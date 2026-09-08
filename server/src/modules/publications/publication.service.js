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
  let authorsResult = await client.query(
    `SELECT id FROM manuscript_authors
     WHERE manuscript_id = $1
     ORDER BY author_order ASC`,
    [manuscriptId]
  )
  let authors = authorsResult.rows

  if (authors.length === 0) {
    const submitterRes = await client.query(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM manuscripts m
       JOIN users u ON u.id = m.submitted_by
       WHERE m.id = $1`,
      [manuscriptId]
    )
    if (submitterRes.rows.length > 0) {
      const u = submitterRes.rows[0]
      const ins = await client.query(
        `INSERT INTO manuscript_authors
           (manuscript_id, user_id, author_order, first_name, last_name, email, is_corresponding)
         VALUES ($1, $2, 1, $3, $4, $5, true)
         RETURNING id`,
        [manuscriptId, u.id, u.first_name || 'Author', u.last_name || '', u.email]
      )
      if (ins.rows[0]) {
        authors = [ins.rows[0]]
      }
    }
  }

  const validSubNumber = submissionNumber || `SUB-${String(manuscriptId).slice(0, 8).toUpperCase()}`
  const certificateNumber = buildCertificateNumber(validSubNumber, publicationYear)
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
  let publication = await getPublicationForManuscript(manuscriptId)
  if (!publication) {
    const client = await pool.connect()
    try {
      publication = await createPublicationRow(client, {
        manuscriptId,
        editorId: null,
        volume: DEFAULT_VOLUME,
        issue: DEFAULT_ISSUE,
        publicationYear: new Date().getFullYear(),
        doi: null,
        articleUrl: null,
      })
    } finally {
      client.release()
    }
  }

  const manuscriptResult = await pool.query(
    `SELECT m.id, m.title, m.submission_number, m.current_status, m.submitted_by,
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
  let authorName = [certificate.first_name, certificate.last_name].filter(Boolean).join(' ').trim()

  if (!authorName) {
    if (certificate.user_id) {
      const uRes = await pool.query('SELECT first_name, last_name, display_name FROM users WHERE id = $1', [certificate.user_id])
      const u = uRes.rows[0]
      if (u) {
        authorName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.display_name
      }
    }
    if (!authorName && manuscript.submitted_by) {
      const uRes = await pool.query('SELECT first_name, last_name, display_name FROM users WHERE id = $1', [manuscript.submitted_by])
      const u = uRes.rows[0]
      if (u) {
        authorName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.display_name
      }
    }
  }

  if (!authorName) {
    authorName = (certificate.email || 'Author').split('@')[0]
  }

  const context = {
    authorName,
    articleTitle: manuscript.title || 'Untitled Article',
    journalName: manuscript.journal_name || manuscript.journal_short_name || 'International Journal of Intelligent Digital Computing Research',
    journalShortName: manuscript.journal_short_name || 'IJIDCR',
    publisherName: manuscript.publisher_name || 'IJIDCR Publishing',
    volume: publication.volume || DEFAULT_VOLUME,
    issue: publication.issue || DEFAULT_ISSUE,
    year: publication.publication_year || new Date().getFullYear(),
    publicationDate: publication.publication_date || new Date(),
    certificateNumber: certificate.certificate_number,
    submissionNumber: manuscript.submission_number,
    verificationUrl: buildAppUrl(`/verify/${certificate.verification_token}`),
    doi: publication.doi || '',
    issn: manuscript.issn_print || manuscript.issn_online || '',
  }

  const pdfBuffer = await renderCertificatePdf(context)
  let publicId = null
  let secureUrl = null

  try {
    const uploadRes = await uploadCertificatePdf({
      pdfBuffer,
      year: publication.publication_year,
      submissionNumber: manuscript.submission_number,
      authorId: certificate.author_id,
    })
    publicId = uploadRes.publicId
    secureUrl = uploadRes.secureUrl
  } catch (storageErr) {
    console.warn('[PUBLICATION] Cloudinary upload fallback to data URL:', storageErr.message)
    secureUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
    publicId = null
  }

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

  // Ensure author rows exist
  const authorCheck = await pool.query(
    `SELECT id FROM manuscript_authors WHERE manuscript_id = $1`,
    [manuscriptId]
  )
  if (authorCheck.rows.length === 0) {
    const client = await pool.connect()
    try {
      await createCertificateRows(client, {
        manuscriptId,
        submissionNumber: manuscript.submission_number,
        publicationYear: publication.publication_year || new Date().getFullYear(),
      })
    } finally {
      client.release()
    }
  }

  // Ensure pending certificate rows exist if none exist
  const existingCerts = await pool.query(
    `SELECT COUNT(*) AS count FROM publication_certificates WHERE manuscript_id = $1`,
    [manuscriptId]
  )
  if (parseInt(existingCerts.rows[0].count, 10) === 0) {
    const client = await pool.connect()
    try {
      await createCertificateRows(client, {
        manuscriptId,
        submissionNumber: manuscript.submission_number,
        publicationYear: publication.publication_year || new Date().getFullYear(),
      })
    } finally {
      client.release()
    }
  }

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
export async function getMyCertificate(manuscriptId, userId, user = {}) {
  const isPrivileged =
    user?.role_name === 'admin' ||
    user?.role_name === 'editor' ||
    user?.account_role_name === 'admin' ||
    user?.account_role_name === 'editor' ||
    user?.assigned_roles?.includes('admin') ||
    user?.assigned_roles?.includes('editor')

  // Validate manuscript and author access
  let manuscriptRes
  if (isPrivileged) {
    manuscriptRes = await pool.query(
      `SELECT m.id, m.title, m.submission_number, m.current_status, m.submitted_by
       FROM manuscripts m
       WHERE m.id = $1
       LIMIT 1`,
      [manuscriptId]
    )
  } else {
    manuscriptRes = await pool.query(
      `SELECT m.id, m.title, m.submission_number, m.current_status, m.submitted_by
       FROM manuscripts m
       JOIN users u ON u.id = $2
       LEFT JOIN manuscript_authors ma ON ma.manuscript_id = m.id
       WHERE m.id = $1 AND (m.submitted_by = u.id OR ma.user_id = u.id OR LOWER(TRIM(ma.email)) = LOWER(TRIM(u.email)))
       LIMIT 1`,
      [manuscriptId, userId]
    )
  }

  if (manuscriptRes.rows.length === 0) {
    throw new AppError('Manuscript not found.', 404)
  }

  const manuscript = manuscriptRes.rows[0]

  if (manuscript.current_status !== 'published') {
    throw new AppError('No certificate is available for this manuscript yet.', 400)
  }

  // Ensure publication row exists
  let publication = await getPublicationForManuscript(manuscriptId)
  if (!publication) {
    const client = await pool.connect()
    try {
      publication = await createPublicationRow(client, {
        manuscriptId,
        editorId: null,
        volume: DEFAULT_VOLUME,
        issue: DEFAULT_ISSUE,
        publicationYear: new Date().getFullYear(),
        doi: null,
        articleUrl: null,
      })
    } finally {
      client.release()
    }
  }

  // Ensure author records exist
  const authorCountRes = await pool.query(
    `SELECT COUNT(*) AS count FROM manuscript_authors WHERE manuscript_id = $1`,
    [manuscriptId]
  )
  if (parseInt(authorCountRes.rows[0].count, 10) === 0) {
    const client = await pool.connect()
    try {
      const uRes = await client.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [manuscript.submitted_by || userId])
      const u = uRes.rows[0] || {}
      await client.query(
        `INSERT INTO manuscript_authors (manuscript_id, user_id, author_order, first_name, last_name, email, is_corresponding)
         VALUES ($1, $2, 1, $3, $4, $5, true)`,
        [manuscriptId, manuscript.submitted_by || userId, u.first_name || 'Author', u.last_name || '', u.email || 'author@example.com']
      )
    } finally {
      client.release()
    }
  }

  // Ensure certificate rows exist
  const certCountRes = await pool.query(
    `SELECT COUNT(*) AS count FROM publication_certificates WHERE manuscript_id = $1`,
    [manuscriptId]
  )
  if (parseInt(certCountRes.rows[0].count, 10) === 0) {
    const client = await pool.connect()
    try {
      await createCertificateRows(client, {
        manuscriptId,
        submissionNumber: manuscript.submission_number,
        publicationYear: publication.publication_year || new Date().getFullYear(),
      })
    } finally {
      client.release()
    }
  }

  // Fetch certificate for this user
  let result = await pool.query(
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
     JOIN users u ON u.id = $2
     WHERE pc.manuscript_id = $1
       AND (ma.user_id = u.id OR LOWER(ma.email) = LOWER(u.email) OR m.submitted_by = u.id)
     ORDER BY (ma.user_id = u.id) DESC, (LOWER(ma.email) = LOWER(u.email)) DESC, ma.is_corresponding DESC, ma.author_order ASC
     LIMIT 1`,
    [manuscriptId, userId]
  )

  if (result.rows.length === 0) {
    result = await pool.query(
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
       WHERE pc.manuscript_id = $1
       ORDER BY ma.is_corresponding DESC, ma.author_order ASC
       LIMIT 1`,
      [manuscriptId]
    )
  }

  if (result.rows.length === 0) {
    throw new AppError('Certificate not found.', 404)
  }

  let row = result.rows[0]

  if (row.status !== 'active') {
    try {
      await generateCertificatesForManuscript(manuscriptId, { triggerNotifications: false })
      const refreshed = await pool.query(
        `SELECT * FROM publication_certificates WHERE id = $1`,
        [row.id]
      )
      if (refreshed.rows[0]) {
        row.status = refreshed.rows[0].status
        row.pdf_file_url = refreshed.rows[0].pdf_file_url
        row.cloudinary_public_id = refreshed.rows[0].cloudinary_public_id
        row.generated_at = refreshed.rows[0].generated_at
      }
    } catch (err) {
      console.error('[PUBLICATION] Lazy certificate generation failed:', err.message)
    }
  }

  const isActive = row.status === 'active'
  const downloadUrl = isActive ? `/api/publications/manuscripts/${manuscriptId}/certificate/download` : null

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
    download_url: downloadUrl,
    verification_url: buildAppUrl(`/verify/${row.verification_token}`),
  }
}

