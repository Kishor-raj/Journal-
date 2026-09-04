import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/config/db.js', () => ({
  default: {
    query: vi.fn(),
  },
}))

vi.mock('../src/modules/email/email.service.js', () => ({
  sendEmail: vi.fn(),
}))

import pool from '../src/config/db.js'
import { sendEmail } from '../src/modules/email/email.service.js'
import { enqueueNotification } from '../src/modules/notification/notification.service.js'

const mockTemplate = {
  id: 1,
  template_key: 'submission_received',
  subject: 'Submission received',
  body_html: '<p>Hello</p>',
  body_text: 'Hello',
  is_active: true,
}

const mockUser = {
  id: 'u1',
  email: 'author@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
}

/**
 * Default (non-once) mock resolution for pool.query so that every
 * call returns a usable shape regardless of exact call ordering.
 */
function happyPool() {
  return { rows: [{ id: 'n1', attempt_count: 0 }] }
}

describe('enqueueNotification idempotency & retry logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default returns for pool.query so ordering doesn't blow up:
    pool.query.mockReset()
    pool.query.mockImplementation(() => Promise.resolve({ rows: [] }))
  })

  it('marks previously-sent notifications as skipped (idempotency)', async () => {
    // First query = event_key attempt lookup
    pool.query.mockResolvedValueOnce({ rows: [] }) // attempt lookup (none yet)
    // template lookup -> finds template
    pool.query.mockResolvedValueOnce({ rows: [mockTemplate] })
    // user lookup
    pool.query.mockResolvedValueOnce({ rows: [mockUser] })
    // workflow_log email_send_attempted insert
    pool.query.mockResolvedValueOnce(happyPool())
    // upsertEmailNotification SELECT existing -> status sent => skip
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'notif1', status: 'sent' }] })

    const result = await enqueueNotification('submission_received', 'u1', {
      manuscript_id: 'm1',
      recipient_email: 'author@example.com',
    })

    expect(sendEmail).not.toHaveBeenCalled()
    expect(result.skipped).toBe(true)
  })

  it('sets status to failed for a permanent provider error', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // attempt lookup
    pool.query.mockResolvedValueOnce({ rows: [mockTemplate] }) // template
    pool.query.mockResolvedValueOnce({ rows: [mockUser] }) // user
    // workflow_log email_send_attempted
    pool.query.mockResolvedValueOnce(happyPool())
    // upsertEmailNotification SELECT existing -> none (rows empty)
    pool.query.mockResolvedValueOnce({ rows: [] })
    // upsert insert -> returns id
    pool.query.mockResolvedValueOnce(happyPool())

    sendEmail.mockResolvedValueOnce({
      success: false,
      isPermanent: true,
      error: 'Email address not found',
    })

    const result = await enqueueNotification('submission_received', 'u1', {
      manuscript_id: 'm1',
      recipient_email: 'author@example.com',
    })

    expect(result.success).toBe(false)
    expect(result.status).toBe('failed')
    expect(result.is_permanent).toBe(true)
  })

  it('sets status to retrying for a transient provider error', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // attempt lookup
    pool.query.mockResolvedValueOnce({ rows: [mockTemplate] }) // template
    pool.query.mockResolvedValueOnce({ rows: [mockUser] }) // user
    pool.query.mockResolvedValueOnce(happyPool()) // email_send_attempted log
    pool.query.mockResolvedValueOnce({ rows: [] }) // upsert select -> none
    pool.query.mockResolvedValueOnce(happyPool()) // upsert insert

    sendEmail.mockResolvedValueOnce({
      success: false,
      isPermanent: false,
      error: 'Service temporarily unavailable',
    })

    const result = await enqueueNotification('submission_received', 'u1', {
      manuscript_id: 'm1',
      recipient_email: 'author@example.com',
    })

    expect(result.success).toBe(false)
    expect(result.status).toBe('retrying')
    expect(result.is_permanent).toBe(false)
  })

  it('classifies a transient-looking error as failed when permanent', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // attempt lookup
    pool.query.mockResolvedValueOnce({ rows: [mockTemplate] }) // template
    pool.query.mockResolvedValueOnce({ rows: [mockUser] }) // user
    pool.query.mockResolvedValueOnce(happyPool()) // email_send_attempted log
    pool.query.mockResolvedValueOnce({ rows: [] }) // upsert select -> none
    pool.query.mockResolvedValueOnce(happyPool()) // upsert insert

    sendEmail.mockResolvedValueOnce({
      success: false,
      isPermanent: undefined,
      error: 'domain not verified',
    })

    const result = await enqueueNotification('submission_received', 'u1', {
      manuscript_id: 'm1',
      recipient_email: 'author@example.com',
    })

    expect(result.status).toBe('failed')
    expect(result.is_permanent).toBe(true)
  })

  it('is a no-op for missing templates', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }) // attempt lookup
    pool.query.mockResolvedValueOnce({ rows: [] }) // template lookup -> none
    const result = await enqueueNotification('submission_received', 'u1', {
      manuscript_id: 'm1',
      recipient_email: 'author@example.com',
    })
    expect(result.success).toBe(false)
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('template_not_found')
  })
})