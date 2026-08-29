import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import pool from '../../config/db.js'

const router = Router()

router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query(
    `SELECT u.*, r.name as role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.user.uid]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
  const user = result.rows[0]
  const profileComplete = user.institution && user.department && user.country
  res.json({ ...user, profile_complete: !!profileComplete })
})

router.patch('/me/profile', authenticate, async (req, res) => {
  const { first_name, last_name, display_name, phone, institution, department, country, bio, orcid_id } = req.body

  const result = await pool.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       display_name = COALESCE($3, display_name),
       phone = $4,
       institution = $5,
       department = $6,
       country = $7,
       bio = $8,
       orcid_id = $9,
       updated_at = now()
     WHERE id = $10
     RETURNING *`,
    [first_name, last_name, display_name, phone, institution, department, country, bio, orcid_id, req.user.uid]
  )

  res.json(result.rows[0])
})

export default router
