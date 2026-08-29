import { env } from '../../config/env.js'
import {
  getGoogleAuthUrl,
  exchangeCode,
  findOrCreateUser,
  createSession,
  destroySession,
  findSession,
  getAssignedRoles,
  selectRoleForSession,
} from './auth.service.js'
import crypto from 'crypto'

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

export async function googleAuth(req, res) {
  try {
    const { url } = getGoogleAuthUrl()
    res.redirect(url)
  } catch (err) {
    console.error('Google auth error:', err)
    res.redirect(`${env.CLIENT_ORIGIN}/login?error=auth_failed`)
  }
}

export async function googleCallback(req, res) {
  const { code, error } = req.query

  if (error) {
    console.error('Google OAuth error:', error)
    return res.redirect(`${env.CLIENT_ORIGIN}/login?error=oauth_rejected`)
  }

  if (!code) {
    return res.redirect(`${env.CLIENT_ORIGIN}/login?error=no_code`)
  }

  try {
    const payload = await exchangeCode(code)
    const userId = await findOrCreateUser(payload)
    const session = await createSession(userId, req.ip, req.get('user-agent'))

    const isProduction = env.NODE_ENV === 'production'
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      // The Vercel frontend and Render API are different sites. Production
      // session cookies must therefore be explicitly allowed cross-site.
      sameSite: isProduction ? 'none' : 'lax',
      expires: session.expiresAt,
    }
    if (!isProduction) {
      cookieOptions.domain = 'localhost'
    }
    res.cookie('session_token', session.token, cookieOptions)

    res.redirect(`${env.CLIENT_ORIGIN}/auth/select-role`)
  } catch (err) {
    console.error('Google callback error:', err)
    res.redirect(`${env.CLIENT_ORIGIN}/login?error=auth_failed`)
  }
}

const VALID_ROLES = ['admin', 'author', 'editor', 'moderator', 'reviewer']

export async function selectRole(req, res) {
  const { role } = req.body

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const assignedRoles = await getAssignedRoles(req.user.uid)
  if (!assignedRoles.includes(role)) {
    return res.status(403).json({ error: 'You are not assigned to this role' })
  }

  const tokenHash = sha256(req.cookies.session_token)
  const updated = await selectRoleForSession(tokenHash, role)

  if (!updated) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const session = await findSession(tokenHash)
  res.json({
    message: 'Role selected',
    role: session?.role_name || role,
  })
}

export async function logout(req, res) {
  const tokenHash = sha256(req.cookies.session_token)
  await destroySession(tokenHash)
  const clearOptions = {}
  if (env.NODE_ENV !== 'production') {
    clearOptions.domain = 'localhost'
  }
  res.clearCookie('session_token', clearOptions)
  res.json({ message: 'Logged out' })
}

export async function getMe(req, res) {
  const user = req.user
  const profileComplete = user.institution && user.department && user.country

  res.json({
    id: user.uid,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    display_name: user.display_name,
    name: user.display_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
    role: user.role_name,
    available_roles: user.assigned_roles?.length ? user.assigned_roles : [user.role_name],
    account_status: user.account_status,
    profile_image_url: user.profile_image_url,
    profile_complete: !!profileComplete,
  })
}
