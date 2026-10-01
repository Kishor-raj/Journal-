import { OAuth2Client } from 'google-auth-library'
import crypto from 'crypto'
import pool from '../../config/db.js'
import { env } from '../../config/env.js'
import { hashPassword, verifyPassword } from './password.js'
import { hashToken, generateTokenWithExpiry, buildAppUrl } from '../../modules/email/email.utils.js'
import { sendEmailVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../../modules/email/email.templates.js'
import { logSecurityEvent } from '../../modules/security/security.service.js'

const callbackOrigin = process.env.AUTH_CALLBACK_ORIGIN || process.env.SERVER_ORIGIN || 'http://localhost:3001'
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${callbackOrigin}/api/auth/google/callback`
)

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function generateState() {
  return crypto.randomBytes(16).toString('hex')
}

export function getGoogleAuthUrl() {
  const state = generateState()
  const redirectOrigin = process.env.AUTH_CALLBACK_ORIGIN || process.env.SERVER_ORIGIN || 'http://localhost:3001'
  const redirectUri = `${redirectOrigin}/api/auth/google/callback`
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    redirect_uri: redirectUri,
  })
  return { url, state }
}

export async function exchangeCode(code) {
  const { tokens } = await googleClient.getToken(code)
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  return ticket.getPayload()
}

export function parseNameParts(fullName = '', academicTitle = '') {
  let clean = String(fullName || '').replace(/\bundefined\b/g, '').trim()
  if (!clean) return { firstName: null, lastName: null, displayName: null }

  const titlePrefixes = [
    'Prof. Dr.', 'Prof.', 'Dr.', 'Assoc. Prof.', 'Asst. Prof.', 'Mr.', 'Ms.', 'Mrs.'
  ]
  for (const prefix of titlePrefixes) {
    if (clean.toLowerCase().startsWith(prefix.toLowerCase())) {
      clean = clean.slice(prefix.length).trim()
      break
    }
  }

  const parts = clean.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || null
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : null
  const displayName = String(fullName).replace(/\bundefined\b/g, '').trim()
  return { firstName, lastName, displayName }
}

export async function syncUserProfileFromEditorialApplication(dbOrClient, userId, userEmail) {
  try {
    const normalizedEmail = normalizeEmail(userEmail)
    if (!normalizedEmail && !userId) return null

    let query
    let params
    if (userId && normalizedEmail) {
      query = `SELECT * FROM editorial_applications
               WHERE (user_id = $1 OR email = $2)
               ORDER BY created_at DESC LIMIT 1`
      params = [userId, normalizedEmail]
    } else if (userId) {
      query = `SELECT * FROM editorial_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`
      params = [userId]
    } else {
      query = `SELECT * FROM editorial_applications WHERE email = $1 ORDER BY created_at DESC LIMIT 1`
      params = [normalizedEmail]
    }

    const appResult = await dbOrClient.query(query, params)
    if (appResult.rows.length === 0) return null
    const app = appResult.rows[0]

    const targetUserId = userId || app.user_id
    if (!targetUserId) return app

    const nameParts = parseNameParts(app.full_name, app.academic_title)
    const inst = app.institution || app.university || 'Academic Institution'
    const dept = app.department || 'Academic Department'
    const ctry = app.country || 'International'
    const stateVal = app.country || 'N/A'
    const courseVal = app.specialization || app.highest_qualification || 'Editorial Member'
    const bioVal = app.statement_of_interest || [app.designation, app.department, app.institution].filter(Boolean).join(', ') || null

    await dbOrClient.query(
      `UPDATE users SET
         first_name = COALESCE(NULLIF(first_name, ''), $1),
         last_name = COALESCE(NULLIF(last_name, ''), $2),
         display_name = COALESCE(NULLIF(display_name, ''), $3),
         phone = COALESCE(NULLIF(phone, ''), $4),
         institution = COALESCE(NULLIF(institution, ''), $5),
         college = COALESCE(NULLIF(college, ''), $6),
         department = COALESCE(NULLIF(department, ''), $7),
         state = COALESCE(NULLIF(state, ''), $8),
         country = COALESCE(NULLIF(country, ''), $9),
         course = COALESCE(NULLIF(course, ''), $10),
         bio = COALESCE(NULLIF(bio, ''), $11),
         orcid_id = COALESCE(NULLIF(orcid_id, ''), $12),
         profile_image_url = COALESCE(NULLIF(profile_image_url, ''), $13),
         editor_id = COALESCE(editor_id, $14),
         updated_at = now()
       WHERE id = $15`,
      [
        nameParts.firstName,
        nameParts.lastName,
        app.full_name || nameParts.displayName,
        app.phone,
        inst,
        inst,
        dept,
        stateVal,
        ctry,
        courseVal,
        bioVal,
        app.orcid_id,
        app.profile_image_url,
        app.editor_id || null,
        targetUserId,
      ]
    )

    if (!app.user_id) {
      await dbOrClient.query(
        `UPDATE editorial_applications SET user_id = $1, updated_at = now() WHERE id = $2`,
        [targetUserId, app.id]
      )
    }

    return app
  } catch (err) {
    console.error('[AUTH] syncUserProfileFromEditorialApplication error:', err.message)
    return null
  }
}

export async function findOrCreateUser(payload) {
  const { sub, email, given_name, family_name, picture, email_verified, name } = payload

  const rawDisplayName = (name && typeof name === 'string' && !name.includes('undefined'))
    ? name.trim()
    : [given_name, family_name].filter((n) => n && n !== 'undefined').join(' ').trim()
  const displayName = rawDisplayName || (email ? email.split('@')[0] : 'User')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find default author role
    const authorRole = await client.query(
      "SELECT id FROM roles WHERE name = 'author'"
    )
    const authorRoleId = authorRole.rows[0]?.id || null

    // Check existing identity
    const identityResult = await client.query(
      'SELECT * FROM user_identities WHERE provider = $1 AND provider_subject = $2',
      ['google', sub]
    )

    let userId
    if (identityResult.rows.length > 0) {
      // Existing user - update tokens and user info if needed
      const identity = identityResult.rows[0]
      userId = identity.user_id

      await client.query(
        `UPDATE users
         SET display_name = CASE
               WHEN display_name LIKE '%undefined%' OR display_name IS NULL OR display_name = '' THEN $1
               ELSE display_name
             END,
             first_name = COALESCE(first_name, $2),
             last_name = COALESCE(last_name, $3),
             profile_image_url = COALESCE($4, profile_image_url),
             role_id = COALESCE(role_id, $5),
             updated_at = now()
         WHERE id = $6`,
        [displayName, given_name || null, family_name || null, picture || null, authorRoleId, userId]
      )

      await client.query(
        'UPDATE user_identities SET provider_name = $1, updated_at = now() WHERE id = $2',
        [displayName, identity.id]
      )
    } else {
      // Check if user exists by email
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id
        await client.query(
          `UPDATE users
           SET display_name = CASE
                 WHEN display_name LIKE '%undefined%' OR display_name IS NULL OR display_name = '' THEN $1
                 ELSE display_name
               END,
               first_name = COALESCE(first_name, $2),
               last_name = COALESCE(last_name, $3),
               profile_image_url = COALESCE($4, profile_image_url),
               role_id = COALESCE(role_id, $5),
               updated_at = now()
           WHERE id = $6`,
          [displayName, given_name || null, family_name || null, picture || null, authorRoleId, userId]
        )
      } else {
        // New user - default to author role
        const newUser = await client.query(
          `INSERT INTO users (role_id, email, first_name, last_name, display_name, profile_image_url, is_email_verified, account_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id`,
          [authorRoleId, email, given_name || null, family_name || null, displayName, picture || null, email_verified]
        )
        userId = newUser.rows[0].id
      }

      // Create identity
      await client.query(
        `INSERT INTO user_identities (user_id, provider, provider_subject, provider_email, provider_name)
         VALUES ($1, 'google', $2, $3, $4)`,
        [userId, sub, email, displayName]
      )
    }

    // New Google user receives only the assigned canonical role
    const userRoleRes = await client.query('SELECT role_id FROM users WHERE id = $1', [userId])
    const assignedRoleId = userRoleRes.rows[0]?.role_id || authorRoleId
    if (assignedRoleId) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, assignedRoleId]
      )
    }

    await syncUserProfileFromEditorialApplication(client, userId, email)

    if (email_verified && email) {
      await processPendingRoleGrants(client, userId, email)
    }

    await client.query('COMMIT')

    return userId
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function createSession(userId, ip, userAgent) {
  const token = generateToken()
  const tokenHash = sha256(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  let userResult = await pool.query(
    'SELECT role_id FROM users WHERE id = $1',
    [userId]
  )
  let defaultRoleId = userResult.rows[0]?.role_id || null

  if (!defaultRoleId) {
    const authorRole = await pool.query("SELECT id FROM roles WHERE name = 'author'")
    defaultRoleId = authorRole.rows[0]?.id || null
    if (defaultRoleId) {
      await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [defaultRoleId, userId])
    }
  }

  await pool.query(
    `INSERT INTO user_sessions (user_id, session_token_hash, ip_address, user_agent, expires_at, role_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, tokenHash, ip, userAgent, expiresAt, defaultRoleId]
  )

  return { token, expiresAt }
}

