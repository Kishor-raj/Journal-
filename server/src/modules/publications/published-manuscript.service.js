import pool from '../../config/db.js'
import cloudinary from '../../config/cloudinary.js'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import { AppError } from '../../shared/errors/AppError.js'
import { buildCertificateNumber } from './publication.service.js'
import { convertDocxToPdf } from './document-converter.js'
import { renderBrandedManuscriptPdf } from './published-manuscript.renderer.js'
import { renderPublicationDocx, deriveCanonicalDoiUrl } from './publication-docx.renderer.js'
import {
  uploadPublishedManuscriptPdf,
  getPublishedManuscriptDownloadUrl,
  getPublishedManuscriptViewUrl,
} from './published-manuscript.storage.js'

async function writeWorkflowLog(client, { manuscriptId, eventName, status, payload, errorMessage }) {
  const query = `
    INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload, error_message)
    VALUES ('published_manuscript', $1, $2, 'generator', $3, $4, $5)
  `
  const target = client || pool
  await target.query(query, [
    manuscriptId,
    eventName,
    status,
    JSON.stringify(payload || {}),
    errorMessage || null,
  ])
}

/**
 * Resolves the official author-submitted source file for the accepted manuscript.
 * Rejects unsupported or missing files; never selects an existing published_manuscript.
 */
export async function resolveManuscriptSourceFile(manuscriptId, versionId = null) {
  const result = await pool.query(
    `SELECT mf.*
     FROM manuscript_files mf
     WHERE mf.manuscript_id = $1
       AND mf.file_type IN ('main_manuscript', 'manuscript')
       AND mf.is_accessible = true
     ORDER BY
       CASE WHEN $2::uuid IS NOT NULL AND mf.version_id = $2::uuid THEN 0 ELSE 1 END ASC,
       mf.uploaded_at DESC
     LIMIT 1`,
    [manuscriptId, versionId]
  )

  if (result.rows.length > 0) {
    return result.rows[0]
  }

  // Fallback: check any accessible file that is DOCX or PDF and NOT a published_manuscript
  const fallbackResult = await pool.query(
    `SELECT mf.*
     FROM manuscript_files mf
     WHERE mf.manuscript_id = $1
       AND mf.file_type != 'published_manuscript'
       AND mf.is_accessible = true
       AND (
         LOWER(mf.format) IN ('docx', 'doc', 'pdf')
         OR LOWER(mf.original_filename) LIKE '%.docx'
         OR LOWER(mf.original_filename) LIKE '%.doc'
         OR LOWER(mf.original_filename) LIKE '%.pdf'
       )
     ORDER BY
       CASE WHEN $2::uuid IS NOT NULL AND mf.version_id = $2::uuid THEN 0 ELSE 1 END ASC,
       mf.uploaded_at DESC
     LIMIT 1`,
    [manuscriptId, versionId]
  )

  return fallbackResult.rows[0] || null
}

/**
 * Downloads a source file buffer from Cloudinary or external URL.
 */
