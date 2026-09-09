export const ROLLOUT_STAGES = {
  development: {
    name: 'Development',
    description: 'Internal testing only',
    autoReplyEnabled: false,
    approvalRequiredForAll: true,
    maxAutoRepliesPerDay: 0,
    allowedClassifications: [],
    logLevel: 'verbose',
  },
  testing: {
    name: 'Testing',
    description: 'Limited testing with test email accounts',
    autoReplyEnabled: false,
    approvalRequiredForAll: true,
    maxAutoRepliesPerDay: 0,
    allowedClassifications: ['SUBMISSION_GUIDELINES', 'JOURNAL_INFORMATION'],
    logLevel: 'verbose',
  },
  pilot: {
    name: 'Pilot',
    description: 'Auto-reply for low-risk categories only, all others require approval',
    autoReplyEnabled: true,
    approvalRequiredForAll: false,
    maxAutoRepliesPerDay: 10,
    allowedClassifications: ['SUBMISSION_GUIDELINES', 'JOURNAL_INFORMATION', 'GENERAL_QUESTION'],
    logLevel: 'normal',
  },
  production: {
    name: 'Production',
    description: 'Full production with auto-reply for all approved categories',
    autoReplyEnabled: true,
    approvalRequiredForAll: false,
    maxAutoRepliesPerDay: 50,
    allowedClassifications: [
      'SUBMISSION_GUIDELINES',
      'JOURNAL_INFORMATION',
      'GENERAL_QUESTION',
      'MANUSCRIPT_STATUS',
      'REVISION_STATUS',
      'REVIEW_STATUS',
    ],
    logLevel: 'normal',
  },
  emergency_off: {
    name: 'Emergency Off',
    description: 'All AI replies disabled, emails queued for manual handling',
    autoReplyEnabled: false,
    approvalRequiredForAll: true,
    maxAutoRepliesPerDay: 0,
    allowedClassifications: [],
    logLevel: 'verbose',
  },
}

export function getRolloutStageConfig(stage) {
  return ROLLOUT_STAGES[stage] || ROLLOUT_STAGES.development
}

export function isAutoReplyAllowedAtStage(stage, classification) {
  const config = getRolloutStageConfig(stage)
  if (!config.autoReplyEnabled) return false
  return config.allowedClassifications.includes(classification)
}

export function getDailyAutoReplyLimit(stage) {
  return getRolloutStageConfig(stage).maxAutoRepliesPerDay
}
