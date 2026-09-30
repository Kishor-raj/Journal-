import { Router } from 'express'
import crypto from 'crypto'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import pool from '../../config/db.js'
import cloudinary from '../../config/cloudinary.js'
import { syncUserProfileFromEditorialApplication } from '../auth/auth.service.js'

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
  let result = await pool.query(
    `SELECT u.*, COALESCE(r.name, 'author') as role_name
     FROM users u LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.user.uid]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
  let user = result.rows[0]

  let profileComplete = user.institution && user.college && user.department && user.state && user.country && user.course
  if (!profileComplete) {
    const synced = await syncUserProfileFromEditorialApplication(pool, user.id, user.email)
    if (synced) {
      result = await pool.query(
        `SELECT u.*, COALESCE(r.name, 'author') as role_name
         FROM users u LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = $1`,
        [req.user.uid]
      )
      if (result.rows.length > 0) {
        user = result.rows[0]
        profileComplete = user.institution && user.college && user.department && user.state && user.country && user.course
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
  } = req.body

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
         WHEN $13 = '__REMOVE__' THEN NULL
         WHEN $13 IS NOT NULL THEN $13
         ELSE profile_image_url
       END,
       updated_at = now()
     WHERE id = $14
     RETURNING *`,
    [
      first_name, last_name, display_name, phone, institution,
      college, department, state, country, course, bio, orcid_id,
      profile_image_url, req.user.uid,
    ]
  )

  if (profile_image_url) {
    const photoVal = profile_image_url === '__REMOVE__' ? null : profile_image_url
    await pool.query(
      `UPDATE editorial_members SET profile_image_url = $1, updated_at = now() WHERE user_id = $2`,
      [photoVal, req.user.uid]
    ).catch(() => {})
  }

  res.json(result.rows[0])
})

export default router
