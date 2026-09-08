import { describe, it, expect } from 'vitest'
import { buildCertificateNumber, validatePublicationMetadata, resolveCertificateAuthorName } from './publication.service.js'

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

describe('resolveCertificateAuthorName', () => {
  it('uses first and last name from author record with proper Title Case', () => {
    expect(resolveCertificateAuthorName({ first_name: 'eswaran', last_name: 'a' })).toBe('Eswaran A')
    expect(resolveCertificateAuthorName({ first_name: 'Eswar', last_name: 'A' })).toBe('Eswar A')
  })

  it('falls back to user profile first and last name when author snapshot has nulls', () => {
    expect(
      resolveCertificateAuthorName({
        first_name: null,
        last_name: null,
        profile_first_name: 'eswaran',
        profile_last_name: 'a',
      })
    ).toBe('Eswaran A')
  })

  it('falls back to profile name when author record only has generic "Author"', () => {
    expect(
      resolveCertificateAuthorName({
        first_name: 'Author',
        last_name: '',
        profile_first_name: 'Eswar',
        profile_last_name: 'A',
      })
    ).toBe('Eswar A')
  })

  it('supports author_profile_first_name and author_profile_last_name', () => {
    expect(
      resolveCertificateAuthorName({
        author_profile_first_name: 'Eswar',
        author_profile_last_name: 'A',
      })
    ).toBe('Eswar A')
  })

  it('resolves consistent author name across multiple manuscripts for the same author', () => {
    const authorUser = { profile_first_name: 'Eswaran', profile_last_name: 'A' }
    const manuscript1 = { first_name: 'Eswaran', last_name: 'A', ...authorUser }
    const manuscript2 = { first_name: null, last_name: null, ...authorUser }
    const manuscript3 = { first_name: 'Author', last_name: '', ...authorUser }

    const name1 = resolveCertificateAuthorName(manuscript1)
    const name2 = resolveCertificateAuthorName(manuscript2)
    const name3 = resolveCertificateAuthorName(manuscript3)

    expect(name1).toBe('Eswaran A')
    expect(name2).toBe('Eswaran A')
    expect(name3).toBe('Eswaran A')
    expect(name1).toBe(name2)
    expect(name2).toBe(name3)
  })

  it('falls back to email username if no name fields exist', () => {
    expect(resolveCertificateAuthorName({ email: 'eswaran.kumar@gmail.com' })).toBe('Eswaran Kumar')
  })
})