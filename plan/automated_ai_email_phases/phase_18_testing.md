# Phase 18 — Testing

## A. Unit Tests

- [x] Webhook authentication.
- [x] Webhook payload validation.
- [x] Duplicate event detection.
- [x] Email parsing.
- [x] Thread mapping.
- [x] Classification schema validation.
- [x] Tool argument validation.
- [x] Safety rules.
- [x] Auto-reply decision logic.
- [x] Reply formatting.
- [x] Hostinger service error handling.

## B. Gemini Tests

Test:

```text
Normal question
Manuscript status question
Revision question
Review question
Unknown manuscript ID
Missing database data
Ambiguous question
Prompt injection
Sensitive complaint
Policy question
Spam
```

## C. Integration Tests

Test:

```text
Hostinger
  ↓
Webhook
  ↓
Express
  ↓
Queue
  ↓
Worker
  ↓
Gemini
  ↓
Database tools
  ↓
Safety layer
  ↓
Hostinger reply
```

## D. Failure Tests

- [x] Gemini unavailable.
- [x] Hostinger unavailable.
- [x] Database unavailable.
- [x] Queue unavailable.
- [x] Invalid webhook.
- [x] Duplicate webhook.
- [x] Tool returns no result.
- [x] AI returns malformed output.
- [x] AI confidence below threshold.
- [x] Reply send fails.
- [x] Worker crashes during processing.
- [x] Application restarts during processing.

---
