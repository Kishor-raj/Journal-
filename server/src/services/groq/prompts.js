export const CLASSIFICATION_PROMPT_VERSION = '2.0'

export const EMAIL_CATEGORIES = Object.freeze({
  SUBMISSION_GUIDELINES: 'SUBMISSION_GUIDELINES',
  JOURNAL_INFORMATION: 'JOURNAL_INFORMATION',
  MANUSCRIPT_STATUS: 'MANUSCRIPT_STATUS',
  REVISION_STATUS: 'REVISION_STATUS',
  REVIEW_STATUS: 'REVIEW_STATUS',
  REVIEWER_INVITATION: 'REVIEWER_INVITATION',
  REVIEWER_EXTENSION: 'REVIEWER_EXTENSION',
  WITHDRAWAL_REQUEST: 'WITHDRAWAL_REQUEST',
  EDITORIAL_DECISION_QUERY: 'EDITORIAL_DECISION_QUERY',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  COMPLAINT: 'COMPLAINT',
  ETHICS_OR_PLAGIARISM: 'ETHICS_OR_PLAGIARISM',
  PAYMENT: 'PAYMENT',
  SECURITY: 'SECURITY',
  SPAM: 'SPAM',
  OTHER: 'OTHER',
})

export const VALID_CLASSIFICATIONS = Object.values(EMAIL_CATEGORIES)

export function buildClassificationPrompt({ fromEmail, subject, bodyText, mailbox, knowledgeContext }) {
  const knowledgeSection = knowledgeContext
    ? `\n## Available Journal Information (for reference only)\n${knowledgeContext}\n`
    : ''

  return `You are an email classifier for a scholarly journal management system (Asgard Publications / IJIDCR).

Classify the following inbound email into exactly ONE category and extract structured information.

## Email Details
- From: ${fromEmail}
- To: ${mailbox}
- Subject: ${subject}
- Body:
${bodyText || '(empty body)'}
${knowledgeSection}
## Categories (pick exactly ONE)
- SUBMISSION_GUIDELINES: Author asking about how to submit, formatting requirements, guidelines
- JOURNAL_INFORMATION: Questions about the journal scope, aims, frequency, indexing
- MANUSCRIPT_STATUS: Author asking about the status of a submitted manuscript
- REVISION_STATUS: Author asking about a revision request or process
- REVIEW_STATUS: Editor/reviewer asking about review progress
- REVIEWER_INVITATION: Response to a reviewer invitation (accept/decline)
- REVIEWER_EXTENSION: Request for review deadline extension
- WITHDRAWAL_REQUEST: Author requesting withdrawal of a manuscript
- EDITORIAL_DECISION_QUERY: Question about an editorial decision (accept/reject/revision)
- GENERAL_QUESTION: Generic question not matching above categories
- COMPLAINT: Formal complaint or grievance
- ETHICS_OR_PLAGIARISM: Ethics concern, plagiarism allegation, or misconduct report
- PAYMENT: Questions about publication fees, APC, payment
- SECURITY: Account security, password reset, unauthorized access
- SPAM: Unsolicited, promotional, or phishing email
- OTHER: Email that does not fit any other category

## Extraction Rules
- If a manuscript/submission number is mentioned, extract it exactly as written
- If a person name is mentioned, extract it
- Flag as sensitive: COMPLAINT, ETHICS_OR_PLAGIARISM, PAYMENT, SECURITY, WITHDRAWAL_REQUEST
- Determine if the email requires human approval for any reply

## Rules
- Return ONLY a valid JSON object. No explanations, no comments, no text outside the JSON.
- "sensitive_topic" MUST be a JSON boolean (true or false). Set to true only if COMPLAINT, ETHICS_OR_PLAGIARISM, PAYMENT, SECURITY, or WITHDRAWAL_REQUEST.
- "requires_human_approval" MUST be a JSON boolean (true or false). Set to true if sensitive or editorial decision related.

Respond in this exact JSON format:
{
  "classification": "MANUSCRIPT_STATUS",
  "intent": "<1-sentence summary of what the sender wants>",
  "confidence": 0.95,
  "sensitive_topic": false,
  "requires_human_approval": false,
  "extracted_data": {
    "submission_number": "<submission number if mentioned, e.g. IJIDCR-26-0010, otherwise null>",
    "manuscript_title": null,
    "person_names": [],
    "key_dates": [],
    "action_requested": "<specific action the sender wants>"
  }
}`
}

export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    classification: { type: 'string', enum: VALID_CLASSIFICATIONS },
    intent: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    sensitive_topic: { type: 'boolean' },
    requires_human_approval: { type: 'boolean' },
    extracted_data: {
      type: 'object',
      properties: {
        submission_number: { type: 'string' },
        manuscript_title: { type: 'string' },
        person_names: { type: 'array', items: { type: 'string' } },
        key_dates: { type: 'array', items: { type: 'string' } },
        action_requested: { type: 'string' },
      },
    },
  },
  required: ['classification', 'intent', 'confidence', 'sensitive_topic', 'requires_human_approval'],
}
