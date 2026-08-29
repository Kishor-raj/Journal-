import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import pool from '../../config/db.js'

const router = Router()

router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query
  const offset = (page - 1) * limit
  const conditions = []
  const params = []

  if (role) {
    params.push(role)
    conditions.push(`r.name = $${params.length}`)
  }
  if (status) {
    params.push(status)
    conditions.push(`u.account_status = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(u.email ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT count(*) FROM users u JOIN roles r ON r.id = u.role_id ${where}`,
    params
  )

  params.push(limit)
  params.push(offset)

  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.display_name,
            u.account_status, u.created_at, r.name as role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  res.json({
    users: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  })
})

router.get('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  const result = await pool.query(
    `SELECT u.*, r.name as role_name
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [req.params.id]
  )
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
  res.json(result.rows[0])
})

router.patch('/users/:id/role', authenticate, requireRole('admin'), async (req, res) => {
  const { role_name, reason } = req.body
  const userId = req.params.id

  if (userId === req.user.uid) {
    return res.status(400).json({ error: 'Cannot change your own role' })
  }

  const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role_name])
  if (roleResult.rows.length === 0) return res.status(400).json({ error: 'Invalid role' })

  const newRoleId = roleResult.rows[0].id
  const userResult = await pool.query('SELECT role_id FROM users WHERE id = $1', [userId])
  if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' })

  const oldRoleId = userResult.rows[0].role_id

  await pool.query('BEGIN')
  try {
    await pool.query(
      'INSERT INTO user_role_history (user_id, old_role_id, new_role_id, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
      [userId, oldRoleId, newRoleId, req.user.uid, reason]
    )
    await pool.query('UPDATE users SET role_id = $1, updated_at = now() WHERE id = $2', [newRoleId, userId])
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
      [userId, newRoleId]
    )

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, 'role_changed', 'users', $2, $3, $4, $5)`,
      [req.user.uid, userId, JSON.stringify({ role_id: oldRoleId }), JSON.stringify({ role_id: newRoleId, role_name }), req.ip]
    )

    await pool.query('COMMIT')
    res.json({ message: 'Role updated' })
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }
})

router.patch('/users/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  const { status, reason } = req.body
  const userId = req.params.id

  if (userId === req.user.uid) {
    return res.status(400).json({ error: 'Cannot change your own account status' })
  }

  const userResult = await pool.query('SELECT account_status FROM users WHERE id = $1', [userId])
  if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' })

  const oldStatus = userResult.rows[0].account_status

  await pool.query('BEGIN')
  try {
    await pool.query(
      'INSERT INTO user_status_history (user_id, old_status, new_status, changed_by, reason) VALUES ($1, $2, $3, $4, $5)',
      [userId, oldStatus, status, req.user.uid, reason]
    )
    await pool.query('UPDATE users SET account_status = $1, updated_at = now() WHERE id = $2', [status, userId])

    // Revoke active sessions on disable/lock
    if (status !== 'active') {
      await pool.query('UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId])
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, 'status_changed', 'users', $2, $3, $4, $5)`,
      [req.user.uid, userId, JSON.stringify({ account_status: oldStatus }), JSON.stringify({ account_status: status }), req.ip]
    )

    await pool.query('COMMIT')
    res.json({ message: 'Status updated' })
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }
})

router.get('/users/:id/activity', authenticate, requireRole('admin'), async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM user_activity WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.params.id]
  )
  res.json(result.rows)
})

router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res) => {
  const userId = req.params.id

  if (userId === req.user.uid) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }

  const userResult = await pool.query(
    'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1',
    [userId]
  )
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' })
  }

  const targetUser = userResult.rows[0]

  await pool.query('BEGIN')
  try {
    // Soft delete: anonymize PII, mark as deleted, revoke sessions
    await pool.query(
      `UPDATE users SET
        account_status = 'deleted',
        email = $1,
        first_name = '[Deleted]',
        last_name = '[User]',
        display_name = '[Deleted User]',
        updated_at = now()
       WHERE id = $2`,
      [`deleted_${userId}@removed.invalid`, userId]
    )

    // Revoke all active sessions
    await pool.query(
      'UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    )

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, 'user_deleted', 'users', $2, $3, $4, $5)`,
      [
        req.user.uid,
        userId,
        JSON.stringify({ email: targetUser.email, role: targetUser.role_name, status: targetUser.account_status }),
        JSON.stringify({ account_status: 'deleted' }),
        req.ip,
      ]
    )

    await pool.query('COMMIT')
    res.json({ message: 'User deleted successfully' })
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }
})

export default router
