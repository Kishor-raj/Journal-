# Phase 5 — Background Queue and Worker

## Objective

Process email asynchronously and reliably.

## TODO

- [x] Choose or reuse an existing queue solution.
- [x] Prefer an existing project queue if one already exists.
- [x] If none exists, use a reliable Redis-backed worker/queue such as BullMQ.
- [x] Create an email AI processing job.
- [x] Implement retry handling.
- [x] Implement exponential/backoff retry where supported.
- [x] Add maximum retry count.
- [x] Add dead-letter/failure handling.
- [x] Make jobs idempotent.
- [x] Track processing status in the database.

## Suggested Flow

```text
Webhook
  ↓
Create email event
  ↓
Enqueue email_processing job
  ↓
Worker
  ↓
Fetch message
  ↓
Store email
  ↓
Gemini processing
  ↓
Policy validation
  ↓
Auto-send / approval / manual
```

## Completion Criteria

- [x] Worker processes queued email jobs.
- [x] Temporary failures retry.
- [x] Permanent failures are recorded.
- [x] Duplicate jobs do not produce duplicate replies.

---
