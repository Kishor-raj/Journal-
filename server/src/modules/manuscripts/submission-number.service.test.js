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
    expect(result).toMatch(/^IJIDCR-\d{2}-0007$/)
  })

  it('returns distinct numbers for consecutive calls', async () => {
    const no = await formatSubmissionNumber(2026, 1)
    const no2 = await formatSubmissionNumber(2026, 2)
    expect(no).not.toBe(no2)
  })
})

describe('formatSubmissionNumber', () => {
  it('formats the first submission of a year as IJIDCR-26-0001', () => {
    expect(formatSubmissionNumber(2026, 1)).toBe('IJIDCR-26-0001')
  })

  it('increments subsequent submissions correctly', () => {
    expect(formatSubmissionNumber(2026, 2)).toBe('IJIDCR-26-0002')
    expect(formatSubmissionNumber(2026, 3)).toBe('IJIDCR-26-0003')
    expect(formatSubmissionNumber(2026, 123)).toBe('IJIDCR-26-0123')
    expect(formatSubmissionNumber(2026, 10000)).toBe('IJIDCR-26-10000')
  })

  it('rolls over to a new year with the first submission as IJIDCR-27-0001', () => {
    expect(formatSubmissionNumber(2027, 1)).toBe('IJIDCR-27-0001')
  })

  it('pads the year to two digits', () => {
    expect(formatSubmissionNumber(2000, 1)).toBe('IJIDCR-00-0001')
    expect(formatSubmissionNumber(2005, 1)).toBe('IJIDCR-05-0001')
    expect(formatSubmissionNumber(2030, 1)).toBe('IJIDCR-30-0001')
  })

  it('always zero-pads the sequence to at least 4 digits', () => {
    expect(formatSubmissionNumber(2026, 0)).toBe('IJIDCR-26-0000')
    expect(formatSubmissionNumber(2026, 42)).toBe('IJIDCR-26-0042')
  })
})
