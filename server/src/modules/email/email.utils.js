import crypto from 'node:crypto'
import { env } from '../../config/env.js'

const ESCAPE_HTML = /[&<>"']/g
const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value) {
  return String(value ?? '').replace(ESCAPE_HTML, (ch) => ESCAPE_MAP[ch])
}

export function stringifyValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function renderTemplate(body, variables = {}, options = {}) {
  const { escape = true } = options
  const source = body || ''
  let result = source
  const safeVars = variables && typeof variables === 'object' ? variables : {}

  for (const [key, rawValue] of Object.entries(safeVars)) {
    const value = stringifyValue(rawValue)
    const safeValue = escape ? escapeHtml(value) : value
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    result = result.replace(re, safeValue)
  }

  result = result.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '')

  return result
}

export function buildAppUrl(pathname, query = {}) {
  const base = (env.PUBLIC_APP_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '')
  const cleanPath = String(pathname || '').startsWith('/') ? pathname : `/${pathname || ''}`
  const url = new URL(base + cleanPath)
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

const TOKEN_BYTES = {
  default: 32,
  short: 16,
  long: 48,
}

export function generateToken(size = 'default') {
  const bytes = TOKEN_BYTES[size] || TOKEN_BYTES.default
  return crypto.randomBytes(bytes).toString('base64url')
}

export function generateTokenWithExpiry(size = 'default', ttlMinutes) {
  const token = generateToken(size)
  const ttl = Number.isFinite(ttlMinutes) ? ttlMinutes : env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000)
  return { token, expiresAt }
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function createHashDigest(data) {
  if (data === null || data === undefined) return null
  return crypto.createHash('sha256').update(String(data)).digest('hex')
}
