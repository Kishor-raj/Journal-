import { OAuth2Client } from 'google-auth-library'
import crypto from 'crypto'
import { env } from '../../config/env.js'
import pool from '../../config/db.js'

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.AUTH_CALLBACK_ORIGIN || 'http://localhost:3001'}/api/auth/google/callback`
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
  const redirectUri = `${env.AUTH_CALLBACK_ORIGIN}/api/auth/google/callback`
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
    audience: env.GOOGLE_CLIENT_ID,
  })
  return ticket.getPayload()
}

export async function findOrCreateUser(payload) {
  const { sub, email, given_name, family_name, picture, email_verified } = payload

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check existing identity
    const identityResult = await client.query(
      'SELECT * FROM user_identities WHERE provider = $1 AND provider_subject = $2',
      ['google', sub]
    )

    if (identityResult.rows.length > 0) {
      // Existing user - update tokens if needed
      const identity = identityResult.rows[0]
      await client.query(
        'UPDATE user_identities SET updated_at = now() WHERE id = $1',
        [identity.id]
      )
      await client.query('COMMIT')
      return identity.user_id
    }

    // Check if user exists by email
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    let userId
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id
    } else {
      // New user - default to author role
      const authorRole = await client.query(
        "SELECT id FROM roles WHERE name = 'author'"
      )
      const roleId = authorRole.rows[0]?.id

      const newUser = await client.query(
        `INSERT INTO users (role_id, email, first_name, last_name, display_name, profile_image_url, is_email_verified, account_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         RETURNING id`,
        [roleId, email, given_name, family_name, `${given_name} ${family_name}`, picture, email_verified]
      )
      userId = newUser.rows[0].id

      // This journal's shared workflow accounts can enter every portal. The
      // users.role_id value remains the Author default for a new session.
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles
         WHERE name IN ('admin', 'author', 'moderator', 'editor', 'reviewer')
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId]
      )
    }

    // Create identity
    await client.query(
      `INSERT INTO user_identities (user_id, provider, provider_subject, provider_email, provider_name)
       VALUES ($1, 'google', $2, $3, $4)`,
      [userId, sub, email, `${given_name} ${family_name}`]
    )

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

  const userResult = await pool.query(
    'SELECT role_id FROM users WHERE id = $1',
    [userId]
  )
  const defaultRoleId = userResult.rows[0]?.role_id || null

  await pool.query(
    `INSERT INTO user_sessions (user_id, session_token_hash, ip_address, user_agent, expires_at, role_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, tokenHash, ip, userAgent, expiresAt, defaultRoleId]
  )

  return { token, expiresAt }
}

export async function selectRoleForSession(tokenHash, roleName) {
  const roleResult = await pool.query(
    'SELECT id FROM roles WHERE name = $1',
    [roleName]
  )

  if (roleResult.rows.length === 0) {
    return null
  }

  const roleId = roleResult.rows[0].id
  const result = await pool.query(
    `UPDATE user_sessions
     SET role_id = $1
     WHERE session_token_hash = $2 AND revoked_at IS NULL AND expires_at > now()
     RETURNING id`,
    [roleId, tokenHash]
  )

  if (result.rowCount === 0) {
    return null
  }

  return roleName
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
            u.role_id, u.account_status, u.profile_image_url,
            u.institution, u.department, u.country,
            COALESCE(r.name, ur.name) AS role_name,
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

  return result.rows[0] || null
}

export async function touchSession(sessionId) {
  await pool.query(
    'UPDATE user_sessions SET last_seen_at = now() WHERE id = $1',
    [sessionId]
  )
}
