import pool from '../../config/db.js'

export async function logSecurityEvent({ eventType, severity = 'info', userId = null, ip = null, userAgent = null, details = {} }) {
  try {
    await pool.query(
      `INSERT INTO security_logs (user_id, event_type, severity, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, severity, ip || null, userAgent || null, JSON.stringify(details)]
    )
  } catch (err) {
    console.error('Failed to write security log:', err)
  }
}
