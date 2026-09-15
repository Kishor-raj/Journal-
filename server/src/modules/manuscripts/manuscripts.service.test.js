import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fakePool } = vi.hoisted(() => ({
  fakePool: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('../../config/db.js', () => ({
  default: fakePool,
}))

vi.mock('../notification/manuscript-notification.service.js', () => ({
  sendSubmissionReceived: vi.fn(),
}))

import {
  createDraft,
  getCategories,
  getArticleTypes,
  getManuscriptById,
  updateManuscript,
} from './manuscripts.service.js'

describe('Manuscripts Service — Submission Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCategories returns active categories list', async () => {
    fakePool.query.mockResolvedValueOnce({
      rows: [
        { id: 'cat-1', name: 'Original Research' },
        { id: 'cat-2', name: 'Review Article' },
      ],
    })

    const result = await getCategories()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Original Research')
  })

  it('getArticleTypes returns active article types list', async () => {
    fakePool.query.mockResolvedValueOnce({
      rows: [
        { id: 'type-1', name: 'Cybersecurity', description: 'Security research' },
      ],
    })

    const result = await getArticleTypes()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Cybersecurity')
  })

  it('updateManuscript handles keywords array and returns full manuscript with relations', async () => {
    fakePool.query.mockImplementation((sql, params) => {
      if (sql.startsWith('SELECT * FROM manuscripts WHERE id')) {
        return Promise.resolve({
          rows: [{ id: 'm-1', current_status: 'draft', submitted_by: 'u-1' }],
        })
      }
      if (sql.includes('checkAccess') || sql.includes('SELECT 1 FROM manuscripts')) {
        return Promise.resolve({ rowCount: 1 })
      }
      if (sql.startsWith('UPDATE manuscripts SET')) {
        return Promise.resolve({ rowCount: 1 })
      }
      if (sql.includes('LEFT JOIN categories c ON c.id = m.category_id')) {
        return Promise.resolve({
          rows: [
            {
              id: 'm-1',
              title: 'My Manuscript',
              abstract: 'An abstract...',
              keywords: ['deep learning', 'neural networks'],
              category_id: 'cat-1',
              category_name: 'Original Research',
              article_type: 'Cybersecurity',
              conflict_of_interest: 'None declared',
              ethics_approval: 'Not applicable',
              funding: 'Grant 123',
              acknowledgements: 'Thanks',
              data_availability: 'Open data',
              current_status: 'draft',
              submitted_by: 'u-1',
            },
          ],
        })
      }
      if (sql.includes('FROM manuscript_authors')) {
        return Promise.resolve({
          rows: [
            {
              id: 'auth-1',
              manuscript_id: 'm-1',
              user_id: 'u-1',
              first_name: 'John',
              last_name: 'Doe',
              is_corresponding: true,
            },
          ],
        })
      }
      if (sql.includes('FROM manuscript_versions')) {
        return Promise.resolve({ rows: [] })
      }
      if (sql.includes('FROM manuscript_files')) {
        return Promise.resolve({ rows: [] })
      }
      return Promise.resolve({ rows: [] })
    })

    const result = await updateManuscript(
      'm-1',
      {
        title: 'My Manuscript',
        abstract: 'An abstract...',
        keywords: ['deep learning', 'neural networks'],
        category_id: 'cat-1',
        article_type: 'Cybersecurity',
        conflict_of_interest: 'None declared',
        ethics_approval: 'Not applicable',
        funding: 'Grant 123',
        acknowledgements: 'Thanks',
        data_availability: 'Open data',
      },
      'u-1'
    )

    expect(result.id).toBe('m-1')
    expect(result.category_name).toBe('Original Research')
    expect(result.article_type).toBe('Cybersecurity')
    expect(result.keywords).toEqual(['deep learning', 'neural networks'])
    expect(result.conflict_of_interest).toBe('None declared')
    expect(result.authors).toHaveLength(1)
  })
})
