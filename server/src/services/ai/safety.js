import pool from '../../config/db.js'

const CONFIDENCE_THRESHOLD = 0.7

const SENSITIVE_CATEGORIES = [
  'COMPLAINT', 'ETHICS_OR_PLAGIARISM', 'PAYMENT', 'SECURITY', 'WITHDRAWAL_REQUEST',
]

const NEVER_AUTO_REPLY_CATEGORIES = [
  'ETHICS_OR_PLAGIARISM', 'SECURITY',
]

const RESTRICTED_INFORMATION_PATTERNS = [
  /password/i, /secret/i, /credential/i, /api.?key/i, /private.?key/i,
  /database.?password/i, /admin.?hash/i, /session.?secret/i,
]

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+an?\s+/i,
  /act\s+as\s+if\s+you/i,
  /pretend\s+you\s+(are|were)/i,
  /new\s+instructions/i,
  /override\s+(your\s+)?instructions/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /human\s*:\s*/i,
]

const IMPERSONATION_PATTERNS = [
  /i\s+am\s+the\s+(editor|admin|reviewer)/i,
  /as\s+the\s+(editor|admin)/i,
  /i\s+have\s+authority/i,
  /i\s+can\s+prove\s+it/i,
]

const STATUS_CHANGE_PATTERNS = [
  /change\s+(the\s+)?status/i,
  /update\s+(the\s+)?status/i,
  /mark\s+as\s+(accepted|rejected|published)/i,
  /set\s+(the\s+)?status/i,
  /move\s+to\s+(accepted|rejected|published)/i,
]

const REVIEWER_DISCLOSURE_PATTERNS = [
  /who\s+(is|are)\s+the\s+reviewer/i,
  /reveal\s+(the\s+)?reviewer/i,
  /reviewer.?s?\s+name/i,
  /peer.?reviewer/i,
  /name\s+of\s+the\s+reviewer/i,
]

export function evaluateSafety({ classification, confidence, bodyText, extractedData, draftBody }) {
  const violations = []
  const flags = []

  if (confidence < CONFIDENCE_THRESHOLD) {
    violations.push({
      rule: 'low_confidence',
      message: `Confidence ${confidence} is below threshold ${CONFIDENCE_THRESHOLD}`,
    })
  }

  if (SENSITIVE_CATEGORIES.includes(classification)) {
    flags.push({
      rule: 'sensitive_category',
      message: `Category ${classification} requires human oversight`,
    })
  }

  if (NEVER_AUTO_REPLY_CATEGORIES.includes(classification)) {
    violations.push({
      rule: 'never_auto_reply',
      message: `Category ${classification} must never be auto-replied`,
    })
  }

  const fullText = `${bodyText || ''} ${draftBody || ''}`

  for (const pattern of RESTRICTED_INFORMATION_PATTERNS) {
    if (pattern.test(fullText)) {
      violations.push({
        rule: 'restricted_information',
        message: `Content matches restricted information pattern: ${pattern.source}`,
      })
    }
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(bodyText || '')) {
      violations.push({
        rule: 'prompt_injection',
        message: `Incoming email contains prompt injection attempt`,
      })
    }
  }

  for (const pattern of IMPERSONATION_PATTERNS) {
    if (pattern.test(bodyText || '')) {
      flags.push({
        rule: 'impersonation_attempt',
        message: `Sender may be attempting to impersonate staff`,
      })
    }
  }

  for (const pattern of STATUS_CHANGE_PATTERNS) {
    if (pattern.test(bodyText || '')) {
      violations.push({
        rule: 'status_change_request',
        message: `Sender is requesting to change manuscript status`,
      })
    }
  }

  for (const pattern of REVIEWER_DISCLOSURE_PATTERNS) {
    if (pattern.test(bodyText || '')) {
      violations.push({
        rule: 'reviewer_disclosure',
        message: `Sender is requesting reviewer identity disclosure`,
      })
    }
  }

  const isSafe = violations.length === 0
  const requiresEscalation = !isSafe || flags.length > 0

  return {
    isSafe,
    requiresEscalation,
    violations,
    flags,
    evaluatedAt: new Date().toISOString(),
  }
}

export async function logSafetyDecision({ emailId, classification, result }) {
  await pool.query(
    `INSERT INTO workflow_logs (workflow_name, event_name, source, status, payload)
     VALUES ('ai_email', 'safety_evaluation', 'backend', $1, $2)`,
    [
      result.isSafe ? 'passed' : 'blocked',
      JSON.stringify({
        email_id: emailId,
        classification,
        is_safe: result.isSafe,
        requires_escalation: result.requiresEscalation,
        violations: result.violations,
        flags: result.flags,
      }),
    ]
  )
}
