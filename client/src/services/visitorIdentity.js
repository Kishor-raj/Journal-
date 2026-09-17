const VISITOR_ID_KEY = 'anonymous_visitor_id'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidVisitorId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

function generateUuid() {
  const hasCrypto = typeof crypto !== 'undefined'
  if (hasCrypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (hasCrypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function getOrCreateVisitorId() {
  try {
    const stored = window.localStorage.getItem(VISITOR_ID_KEY)
    if (isValidVisitorId(stored)) return stored
  } catch {
    return null
  }

  try {
    const id = generateUuid()
    window.localStorage.setItem(VISITOR_ID_KEY, id)
    return id
  } catch {
    return null
  }
}

export function clearVisitorId() {
  try {
    window.localStorage.removeItem(VISITOR_ID_KEY)
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export default getOrCreateVisitorId