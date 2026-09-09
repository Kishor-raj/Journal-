const AUTO_REPLY_CATEGORIES = [
  'SUBMISSION_GUIDELINES',
  'JOURNAL_INFORMATION',
  'GENERAL_QUESTION',
  'MANUSCRIPT_STATUS',
  'REVISION_STATUS',
  'REVIEW_STATUS',
]

const HUMAN_APPROVAL_CATEGORIES = [
  'WITHDRAWAL_REQUEST',
  'EDITORIAL_DECISION_QUERY',
  'COMPLAINT',
  'REVIEWER_INVITATION',
  'REVIEWER_EXTENSION',
  'PAYMENT',
]

const NEVER_AUTO_REPLY_CATEGORIES = [
  'ETHICS_OR_PLAGIARISM',
  'SECURITY',
  'SPAM',
  'OTHER',
]

const DEFAULT_CONFIDENCE_THRESHOLD = 0.75

export function evaluateAutoReply({ classification, confidence, sensitiveTopic, requiresHumanApproval, extractedData }) {
  if (NEVER_AUTO_REPLY_CATEGORIES.includes(classification)) {
    return {
      decision: 'manual',
      reason: `Category ${classification} requires manual handling`,
      autoReplyAllowed: false,
    }
  }

  if (HUMAN_APPROVAL_CATEGORIES.includes(classification) || requiresHumanApproval) {
    return {
      decision: 'human_approval',
      reason: `Category ${classification} requires human approval before sending`,
      autoReplyAllowed: false,
    }
  }

  if (sensitiveTopic) {
    return {
      decision: 'human_approval',
      reason: 'Email flagged as sensitive topic',
      autoReplyAllowed: false,
    }
  }

  if (!AUTO_REPLY_CATEGORIES.includes(classification)) {
    return {
      decision: 'manual',
      reason: `Category ${classification} is not in auto-reply list`,
      autoReplyAllowed: false,
    }
  }

  if (confidence < DEFAULT_CONFIDENCE_THRESHOLD) {
    return {
      decision: 'human_approval',
      reason: `Confidence ${confidence} is below threshold ${DEFAULT_CONFIDENCE_THRESHOLD}`,
      autoReplyAllowed: false,
    }
  }

  if (extractedData?.submission_number) {
    return {
      decision: 'auto_reply',
      reason: 'Verified submission number present with high confidence',
      autoReplyAllowed: true,
    }
  }

  return {
    decision: 'auto_reply',
    reason: `High-confidence classification in auto-reply category`,
    autoReplyAllowed: true,
  }
}

export function getReplyConfig() {
  return {
    autoReplyCategories: [...AUTO_REPLY_CATEGORIES],
    humanApprovalCategories: [...HUMAN_APPROVAL_CATEGORIES],
    neverAutoReplyCategories: [...NEVER_AUTO_REPLY_CATEGORIES],
    confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  }
}
