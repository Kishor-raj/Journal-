# Phase 4 — Email Storage and Thread Model

## Objective

Create durable storage for incoming/outgoing email history.

## TODO

Add or adapt tables for:

```text
email_threads
emails
email_attachments        (if needed)
ai_email_processing
ai_email_replies
```

### Suggested `email_threads`

```text
id
provider
provider_thread_id
mailbox
subject
from_email
last_message_at
status
created_at
updated_at
```

### Suggested `emails`

```text
id
thread_id
provider_message_id
message_id
in_reply_to
from_email
to_email
cc_email
bcc_email
subject
body_text
body_html
received_at
direction
raw_metadata
created_at
```

### Suggested `ai_email_processing`

```text
id
email_id
classification
intent
confidence
extracted_data
status
model_name
prompt_version
started_at
completed_at
error_message
created_at
```

### Suggested `ai_email_replies`

```text
id
email_id
thread_id
draft_body
final_body
decision
confidence
approval_required
approved_by
approved_at
sent_at
provider_message_id
status
failure_reason
created_at
updated_at
```

## TODO

- [x] Add suitable indexes.
- [x] Add unique constraints for provider message IDs.
- [x] Add indexes for provider thread IDs.
- [x] Store raw provider metadata only where appropriate.
- [x] Avoid storing unnecessary sensitive data.
- [x] Define retention rules for raw email data.

## Completion Criteria

- [x] Every processed email can be traced to a stored record.
- [x] Thread history can be reconstructed.
- [x] Outgoing AI replies are auditable.

---
