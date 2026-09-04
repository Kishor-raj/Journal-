import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fakePool } = vi.hoisted(() => ({
  fakePool: { query: vi.fn() },
}))

vi.mock('../../config/cloudinary.js', () => ({
  default: {
    uploader: {
      destroy: vi.fn(),
    },
    url: vi.fn((id, opts) => `https://res.cloudinary.com/x/${opts?.resource_type}/${id}`),
    utils: {
      api_sign_request: vi.fn(() => 'sig'),
    },
  },
}))

vi.mock('../../config/db.js', () => ({
  default: fakePool,
}))

import cloudinary from '../../config/cloudinary.js'
import { resolveDestroyResourceType, deleteManuscriptFile } from './files.service.js'

describe('resolveDestroyResourceType (Cloudinary storage)', () => {
  it('derives image from image mime type even when stored resource_type is "auto"', () => {
    expect(resolveDestroyResourceType({ resource_type: 'auto', mime_type: 'image/png', format: 'png' })).toBe('image')
  })

  it('derives video from video mime type', () => {
    expect(resolveDestroyResourceType({ resource_type: 'auto', mime_type: 'video/mp4', format: 'mp4' })).toBe('video')
  })

  it('derives raw for pdf/doc files whose stored resource_type is "auto"', () => {
    expect(resolveDestroyResourceType({ resource_type: 'auto', mime_type: 'application/pdf', format: 'pdf' })).toBe('raw')
    expect(resolveDestroyResourceType({ resource_type: 'auto', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', format: 'docx' })).toBe('raw')
  })

  it('falls back to validation-only stored type and then raw', () => {
    expect(resolveDestroyResourceType({ resource_type: 'raw', mime_type: null, format: null })).toBe('raw')
    expect(resolveDestroyResourceType({ resource_type: 'image', mime_type: null, format: null })).toBe('image')
    expect(resolveDestroyResourceType({ resource_type: 'garbage', mime_type: null, format: null })).toBe('raw')
  })
})

describe('deleteManuscriptFile — Cloudinary destroy + DB cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const fileRow = {
    id: 'file-1',
    manuscript_id: 'manus-1',
    public_id: 'manuscripts/manus-1/v1/main_manuscript_1234',
    resource_type: 'auto',
    mime_type: 'application/pdf',
    format: 'pdf',
    submitted_by: 'user-1',
  }

  it('destroys the Cloudinary asset, deletes the DB row, and returns success', async () => {
    fakePool.query.mockImplementation((sql) => {
      if (sql.includes('JOIN manuscripts')) {
        return Promise.resolve({ rows: [{ ...fileRow, current_status: 'draft' }] })
      }
      if (sql.startsWith('DELETE')) {
        return Promise.resolve({ rowCount: 1 })
      }
      return Promise.resolve({ rows: [] })
    })
    cloudinary.uploader.destroy.mockResolvedValueOnce({ result: 'ok' })

    const result = await deleteManuscriptFile('manus-1', 'file-1', 'user-1')

    expect(result.success).toBe(true)
    expect(result.deleted_file_id).toBe('file-1')
    // must destroy with a VALID resource_type (not 'auto'), 'raw' for a pdf
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      'manuscripts/manus-1/v1/main_manuscript_1234',
      expect.objectContaining({ resource_type: 'raw' })
    )
  })

  it('re-tries destroy with fallback resource types when the primary returns "not found"', async () => {
    fakePool.query.mockImplementation((sql) => {
      if (sql.includes('JOIN manuscripts')) {
        return Promise.resolve({ rows: [{ ...fileRow, current_status: 'draft' }] })
      }
      if (sql.startsWith('DELETE')) {
        return Promise.resolve({ rowCount: 1 })
      }
      return Promise.resolve({ rows: [] })
    })
    cloudinary.uploader.destroy.mockResolvedValueOnce({ result: 'not found' }).mockResolvedValue({ result: 'ok' })

    await deleteManuscriptFile('manus-1', 'file-1', 'user-1')

    const calls = cloudinary.uploader.destroy.mock.calls.map((c) => c[1].resource_type)
    expect(calls.length).toBeGreaterThan(1)
    expect(calls).toContain('raw')
  })

  it('still deletes the DB row when Cloudinary destroy throws (asset already gone)', async () => {
    fakePool.query.mockImplementation((sql) => {
      if (sql.includes('JOIN manuscripts')) {
        return Promise.resolve({ rows: [{ ...fileRow, current_status: 'draft' }] })
      }
      if (sql.startsWith('DELETE')) {
        return Promise.resolve({ rowCount: 1 })
      }
      return Promise.resolve({ rows: [] })
    })
    cloudinary.uploader.destroy.mockRejectedValue(new Error('rate limit'))

    const result = await deleteManuscriptFile('manus-1', 'file-1', 'user-1')

    expect(result.success).toBe(true)
    expect(fakePool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM manuscript_files'), ['file-1'])
  })

  it('does not destroy or delete when the file is not part of the manuscript (404)', async () => {
    fakePool.query.mockResolvedValueOnce({ rows: [] })

    await expect(deleteManuscriptFile('manus-1', 'missing', 'user-1')).rejects.toMatchObject({ statusCode: 404 })
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled()
  })
})