export async function getAssignedRoles(userId) {
  const result = await pool.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND r.is_active = true
     ORDER BY CASE r.name
       WHEN 'admin' THEN 1 WHEN 'author' THEN 2 WHEN 'moderator' THEN 3
       WHEN 'editor' THEN 4 WHEN 'reviewer' THEN 5 ELSE 99 END`,
    [userId]
  )

  if (result.rows.length === 0) {
    const userRole = await pool.query(
      `SELECT r.name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND r.is_active = true`,
      [userId]
    )
    if (userRole.rows.length > 0) {
      return [userRole.rows[0].name]
    }
    return []
  }

  return result.rows.map((row) => row.name)
}

export async function destroySession(tokenHash) {
  await pool.query(
    'UPDATE user_sessions SET revoked_at = now() WHERE session_token_hash = $1',
    [tokenHash]
  )
}

export async function findSession(tokenHash) {
  const result = await pool.query(
    `SELECT s.*, u.id as uid, u.email, u.first_name, u.last_name, u.display_name,
            u.role_id, u.editor_id, u.account_status, u.profile_image_url,
            u.institution, u.college, u.department, u.state, u.country, u.course,
            COALESCE(r.name, ur.name, 'author') AS role_name,
            ur.name AS account_role_name,
            COALESCE((
              SELECT array_agg(assigned_role.name ORDER BY CASE assigned_role.name
                WHEN 'admin' THEN 1 WHEN 'author' THEN 2 WHEN 'moderator' THEN 3
                WHEN 'editor' THEN 4 WHEN 'reviewer' THEN 5 ELSE 99 END)
              FROM user_roles assigned
              JOIN roles assigned_role ON assigned_role.id = assigned.role_id
              WHERE assigned.user_id = u.id AND assigned_role.is_active = true
            ), ARRAY[]::varchar[]) AS assigned_roles
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN roles r ON r.id = s.role_id
     LEFT JOIN roles ur ON ur.id = u.role_id
     WHERE s.session_token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [tokenHash]
  )

  const session = result.rows[0]
  if (!session) return null

  if (session.display_name && session.display_name.includes('undefined')) {
    session.display_name = session.display_name.replace(/\bundefined\b/g, '').trim() ||
      session.first_name ||
      session.email?.split('@')[0]
  }

  return session
}

