import { describe, it, expect } from 'vitest'
import { buildCertificateNumber, validatePublicationMetadata } from './publication.service.js'

describe('buildCertificateNumber', () => {
  it('builds ARFI-YY-ARTICLE_NO reusing the manuscript submission number', () => {
    expect(buildCertificateNumber('IJIDCR-26-0001', 2026)).toBe('ARFI-26-IJIDCR-26-0001')
  })

  it('uses the publication year (not the article year) for the ARFI prefix', () => {
    expect(buildCertificateNumber('IJIDCR-25-0042', 2026)).toBe('ARFI-26-IJIDCR-25-0042')
  })

  it('zero-pads the year to two digits', () => {
    expect(buildCertificateNumber('IJIDCR-05-0001', 2005)).toBe('ARFI-05-IJIDCR-05-0001')
    expect(buildCertificateNumber('IJIDCR-00-0001', 2000)).toBe('ARFI-00-IJIDCR-00-0001')
  })

  it('rejects a missing submission number', () => {
    expect(() => buildCertificateNumber('', 2026)).toThrow(/missing/i)
    expect(() => buildCertificateNumber('   ', 2026)).toThrow(/missing/i)
  })
})

describe('validatePublicationMetadata', () => {
  it('defaults volume/issue to 1 and year to the current year', () => {
    const metadata = validatePublicationMetadata({})
    expect(metadata.volume).toBe(1)
    expect(metadata.issue).toBe(1)
    expect(metadata.publicationYear).toBe(new Date().getFullYear())
    expect(metadata.doi).toBeNull()
    expect(metadata.articleUrl).toBeNull()
  })

  it('accepts numeric strings and trims optional identifiers', () => {
    const metadata = validatePublicationMetadata({ volume: '3', issue: '2', doi: '  10.1/x  ' })
    expect(metadata.volume).toBe(3)
    expect(metadata.issue).toBe(2)
    expect(metadata.doi).toBe('10.1/x')
  })

  it('normalizes empty strings for volume/issue/doi', () => {
    const metadata = validatePublicationMetadata({ volume: '', issue: '', doi: '' })
    expect(metadata.volume).toBe(1)
    expect(metadata.issue).toBe(1)
    expect(metadata.doi).toBeNull()
  })

  it('rejects non-positive or non-integer volume/issue', () => {
    expect(() => validatePublicationMetadata({ volume: 0 })).toThrow(/Volume/)
    expect(() => validatePublicationMetadata({ volume: -1 })).toThrow(/Volume/)
    expect(() => validatePublicationMetadata({ volume: 1.5 })).toThrow(/Volume/)
    expect(() => validatePublicationMetadata({ issue: 0 })).toThrow(/Issue/)
    expect(() => validatePublicationMetadata({ issue: 'abc' })).toThrow(/Issue/)
  })
})