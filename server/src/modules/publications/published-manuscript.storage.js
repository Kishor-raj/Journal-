import crypto from 'crypto'
import cloudinary from '../../config/cloudinary.js'
import { env } from '../../config/env.js'

function isConfigured() {
  const config = cloudinary.config()
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET &&
    config.cloud_name &&
    config.api_key &&
    config.api_secret
  )
}

export function safePathSegment(value) {
  return String(value ?? 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80)
}

export function publishedManuscriptFolderFor(year, submissionNumber) {
  return `published-manuscripts/${safePathSegment(year)}/${safePathSegment(submissionNumber)}`
}

/**
 * Uploads a generated branded manuscript PDF to Cloudinary.
 * Returns storage metadata including publicId, secureUrl, resourceType, sha256Checksum, fileSizeBytes.
 */
export function uploadPublishedManuscriptPdf({ pdfBuffer, year, submissionNumber }) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    return Promise.reject(new Error('Invalid PDF buffer provided for upload.'))
  }

  const sha256Checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
  const fileSizeBytes = pdfBuffer.length

  if (!isConfigured()) {
    // If Cloudinary is not configured (e.g. test environment), resolve with mock payload
    if (process.env.NODE_ENV === 'test') {
      const folder = publishedManuscriptFolderFor(year, submissionNumber)
      const mockPublicId = `${folder}/manuscript-${safePathSegment(submissionNumber)}`
      return Promise.resolve({
        publicId: mockPublicId,
        secureUrl: `https://res.cloudinary.com/mock/raw/upload/${mockPublicId}.pdf`,
        resourceType: 'raw',
        format: 'pdf',
        mimeType: 'application/pdf',
        fileSizeBytes,
        sha256Checksum,
      })
    }

    const error = new Error('Cloudinary storage is not configured. Published manuscript PDF cannot be stored.')
    error.code = 'STORAGE_NOT_CONFIGURED'
    return Promise.reject(error)
  }

  const folder = publishedManuscriptFolderFor(year, submissionNumber)
  const publicId = `${folder}/manuscript-${safePathSegment(submissionNumber)}`

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'raw',
        format: 'pdf',
        folder: '',
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type || 'raw',
          format: 'pdf',
          mimeType: 'application/pdf',
          fileSizeBytes,
          sha256Checksum,
        })
      }
    )
    stream.end(pdfBuffer)
  })
}

export function getPublishedManuscriptDownloadUrl(publicId) {
  if (!publicId) return null
  try {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
      flags: 'attachment',
    })
  } catch {
    return null
  }
}

export function getPublishedManuscriptViewUrl(publicId) {
  if (!publicId) return null
  try {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: true,
    })
  } catch {
    return null
  }
}
