# Phase 7 — Email Classification

## Objective

Classify incoming emails before deciding whether to answer automatically.

## Initial Categories

```text
SUBMISSION_GUIDELINES
JOURNAL_INFORMATION
MANUSCRIPT_STATUS
REVISION_STATUS
REVIEW_STATUS
REVIEWER_INVITATION
REVIEWER_EXTENSION
WITHDRAWAL_REQUEST
EDITORIAL_DECISION_QUERY
GENERAL_QUESTION
COMPLAINT
ETHICS_OR_PLAGIARISM
PAYMENT
SECURITY
SPAM
OTHER
```

## TODO

- [x] Define a strict classification schema.
- [x] Require Gemini to return structured output.
- [x] Extract:
  - [x] intent
  - [x] confidence
  - [x] manuscript ID
  - [x] user email
  - [x] requested action
  - [x] sensitive-topic flag
- [x] Validate AI output against a backend schema.
- [x] Reject malformed output.
- [x] Store classification results for auditing.
- [x] Version classification prompts.

## Example Result

```json
{
  "intent": "MANUSCRIPT_STATUS",
  "confidence": 0.96,
  "manuscriptId": "ARFI-26-CS-000001",
  "requiresHumanApproval": false
}
```

## Completion Criteria

- [x] Common email categories are classified consistently.
- [x] Low-confidence results do not trigger automatic sending.

---
