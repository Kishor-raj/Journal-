export const NotificationEvents = Object.freeze({
  ACCOUNT_VERIFICATION: 'account_verification',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  REVIEWER_INVITATION: 'reviewer_invitation',
  REVIEWER_INVITATION_REMINDER: 'reviewer_invitation_reminder',
  MANUSCRIPT_SUBMITTED: 'submission_received',
  MANUSCRIPT_DESK_REJECTED: 'desk_rejected',
  MANUSCRIPT_REJECTED: 'editorial_rejected',
  MANUSCRIPT_ACCEPTED: 'editorial_accepted',
  MANUSCRIPT_MINOR_REVISION: 'minor_revision_requested',
  MANUSCRIPT_MAJOR_REVISION: 'major_revision_requested',
  DRAFT_MANUSCRIPT_REMINDER: 'draft_reminder',
  REVIEW_SUBMITTED_CONFIRMATION: 'review_submitted_confirmation',
  MANUSCRIPT_WITHDRAWAL_CONFIRMATION: 'manuscript_withdrawal_confirmation',
  REVISION_SUBMITTED: 'revision_submitted',
  PUBLICATION_CERTIFICATE: 'publication_certificate',
})

export const NotificationStatus = Object.freeze({
  PENDING: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  RETRYING: 'retrying',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
})

export const MAX_RETRY_ATTEMPTS = 5

export const RETRY_BACKOFF = Object.freeze([0, 60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000])

export const EventKeys = Object.freeze({
  verification: (userId, attempt = 1) => `user:${userId}:verification:${attempt}`,
  passwordReset: (userId, attempt = 1) => `user:${userId}:password_reset:${attempt}`,
  passwordChanged: (userId) => `user:${userId}:password_changed`,
  submissionReceived: (manuscriptId) => `submission:${manuscriptId}:received`,
  deskRejected: (manuscriptId) => `manuscript:${manuscriptId}:desk_rejected`,
  editorialAccepted: (manuscriptId) => `manuscript:${manuscriptId}:editorial_accepted`,
  editorialRejected: (manuscriptId) => `manuscript:${manuscriptId}:editorial_rejected`,
  editorialDecision: (manuscriptId, templateKey) => `manuscript:${manuscriptId}:${templateKey}`,
  decision: (manuscriptId, templateKey, decisionId) => `manuscript:${manuscriptId}:${templateKey}:decision:${decisionId}`,
  minorRevision: (manuscriptId) => `manuscript:${manuscriptId}:minor_revision_requested`,
  majorRevision: (manuscriptId) => `manuscript:${manuscriptId}:major_revision_requested`,
  draftReminder: (manuscriptId, dateStr) => `manuscript:${manuscriptId}:draft_reminder:${dateStr}`,
  reviewerInvitation: (assignmentId, invitationId) => `review-invite:${assignmentId}:${invitationId}`,
  reviewerReminder: (assignmentId) => `review-assignment:${assignmentId}:reminder`,
  reviewSubmitted: (manuscriptId, reviewId) => `review-submitted:${manuscriptId}:${reviewId}`,
  manuscriptWithdrawn: (manuscriptId) => `manuscript:${manuscriptId}:withdrawn`,
  revisionSubmitted: (manuscriptId, revisionId) => `revision:${manuscriptId}:${revisionId}`,
  publicationCertificate: (manuscriptId, authorId) => `manuscript:${manuscriptId}:certificate:${authorId}`,
})

export function isPermanentEmailError(errorMessage) {
  if (!errorMessage) return false
  const msg = String(errorMessage).toLowerCase()
  const permanentPatterns = [
    'invalid email',
    'recipient not found',
    'invalid recipient',
    'unknown recipient',
    'address rejected',
    'bounce',
    'not deliverable',
    'invalid_domain',
    'invalid_from',
    'sender domain',
    'domain not verified',
    'verified sender',
    'not verified',
  ]
  return permanentPatterns.some((pattern) => msg.includes(pattern))
}