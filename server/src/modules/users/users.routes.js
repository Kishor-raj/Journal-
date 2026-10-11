import { Router } from 'express'
import crypto from 'crypto'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import pool from '../../config/db.js'
import cloudinary from '../../config/cloudinary.js'
import { syncUserProfileFromEditorialApplication, isUserProfileComplete } from '../auth/auth.service.js'

const router = Router()

// Limited lookup used by authors when selecting registered co-authors.
// Never return credentials, role internals, or security/account metadata.
router.get('/search', authenticate, requireRole('author'), async (req, res) => {
  const query = String(req.query.q || '').trim()
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 20)

  if (query.length < 2) return res.json([])

  const result = await pool.query(
    `SELECT id, first_name, last_name, display_name, email, institution, college, department, state, country, course, orcid_id
     FROM users
     WHERE account_status = 'active'
       AND (
         LOWER(email::text) LIKE LOWER($1)
         OR LOWER(COALESCE(display_name, '')) LIKE LOWER($1)
         OR LOWER(COALESCE(first_name, '')) LIKE LOWER($1)
         OR LOWER(COALESCE(last_name, '')) LIKE LOWER($1)
       )
     ORDER BY LOWER(COALESCE(display_name, email::text)), LOWER(email::text)
     LIMIT $2`,
    [`%${query}%`, limit]
  )

  res.json(result.rows)
})

router.get('/me', authenticate, async (req, res) => {
  const queryStr = `
    SELECT u.*,
           COALESCE(u.cv_file_url, ea.cv_file_url) AS cv_file_url,
           COALESCE(u.cv_file_name, ea.cv_file_name) AS cv_file_name,
           COALESCE(u.cv_file_size, ea.cv_file_size) AS cv_file_size,
           COALESCE(u.cv_mime_type, ea.cv_mime_type, 'application/pdf') AS cv_mime_type,
           COALESCE(u.cv_updated_at, ea.updated_at, u.updated_at) AS cv_updated_at,
           COALESCE(r.name, 'author') as role_name
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    LEFT JOIN LATERAL (
      SELECT cv_file_url, cv_file_name, cv_file_size, cv_mime_type, updated_at
      FROM editorial_applications
      WHERE user_id = u.id OR LOWER(email::text) = LOWER(u.email::text)
      ORDER BY created_at DESC
      LIMIT 1
    ) ea ON true
    WHERE u.id = $1
  `

  let result = await pool.query(queryStr, [req.user.uid])
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
  let user = result.rows[0]

  let profileComplete = isUserProfileComplete(user)
  if (!profileComplete) {
    const synced = await syncUserProfileFromEditorialApplication(pool, user.id, user.email)
    if (synced) {
      result = await pool.query(queryStr, [req.user.uid])
      if (result.rows.length > 0) {
        user = result.rows[0]
        profileComplete = isUserProfileComplete(user)
      }
    }
  }

  if (user.display_name && user.display_name.includes('undefined')) {
    user.display_name = user.display_name.replace(/\bundefined\b/g, '').trim() || user.first_name || user.email?.split('@')[0]
  }
  res.json({ ...user, profile_complete: !!profileComplete })
})

router.post('/me/photo-signature', authenticate, async (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const randomSuffix = crypto.randomBytes(8).toString('hex')
    const folder = 'profile-photos'
    const publicId = `user_${req.user.uid}_${timestamp}_${randomSuffix}`

    const paramsToSign = {
      timestamp,
      folder,
      public_id: publicId,
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET)

    res.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      public_id: publicId,
    })
  } catch (err) {
    console.error('[USERS] Error generating photo signature:', err.message)
    res.status(500).json({ error: 'Failed to generate upload signature' })
  }
})

router.post('/me/cv-signature', authenticate, async (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const randomSuffix = crypto.randomBytes(8).toString('hex')
    const folder = 'editorial-board/cv'
    const publicId = `cv_user_${req.user.uid}_${timestamp}_${randomSuffix}`

    const paramsToSign = {
      timestamp,
      folder,
      public_id: publicId,
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET)

    res.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      public_id: publicId,
    })
  } catch (err) {
    console.error('[USERS] Error generating CV signature:', err.message)
    res.status(500).json({ error: 'Failed to generate CV upload signature' })
  }
})

