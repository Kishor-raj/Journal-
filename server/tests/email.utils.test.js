import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderTemplate, escapeHtml, stringifyValue, buildAppUrl, hashToken, generateToken } from '../src/modules/email/email.utils.js'

describe('Email template utilities', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    })

    it('handles ampersands and apostrophes', () => {
      expect(escapeHtml("O'Brien & Sons")).toBe('O&#39;Brien &amp; Sons')
    })

    it('handles null/undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })
  })

  describe('stringifyValue', () => {
    it('converts values to strings', () => {
      expect(stringifyValue(42)).toBe('42')
      expect(stringifyValue(false)).toBe('false')
    })

    it('handles objects as JSON', () => {
      expect(stringifyValue({ a: 1 })).toBe('{"a":1}')
    })

    it('handles null/undefined', () => {
      expect(stringifyValue(null)).toBe('')
      expect(stringifyValue(undefined)).toBe('')
    })
  })

  describe('renderTemplate', () => {
    it('replaces known variables', () => {
      const result = renderTemplate('Hello {{name}}!', { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('escapes HTML by default', () => {
      const result = renderTemplate('Hi {{name}}', { name: '<b>Bob</b>' })
      expect(result).toBe('Hi &lt;b&gt;Bob&lt;/b&gt;')
    })

    it('does not escape when escape=false', () => {
      const result = renderTemplate('Hi {{name}}', { name: '<b>Bob</b>' }, { escape: false })
      expect(result).toBe('Hi <b>Bob</b>')
    })

    it('removes unknown variables', () => {
      const result = renderTemplate('Hello {{missing}}', {})
      expect(result).toBe('Hello ')
    })

    it('handles missing optional variables gracefully', () => {
      const result = renderTemplate('{{a}} {{b}} {{c}}', { a: '1', c: '3' })
      expect(result).toBe('1  3')
    })

    it('replaces all occurrences', () => {
      const result = renderTemplate('{{x}}-{{x}}-{{x}}', { x: 'y' })
      expect(result).toBe('y-y-y')
    })
  })

  describe('buildAppUrl', () => {
    it('builds a URL from the public origin', () => {
      const url = buildAppUrl('/verify', { token: 'abc' })
      expect(url).toContain('/verify')
      expect(url).toContain('token=abc')
    })

    it('normalizes leading slashes', () => {
      expect(buildAppUrl('/foo')).toContain('/foo')
      expect(buildAppUrl('foo')).toContain('/foo')
    })

    it('adds query parameters', () => {
      const url = buildAppUrl('/path', { a: '1', b: '2' })
      expect(url).toContain('a=1')
      expect(url).toContain('b=2')
    })
  })

  describe('token utilities', () => {
    it('hashToken produces sha256 hex', () => {
      const hash = hashToken('my-token')
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('hashToken is deterministic', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'))
    })

    it('hashing different tokens produces different hashes', () => {
      expect(hashToken('abc')).not.toBe(hashToken('abd'))
    })

    it('generateToken produces a secure random token', () => {
      const t1 = generateToken()
      const t2 = generateToken()
      expect(t1).toBeTruthy()
      expect(t1).not.toBe(t2)
    })
  })
})