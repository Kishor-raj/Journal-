import pool from '../../config/db.js'

export async function isConflicted(userId, manuscriptId) {
  const result = await pool.query(
    'SELECT 1 FROM manuscript_authors WHERE manuscript_id = $1 AND user_id = $2 LIMIT 1',
    [manuscriptId, userId]
  )
  return result.rowCount > 0
}
