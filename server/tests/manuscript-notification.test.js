import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendSubmissionReceived, sendDeskRejected, sendEditorialAccepted, sendEditorialRejected } from '../src/modules/notification/manuscript-notification.service.js'
import pool from '../src/config/db.js'

vi.mock('../src/config/db.js', () => ({
  default: {
    query: vi.fn(),
  },
}))

vi.mock('../src/modules/notification/notification.service.js', () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ success: true, log_id: 'log-1' }),
}))

vi.mock('../src/modules/email/email.utils.js', () => ({
  buildAppUrl: (path) => `https://journal.example.com${path}`,
}))

import { enqueueNotification } from '../src/modules/notification/notification.service.js'

describe('Manuscript notification dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pool.query.mockReset()
  })

  it('sendSubmissionReceived loads context and calls enqueueNotification', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'm1',
          title: 'My Paper',
          submission_number: 'M-001',
          journal_id: 'j1',
          submitted_by: 'u1',
          submitted_at: new Date(),
          updated_at: new Date(),
          current_status: 'submitted',
          journal_name: 'Test Journal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'u1',
          email: 'author@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          display_name: 'Jane Doe',
        }],
      })

    const result = await sendSubmissionReceived('m1')

    expect(result.success).toBe(true)
    expect(enqueueNotification).toHaveBeenCalledWith(
      'submission_received',
      'u1',
      expect.objectContaining({
        recipient_email: 'author@example.com',
        author_name: 'Jane Doe',
        submission_number: 'M-001',
        manuscript_title: 'My Paper',
        journal_name: 'Test Journal',
        manuscript_id: 'm1',
      })
    )
  })

  it('sendSubmissionReceived returns safely when context is missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] })
    const result = await sendSubmissionReceived('m-nonexistent')
    expect(result.success).toBe(false)
    expect(result.skipped).toBe(true)
  })

  it('sendDeskRejected includes author-safe moderator reason', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'm1',
          title: 'Paper',
          submission_number: 'M-002',
          journal_id: 'j1',
          submitted_by: 'u1',
          submitted_at: new Date(),
          updated_at: new Date(),
          current_status: 'desk_rejected',
          journal_name: 'Test Journal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 'author@example.com', first_name: 'Jane', last_name: 'Doe', display_name: null }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'd1',
          manuscript_id: 'm1',
          decision: 'reject',
          reason: 'Out of scope',
          notes_to_author: 'Consider a different journal',
        }],
      })

    const result = await sendDeskRejected('m1', 'd1')

    expect(result.success).toBe(true)
    expect(enqueueNotification).toHaveBeenCalledWith(
      'desk_rejected',
      'u1',
      expect.objectContaining({
        decision_reason: 'Out of scope',
        moderation_notes_to_author: 'Consider a different journal',
      })
    )
  })

  it('sendEditorialAccepted does not include internal_notes', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'm1',
          title: 'Paper',
          submission_number: 'M-003',
          journal_id: 'j1',
          submitted_by: 'u1',
          submitted_at: new Date(),
          updated_at: new Date(),
          current_status: 'accepted',
          journal_name: 'Test Journal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 'author@example.com', first_name: 'Jane', last_name: 'Doe', display_name: 'Jane' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'ed1',
          manuscript_id: 'm1',
          decision: 'accept',
          comments_to_author: 'Great work!',
          internal_notes: 'DO NOT EXPOSE THIS',
          decision_date: new Date(),
        }],
      })

    const result = await sendEditorialAccepted('m1', 'ed1')

    expect(result.success).toBe(true)
    const callArgs = enqueueNotification.mock.calls[0]
    expect(callArgs[2]).not.toHaveProperty('internal_notes')
    expect(callArgs[2].manuscript_id).toBe('m1')
  })

  it('sendEditorialRejected includes comments_to_author but not internal_notes', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'm1',
          title: 'Paper',
          submission_number: 'M-004',
          journal_id: 'j1',
          submitted_by: 'u1',
          submitted_at: new Date(),
          updated_at: new Date(),
          current_status: 'rejected',
          journal_name: 'Test Journal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 'author@example.com', first_name: 'Jane', last_name: 'Doe', display_name: 'Jane' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'ed2',
          manuscript_id: 'm1',
          decision: 'reject',
          comments_to_author: 'Comments for author',
          internal_notes: 'Internal review notes',
          decision_date: new Date(),
        }],
      })

    await sendEditorialRejected('m1', 'ed2')

    const callArgs = enqueueNotification.mock.calls[0]
    expect(callArgs[2].comments_to_author).toBe('Comments for author')
    expect(callArgs[2]).not.toHaveProperty('internal_notes')
  })
})