# Phase 3 — Incoming Email Webhook

## Objective

Receive new-message notifications from Hostinger without repeatedly polling the mailbox.

## TODO

- [x] Create a public HTTPS endpoint such as:

```text
POST /api/email/hostinger/webhook
```

- [x] Configure the Hostinger `message.received` webhook.
- [x] Verify webhook authentication/signature according to the current Hostinger documentation.
- [x] Reject unauthenticated webhook requests.
- [x] Validate the event payload.
- [x] Store the webhook event before processing it.
- [x] Make webhook handling idempotent.
- [x] Detect duplicate webhook deliveries.
- [x] Return a successful HTTP response quickly after safely accepting the event.
- [x] Do not perform the complete Gemini processing inside the webhook request.
- [x] Send processing to the background queue.

## Suggested Database Table

```text
email_webhook_events
--------------------
id
provider
event_id
event_type
payload
received_at
processed_at
status
error_message
created_at
updated_at
```

## Completion Criteria

- [x] Sending an email to the Hostinger mailbox creates a webhook event.
- [x] Invalid webhook requests are rejected.
- [x] Duplicate events are not processed twice.
- [x] Webhook endpoint returns quickly.
- [x] No Gemini call happens directly inside the webhook request.

---
