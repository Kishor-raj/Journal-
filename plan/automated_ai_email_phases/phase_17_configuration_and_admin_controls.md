# Phase 17 — Configuration and Admin Controls

## Objective

Avoid hard-coding operational decisions.

## TODO

Make configurable:

```text
AI enabled/disabled
Auto-reply enabled/disabled
Confidence threshold
Allowed auto-reply categories
Human-approval categories
Model name
Maximum email context length
Maximum generated reply length
Rate limits
Retry count
```

## Suggested Environment Configuration

```env
GEMINI_API_KEY=
GEMINI_MODEL=

HOSTINGER_MAIL_API_KEY=
HOSTINGER_MAILBOX=
HOSTINGER_WEBHOOK_SECRET=

AI_EMAIL_ENABLED=true
AI_AUTO_REPLY_ENABLED=false
AI_AUTO_REPLY_CONFIDENCE_THRESHOLD=0.90
```

Use secure defaults.

Recommended initial state:

```env
AI_EMAIL_ENABLED=true
AI_AUTO_REPLY_ENABLED=false
```

This allows testing in draft/approval mode before automatic sending.

---
