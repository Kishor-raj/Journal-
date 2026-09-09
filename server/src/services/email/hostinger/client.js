import { env } from '../../../config/env.js'

const DEFAULT_TIMEOUT_MS = 30_000

function getApiKey() {
  const key = env.HOSTINGER_MAIL_API_KEY
  if (!key) throw new Error('HOSTINGER_MAIL_API_KEY is not configured')
  return key
}

function getBaseUrl() {
  return (env.HOSTINGER_API_BASE_URL || 'https://email.hostinger.com/api/v1').replace(/\/+$/, '')
}

export async function hostingerRequest(method, path, { body, query, timeout } = {}) {
  const baseUrl = getBaseUrl()
  const apiKey = getApiKey()

  const url = new URL(`${baseUrl}${path}`)
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
