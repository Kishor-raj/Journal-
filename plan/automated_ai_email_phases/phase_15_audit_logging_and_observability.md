# Phase 15 — Audit Logging and Observability

## Objective

Provide complete traceability without storing unnecessary sensitive information.

## TODO

Log:

```text
Webhook received
Email stored
AI classification
Model used
Prompt version
Knowledge sources used
Tool calls
Safety decision
Approval action
Send attempt
Send result
Error/failure
```

Do not log:

```text
API keys
Passwords
Database credentials
Session secrets
Unnecessary sensitive email content
```

## Add Metrics

Track:

```text
Emails received
Emails processed
AI classifications
Auto-replies
Human approvals
Manual escalations
AI failures
Hostinger API failures
Gemini API failures
Average processing time
Average confidence
Duplicate events
```

## Completion Criteria

- [x] Admin can investigate why an email received a specific response.
- [x] Operational failures are visible.

---
