import {
  getGoogleAuthUrl,
  exchangeCode,
  findOrCreateUser,
  createSession,
  destroySession,
  findSession,
  getAssignedRoles,
  selectRoleForSession,
  registerUser,
  loginWithPassword,
  verifyEmailToken,
  resendEmailVerification,
  requestPasswordReset,
  validateResetToken,
  resetPassword as resetUserPassword,
} from './auth.service.js'
import crypto from 'crypto'

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

function isHttpsOrigin(origin) {
  try {
    return new URL(origin).protocol === 'https:'
  } catch {
    return false
  }
}

function getSessionCookieOptions(expires) {
  const serverOrigin = process.env.SERVER_ORIGIN || 'http://localhost:3001'
  const secureCookie = process.env.NODE_ENV === 'production' || isHttpsOrigin(serverOrigin)
  const cookieOptions = {
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? 'none' : 'lax',
    partitioned: secureCookie,
    path: '/',
  }

  if (expires) {
    cookieOptions.expires = expires
  }

  return cookieOptions
}

export async function googleAuth(req, res) {
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  try {
    const { url } = getGoogleAuthUrl()
    res.redirect(url)
  } catch (err) {
    console.error('Google auth error:', err)
    res.redirect(`${clientOrigin}/login?error=auth_failed`)
  }
}

export async function googleCallback(req, res) {
  const { code, error } = req.query
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

  if (error) {
    console.error('Google OAuth error:', error)
    return res.redirect(`${clientOrigin}/login?error=oauth_rejected`)
  }

  if (!code) {
    return res.redirect(`${clientOrigin}/login?error=no_code`)
  }

  try {
    const payload = await exchangeCode(code)
    const userId = await findOrCreateUser(payload)
    const session = await createSession(userId, req.ip, req.get('user-agent'))

    const cookieOptions = getSessionCookieOptions(session.expiresAt)
    res.cookie('session_token', session.token, cookieOptions)

    res.redirect(`${clientOrigin}/auth/callback?token=${session.token}`)
  } catch (err) {
    console.error('Google callback error:', err)
    res.redirect(`${clientOrigin}/login?error=auth_failed`)
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

  const rawToken = req.token || req.cookies?.session_token
  if (!rawToken) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const tokenHash = sha256(rawToken)
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
  const rawToken = req.token || req.cookies?.session_token
  if (rawToken) {
    const tokenHash = sha256(rawToken)
    await destroySession(tokenHash)
  }
  res.clearCookie('session_token', getSessionCookieOptions())
  res.json({ message: 'Logged out' })
}

export async function getMe(req, res) {
  const user = req.user
  const profileComplete = user.institution && user.department && user.country

  let rawDisplayName = user.display_name
  if (rawDisplayName && rawDisplayName.includes('undefined')) {
    rawDisplayName = rawDisplayName.replace(/\bundefined\b/g, '').trim()
  }

  const cleanFirstName = (user.first_name && user.first_name !== 'undefined') ? user.first_name : null
  const cleanLastName = (user.last_name && user.last_name !== 'undefined') ? user.last_name : null
  const cleanName = rawDisplayName || [cleanFirstName, cleanLastName].filter(Boolean).join(' ') || (user.email ? user.email.split('@')[0] : 'User')

  const availableRoles = (user.assigned_roles && user.assigned_roles.length > 0)
    ? user.assigned_roles
    : (user.role_name ? [user.role_name] : ['admin', 'author', 'moderator', 'editor', 'reviewer'])

  res.json({
    id: user.uid,
    email: user.email,
    first_name: cleanFirstName,
    last_name: cleanLastName,
    display_name: cleanName,
    name: cleanName,
    role: user.role_name || availableRoles[0] || 'author',
    available_roles: availableRoles,
    account_status: user.account_status,
    profile_image_url: user.profile_image_url,
    profile_complete: !!profileComplete,
  })
}

export async function register(req, res) {
  const { email, password, first_name, last_name, role } = req.body || {}

  if (role) {
    return res.status(400).json({ error: 'Role cannot be set during registration', code: 'VALIDATION_ERROR' })
  }

  const result = await registerUser({
    email,
    password,
    first_name,
    last_name,
  })

  if (result.duplicate) {
    if (result.user.hasPassword && !result.user.is_email_verified) {
      return res.status(409).json({
        error: 'An account with this email already exists and is awaiting email verification',
        code: 'EMAIL_UNVERIFIED_EXISTS',
        resend: true,
      })
    }
    return res.status(409).json({
      error: 'An account with this email already exists',
      code: 'EMAIL_ALREADY_EXISTS',
    })
  }

  res.status(201).json({
    message: 'Registration successful. Check your email to verify your account.',
    code: 'REGISTRATION_SUCCESS',
    requiresVerification: true,
    id: result.id,
  })
}

export async function login(req, res) {
  const { email, password } = req.body || {}

  const { session, user } = await loginWithPassword({
    email,
    password,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  const cookieOptions = getSessionCookieOptions(session.expiresAt)
  res.cookie('session_token', session.token, cookieOptions)

  res.json({
    message: 'Login successful',
    token: session.token,
    user: { id: user.id, email: user.email },
  })
}

export async function verifyEmail(req, res) {
  const { token } = req.body || {}

  await verifyEmailToken(token, req.ip, req.get('user-agent'))

  res.json({ message: 'Email verified successfully', code: 'VERIFICATION_SUCCESS' })
}

export async function resendVerification(req, res) {
  const { email } = req.body || {}

  await resendEmailVerification({
    email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  res.json({
    message: 'If an account requires verification, a new verification email will be sent.',
  })
}

export async function forgotPassword(req, res) {
  const { email } = req.body || {}

  await requestPasswordReset({
    email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  res.json({
    message: 'If an account exists for this email, a password reset link has been sent.',
  })
}

export async function validateResetPasswordToken(req, res) {
  const { token } = req.query || {}

  const result = await validateResetToken(token)

  if (!result.valid) {
    return res.status(400).json({ valid: false, error: 'This password reset link is invalid or has expired' })
  }

  res.json({ valid: true, expires_at: result.expires_at })
}

export async function resetPassword(req, res) {
  const { token, password } = req.body || {}

  await resetUserPassword({
    token,
    password,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  res.json({ message: 'Password reset successfully.' })
}
