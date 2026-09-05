import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'
import { generateToken, buildAppUrl } from '../email/email.utils.js'
import { renderCertificatePdf } from './certificate.renderer.js'
import { uploadCertificatePdf, getCertificateDownloadUrl } from './certificate.storage.js'
import { sendPublicationCertificate } from '../notification/manuscript-notification.service.js'

const DEFAULT_VOLUME = 1
const DEFAULT_ISSUE = 1

function twoDigitYear(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '00'
  return String(Math.abs(Math.trunc(num))).padStart(2, '0').slice(-2)
}

/**
 * Certificate No. = ARFI-{YY}-{ARTICLE_NO}, reusing the existing Article No.
 * (manuscripts.submission_number). No separate certificate sequence is used.
 *
 * Example: submission_number = IJIDCR-26-0001, year = 2026
 *          -> ARFI-26-IJIDCR-26-0001
 */
export function buildCertificateNumber(submissionNumber, publicationYear) {
  const articleNo = String(submissionNumber || '').trim()
  if (!articleNo) {
    throw new AppError('Article Number (submission_number) is missing.', 400)
  }
  return `ARFI-${twoDigitYear(publicationYear)}-${articleNo}`
}

export function validatePublicationMetadata(metadata = {}) {
  const volume =
    metadata.volume === undefined || metadata.volume === null || metadata.volume === ''
      ? DEFAULT_VOLUME
      : Number(metadata.volume)
  const issue =
    metadata.issue === undefined || metadata.issue === null || metadata.issue === ''
      ? DEFAULT_ISSUE
      : Number(metadata.issue)

  if (!Number.isInteger(volume) || volume <= 0) {
    throw new AppError('Volume must be a positive integer.', 400)
  }
  if (!Number.isInteger(issue) || issue <= 0) {
    throw new AppError('Issue must be a positive integer.', 400)
  }

  const doi = metadata.doi && typeof metadata.doi === 'string' ? metadata.doi.trim() || null : null
  const articleUrl =
    metadata.article_url && typeof metadata.article_url === 'string'
      ? metadata.article_url.trim() || null
      : null

  return {
    volume,
    issue,
    publicationYear: new Date().getFullYear(),
    doi,
    articleUrl,
  }
}

async function writeWorkflowLog(target, { manuscriptId, eventName, status, payload, errorMessage }) {
  await target.query(
    `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload, error_message)
     VALUES ('publication', $1, $2, 'publish', $3, $4, $5)`,
    [manuscriptId, eventName, status, JSON.stringify(payload || {}), errorMessage || null]
  )
}

/**
 * Creates the authoritative publication record. Idempotent: uses a unique
 * manuscript_id constraint and never creates a duplicate publication row.
 */
export async function createPublicationRow(client, { manuscriptId, editorId, volume, issue, publicationYear, doi, articleUrl }) {
  const result = await client.query(
    `INSERT INTO publications
       (manuscript_id, volume, issue, publication_year, doi, article_url, published_at, published_by)
     VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
     ON CONFLICT (manuscript_id) DO NOTHING
     RETURNING *`,
    [manuscriptId, volume, issue, publicationYear, doi, articleUrl, editorId]
  )
  if (result.rows[0]) return result.rows[0]

  const existing = await client.query('SELECT * FROM publications WHERE manuscript_id = $1', [manuscriptId])
  return existing.rows[0]
}

/**
 * Creates one certificate record per manuscript author inside the publish
 * transaction. Idempotent per (manuscript_id, author_id). Verification tokens
 * are unpredictable random base64url strings. Certificate rows are created as
 * 'pending'; PDF generation happens after commit so storage/email failures
 * never corrupt the transaction.
 */
export async function createCertificateRows(client, { manuscriptId, submissionNumber, publicationYear }) {
  const authorsResult = await client.query(
    `SELECT id FROM manuscript_authors
     WHERE manuscript_id = $1
     ORDER BY author_order ASC`,
    [manuscriptId]
  )
  const authors = authorsResult.rows
  const certificateNumber = buildCertificateNumber(submissionNumber, publicationYear)
  const certificates = []

  for (const author of authors) {
    const token = generateToken('long')
    const result = await client.query(
      `INSERT INTO publication_certificates
         (manuscript_id, author_id, certificate_number, verification_token, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (manuscript_id, author_id) DO NOTHING
       RETURNING *`,
      [manuscriptId, author.id, certificateNumber, token]
    )
    if (result.rows[0]) certificates.push(result.rows[0])
  }

  return { authors, certificates, certificateNumber }
}

export async function getPublicationForManuscript(manuscriptId) {
  const result = await pool.query('SELECT * FROM publications WHERE manuscript_id = $1', [manuscriptId])
  return result.rows[0] || null
}

