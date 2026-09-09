import { describe, it, expect } from 'vitest'
import {
  sanitizeHtmlContent,
  sanitizePlainText,
  sanitizeSubject,
  validateWebhookPayload,
  validateEmailPayload,
  redactSecrets,
} from '../../../services/ai/security.js'

describe('sanitizeHtmlContent', () => {
  it('removes script tags', () => {
    expect(sanitizeHtmlContent('<p>Hello</p><script>alert(1)</script>')).toBe('<p>Hello</p>')
  })

  it('removes iframe tags', () => {
    expect(sanitizeHtmlContent('<p>Hi</p><iframe src="evil.com"></iframe>')).toBe('<p>Hi</p>')
  })

  it('removes event handlers', () => {
    expect(sanitizeHtmlContent('<img onerror="alert(1)" src="x">')).not.toContain('onerror')
  })

  it('removes javascript: protocol', () => {
    expect(sanitizeHtmlContent('<a href="javascript:alert(1)">click</a>')).not.toContain('javascript:')
  })

  it('removes data: text/html', () => {
    expect(sanitizeHtmlContent('data:text/html,<h1>Hacked</h1>')).not.toContain('text/html')
  })

  it('truncates long content', () => {
    const long = 'x'.repeat(60000)
    expect(sanitizeHtmlContent(long)).toHaveLength(50000)
  })

  it('handles null input', () => {
    expect(sanitizeHtmlContent(null)).toBe('')
  })

  it('handles non-string input', () => {
    expect(sanitizeHtmlContent(123)).toBe('')
  })

  it('preserves safe HTML', () => {
    const safe = '<p>Hello <strong>World</strong></p>'
    expect(sanitizeHtmlContent(safe)).toBe(safe)
  })
})

describe('sanitizePlainText', () => {
  it('removes control characters', () => {
    expect(sanitizePlainText('Hello\x00 World')).toBe('Hello World')
  })

  it('preserves normal text', () => {
    expect(sanitizePlainText('Hello World!')).toBe('Hello World!')
  })

  it('handles null', () => {
    expect(sanitizePlainText(null)).toBe('')
  })

  it('truncates long text', () => {
    expect(sanitizePlainText('x'.repeat(60000))).toHaveLength(50000)
  })
})

describe('sanitizeSubject', () => {
  it('removes newlines from subject', () => {
    expect(sanitizeSubject('Hello\nWorld')).toBe('Hello World')
  })

  it('trims whitespace', () => {
    expect(sanitizeSubject('  Hello  ')).toBe('Hello')
  })

  it('truncates long subject', () => {
    expect(sanitizeSubject('x'.repeat(2000))).toHaveLength(1000)
  })

  it('handles null', () => {
    expect(sanitizeSubject(null)).toBe('')
  })
})

describe('validateWebhookPayload', () => {
  it('accepts valid payload', () => {
    const result = validateWebhookPayload({ event_id: 'e1', event_type: 'message.received', data: {} })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects missing event_id', () => {
    const result = validateWebhookPayload({ event_type: 'message.received' })
    expect(result.valid).toBe(false)
  })

  it('rejects missing event_type', () => {
    const result = validateWebhookPayload({ event_id: 'e1' })
    expect(result.valid).toBe(false)
  })

  it('rejects invalid event_type', () => {
    const result = validateWebhookPayload({ event_id: 'e1', event_type: 'invalid_type' })
    expect(result.valid).toBe(false)
  })

  it('rejects null body', () => {
    const result = validateWebhookPayload(null)
    expect(result.valid).toBe(false)
  })
})

describe('validateEmailPayload', () => {
  it('accepts valid payload with message_id', () => {
    const result = validateEmailPayload({ message_id: 'm1', from: 'test@example.com' })
    expect(result.valid).toBe(true)
  })

  it('accepts valid payload with id', () => {
    const result = validateEmailPayload({ id: 'm1' })
    expect(result.valid).toBe(true)
  })

  it('rejects payload without message_id or id', () => {
    const result = validateEmailPayload({ from: 'test@example.com' })
    expect(result.valid).toBe(false)
  })

  it('rejects null data', () => {
    const result = validateEmailPayload(null)
    expect(result.valid).toBe(false)
  })
})

describe('redactSecrets', () => {
  it('redacts api_key', () => {
    const result = redactSecrets({ api_key: 'sk-1234567890' })
    expect(result.api_key).toContain('****')
    expect(result.api_key).not.toBe('sk-1234567890')
  })

  it('redacts authorization header', () => {
    const result = redactSecrets({ authorization: 'Bearer secret-token-value' })
    expect(result.authorization).toContain('****')
  })

  it('does not redact normal fields', () => {
    const result = redactSecrets({ name: 'John', count: 5 })
    expect(result.name).toBe('John')
    expect(result.count).toBe(5)
  })

  it('recursively redacts nested objects', () => {
    const result = redactSecrets({ config: { secret_key: 'abcdef12345678' } })
    expect(result.config.secret_key).toContain('****')
  })

  it('handles null input', () => {
    expect(redactSecrets(null)).toBeNull()
  })

  it('short secrets are fully masked', () => {
    const result = redactSecrets({ token: 'abc' })
    expect(result.token).toBe('****')
  })
})