export async function touchSession(sessionId) {
  await pool.query(
    'UPDATE user_sessions SET last_seen_at = now() WHERE id = $1',
    [sessionId]
  )
}

const PASSWORD_MIN_LENGTH = 8

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export class AuthError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true
  }
}

export async function registerUser({ email, password, first_name, last_name }) {
  const normalizedEmail = normalizeEmail(email)
  const trimmedFirstName = (first_name || '').trim()
  const trimmedLastName = (last_name || '').trim()

  if (!normalizedEmail) throw new AuthError('Email is required', 'VALIDATION_ERROR')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AuthError('Invalid email format', 'VALIDATION_ERROR')
  }
  if (!password || String(password).trim() === '') {
    throw new AuthError('Password is required', 'VALIDATION_ERROR')
  }
  if (String(password).length < PASSWORD_MIN_LENGTH) {
    throw new AuthError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 'VALIDATION_ERROR')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query(
      'SELECT id, is_email_verified FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      const credential = await client.query(
        'SELECT password_hash FROM user_password_credentials WHERE user_id = $1',
        [user.id]
      )
      await client.query('ROLLBACK')
      return { duplicate: true, user: { id: user.id, is_email_verified: user.is_email_verified, hasPassword: credential.rows.length > 0 } }
    }

    const authorRole = await client.query("SELECT id FROM roles WHERE name = 'author'")
    const authorRoleId = authorRole.rows[0]?.id || null

    // Check if there's an existing editorial application for this email
    const appRes = await client.query(
      `SELECT * FROM editorial_applications WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail]
    )
    const app = appRes.rows[0]

    let firstNameValue = trimmedFirstName || null
    let lastNameValue = trimmedLastName || null
    let displayName = [firstNameValue, lastNameValue].filter(Boolean).join(' ').trim() || null
    let phoneVal = null
    let instVal = null
    let collegeVal = null
    let deptVal = null
    let stateVal = null
    let countryVal = null
    let courseVal = null
    let bioVal = null
    let orcidVal = null
    let profileImageUrlVal = null

    if (app) {
      const nameParts = parseNameParts(app.full_name, app.academic_title)
      firstNameValue = firstNameValue || nameParts.firstName
      lastNameValue = lastNameValue || nameParts.lastName
      displayName = displayName || app.full_name || nameParts.displayName || normalizedEmail.split('@')[0]
      phoneVal = app.phone || null
      instVal = app.institution || app.university || null
      collegeVal = app.institution || app.university || null
      deptVal = app.department || null
      stateVal = app.country || 'N/A'
      countryVal = app.country || null
      courseVal = app.specialization || app.highest_qualification || 'Editorial Member'
      bioVal = app.statement_of_interest || [app.designation, app.department, app.institution].filter(Boolean).join(', ') || null
      orcidVal = app.orcid_id || null
      profileImageUrlVal = app.profile_image_url || null
    } else {
      displayName = displayName || normalizedEmail.split('@')[0]
    }

    const newUser = await client.query(
      `INSERT INTO users (
         role_id, email, first_name, last_name, display_name,
         phone, institution, college, department, state, country, course,
         bio, orcid_id, profile_image_url,
         is_email_verified, account_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false, 'active')
       RETURNING id`,
      [
        authorRoleId, normalizedEmail, firstNameValue, lastNameValue, displayName,
        phoneVal, instVal, collegeVal, deptVal, stateVal, countryVal, courseVal,
        bioVal, orcidVal, profileImageUrlVal
      ]
    )

    const userId = newUser.rows[0].id

    if (app && !app.user_id) {
      await client.query(
        `UPDATE editorial_applications SET user_id = $1, updated_at = now() WHERE id = $2`,
        [userId, app.id]
      )
    }

    const passwordHash = await hashPassword(String(password))
    await client.query(
      `INSERT INTO user_password_credentials (user_id, password_hash)
       VALUES ($1, $2)`,
      [userId, passwordHash]
    )

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, authorRoleId]
    )

    const { token, expiresAt } = generateTokenWithExpiry('short', env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES)
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, hashToken(token), expiresAt]
    )

    await client.query('COMMIT')

    const emailResult = await sendEmailVerificationEmail({
      to: normalizedEmail,
      firstName: firstNameValue || displayName,
      token,
      expiresAt,
    })

    return { id: userId, email: normalizedEmail, verificationEmail: emailResult }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function loginWithPassword({ email, password, ip, userAgent }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) throw new AuthError('Email is required', 'VALIDATION_ERROR')
  if (!password || String(password).trim() === '') {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  const userResult = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [normalizedEmail]
  )
  const user = userResult.rows[0]
  if (!user) {
    await logSecurityEvent({ eventType: 'login_failed', severity: 'warning', ip, userAgent, details: { reason: 'invalid_credentials' } })
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  if (user.account_status === 'locked') {
    await logSecurityEvent({ eventType: 'login_blocked_locked', severity: 'warning', userId: user.id, ip, userAgent })
    throw new AuthError('Account is locked', 'ACCOUNT_LOCKED', 403)
  }

  if (user.account_status === 'disabled') {
    await logSecurityEvent({ eventType: 'login_blocked_disabled', severity: 'warning', userId: user.id, ip, userAgent })
    throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED', 403)
  }

  const credentialResult = await pool.query(
    'SELECT * FROM user_password_credentials WHERE user_id = $1',
    [user.id]
  )
  const credential = credentialResult.rows[0]
  if (!credential) {
    await logSecurityEvent({ eventType: 'login_failed', severity: 'warning', userId: user.id, ip, userAgent, details: { reason: 'no_password' } })
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  if (credential.locked_until && new Date(credential.locked_until) > new Date()) {
    await logSecurityEvent({ eventType: 'login_blocked_locked', severity: 'warning', userId: user.id, ip, userAgent })
    throw new AuthError('Account is locked', 'ACCOUNT_LOCKED', 403)
  }

  const valid = await verifyPassword(String(password), credential.password_hash)
  if (!valid) {
    await logSecurityEvent({ eventType: 'login_failed', severity: 'warning', userId: user.id, ip, userAgent, details: { reason: 'wrong_password' } })
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401)
  }

  if (credential.failed_login_attempts > 0) {
    await pool.query(
      `UPDATE user_password_credentials SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1`,
      [user.id]
    )
  }

  if (!user.is_email_verified) {
    await logSecurityEvent({ eventType: 'login_unverified_email', severity: 'info', userId: user.id, ip, userAgent })
    throw new AuthError('Email not verified', 'EMAIL_NOT_VERIFIED', 403)
  }

  await syncUserProfileFromEditorialApplication(pool, user.id, user.email)

  const session = await createSession(user.id, ip, userAgent)
  await logSecurityEvent({ eventType: 'login_success', severity: 'info', userId: user.id, ip, userAgent })

  return { session, user: { id: user.id, email: user.email } }
}

export async function verifyEmailToken(rawToken, ip, userAgent) {
  if (!rawToken) throw new AuthError('Verification token is required', 'VERIFICATION_INVALID', 400)

  const tokenHash = hashToken(String(rawToken))
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const tokenResult = await client.query(
      'SELECT * FROM email_verification_tokens WHERE token_hash = $1',
      [tokenHash]
    )
    const token = tokenResult.rows[0]
    if (!token) {
      await client.query('ROLLBACK')
      await logSecurityEvent({ eventType: 'verification_failed', severity: 'warning', ip, userAgent, details: { reason: 'invalid_token' } })
      throw new AuthError('This verification link is no longer valid', 'VERIFICATION_INVALID', 400)
    }

    if (token.used_at) {
      await client.query('ROLLBACK')
      await logSecurityEvent({ eventType: 'verification_used', severity: 'warning', userId: token.user_id, ip, userAgent })
      throw new AuthError('This verification link is no longer valid', 'VERIFICATION_INVALID', 400)
    }

    if (new Date(token.expires_at) < new Date()) {
      await client.query('ROLLBACK')
      await logSecurityEvent({ eventType: 'verification_expired', severity: 'warning', userId: token.user_id, ip, userAgent })
      throw new AuthError('Verification link expired', 'VERIFICATION_EXPIRED', 400)
    }

    await client.query(
      'UPDATE email_verification_tokens SET used_at = now() WHERE id = $1',
      [token.id]
    )

    await client.query(
      'UPDATE users SET is_email_verified = true, updated_at = now() WHERE id = $1',
      [token.user_id]
    )

    const userRes = await client.query('SELECT id, email FROM users WHERE id = $1', [token.user_id])
    if (userRes.rows.length > 0) {
      await syncUserProfileFromEditorialApplication(client, userRes.rows[0].id, userRes.rows[0].email)
      await processPendingRoleGrants(client, userRes.rows[0].id, userRes.rows[0].email, ip, userAgent)
    }

    await client.query('COMMIT')
    await logSecurityEvent({ eventType: 'verification_success', severity: 'info', userId: token.user_id, ip, userAgent })
    return { success: true }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function resendEmailVerification({ email, ip, userAgent }) {
  const normalizedEmail = normalizeEmail(email)

  const userResult = await pool.query(
    'SELECT id, email, first_name, is_email_verified FROM users WHERE email = $1',
    [normalizedEmail]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].is_email_verified) {
    return { sent: true }
  }

  const user = userResult.rows[0]

  await pool.query(
    'DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL',
    [user.id]
  )

  const { token, expiresAt } = generateTokenWithExpiry('short', env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES)
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, hashToken(token), expiresAt]
  )

  await sendEmailVerificationEmail({
    to: user.email,
    firstName: user.first_name || user.email.split('@')[0],
    token,
    expiresAt,
  })

  await logSecurityEvent({ eventType: 'verification_resend', severity: 'info', userId: user.id, ip, userAgent })
  return { sent: true }
}

export async function requestPasswordReset({ email, ip, userAgent }) {
  const normalizedEmail = normalizeEmail(email)

  const userResult = await pool.query(
    'SELECT id, email, first_name, account_status, is_email_verified FROM users WHERE email = $1',
    [normalizedEmail]
  )

  const user = userResult.rows[0]
  if (!user) {
    return { sent: true }
  }

  await pool.query(
    `DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
    [user.id]
  )

  const { token, expiresAt } = generateTokenWithExpiry('default', env.PASSWORD_RESET_TOKEN_TTL_MINUTES)
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, hashToken(token), expiresAt, ip || null, userAgent || null]
  )

  const resetUrl = buildAppUrl('/reset-password', { token })
  try {
    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name || user.email.split('@')[0],
      resetUrl,
      expiresAt,
    })
  } catch (emailErr) {
    console.error('Failed to send password reset email:', emailErr)
  }

  await logSecurityEvent({
    eventType: 'password_reset_requested',
    severity: 'info',
    userId: user.id,
    ip,
    userAgent,
  })

  return { sent: true }
}

