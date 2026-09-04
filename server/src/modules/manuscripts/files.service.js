import cloudinary from '../../config/cloudinary.js'
import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'

export function generateSignature(manuscriptId, versionId, fileType) {
  const timestamp = Math.round(Date.now() / 1000)
  const folder = `manuscripts/${manuscriptId}/v${versionId}`
  const publicId = `${fileType}_${timestamp}`

  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET)

  return {
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    public_id: publicId,
  }
}

export async function confirmUpload(manuscriptId, versionId, fileData, userId) {
  const manuscriptResult = await pool.query(
    'SELECT id FROM manuscripts WHERE id = $1',
    [manuscriptId]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  let dbVersionId = versionId;
  if (versionId === 'current') {
    dbVersionId = null;
  } else {
    const versionResult = await pool.query(
      'SELECT id FROM manuscript_versions WHERE id = $1 AND manuscript_id = $2',
      [versionId, manuscriptId]
    )

    if (versionResult.rows.length === 0) {
      throw new AppError('Version not found', 404)
    }
  }

  const {
    file_type,
    original_filename,
    public_id,
    resource_type,
    format,
    mime_type,
    file_size_bytes,
    sha256_checksum,
  } = fileData

  const result = await pool.query(
    `INSERT INTO manuscript_files (manuscript_id, version_id, file_type, original_filename, public_id, resource_type, format, mime_type, file_size_bytes, sha256_checksum, uploaded_by, is_accessible)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
     RETURNING *`,
    [manuscriptId, dbVersionId, file_type, original_filename, public_id, resource_type, format, mime_type, file_size_bytes, sha256_checksum, userId]
  )

  return result.rows[0]
}

export async function deleteManuscriptFile(manuscriptId, fileId, userId) {
  const fileResult = await pool.query(
    `SELECT mf.*, m.current_status, m.submitted_by
     FROM manuscript_files mf
     JOIN manuscripts m ON m.id = mf.manuscript_id
     WHERE mf.id = $1 AND mf.manuscript_id = $2`,
    [fileId, manuscriptId]
  )

  if (fileResult.rows.length === 0) {
    throw new AppError('File not found', 404)
  }

  const file = fileResult.rows[0]

  if (file.current_status !== 'draft') {
    throw new AppError('Cannot remove files from a submitted manuscript', 400)
  }

  const isOwner = file.submitted_by === userId
  if (!isOwner) {
    throw new AppError('You are not authorized to remove this file', 403)
  }

  try {
    await cloudinary.uploader.destroy(file.public_id, {
      resource_type: file.resource_type || 'raw',
    })
  } catch {
    // If Cloudinary deletion fails (e.g., file already removed), continue with DB cleanup
  }

  await pool.query('DELETE FROM manuscript_files WHERE id = $1', [fileId])

  return { success: true, deleted_file_id: fileId }
}

export async function getFileAccess(fileId, user) {
  const result = await pool.query(
    `SELECT mf.*, m.submitted_by, m.current_status,
       EXISTS (
         SELECT 1 FROM manuscript_authors ma
         WHERE ma.manuscript_id = m.id AND ma.user_id = $2
       ) AS is_author,
       EXISTS (
         SELECT 1 FROM reviewer_assignments ra
         WHERE ra.manuscript_id = m.id AND ra.reviewer_id = $2
           AND ra.assignment_status IN ('invited', 'accepted')
       ) AS is_reviewer
     FROM manuscript_files mf
     JOIN manuscripts m ON m.id = mf.manuscript_id
     WHERE mf.id = $1 AND mf.is_accessible = true`,
    [fileId, user.uid]
  )

  if (result.rowCount === 0) throw new AppError('File not found', 404)

  const file = result.rows[0]
  const role = user.role_name
  const allowed = role === 'admin' || role === 'editor' ||
    (role === 'moderator' && ['submitted', 'under_moderation'].includes(file.current_status)) ||
    (role === 'author' && (file.submitted_by === user.uid || file.is_author)) ||
    (role === 'reviewer' && file.is_reviewer)

  if (!allowed) throw new AppError('You are not permitted to access this file', 403)

  const options = {
    resource_type: file.resource_type || 'raw',
    secure: true,
  }
  if (file.format) options.format = file.format

  return {
    id: file.id,
    filename: file.original_filename,
    view_url: cloudinary.url(file.public_id, options),
    download_url: cloudinary.url(file.public_id, { ...options, flags: 'attachment' }),
  }
}
