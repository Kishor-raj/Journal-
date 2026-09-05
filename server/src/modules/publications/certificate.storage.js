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

function safePathSegment(value) {
  return String(value ?? 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80)
}

export function certificateFolderFor(year, submissionNumber) {
  return `certificates/${safePathSegment(year)}/${safePathSegment(submissionNumber)}`
}

/**
 * Uploads a generated certificate PDF to the project's Cloudinary storage.
 * Returns `{ publicId, secureUrl, resourceType }`.
 */
export function uploadCertificatePdf({ pdfBuffer, year, submissionNumber, authorId }) {
  if (!isConfigured()) {
    const error = new Error('Cloudinary storage is not configured. Certificate PDF cannot be stored.')
    error.code = 'STORAGE_NOT_CONFIGURED'
    return Promise.reject(error)
  }

  const folder = certificateFolderFor(year, submissionNumber)
  const publicId = `${folder}/author-${safePathSegment(authorId)}`

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'auto',
        format: 'pdf',
        folder: '',
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error)
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
        })
      }
    )
    stream.end(pdfBuffer)
  })
}

export function getCertificateDownloadUrl(publicId) {
  if (!publicId) return null
  try {
    return cloudinary.url(publicId, { secure: true, format: 'pdf', flags: 'attachment' })
  } catch {
    return null
  }
}