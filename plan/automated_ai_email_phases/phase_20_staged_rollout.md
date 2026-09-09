# Phase 20 — Staged Rollout

## Stage 1 — Development

```text
Receive email
→ AI classification
→ AI draft
→ Human approval
→ Send
```

- [x] No automatic sending.

## Stage 2 — Internal Testing

- [x] Test with controlled internal mailboxes.
- [x] Verify classifications.
- [x] Verify database tool responses.
- [x] Verify thread handling.
- [x] Verify audit logs.

## Stage 3 — Limited Auto Reply

Enable automatic replies only for:

```text
Journal FAQ
Submission guidelines
General verified information
Basic verified manuscript status
```

## Stage 4 — Production Monitoring

Monitor:

```text
Auto-reply accuracy
False replies
Escalations
Gemini failures
Hostinger failures
User complaints
Duplicate sends
```

## Stage 5 — Expand Carefully

Only expand the auto-reply category list after reviewing real production results.

---
