import { describe, it, expect } from 'vitest'
import { evaluateAutoReply } from '../../../services/ai/autoReplyRules.js'

describe('evaluateAutoReply', () => {
  const baseHighConf = { confidence: 0.9, sensitiveTopic: false, requiresHumanApproval: false, extractedData: {} }

  it('allows auto reply for SUBMISSION_GUIDELINES with high confidence', () => {
    const result = evaluateAutoReply({ classification: 'SUBMISSION_GUIDELINES', ...baseHighConf })
    expect(result.decision).toBe('auto_reply')
    expect(result.autoReplyAllowed).toBe(true)
  })

  it('allows auto reply for JOURNAL_INFORMATION', () => {
    const result = evaluateAutoReply({ classification: 'JOURNAL_INFORMATION', ...baseHighConf })
    expect(result.decision).toBe('auto_reply')
    expect(result.autoReplyAllowed).toBe(true)
  })

  it('allows auto reply for GENERAL_QUESTION', () => {
    const result = evaluateAutoReply({ classification: 'GENERAL_QUESTION', ...baseHighConf })
    expect(result.decision).toBe('auto_reply')
    expect(result.autoReplyAllowed).toBe(true)
  })

  it('allows auto reply for MANUSCRIPT_STATUS', () => {
    const result = evaluateAutoReply({ classification: 'MANUSCRIPT_STATUS', ...baseHighConf })
    expect(result.decision).toBe('auto_reply')
    expect(result.autoReplyAllowed).toBe(true)
  })

  it('allows auto reply with submission_number', () => {
    const result = evaluateAutoReply({
      classification: 'SUBMISSION_GUIDELINES',
      confidence: 0.9,
      sensitiveTopic: false,
      requiresHumanApproval: false,
      extractedData: { submission_number: 'IJIDCR-26-0001' },
    })
    expect(result.decision).toBe('auto_reply')
    expect(result.autoReplyAllowed).toBe(true)
    expect(result.reason).toContain('Verified submission number')
  })

  it('requires human approval for WITHDRAWAL_REQUEST', () => {
    const result = evaluateAutoReply({ classification: 'WITHDRAWAL_REQUEST', ...baseHighConf })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('requires human approval for COMPLAINT', () => {
    const result = evaluateAutoReply({ classification: 'COMPLAINT', ...baseHighConf })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('requires human approval for PAYMENT', () => {
    const result = evaluateAutoReply({ classification: 'PAYMENT', ...baseHighConf })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('requires human approval for REVIEWER_INVITATION', () => {
    const result = evaluateAutoReply({ classification: 'REVIEWER_INVITATION', ...baseHighConf })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('requires human approval when requiresHumanApproval flag set', () => {
    const result = evaluateAutoReply({ classification: 'SUBMISSION_GUIDELINES', ...baseHighConf, requiresHumanApproval: true })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('requires human approval for sensitive topics', () => {
    const result = evaluateAutoReply({ classification: 'JOURNAL_INFORMATION', ...baseHighConf, sensitiveTopic: true })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('requires human approval for low confidence', () => {
    const result = evaluateAutoReply({ classification: 'SUBMISSION_GUIDELINES', confidence: 0.5, sensitiveTopic: false, requiresHumanApproval: false, extractedData: {} })
    expect(result.decision).toBe('human_approval')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('marks ETHICS_OR_PLAGIARISM as manual', () => {
    const result = evaluateAutoReply({ classification: 'ETHICS_OR_PLAGIARISM', ...baseHighConf })
    expect(result.decision).toBe('manual')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('marks SECURITY as manual', () => {
    const result = evaluateAutoReply({ classification: 'SECURITY', ...baseHighConf })
    expect(result.decision).toBe('manual')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('marks SPAM as manual', () => {
    const result = evaluateAutoReply({ classification: 'SPAM', ...baseHighConf })
    expect(result.decision).toBe('manual')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('marks OTHER as manual', () => {
    const result = evaluateAutoReply({ classification: 'OTHER', ...baseHighConf })
    expect(result.decision).toBe('manual')
    expect(result.autoReplyAllowed).toBe(false)
  })

  it('marks unknown categories as manual', () => {
    const result = evaluateAutoReply({ classification: 'UNKNOWN_CATEGORY', ...baseHighConf })
    expect(result.decision).toBe('manual')
    expect(result.autoReplyAllowed).toBe(false)
  })
})
