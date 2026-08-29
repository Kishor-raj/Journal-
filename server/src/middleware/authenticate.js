import crypto from 'crypto'
import { findSession, touchSession } from '../modules/auth/auth.service.js'

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

export async function authenticate(req, res, next) {
  const rawToken = req.cookies?.session_token
  if (!rawToken) return res.status(401).json({ error: 'Not authenticated' })

  const tokenHash = sha256(rawToken)
  const session = await findSession(tokenHash)

  if (!session) return res.status(401).json({ error: 'Session expired or invalid' })
  if (session.account_status !== 'active') return res.status(403).json({ error: 'Account not active' })

  req.user = session
  touchSession(session.id).catch(() => {})
  next()
}
