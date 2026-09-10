import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import pool from '../../config/db.js'

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
  const result = await pool.query(
    `SELECT u.*, COALESCE(r.name, 'author') as role_name
     FROM users u LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.user.uid]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
  const user = result.rows[0]
  if (user.display_name && user.display_name.includes('undefined')) {
    user.display_name = user.display_name.replace(/\bundefined\b/g, '').trim() || user.first_name || user.email?.split('@')[0]
  }
  const profileComplete = user.institution && user.college && user.department && user.state && user.country && user.course
  res.json({ ...user, profile_complete: !!profileComplete })
})

router.patch('/me/profile', authenticate, async (req, res) => {
  const { first_name, last_name, display_name, phone, institution, college, department, state, country, course, bio, orcid_id } = req.body

  const result = await pool.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       display_name = COALESCE($3, display_name),
       phone = $4,
       institution = $5,
       college = $6,
       department = $7,
       state = $8,
       country = $9,
       course = $10,
       bio = $11,
       orcid_id = $12,
       updated_at = now()
     WHERE id = $13
     RETURNING *`,
    [first_name, last_name, display_name, phone, institution, college, department, state, country, course, bio, orcid_id, req.user.uid]
  )

  res.json(result.rows[0])
})

export default router
