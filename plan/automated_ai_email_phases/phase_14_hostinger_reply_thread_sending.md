# Phase 14 — Hostinger Reply/Thread Sending

## Objective

Send the approved response through Hostinger while preserving the conversation/thread.

## TODO

- [x] Use the original message/thread identifiers where supported.
- [x] Reply to the existing message/thread rather than starting a new unrelated email.
- [x] Preserve appropriate subject/reply headers.
- [x] Avoid duplicate sends.
- [x] Record provider message ID.
- [x] Mark the AI reply as sent only after successful provider confirmation.
- [x] Handle Hostinger API failures.
- [x] Retry only safe/retryable failures.
- [x] Prevent duplicate sends after retries.

## Completion Criteria

- [x] Recipient receives the response from the correct domain mailbox.
- [x] Reply remains associated with the original conversation.
- [x] Duplicate replies are prevented.

---
