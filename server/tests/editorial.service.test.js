import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/config/db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

vi.mock('../src/modules/notification/notification.service.js', () => ({
  enqueueNotification: vi.fn(),
}))

vi.mock('../src/modules/notification/manuscript-notification.service.js', () => ({
  sendEditorialAccepted: vi.fn(),
  sendEditorialRejected: vi.fn(),
  sendMinorRevisionRequested: vi.fn(),
  sendMajorRevisionRequested: vi.fn(),
}))

import pool from '../src/config/db.js'
import {
  publishManuscript,
  getAcceptedManuscripts,
} from '../src/modules/editorial/editorial.service.js'

function makeClient() {
  return {
    query: vi.fn(),
    release: vi.fn(),
  }
}

describe('publishManuscript', () => {
  let client

  beforeEach(() => {
    vi.clearAllMocks()
    client = makeClient()
    pool.connect.mockResolvedValue(client)
  })

  it('publishes an accepted manuscript with status history, audit log and activity', async () => {
    const publishedAt = '2026-09-05T00:00:00.000Z'
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'm1', current_status: 'accepted' }] }) // SELECT * FOR UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // editorial assignment exists
      .mockResolvedValueOnce({ rows: [] }) // UPDATE manuscripts
      .mockResolvedValueOnce({ rows: [] }) // INSERT status history
      .mockResolvedValueOnce({ rows: [] }) // INSERT audit log
      .mockResolvedValueOnce({ rows: [] }) // INSERT user activity
      .mockResolvedValueOnce({ rows: [] }) // COMMIT
      .mockResolvedValueOnce({ rows: [{ id: 'm1', current_status: 'published', published_at: publishedAt }] }) // SELECT updated

    const result = await publishManuscript('m1', 'editor-1')

    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK')
    expect(result.success).toBe(true)
    expect(result.message).toBe('Manuscript published successfully.')
    expect(result.manuscript.current_status).toBe('published')
    expect(result.manuscript.published_at).toBe(publishedAt)

    const calls = client.query.mock.calls
    const updateCall = calls.find(([sql]) => typeof sql === 'string' && sql.includes("current_status = 'published'"))
    expect(updateCall).toBeTruthy()
    expect(updateCall[1]).toEqual(['m1'])

    const historyCall = calls.find(([sql]) => typeof sql === 'string' && sql.includes('manuscript_status_history'))
    expect(historyCall).toBeTruthy()
    expect(historyCall[1]).toEqual(['m1', 'accepted', 'editor-1'])
    expect(historyCall[0]).toContain("VALUES ($1, $2, 'published', $3)")

    const auditCall = calls.find(([sql]) => typeof sql === 'string' && sql.includes('audit_logs'))
    expect(auditCall).toBeTruthy()
    expect(auditCall[0]).toContain("'manuscript_published'")
    expect(auditCall[1]).toEqual(['editor-1', 'm1', expect.any(String)])

    const activityCall = calls.find(([sql]) => typeof sql === 'string' && sql.includes('user_activity'))
    expect(activityCall).toBeTruthy()
    expect(activityCall[0]).toContain("'manuscript_published'")
    expect(activityCall[0]).toContain("'manuscripts'")
    expect(activityCall[1]).toEqual(['editor-1', 'm1'])

    expect(client.release).toHaveBeenCalled()
  })

  it('rejects a manuscript that is not accepted', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'm1', current_status: 'under_review' }] }) // SELECT * FOR UPDATE

    const promise = publishManuscript('m1', 'editor-1')

    await expect(promise).rejects.toMatchObject({ statusCode: 400, message: 'Only accepted manuscripts can be published' })
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
  })

  it('rejects an already published manuscript', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'm1', current_status: 'published' }] }) // SELECT * FOR UPDATE

    const promise = publishManuscript('m1', 'editor-1')

    await expect(promise).rejects.toMatchObject({ statusCode: 409, message: 'Manuscript is already published' })
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
  })

  it('rejects a manuscript that does not exist', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT * FOR UPDATE -> none

    const promise = publishManuscript('missing', 'editor-1')

    await expect(promise).rejects.toMatchObject({ statusCode: 404, message: 'Manuscript not found' })
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
  })

  it('rejects an editor who is not assigned to the manuscript', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'm1', current_status: 'accepted' }] }) // SELECT * FOR UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // editorial assignment missing

    const promise = publishManuscript('m1', 'other-editor')

    await expect(promise).rejects.toMatchObject({ statusCode: 403, message: 'Not assigned to this manuscript' })
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
  })

  it('rolls back when a later statement fails', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'm1', current_status: 'accepted' }] }) // SELECT * FOR UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // editorial assignment
      .mockResolvedValueOnce({ rows: [] }) // UPDATE manuscripts
      .mockRejectedValueOnce(new Error('history insert failed')) // INSERT status history

    const promise = publishManuscript('m1', 'editor-1')

    await expect(promise).rejects.toThrow('history insert failed')
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query).not.toHaveBeenCalledWith('COMMIT')
  })
})

describe('getAcceptedManuscripts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns accepted and published manuscripts', async () => {
    const rows = [
      { id: 'm1', current_status: 'accepted', published_at: null },
      { id: 'm2', current_status: 'published', published_at: '2026-01-01T00:00:00Z' },
    ]
    pool.query.mockResolvedValueOnce({ rows })

    const result = await getAcceptedManuscripts()

    expect(pool.query).toHaveBeenCalled()
    const sql = pool.query.mock.calls[0][0]
    expect(sql).toContain("m.current_status IN ('accepted', 'published')")
    expect(sql).toContain("msh.to_status = 'accepted'")
    expect(result).toEqual(rows)
  })
})