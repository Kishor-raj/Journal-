const EMAIL_BODY_MAX_LENGTH = 50_000
const SUBJECT_MAX_LENGTH = 1_000
const MAX_WEBHOOK_PAYLOAD_BYTES = 512_000

export function sanitizeHtmlContent(html) {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*\S+/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .slice(0, EMAIL_BODY_MAX_LENGTH)
}

export function sanitizePlainText(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, EMAIL_BODY_MAX_LENGTH)
}

export function sanitizeSubject(subject) {
  if (!subject || typeof subject !== 'string') return ''
  return subject
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r?\n/g, ' ')
    .trim()
    .slice(0, SUBJECT_MAX_LENGTH)
}

export function validateWebhookPayload(body) {
  const errors = []

  if (!body || typeof body !== 'object') {
    errors.push('Payload must be a JSON object')
    return { valid: false, errors }
  }

  if (!body.event_id || typeof body.event_id !== 'string') {
    errors.push('event_id is required and must be a string')
  }

  if (!body.event_type || typeof body.event_type !== 'string') {
    errors.push('event_type is required and must be a string')
  }

  const validEventTypes = ['message.received', 'message.sent', 'message.updated', 'message.deleted']
  if (body.event_type && !validEventTypes.includes(body.event_type)) {
    errors.push(`event_type must be one of: ${validEventTypes.join(', ')}`)
  }

  if (body.event_id && body.event_id.length > 255) {
    errors.push('event_id must be 255 characters or fewer')
  }

  return { valid: errors.length === 0, errors }
}

export function validateEmailPayload(data) {
  const errors = []

  if (!data) {
    errors.push('Email data is required')
    return { valid: false, errors }
  }

  const messageId = data.message_id || data.id
  if (!messageId) {
    errors.push('message_id is required')
  }

  if (data.from && typeof data.from !== 'string') {
    errors.push('from must be a string')
  }

  if (data.subject && typeof data.subject !== 'string') {
    errors.push('subject must be a string')
  }

  return { valid: errors.length === 0, errors }
}

export function redactSecrets(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const redacted = { ...obj }
  const secretKeys = ['api_key', 'apikey', 'api-key', 'secret', 'password', 'token', 'authorization']

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase()
    if (secretKeys.some((sk) => lowerKey.includes(sk))) {
      const val = String(redacted[key])
      redacted[key] = val.length > 8 ? val.slice(0, 4) + '****' + val.slice(-4) : '****'
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSecrets(redacted[key])
    }
  }
  return redacted
}

export function createWebhookPayloadGuard() {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > MAX_WEBHOOK_PAYLOAD_BYTES) {
      return res.status(413).json({ error: 'Payload too large' })
    }
    next()
  }
}
