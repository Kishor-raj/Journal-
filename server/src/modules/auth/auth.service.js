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

    // This journal's shared workflow accounts can enter every portal.
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles
       WHERE name IN ('admin', 'author', 'moderator', 'editor', 'reviewer')
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId]
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
  let result = await pool.query(
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
    // Ensure all standard roles exist for this user in user_roles
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles
       WHERE name IN ('admin', 'author', 'moderator', 'editor', 'reviewer')
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId]
    )
    result = await pool.query(
      `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.is_active = true
       ORDER BY CASE r.name
         WHEN 'admin' THEN 1 WHEN 'author' THEN 2 WHEN 'moderator' THEN 3
         WHEN 'editor' THEN 4 WHEN 'reviewer' THEN 5 ELSE 99 END`,
      [userId]
    )
  }

  const roleNames = result.rows.map((row) => row.name)
  return roleNames.length > 0 ? roleNames : ['admin', 'author', 'moderator', 'editor', 'reviewer']
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

  if (!session.assigned_roles || session.assigned_roles.length === 0) {
    session.assigned_roles = ['admin', 'author', 'moderator', 'editor', 'reviewer']
  }

  return session
}

export async function touchSession(sessionId) {
  await pool.query(
    'UPDATE user_sessions SET last_seen_at = now() WHERE id = $1',
    [sessionId]
  )
}