/**
 * Downloads the freshly rendered certificate PDF directly for the authenticated user.
 */
export async function downloadMyCertificatePdf(manuscriptId, userId, user = {}) {
  const certInfo = await getMyCertificate(manuscriptId, userId, user)
  if (!certInfo || certInfo.status !== 'active') {
    throw new AppError('Certificate is not available for download.', 404)
  }

  const { publication, manuscript } = await loadPublicationContext(manuscriptId)

  const context = {
    authorName: [certInfo.author?.first_name, certInfo.author?.last_name].filter(Boolean).join(' ').trim() || certInfo.author?.email || 'Author',
    articleTitle: certInfo.manuscript_title || manuscript.title || 'Untitled Article',
    journalName: certInfo.journal_name || manuscript.journal_name || 'International Journal of Intelligent Digital Computing Research',
    journalShortName: certInfo.journal_short_name || manuscript.journal_short_name || 'IJIDCR',
    publisherName: certInfo.publisher_name || manuscript.publisher_name || 'IJIDCR Publishing',
    volume: certInfo.volume || publication.volume || DEFAULT_VOLUME,
    issue: certInfo.issue || publication.issue || DEFAULT_ISSUE,
    year: certInfo.publication_year || publication.publication_year || new Date().getFullYear(),
    publicationDate: certInfo.publication_date || publication.publication_date || new Date(),
    certificateNumber: certInfo.certificate_number,
    submissionNumber: certInfo.submission_number || manuscript.submission_number,
    verificationUrl: certInfo.verification_url,
    doi: certInfo.doi || publication.doi || '',
    issn: certInfo.issn_print || certInfo.issn_online || '',
  }

  const pdfBuffer = await renderCertificatePdf(context)
  return {
    pdfBuffer,
    filename: `Certificate-${certInfo.certificate_number || 'Publication'}.pdf`,
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