import { describe, it, expect } from 'vitest'
import {
  NotificationEvents,
  NotificationStatus,
  MAX_RETRY_ATTEMPTS,
  RETRY_BACKOFF,
  EventKeys,
  isPermanentEmailError,
} from '../src/modules/notification/notification.events.js'

describe('Notification event model', () => {
  it('exposes all required notification events', () => {
    expect(NotificationEvents.ACCOUNT_VERIFICATION).toBe('account_verification')
    expect(NotificationEvents.PASSWORD_RESET).toBe('password_reset')
    expect(NotificationEvents.REVIEWER_INVITATION).toBe('reviewer_invitation')
    expect(NotificationEvents.MANUSCRIPT_SUBMITTED).toBe('submission_received')
    expect(NotificationEvents.MANUSCRIPT_DESK_REJECTED).toBe('desk_rejected')
    expect(NotificationEvents.MANUSCRIPT_REJECTED).toBe('editorial_rejected')
    expect(NotificationEvents.MANUSCRIPT_ACCEPTED).toBe('editorial_accepted')
    expect(NotificationEvents.MANUSCRIPT_MINOR_REVISION).toBe('minor_revision_requested')
    expect(NotificationEvents.MANUSCRIPT_MAJOR_REVISION).toBe('major_revision_requested')
    expect(NotificationEvents.DRAFT_MANUSCRIPT_REMINDER).toBe('draft_reminder')
  })

  it('exposes valid notification statuses', () => {
    expect(NotificationStatus.PENDING).toBe('queued')
    expect(NotificationStatus.SENDING).toBe('sending')
    expect(NotificationStatus.SENT).toBe('sent')
    expect(NotificationStatus.FAILED).toBe('failed')
    expect(NotificationStatus.RETRYING).toBe('retrying')
    expect(NotificationStatus.CANCELLED).toBe('cancelled')
    expect(NotificationStatus.SKIPPED).toBe('skipped')
  })

  it('has a bounded max retry count', () => {
    expect(MAX_RETRY_ATTEMPTS).toBe(5)
    expect(RETRY_BACKOFF.length).toBe(MAX_RETRY_ATTEMPTS)
  })
})

describe('Event key helpers', () => {
  it('builds deterministic submission keys', () => {
    expect(EventKeys.submissionReceived('abc')).toBe('submission:abc:received')
    expect(EventKeys.submissionReceived('abc')).toBe(EventKeys.submissionReceived('abc'))
  })

  it('builds deterministic decision keys', () => {
    expect(EventKeys.editorialAccepted('abc')).toBe('manuscript:abc:editorial_accepted')
    expect(EventKeys.editorialRejected('abc')).toBe('manuscript:abc:editorial_rejected')
    expect(EventKeys.minorRevision('abc')).toBe('manuscript:abc:minor_revision_requested')
    expect(EventKeys.majorRevision('abc')).toBe('manuscript:abc:major_revision_requested')
  })

  it('builds draft reminder keys with date', () => {
    expect(EventKeys.draftReminder('abc', '2026-01-01')).toBe('manuscript:abc:draft_reminder:2026-01-01')
  })

  it('builds reviewer invitation keys', () => {
    expect(EventKeys.reviewerInvitation('asg1', 'inv1')).toBe('review-invite:asg1:inv1')
  })
})

describe('Error categorization', () => {
  it('classifies transient errors', () => {
    expect(isPermanentEmailError('Email provider temporarily unavailable')).toBe(false)
    expect(isPermanentEmailError('ETIMEDOUT')).toBe(false)
    expect(isPermanentEmailError('Rate limit exceeded')).toBe(false)
  })

  it('classifies permanent errors', () => {
    expect(isPermanentEmailError('Invalid recipient email address')).toBe(true)
    expect(isPermanentEmailError('recipient not found')).toBe(true)
    expect(isPermanentEmailError('domain not verified')).toBe(true)
    expect(isPermanentEmailError('sender domain not verified')).toBe(true)
  })

  it('handles empty/unknown errors as transient', () => {
    expect(isPermanentEmailError('')).toBe(false)
    expect(isPermanentEmailError(null)).toBe(false)
    expect(isPermanentEmailError(undefined)).toBe(false)
  })
})