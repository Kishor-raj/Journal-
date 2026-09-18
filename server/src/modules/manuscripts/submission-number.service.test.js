import { describe, it, expect, vi } from 'vitest'
import { formatSubmissionNumber, generateSubmissionNumber } from './submission-number.service.js'

function makeMockClient(returnValue) {
  return {
    query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ last_number: returnValue }] }),
  }
}

describe('generateSubmissionNumber (with mocked DB client)', () => {
  it('calls the counter insert and atomic increment', async () => {
    const client = makeMockClient(7)
    const result = await generateSubmissionNumber(client)

    expect(client.query).toHaveBeenCalledTimes(2)
    expect(result).toMatch(/^IJIDCR-\d{2}-00007$/)
  })

  it('returns distinct numbers for consecutive calls', async () => {
    const no = await formatSubmissionNumber(2026, 1)
    const no2 = await formatSubmissionNumber(2026, 2)
    expect(no).not.toBe(no2)
  })
})

describe('formatSubmissionNumber', () => {
  it('formats the first submission of a year as IJIDCR-26-00001', () => {
    expect(formatSubmissionNumber(2026, 1)).toBe('IJIDCR-26-00001')
  })

  it('increments subsequent submissions correctly', () => {
    expect(formatSubmissionNumber(2026, 2)).toBe('IJIDCR-26-00002')
    expect(formatSubmissionNumber(2026, 3)).toBe('IJIDCR-26-00003')
    expect(formatSubmissionNumber(2026, 123)).toBe('IJIDCR-26-00123')
    expect(formatSubmissionNumber(2026, 100000)).toBe('IJIDCR-26-100000')
  })

  it('rolls over to a new year with the first submission as IJIDCR-27-00001', () => {
    expect(formatSubmissionNumber(2027, 1)).toBe('IJIDCR-27-00001')
  })

  it('pads the year to two digits', () => {
    expect(formatSubmissionNumber(2000, 1)).toBe('IJIDCR-00-00001')
    expect(formatSubmissionNumber(2005, 1)).toBe('IJIDCR-05-00001')
    expect(formatSubmissionNumber(2030, 1)).toBe('IJIDCR-30-00001')
  })

  it('always zero-pads the sequence to at least 5 digits', () => {
    expect(formatSubmissionNumber(2026, 0)).toBe('IJIDCR-26-00000')
    expect(formatSubmissionNumber(2026, 42)).toBe('IJIDCR-26-00042')
  })
})
