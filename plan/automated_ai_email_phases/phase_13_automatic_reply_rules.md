# Phase 13 — Automatic Reply Rules

## Objective

Enable automatic replies only for approved categories.

## Initial AUTO_REPLY candidates

```text
SUBMISSION_GUIDELINES
JOURNAL_INFORMATION
GENERAL_QUESTION
Basic MANUSCRIPT_STATUS queries
Other verified FAQ-style requests
```

Only allow auto-reply when:

```text
confidence >= configured threshold
AND
no sensitive category
AND
required database information is verified
AND
policy validation passes
AND
thread/message is valid
```

## HUMAN_APPROVAL candidates

```text
WITHDRAWAL_REQUEST
EDITORIAL_DECISION_QUERY
COMPLAINT
REVIEWER_INVITATION
REVIEWER_EXTENSION
Dispute-related messages
Other potentially sensitive workflow requests
```

## MANUAL / NEVER_AUTO_REPLY candidates

```text
ETHICS_OR_PLAGIARISM
SECURITY
Payment disputes
Legal threats
Requests for secrets
Requests to alter system/workflow state
Requests to disclose confidential reviewer information
```

## Completion Criteria

- [x] Auto-reply rules are deterministic and configurable.
- [x] AI cannot override the rules.

---
