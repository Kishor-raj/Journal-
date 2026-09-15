import { describe, it, expect } from 'vitest'
import { validateContactInput } from './contact.service.js'

describe('validateContactInput', () => {
  it('accepts a valid request', () => {
    const result = validateContactInput({
      fullName: 'John Doe',
      email: 'john@example.com',
      institution: 'ABC University',
      country: 'India',
      subject: 'Question about manuscript submission',
      category: 'Manuscript Submission',
      message: 'I would like to know about the submission requirements.',
    })
    expect(result.valid).toBe(true)
    expect(result.data.fullName).toBe('John Doe')
    expect(result.data.email).toBe('john@example.com')
    expect(result.data.category).toBe('Manuscript Submission')
  })

  it('trims whitespace from string fields', () => {
    const result = validateContactInput({
      fullName: '  John Doe  ',
      email: '  JOHN@example.com  ',
      subject: '  Hello  ',
      category: 'Other',
      message: '  Test message  ',
    })
    expect(result.valid).toBe(true)
    expect(result.data.fullName).toBe('John Doe')
    expect(result.data.email).toBe('john@example.com')
    expect(result.data.subject).toBe('Hello')
    expect(result.data.message).toBe('Test message')
  })

  it('rejects a request with missing required fields', () => {
    const result = validateContactInput({
      fullName: '',
      email: '',
      subject: '',
      category: '',
      message: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(5)
    expect(result.errors.join(' ')).toContain('Full name is required.')
    expect(result.errors.join(' ')).toContain('Email is required.')
    expect(result.errors.join(' ')).toContain('Subject is required.')
    expect(result.errors.join(' ')).toContain('Category is required.')
    expect(result.errors.join(' ')).toContain('Message is required.')
  })

  it('rejects an invalid email format', () => {
    const result = validateContactInput({
      fullName: 'John',
      email: 'not-an-email',
      subject: 'Hello',
      category: 'Other',
      message: 'Test message',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('valid email address')
  })

  it('rejects an invalid category', () => {
    const result = validateContactInput({
      fullName: 'John',
      email: 'john@example.com',
      subject: 'Hello',
      category: 'Not A Real Category',
      message: 'Test message',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Invalid category selected')
  })

  it('rejects an oversized message', () => {
    const result = validateContactInput({
      fullName: 'John',
      email: 'john@example.com',
      subject: 'Hello',
      category: 'Other',
      message: 'x'.repeat(5001),
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Message must not exceed 5000 characters')
  })

  it('rejects an oversized full name', () => {
    const result = validateContactInput({
      fullName: 'x'.repeat(201),
      email: 'john@example.com',
      subject: 'Hello',
      category: 'Other',
      message: 'Test message',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Full name must not exceed 200 characters')
  })

  it('rejects an oversized optional field', () => {
    const result = validateContactInput({
      fullName: 'John',
      email: 'john@example.com',
      institution: 'x'.repeat(301),
      subject: 'Hello',
      category: 'Other',
      message: 'Test message',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Institution must not exceed 300 characters')
  })

  it('handles malformed payloads without crashing', () => {
    const result = validateContactInput(null)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('treats numeric/object values for required string fields as missing', () => {
    const result = validateContactInput({
      fullName: 123,
      email: { weird: true },
      subject: [],
      category: 'Other',
      message: 'Test message',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('Full name is required.')
    expect(result.errors.join(' ')).toContain('Email is required.')
    expect(result.errors.join(' ')).toContain('Subject is required.')
  })
})