async function loadPublicationContext(manuscriptId) {
  const publication = await getPublicationForManuscript(manuscriptId)
  if (!publication) {
    throw new AppError('Publication record not found.', 404)
  }

  const manuscriptResult = await pool.query(
    `SELECT m.id, m.title, m.submission_number, m.current_status,
            j.name AS journal_name, j.short_name AS journal_short_name,
            j.publisher_name, j.issn_print, j.issn_online
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     WHERE m.id = $1`,
    [manuscriptId]
  )
  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found.', 404)
  }

  return { publication, manuscript: manuscriptResult.rows[0] }
}

async function generateAndStoreCertificate({ publication, manuscript, certificate }) {
  const authorName =
    [certificate.first_name, certificate.last_name].filter(Boolean).join(' ').trim() ||
    (certificate.email || 'Author').split('@')[0]

  const context = {
    authorName,
    articleTitle: manuscript.title || 'Untitled Article',
    journalName: manuscript.journal_name || manuscript.journal_short_name || 'Journal',
    journalShortName: manuscript.journal_short_name || '',
    publisherName: manuscript.publisher_name || '',
    volume: publication.volume,
    issue: publication.issue,
    year: publication.publication_year,
    publicationDate: publication.publication_date,
    certificateNumber: certificate.certificate_number,
    submissionNumber: manuscript.submission_number,
    verificationUrl: buildAppUrl(`/verify/${certificate.verification_token}`),
    doi: publication.doi || '',
    issn: manuscript.issn_print || manuscript.issn_online || '',
  }

  const pdfBuffer = await renderCertificatePdf(context)
  const { publicId, secureUrl } = await uploadCertificatePdf({
    pdfBuffer,
    year: publication.publication_year,
    submissionNumber: manuscript.submission_number,
    authorId: certificate.author_id,
  })

  const result = await pool.query(
    `UPDATE publication_certificates
     SET status = 'active', pdf_file_url = $1, cloudinary_public_id = $2,
         generated_at = now(), updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [secureUrl, publicId, certificate.id]
  )

  await writeWorkflowLog(pool, {
    manuscriptId: manuscript.id,
    eventName: 'certificate_generated',
    status: 'success',
    payload: {
      certificate_id: certificate.id,
      certificate_number: certificate.certificate_number,
      public_id: publicId,
    },
  })

  return result.rows[0]
}

async function markCertificateFailed(certificateId, manuscriptId, errorMessage) {
  await pool.query(
    `UPDATE publication_certificates SET status = 'failed', updated_at = now() WHERE id = $1`,
    [certificateId]
  )
  await writeWorkflowLog(pool, {
    manuscriptId,
    eventName: 'certificate_generation_failed',
    status: 'failed',
    payload: { certificate_id: certificateId },
    errorMessage,
  })
}

/**
 * Generates, stores and finalizes ('active') certificate PDFs for a published
 * manuscript. Runs after the publish commit, so failures leave certificate
 * rows in a retryable 'failed' state instead of an inconsistent one.
 */
export async function generateCertificatesForManuscript(manuscriptId, { triggerNotifications = true } = {}) {
  const { publication, manuscript } = await loadPublicationContext(manuscriptId)

  const certificateResult = await pool.query(
    `SELECT pc.id, pc.author_id, pc.certificate_number, pc.verification_token, pc.status,
            ma.user_id, ma.first_name, ma.last_name, ma.email, ma.author_order
     FROM publication_certificates pc
     JOIN manuscript_authors ma ON ma.id = pc.author_id
     WHERE pc.manuscript_id = $1 AND pc.status IN ('pending', 'failed')
     ORDER BY ma.author_order ASC`,
    [manuscriptId]
  )

  const results = []
  for (const certificate of certificateResult.rows) {
    try {
      const updated = await generateAndStoreCertificate({ publication, manuscript, certificate })
      results.push({ certificate_id: certificate.id, status: updated.status })
      if (triggerNotifications && updated.status === 'active') {
        try {
          await sendPublicationCertificate(manuscriptId, certificate.author_id)
        } catch (err) {
          console.error(`[PUBLICATION] Certificate notification failed for ${certificate.id}:`, err.message)
        }
      }
    } catch (err) {
      await markCertificateFailed(certificate.id, manuscriptId, err.message)
      results.push({ certificate_id: certificate.id, status: 'failed', error: err.message })
    }
  }

  return { manuscript_id: manuscriptId, results }
}

/**
 * Returns the authenticated author's own certificate for a manuscript.
 */
export async function getMyCertificate(manuscriptId, userId) {
  const result = await pool.query(
    `SELECT pc.id, pc.certificate_number, pc.verification_token, pc.pdf_file_url,
            pc.cloudinary_public_id, pc.status, pc.generated_at, pc.revoked_at, pc.revocation_reason,
            m.title AS manuscript_title, m.submission_number,
            p.volume, p.issue, p.publication_year, p.publication_date, p.doi, p.article_url,
            ma.first_name, ma.last_name, ma.email,
            j.name AS journal_name, j.short_name AS journal_short_name,
            j.publisher_name, j.issn_print, j.issn_online
     FROM publication_certificates pc
     JOIN manuscripts m ON m.id = pc.manuscript_id
     JOIN publications p ON p.manuscript_id = pc.manuscript_id
     JOIN manuscript_authors ma ON ma.id = pc.author_id
     LEFT JOIN journals j ON j.id = m.journal_id
     WHERE pc.manuscript_id = $1 AND ma.user_id = $2 AND m.current_status = 'published'`,
    [manuscriptId, userId]
  )

  if (result.rows.length === 0) {
    throw new AppError('Certificate not found.', 404)
  }
  const row = result.rows[0]
  const isActive = row.status === 'active'

  return {
    id: row.id,
    certificate_number: row.certificate_number,
    status: row.status,
    manuscript_title: row.manuscript_title,
    submission_number: row.submission_number,
    volume: row.volume,
    issue: row.issue,
    publication_year: row.publication_year,
    publication_date: row.publication_date,
    doi: row.doi,
    article_url: row.article_url,
    author: { first_name: row.first_name, last_name: row.last_name, email: row.email },
    journal_name: row.journal_name,
    journal_short_name: row.journal_short_name,
    publisher_name: row.publisher_name,
    issn_print: row.issn_print,
    issn_online: row.issn_online,
    generated_at: row.generated_at,
    revoked_at: row.revoked_at,
    pdf_url: isActive ? row.pdf_file_url : null,
    download_url: isActive ? getCertificateDownloadUrl(row.cloudinary_public_id) : null,
    verification_url: buildAppUrl(`/verify/${row.verification_token}`),
  }
}

/**
 * Public certificate verification. Exposes public information only.
 */
export async function getCertificateVerification(token) {
  if (!token) {
    throw new AppError('Verification token is required.', 400)
  }

  const result = await pool.query(
    `SELECT pc.status, pc.certificate_number, pc.revoked_at, pc.revocation_reason, pc.generated_at,
            m.title AS manuscript_title, m.submission_number,
            p.volume, p.issue, p.publication_year, p.publication_date, p.doi,
            ma.first_name, ma.last_name, ma.email,
            j.name AS journal_name, j.short_name AS journal_short_name,
            j.issn_print, j.issn_online
     FROM publication_certificates pc
     JOIN manuscripts m ON m.id = pc.manuscript_id
     JOIN publications p ON p.manuscript_id = pc.manuscript_id
     JOIN manuscript_authors ma ON ma.id = pc.author_id
     LEFT JOIN journals j ON j.id = m.journal_id
     WHERE pc.verification_token = $1`,
    [token]
  )

  if (result.rows.length === 0) {
    return { status: 'invalid' }
  }

  const row = result.rows[0]
  const certStatus = row.status === 'active' ? 'active' : row.status === 'revoked' ? 'revoked' : 'unavailable'

  return {
    status: certStatus,
    certificate_number: row.certificate_number,
    manuscript: { title: row.manuscript_title, submission_number: row.submission_number },
    author: { first_name: row.first_name, last_name: row.last_name, email: row.email },
    publication: {
      volume: row.volume,
      issue: row.issue,
      year: row.publication_year,
      date: row.publication_date,
      doi: row.doi,
    },
    journal: {
      name: row.journal_name,
      short_name: row.journal_short_name,
      issn_print: row.issn_print,
      issn_online: row.issn_online,
    },
    revoked_at: row.revoked_at,
  }
}

/**
 * Certificate management list for editors/admins.
 */
export async function getCertificatesForManuscript(manuscriptId) {
  const result = await pool.query(
    `SELECT pc.id, pc.certificate_number, pc.verification_token, pc.status,
            pc.generated_at, pc.revoked_at, pc.revocation_reason, pc.pdf_file_url,
            ma.first_name, ma.last_name, ma.email, ma.user_id
     FROM publication_certificates pc
     JOIN manuscript_authors ma ON ma.id = pc.author_id
     WHERE pc.manuscript_id = $1
     ORDER BY ma.author_order ASC`,
    [manuscriptId]
  )
  return result.rows
}

/**
 * Revokes an active certificate (authorized editors/admins).
 */
export async function revokeCertificate(certificateId, userId, reason) {
  const result = await pool.query(
    `UPDATE publication_certificates
     SET status = 'revoked', revoked_at = now(), revocation_reason = $1, updated_at = now()
     WHERE id = $2
     RETURNING *`,
    [reason || null, certificateId]
  )

  if (result.rows.length === 0) {
    throw new AppError('Certificate not found.', 404)
  }
  const certificate = result.rows[0]

  await writeWorkflowLog(pool, {
    manuscriptId: certificate.manuscript_id,
    eventName: 'certificate_revoked',
    status: 'success',
    payload: {
      certificate_id: certificate.id,
      certificate_number: certificate.certificate_number,
      revoked_by: userId,
    },
  })

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values)
     VALUES ($1, 'certificate_revoked', 'publication_certificates', $2, $3)`,
    [userId, certificate.id, JSON.stringify({ certificate_number: certificate.certificate_number, reason: reason || null })]
  )

  return certificate
}