export async function validateResetToken(rawToken) {
  if (!rawToken) throw new AuthError('Reset token is required', 'VALIDATION_ERROR', 400)

  const tokenHash = hashToken(String(rawToken))
  const result = await pool.query(
    `SELECT expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
    [tokenHash]
  )
  const token = result.rows[0]

  if (!token || token.used_at || new Date(token.expires_at) < new Date()) {
    return { valid: false }
  }

  return { valid: true, expires_at: token.expires_at }
}

export async function resetPassword({ token, password, ip, userAgent }) {
  if (!token) throw new AuthError('Reset token is required', 'VALIDATION_ERROR', 400)
  if (!password || String(password).trim() === '') {
    throw new AuthError('New password is required', 'VALIDATION_ERROR', 400)
  }
  if (String(password).length < PASSWORD_MIN_LENGTH) {
    throw new AuthError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 'VALIDATION_ERROR', 400)
  }

  const tokenHash = hashToken(String(token))
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const tokenResult = await client.query(
      `SELECT * FROM password_reset_tokens WHERE token_hash = $1 FOR UPDATE`,
      [tokenHash]
    )
    const resetToken = tokenResult.rows[0]
    if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at) < new Date()) {
      await client.query('ROLLBACK')
      await logSecurityEvent({ eventType: 'password_reset_failed', severity: 'warning', ip, userAgent, details: { reason: 'invalid_token' } })
      throw new AuthError('This password reset link is invalid or has expired', 'RESET_TOKEN_INVALID', 400)
    }

    const userResult = await client.query(
      'SELECT id, email, first_name, account_status FROM users WHERE id = $1',
      [resetToken.user_id]
    )
    const user = userResult.rows[0]
    if (!user) {
      await client.query('ROLLBACK')
      throw new AuthError('This password reset link is invalid or has expired', 'RESET_TOKEN_INVALID', 400)
    }

    if (user.account_status === 'disabled' || user.account_status === 'locked') {
      await client.query('ROLLBACK')
      await logSecurityEvent({ eventType: 'password_reset_failed', severity: 'warning', userId: user.id, ip, userAgent, details: { reason: 'account_not_active' } })
      throw new AuthError('This account cannot reset its password', 'ACCOUNT_NOT_ACTIVE', 403)
    }

    const passwordHash = await hashPassword(String(password))
    await client.query(
      `INSERT INTO user_password_credentials (user_id, password_hash, password_changed_at, failed_login_attempts, locked_until)
       VALUES ($1, $2, now(), 0, NULL)
       ON CONFLICT (user_id) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           password_changed_at = now(),
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = now()`,
      [user.id, passwordHash]
    )

    await client.query(
      'UPDATE password_reset_tokens SET used_at = now() WHERE id = $1',
      [resetToken.id]
    )

    await client.query(
      `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [user.id]
    )

    await client.query('COMMIT')

    try {
      await sendPasswordChangedEmail({
        to: user.email,
        firstName: user.first_name || user.email.split('@')[0],
      })
    } catch (emailErr) {
      console.error('Failed to send password changed email:', emailErr)
    }

    await logSecurityEvent({
      eventType: 'password_reset_completed',
      severity: 'info',
      userId: user.id,
      ip,
      userAgent,
    })

    return { success: true }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function processPendingRoleGrants(client, userId, userEmail, ip, userAgent) {
  try {
    const normalized = normalizeEmail(userEmail)
    await syncUserProfileFromEditorialApplication(client, userId, normalized)

    const grantRes = await client.query(
      `SELECT * FROM editorial_role_grants
       WHERE email = $1 AND status = 'PENDING' AND token_expires_at > now()
       ORDER BY granted_at DESC LIMIT 1`,
      [normalized]
    )

    if (grantRes.rows.length === 0) return false

    const grant = grantRes.rows[0]
    const editorRoleRes = await client.query("SELECT id FROM roles WHERE name = 'editor'")
    const editorRoleId = editorRoleRes.rows[0]?.id

    if (editorRoleId) {
      await client.query(
        `UPDATE users SET role_id = $1, updated_at = now() WHERE id = $2`,
        [editorRoleId, userId]
      )
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, editorRoleId]
      )
    }

    await client.query(
      `UPDATE editorial_role_grants
       SET status = 'USED', used_at = now(), created_user_id = $1, updated_at = now()
       WHERE id = $2`,
      [userId, grant.id]
    )

    // Update editorial_applications, appointments, members
    const appRes = await client.query('SELECT * FROM editorial_applications WHERE id = $1', [grant.application_id])
    if (appRes.rows.length > 0) {
      const app = appRes.rows[0]
      if (app.profile_image_url) {
        await client.query(
          `UPDATE users SET profile_image_url = COALESCE(profile_image_url, $1) WHERE id = $2`,
          [app.profile_image_url, userId]
        )
      }
      await client.query(
        `UPDATE editorial_applications SET user_id = $1, status = 'ACTIVE_MEMBER', updated_at = now() WHERE id = $2`,
        [userId, app.id]
      )
      await client.query(
        `UPDATE editorial_appointments SET user_id = $1, updated_at = now() WHERE application_id = $2 AND user_id IS NULL`,
        [userId, app.id]
      )
      await client.query(
        `UPDATE editorial_members SET user_id = $1, updated_at = now() WHERE application_id = $2 AND user_id IS NULL`,
        [userId, app.id]
      )
    }

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'editorial_role_grant_consumed', 'editorial_role_grants', $2, $3, $4, $5)`,
      [
        userId,
        grant.id,
        JSON.stringify({ application_id: grant.application_id, user_id: userId }),
        ip || null,
        userAgent || null,
      ]
    )

    return true
  } catch (err) {
    console.error('[AUTH] Failed to process pending role grant:', err.message)
    return false
  }
}

export async function validateInvitationToken(rawToken) {
  if (!rawToken || !String(rawToken).trim()) {
    return { valid: false, message: 'Invitation token is required.' }
  }

  const tokenHash = hashToken(String(rawToken).trim())
  const result = await pool.query(
    `SELECT rg.*, ea.full_name, ea.preferred_role, ea.preferred_editorial_section
     FROM editorial_role_grants rg
     LEFT JOIN editorial_applications ea ON ea.id = rg.application_id
     WHERE rg.invitation_token_hash = $1`,
    [tokenHash]
  )

  const grant = result.rows[0]
  if (!grant) {
    return { valid: false, message: 'Invalid invitation link.' }
  }

  if (grant.status === 'USED') {
    return { valid: false, message: 'This invitation link has already been used. Please log in with your account credentials.' }
  }

  if (grant.status === 'REVOKED') {
    return { valid: false, message: 'This invitation has been revoked.' }
  }

  if (new Date(grant.token_expires_at) < new Date()) {
    return { valid: false, message: 'This invitation link has expired. Please contact the editorial office for a new invitation.' }
  }

  return {
    valid: true,
    email: grant.email,
    role: grant.role,
    name: grant.full_name,
    preferred_role: grant.preferred_role,
    section: grant.preferred_editorial_section,
    expires_at: grant.token_expires_at,
  }
}

