import { env } from '../../../config/env.js'

const DEFAULT_TIMEOUT_MS = 30_000

function getApiKey() {
  const key = env.HOSTINGER_MAIL_API_KEY
  if (!key) throw new Error('HOSTINGER_MAIL_API_KEY is not configured')
  return key
}

function getBaseUrl() {
  let url = (env.HOSTINGER_API_BASE_URL || 'https://api.mail.hostinger.com').replace(/\/+$/, '')
  if (url.includes('email.hostinger.com')) {
    url = url.replace('email.hostinger.com', 'api.mail.hostinger.com')
  }
  return url.replace(/\/api\/v1\/?$/, '')
}

let cachedMailboxMap = null
let cacheExpiresAt = 0

export async function resolveMailboxResourceId(mailbox) {
  if (mailbox && /^AC[A-Za-z0-9]+$/i.test(mailbox)) {
    return mailbox
  }

  const now = Date.now()
  if (cachedMailboxMap && now < cacheExpiresAt) {
    if (mailbox) {
      const id = cachedMailboxMap.get(mailbox.toLowerCase())
      if (id) return id
    }
    if (cachedMailboxMap.size > 0) {
      return cachedMailboxMap.values().next().value
    }
  }

  try {
    const account = await hostingerRequest('GET', '/api/v1/me')
    const mailboxes = account?.data?.mailboxes || []
    const map = new Map()
    for (const m of mailboxes) {
      if (m.address && m.resourceId) {
        map.set(m.address.toLowerCase(), m.resourceId)
      }
    }
    cachedMailboxMap = map
    cacheExpiresAt = now + 10 * 60 * 1000

    if (mailbox) {
      const id = map.get(mailbox.toLowerCase())
      if (id) return id
    }
    if (env.HOSTINGER_MAILBOX) {
      const envId = map.get(env.HOSTINGER_MAILBOX.toLowerCase())
      if (envId) return envId
    }
    if (mailboxes.length > 0 && mailboxes[0].resourceId) {
      return mailboxes[0].resourceId
    }
  } catch (err) {
    console.warn(`[HOSTINGER] Failed to resolve mailbox resourceId via /api/v1/me: ${err.message}`)
  }

  return mailbox || env.HOSTINGER_MAILBOX
}

export async function hostingerRequest(method, path, { body, query, timeout } = {}) {
  const baseUrl = getBaseUrl()
  const apiKey = getApiKey()

  const normalizedPath = path.startsWith('/api/v1')
    ? path
    : `/api/v1${path.startsWith('/') ? '' : '/'}${path}`

  const url = new URL(`${baseUrl}${normalizedPath}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null) url.searchParams.set(key, String(value))
    }
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout || DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (response.status === 204) {
      return { success: true }
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (!response.ok) {
      const error = new Error(`Hostinger API ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`)
      error.statusCode = response.status
      error.providerResponse = data
      throw error
    }

    return data
  } finally {
    clearTimeout(timer)
  }
}

export function isConfigured() {
  return Boolean(env.HOSTINGER_MAIL_API_KEY && env.HOSTINGER_MAILBOX)
}
