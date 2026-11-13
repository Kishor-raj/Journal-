import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatDoiSuffix,
  formatFullDoi,
  buildCanonicalDoiUrl,
  buildArticleLandingUrl,
  allocateNextDoiSuffix,
  allocateDoiForPublication,
  getDoiDetailsForManuscript,
} from './doi.service.js'
import pool from '../../config/db.js'

vi.mock('../../config/db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

describe('DOI Service - Suffix & String Formatting', () => {
  it('formats suffix with 5-digit padding for numbers < 100,000', () => {
    expect(formatDoiSuffix(1)).toBe('IJIDCR_00001')
    expect(formatDoiSuffix(2)).toBe('IJIDCR_00002')
    expect(formatDoiSuffix(42)).toBe('IJIDCR_00042')
    expect(formatDoiSuffix(999)).toBe('IJIDCR_00999')
    expect(formatDoiSuffix(99999)).toBe('IJIDCR_99999')
  })

  it('formats suffix beyond 5 digits without truncation', () => {
    expect(formatDoiSuffix(100000)).toBe('IJIDCR_100000')
    expect(formatDoiSuffix(1234567)).toBe('IJIDCR_1234567')
  })

  it('accepts string representations of positive integers', () => {
    expect(formatDoiSuffix('7')).toBe('IJIDCR_00007')
    expect(formatDoiSuffix('0050')).toBe('IJIDCR_00050')
  })

  it('rejects invalid or non-positive sequence numbers', () => {
    expect(() => formatDoiSuffix(0)).toThrow(/Invalid sequence number/)
    expect(() => formatDoiSuffix(-5)).toThrow(/Invalid sequence number/)
    expect(() => formatDoiSuffix(NaN)).toThrow(/Invalid sequence number/)
    expect(() => formatDoiSuffix('invalid')).toThrow(/Invalid sequence number/)
  })

  it('formats full DOI with default prefix 10.68968', () => {
    expect(formatFullDoi('IJIDCR_00001')).toBe('10.68968/IJIDCR_00001')
    expect(formatFullDoi('/IJIDCR_00002')).toBe('10.68968/IJIDCR_00002')
  })

  it('supports custom prefix when provided', () => {
    expect(formatFullDoi('TEST_001', '10.5555')).toBe('10.5555/TEST_001')
  })

  it('rejects empty or whitespace-only suffix', () => {
    expect(() => formatFullDoi('')).toThrow(/required/)
    expect(() => formatFullDoi('   ')).toThrow(/required/)
  })

  it('builds canonical https://doi.org URL', () => {
    expect(buildCanonicalDoiUrl('10.68968/IJIDCR_00001')).toBe('https://doi.org/10.68968/IJIDCR_00001')
    expect(buildCanonicalDoiUrl('https://doi.org/10.68968/IJIDCR_00001')).toBe('https://doi.org/10.68968/IJIDCR_00001')
    expect(buildCanonicalDoiUrl(null)).toBeNull()
    expect(buildCanonicalDoiUrl('')).toBeNull()
  })

  it('builds canonical article landing page URL', () => {
    const landingUrl = buildArticleLandingUrl('manuscript-uuid-123')
    expect(landingUrl).toContain('/articles/manuscript-uuid-123')
    expect(() => buildArticleLandingUrl(null)).toThrow(/Manuscript ID is required/)
  })
})

describe('DOI Service - Database Allocation & Idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allocates next sequence suffix via database sequence', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [{ seq: '42' }],
      }),
    }

    const suffix = await allocateNextDoiSuffix(mockClient)
    expect(mockClient.query).toHaveBeenCalledWith("SELECT nextval('doi_suffix_seq') AS seq")
    expect(suffix).toBe('IJIDCR_00042')
  })

  it('reuses existing DOI if manuscript already has one allocated (idempotent)', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [{
          id: 'pub-1',
          doi: '10.68968/IJIDCR_00010',
          doi_suffix: 'IJIDCR_00010',
          doi_status: 'registered',
        }],
      }),
    }

    const res = await allocateDoiForPublication(mockClient, 'm-123')
    expect(res).toEqual({
      publicationId: 'pub-1',
      doi: '10.68968/IJIDCR_00010',
      doiSuffix: 'IJIDCR_00010',
      articleUrl: expect.stringContaining('/articles/m-123'),
      doiStatus: 'registered',
      doiEnvironment: 'test',
      isNew: false,
    })
    // sequence must NOT be fetched if already allocated
    expect(mockClient.query).toHaveBeenCalledTimes(1)
    expect(mockClient.query).not.toHaveBeenCalledWith("SELECT nextval('doi_suffix_seq') AS seq")
  })

  it('allocates new DOI if publication exists without DOI', async () => {
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{ id: 'pub-1', doi: null, doi_suffix: null }],
        })
        .mockResolvedValueOnce({
          rows: [{ seq: '1' }],
        }),
    }

    const res = await allocateDoiForPublication(mockClient, 'm-456')
    expect(res).toEqual({
      publicationId: 'pub-1',
      doi: '10.68968/IJIDCR_00001',
      doiSuffix: 'IJIDCR_00001',
      articleUrl: expect.stringContaining('/articles/m-456'),
      doiStatus: 'reserved',
      doiEnvironment: 'test',
      isNew: true,
    })
    expect(mockClient.query).toHaveBeenCalledTimes(2)
  })

  it('fetches DOI details for manuscript', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'pub-1',
        manuscript_id: 'm-123',
        doi: '10.68968/IJIDCR_00005',
        doi_suffix: 'IJIDCR_00005',
        doi_status: 'registered',
        doi_environment: 'production',
        doi_batch_id: 'batch-abc',
        doi_submission_id: 'sub-xyz',
        doi_error: null,
        article_url: 'http://localhost:5173/articles/m-123',
      }],
    })

    const details = await getDoiDetailsForManuscript('m-123')
    expect(details).not.toBeNull()
    expect(details.doi).toBe('10.68968/IJIDCR_00005')
    expect(details.doi_url).toBe('https://doi.org/10.68968/IJIDCR_00005')
    expect(details.article_url).toContain('/articles/m-123')
  })
})