router.get('/me/cv', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(u.cv_file_url, ea.cv_file_url) AS cv_file_url,
              COALESCE(u.cv_file_name, ea.cv_file_name, 'Academic_CV.pdf') AS cv_file_name
       FROM users u
       LEFT JOIN LATERAL (
         SELECT cv_file_url, cv_file_name
         FROM editorial_applications
         WHERE user_id = u.id OR LOWER(email::text) = LOWER(u.email::text)
         ORDER BY created_at DESC
         LIMIT 1
       ) ea ON true
       WHERE u.id = $1`,
      [req.user.uid]
    )
    const user = result.rows[0]
    if (!user || !user.cv_file_url) {
      return res.status(404).json({ error: 'No CV document found.' })
    }
    res.redirect(user.cv_file_url)
  } catch (err) {
    console.error('[USERS] Error fetching user CV:', err.message)
    res.status(500).json({ error: 'Failed to access CV document' })
  }
})

router.delete('/me/photo', authenticate, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET profile_image_url = NULL, updated_at = now() WHERE id = $1`,
      [req.user.uid]
    )

    await pool.query(
      `UPDATE editorial_members SET profile_image_url = NULL, updated_at = now() WHERE user_id = $1`,
      [req.user.uid]
    ).catch(() => {})

    res.json({ success: true, message: 'Profile photo removed' })
  } catch (err) {
    console.error('[USERS] Error removing profile photo:', err.message)
    res.status(500).json({ error: 'Failed to remove profile photo' })
  }
})

router.patch('/me/profile', authenticate, async (req, res) => {
  const {
    first_name, last_name, display_name, phone, institution,
    college, department, state, country, course, bio, orcid_id,
    profile_image_url,
    cv_file_url, cv_file_name, cv_file_public_id, cv_file_size, cv_mime_type,
  } = req.body

  const parsedCvSize = cv_file_size !== undefined && cv_file_size !== null ? parseInt(cv_file_size, 10) : null

  const result = await pool.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       display_name = COALESCE($3, display_name),
       phone = COALESCE($4, phone),
       institution = COALESCE($5, institution),
       college = COALESCE($6, college),
       department = COALESCE($7, department),
       state = COALESCE($8, state),
       country = COALESCE($9, country),
       course = COALESCE($10, course),
       bio = COALESCE($11, bio),
       orcid_id = COALESCE($12, orcid_id),
       profile_image_url = CASE
         WHEN $13::text = '__REMOVE__' THEN NULL
         WHEN $13::text IS NOT NULL THEN $13::text
         ELSE profile_image_url
       END,
       cv_file_url = CASE
         WHEN $14::text = '__REMOVE__' THEN NULL
         WHEN $14::text IS NOT NULL THEN $14::text
         ELSE cv_file_url
       END,
       cv_file_name = CASE
         WHEN $14::text = '__REMOVE__' THEN NULL
         WHEN $15::text IS NOT NULL THEN $15::character varying
         ELSE cv_file_name
       END,
       cv_file_public_id = CASE
         WHEN $14::text = '__REMOVE__' THEN NULL
         WHEN $16::text IS NOT NULL THEN $16::text
         ELSE cv_file_public_id
       END,
       cv_file_size = CASE
         WHEN $14::text = '__REMOVE__' THEN NULL
         WHEN $17::integer IS NOT NULL THEN $17::integer
         ELSE cv_file_size
       END,
       cv_mime_type = CASE
         WHEN $14::text = '__REMOVE__' THEN NULL
         WHEN $18::text IS NOT NULL THEN $18::character varying
         ELSE cv_mime_type
       END,
       cv_updated_at = CASE
         WHEN $14::text = '__REMOVE__' THEN NULL
         WHEN $14::text IS NOT NULL THEN now()
         ELSE cv_updated_at
       END,
       updated_at = now()
     WHERE id = $19
     RETURNING *`,
    [
      first_name ?? null,
      last_name ?? null,
      display_name ?? null,
      phone ?? null,
      institution ?? null,
      college ?? null,
      department ?? null,
      state ?? null,
      country ?? null,
      course ?? null,
      bio ?? null,
      orcid_id ?? null,
      profile_image_url ?? null,
      cv_file_url ?? null,
      cv_file_name ?? null,
      cv_file_public_id ?? null,
      parsedCvSize,
      cv_mime_type ?? null,
      req.user.uid,
    ]
  )

  if (profile_image_url) {
    const photoVal = profile_image_url === '__REMOVE__' ? null : profile_image_url
    await pool.query(
      `UPDATE editorial_members SET profile_image_url = $1, updated_at = now() WHERE user_id = $2`,
      [photoVal, req.user.uid]
    ).catch(() => {})
  }

  if (cv_file_url !== undefined) {
    const cvUrlVal = cv_file_url === '__REMOVE__' ? null : cv_file_url
    await pool.query(
      `UPDATE editorial_applications
       SET cv_file_url = $1::text,
           cv_file_name = COALESCE($2::character varying, cv_file_name),
           cv_file_public_id = COALESCE($3::text, cv_file_public_id),
           cv_file_size = COALESCE($4::integer, cv_file_size),
           cv_mime_type = COALESCE($5::character varying, cv_mime_type),
           updated_at = now()
       WHERE user_id = $6 OR LOWER(email::text) = (SELECT LOWER(email::text) FROM users WHERE id = $6)`,
      [
        cvUrlVal,
        cv_file_name ?? null,
        cv_file_public_id ?? null,
        parsedCvSize,
        cv_mime_type ?? null,
        req.user.uid,
      ]
    ).catch((err) => {
      console.warn('[USERS] Could not sync CV to editorial_applications:', err.message)
    })
  }

  res.json(result.rows[0])
})

export default router