async function fetchSourceBuffer(file) {
  if (!file || !file.public_id) {
    throw new AppError('Source manuscript file has no storage public ID.', 400)
  }

  const resourceType = file.resource_type || 'raw'
  const downloadUrl = cloudinary.url(file.public_id, {
    resource_type: resourceType,
    secure: true,
  })

  if (!downloadUrl) {
    throw new AppError('Failed to generate download URL for source manuscript file.', 500)
  }

  try {
    const res = await fetch(downloadUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch (err) {
    throw new AppError(`Failed to fetch source document from storage: ${err.message}`, 502)
  }
}

/**
 * Loads publication context, journal details, certificate number, and source file.
 */
export async function loadManuscriptPublicationContext(manuscriptId) {
  const manuscriptRes = await pool.query(
    `SELECT m.id, m.title, m.abstract, m.keywords, m.article_type, m.submission_number,
            m.current_status, m.current_version_id, m.submitted_at,
            m.conflict_of_interest, m.ethics_approval, m.funding, m.acknowledgements, m.data_availability,
            c.name AS category_name,
            c.name AS subject_category,
            j.id AS journal_id, j.name AS journal_name, j.short_name AS journal_short_name,
            j.publisher_name, j.issn_print, j.issn_online, j.website_url, j.logo_url
     FROM manuscripts m
     LEFT JOIN categories c ON c.id = m.category_id
     LEFT JOIN journals j ON j.id = m.journal_id
     WHERE m.id = $1`,
    [manuscriptId]
  )

  if (manuscriptRes.rows.length === 0) {
    throw new AppError('Manuscript not found.', 404)
  }

  const manuscript = manuscriptRes.rows[0]

  const pubRes = await pool.query(
    `SELECT * FROM publications WHERE manuscript_id = $1`,
    [manuscriptId]
  )

  const publication = pubRes.rows[0] || {
    volume: 1,
    issue: 1,
    publication_year: new Date().getFullYear(),
    document_status: 'pending',
  }

  // Load authors
  const authorsRes = await pool.query(
    `SELECT id, first_name, last_name, email, institution, department, country, orcid_id,
            is_corresponding, author_order, contribution_roles
     FROM manuscript_authors
     WHERE manuscript_id = $1
     ORDER BY author_order ASC`,
    [manuscriptId]
  )
  const authors = authorsRes.rows || []

  // Load acceptance date from editorial_decisions or status history
  let acceptedDate = null
  const acceptRes = await pool.query(
    `SELECT created_at
     FROM editorial_decisions
     WHERE manuscript_id = $1 AND decision = 'accept'
     ORDER BY created_at DESC
     LIMIT 1`,
    [manuscriptId]
  )
  if (acceptRes.rows.length > 0) {
    acceptedDate = acceptRes.rows[0].created_at
  } else {
    const historyRes = await pool.query(
      `SELECT created_at
       FROM manuscript_status_history
       WHERE manuscript_id = $1 AND to_status = 'accepted'
       ORDER BY created_at DESC
       LIMIT 1`,
      [manuscriptId]
    )
    acceptedDate = historyRes.rows[0]?.created_at || publication.published_at || manuscript.updated_at || null
  }

  // Load revision date if applicable
  const revisionRes = await pool.query(
    `SELECT rr.submitted_at
     FROM revision_responses rr
     JOIN revision_requests rq ON rq.id = rr.revision_request_id
     WHERE rq.manuscript_id = $1 AND rr.submitted_at IS NOT NULL
     ORDER BY rr.submitted_at DESC
     LIMIT 1`,
    [manuscriptId]
  )

  const receivedDate = manuscript.submitted_at || manuscript.created_at || null

  const dates = {
    received: receivedDate,
    revised: revisionRes.rows[0]?.submitted_at || null,
    accepted: acceptedDate || receivedDate || new Date().toISOString(),
  }

  // Load existing certificate number from publication_certificates
  const certRes = await pool.query(
    `SELECT certificate_number
     FROM publication_certificates
     WHERE manuscript_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [manuscriptId]
  )

  const certificateNumber =
    certRes.rows[0]?.certificate_number ||
    buildCertificateNumber(
      manuscript.submission_number || `SUB-${String(manuscriptId).slice(0, 8).toUpperCase()}`,
      publication.publication_year || new Date().getFullYear()
    )

  const journal = {
    name: manuscript.journal_name,
    short_name: manuscript.journal_short_name,
    publisher_name: manuscript.publisher_name,
    issn_print: manuscript.issn_print,
    issn_online: manuscript.issn_online,
    website_url: manuscript.website_url,
    logo_url: manuscript.logo_url,
  }

  return {
    manuscript,
    publication,
    certificateNumber,
    journal,
    authors,
    dates,
  }
}

/**
 * Stamps an interactive clickable Link annotation over the Crossref badge button area on page 1.
 * Guarantees clicking anywhere within the badge boundary redirects directly to the canonical DOI URL.
 *
 * @param {Buffer} pdfBuffer - Input PDF buffer
 * @param {string} doiUrl - Canonical DOI URL (e.g. https://doi.org/10.68968/...)
 * @returns {Promise<Buffer>} Modified PDF buffer
 */
export async function stampCrossrefLinkAnnotation(pdfBuffer, doiUrl) {
  if (!doiUrl || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    return pdfBuffer
  }

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()
    if (pages.length === 0) return pdfBuffer

    const firstPage = pages[0]
    const { height } = firstPage.getSize()

    // Page 1 badge button boundary:
    // Left: ~480pt, Right: ~550pt, Bottom: height - 145pt, Top: height - 85pt
    const linkAnnotation = pdfDoc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [480, height - 145, 550, height - 85],
      Border: [0, 0, 0],
      C: [0, 0, 0],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(doiUrl),
      },
    })

    const linkAnnotationRef = pdfDoc.context.register(linkAnnotation)
    firstPage.node.addAnnot(linkAnnotationRef)

    const modifiedBytes = await pdfDoc.save()
    return Buffer.from(modifiedBytes)
  } catch {
    // If stamping fails, return original pdfBuffer gracefully
    return pdfBuffer
  }
}

/**
 * Generates the official branded published PDF for an accepted manuscript.
 *
 * @param {string} manuscriptId
 * @param {string} [editorId]
 * @param {Object} [options]
 * @param {Buffer} [options.sourceBuffer] - Optional direct buffer (useful for unit tests)
 * @param {string} [options.sourceExtension] - Optional file format extension
 * @returns {Promise<Object>} Generation result
 */
export async function generatePublishedManuscriptPdf(manuscriptId, editorId = null, options = {}) {
  const context = await loadManuscriptPublicationContext(manuscriptId)
  const { manuscript, publication, certificateNumber, journal } = context

  // Mark publication document status as processing
  await pool.query(
    `UPDATE publications
     SET document_status = 'processing',
         document_error = NULL
     WHERE manuscript_id = $1`,
    [manuscriptId]
  )

  await writeWorkflowLog(pool, {
    manuscriptId,
    eventName: 'document_generation_started',
    status: 'processing',
    payload: {
      submission_number: manuscript.submission_number,
      certificate_number: certificateNumber,
    },
  })

  try {
    let sourceBuffer = options.sourceBuffer || null
    let format = (options.sourceExtension || '').toLowerCase()
    let sourceFile = null

    if (!sourceBuffer) {
      sourceFile = await resolveManuscriptSourceFile(manuscriptId, manuscript.current_version_id)
      if (!sourceFile) {
        throw new AppError(
          'No accessible author manuscript file (DOCX or PDF) found for publication.',
          404
        )
      }

      format = (sourceFile.format || '').toLowerCase()
      if (!format && sourceFile.original_filename) {
        const parts = sourceFile.original_filename.split('.')
        format = parts.length > 1 ? parts.pop().toLowerCase() : ''
      }

      sourceBuffer = await fetchSourceBuffer(sourceFile)
    }

    if (!['docx', 'doc', 'pdf'].includes(format)) {
      throw new AppError(
        `Unsupported source file format '${format}'. Only DOCX and PDF manuscripts are supported for publication.`,
        400
      )
    }

    let finalPdfBuffer = null

    if (format === 'docx' || format === 'doc') {
      // Step 1: Generate journal-formatted DOCX from master template
      const formattedDocxBuffer = await renderPublicationDocx({
        sourceDocxBuffer: sourceBuffer,
        context: {
          ...context,
          authors: context.authors || [],
          dates: context.dates || {},
        },
      })

      // Step 2: Convert formatted DOCX to PDF using LibreOffice
      finalPdfBuffer = await convertDocxToPdf(formattedDocxBuffer, { originalExtension: 'docx' })
    } else if (format === 'pdf') {
      // Fallback PDF path with journal branding overlay
      finalPdfBuffer = await renderBrandedManuscriptPdf({
        pdfBuffer: sourceBuffer,
        journal,
        manuscript,
        publication,
        certificateNumber,
      })
    }

    // Step 2.5: Stamp full-area Crossref clickable link annotation pointing to canonical DOI URL
    const rawDoi = publication.doi || manuscript.doi || ''
    const { doiUrl } = deriveCanonicalDoiUrl(rawDoi, manuscript.submission_number, manuscript.id)
    finalPdfBuffer = await stampCrossrefLinkAnnotation(finalPdfBuffer, doiUrl)

    // Validate generated PDF buffer
    if (!Buffer.isBuffer(finalPdfBuffer) || finalPdfBuffer.length < 500) {
      throw new AppError('Generated publication PDF document is empty or invalid.', 500)
    }

    const pdfMagic = finalPdfBuffer.slice(0, 5).toString('utf-8')
    if (!pdfMagic.startsWith('%PDF')) {
      throw new AppError('Invalid PDF format produced by document generator.', 500)
    }

    // Step 3: Upload branded PDF to Cloudinary
    const uploadResult = await uploadPublishedManuscriptPdf({
      pdfBuffer: finalPdfBuffer,
      year: publication.publication_year || new Date().getFullYear(),
      submissionNumber: manuscript.submission_number,
    })

    const finalFilename = `${manuscript.submission_number || 'manuscript'}-published.pdf`

    // Step 4: Persist in manuscript_files
    const client = await pool.connect()
    let savedFile = null
    try {
      await client.query('BEGIN')

      // Insert or update manuscript_files record
      const fileInsert = await client.query(
        `INSERT INTO manuscript_files
           (manuscript_id, version_id, file_type, original_filename, storage_provider,
            public_id, resource_type, format, mime_type, file_size_bytes, sha256_checksum,
            uploaded_by, is_accessible)
         VALUES ($1, $2, 'published_manuscript', $3, 'cloudinary', $4, $5, 'pdf', 'application/pdf', $6, $7, $8, true)
         ON CONFLICT (public_id) DO UPDATE
           SET original_filename = EXCLUDED.original_filename,
               file_size_bytes = EXCLUDED.file_size_bytes,
               sha256_checksum = EXCLUDED.sha256_checksum,
               uploaded_at = now(),
               is_accessible = true
         RETURNING *`,
        [
          manuscriptId,
          manuscript.current_version_id || null,
          finalFilename,
          uploadResult.publicId,
          uploadResult.resourceType,
          uploadResult.fileSizeBytes,
          uploadResult.sha256Checksum,
          editorId,
        ]
      )
      savedFile = fileInsert.rows[0]

      // Invalidate any other older published_manuscript records for this manuscript
      await client.query(
        `DELETE FROM manuscript_files
         WHERE manuscript_id = $1
           AND file_type = 'published_manuscript'
           AND id != $2`,
        [manuscriptId, savedFile.id]
      )

      // Update publications record
      await client.query(
        `UPDATE publications
         SET document_status = 'ready',
             document_file_id = $2,
             document_error = NULL,
             document_generated_at = now()
         WHERE manuscript_id = $1`,
        [manuscriptId, savedFile.id]
      )

      await writeWorkflowLog(client, {
        manuscriptId,
        eventName: 'document_generation_succeeded',
        status: 'success',
        payload: {
          file_id: savedFile.id,
          public_id: savedFile.public_id,
          file_size_bytes: savedFile.file_size_bytes,
          certificate_number: certificateNumber,
        },
      })

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return {
      success: true,
      document_status: 'ready',
      file_id: savedFile.id,
      public_id: savedFile.public_id,
      download_url: getPublishedManuscriptDownloadUrl(savedFile.public_id),
      view_url: getPublishedManuscriptViewUrl(savedFile.public_id),
      certificate_number: certificateNumber,
    }
  } catch (err) {
    const safeError = err.message || 'Unknown publication PDF generation failure'

    await pool.query(
      `UPDATE publications
       SET document_status = 'failed',
           document_error = $2
       WHERE manuscript_id = $1`,
      [manuscriptId, safeError]
    )

    await writeWorkflowLog(pool, {
      manuscriptId,
      eventName: 'document_generation_failed',
      status: 'failed',
      payload: { error: safeError },
      errorMessage: safeError,
    })

    return {
      success: false,
      document_status: 'failed',
      error: safeError,
    }
  }
}

/**
 * Authenticated retry action for editors/admins to regenerate a publication PDF.
 * Never sends duplicate author notifications.
 */
export async function reprocessPublishedManuscript(manuscriptId, editorId) {
  const result = await generatePublishedManuscriptPdf(manuscriptId, editorId)
  if (!result.success) {
    throw new AppError(result.error || 'Failed to reprocess published manuscript document.', 500)
  }
  return result
}

/**
 * Returns current published document status for editors.
 */
export async function getPublishedManuscriptStatus(manuscriptId) {
  const result = await pool.query(
    `SELECT p.document_status,
            p.document_error,
            p.document_generated_at,
            mf.id AS file_id,
            mf.public_id,
            mf.file_size_bytes,
            mf.uploaded_at
     FROM publications p
     LEFT JOIN manuscript_files mf ON mf.id = p.document_file_id
     WHERE p.manuscript_id = $1`,
    [manuscriptId]
  )

  if (result.rows.length === 0) {
    return {
      status: 'pending',
      error: null,
      generated_at: null,
      file_id: null,
      download_url: null,
    }
  }

  const row = result.rows[0]
  return {
    status: row.document_status || 'pending',
    error: row.document_error || null,
    generated_at: row.document_generated_at || null,
    file_id: row.file_id || null,
    download_url: row.public_id ? getPublishedManuscriptDownloadUrl(row.public_id) : null,
    view_url: row.public_id ? getPublishedManuscriptViewUrl(row.public_id) : null,
  }
}
