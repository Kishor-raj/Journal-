# Contact Inquiry AI Reply Routing Fix — TODO

## Project Goal

Fix the current Contact Form inquiry email flow so that the existing AI auto-reply system sends its response to the **visitor's email address**, instead of replying to the journal's own mailbox.

### Current problem

The Contact Form notification is correctly sent to the journal mailbox and includes the visitor's email as `Reply-To`, but the existing AI email worker currently determines the reply recipient from the message's `from_email`.

This causes:

```text
Visitor submits Contact Form
        ↓
Notification → ceo@ijidcr-asgard.in
Reply-To → visitor@gmail.com
        ↓
AI webhook receives the email
        ↓
AI reads from_email = ceo@ijidcr-asgard.in
        ↓
AI replies to ceo@ijidcr-asgard.in   ❌
```

### Required result

```text
Visitor submits Contact Form
        ↓
Notification → ceo@ijidcr-asgard.in
Reply-To → visitor@gmail.com
        ↓
AI webhook receives the email
        ↓
AI detects Reply-To = visitor@gmail.com
        ↓
AI generates reply
        ↓
AI sends reply → visitor@gmail.com   ✅
```

---

# Phase 1 — Inspect and Confirm Existing Implementation

### TODO

- [x] Inspect the existing Contact Form backend.
- [x] Inspect the existing Resend email-sending implementation.
- [x] Inspect the Hostinger webhook endpoint.
- [x] Inspect `server/src/modules/ai-email/ai-email-worker.js`.
- [x] Locate where incoming email `from` is parsed.
- [x] Locate where `from_email` is stored in the database.
- [x] Locate where the AI reply recipient is selected.
- [x] Locate the failed-reply retry logic.
- [x] Confirm whether the Hostinger webhook payload exposes `Reply-To` in `reply_to`, `replyTo`, headers, or another field.
- [ ] Confirm the exact payload shape with a real/test webhook payload before finalizing the parser.
- [x] Do not change unrelated email workflow logic.

### Expected finding

The existing system should continue to use the normal sender for ordinary incoming emails, while Contact Form inquiries should use the visitor's `Reply-To` address.

---

# Phase 2 — Preserve the Existing Contact Form Email Configuration

Keep the existing environment variables.

```env
CONTACT_FROM_EMAIL=ceo@ijidcr-asgard.in
CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in
```

### TODO

- [x] Do not change `CONTACT_FROM_EMAIL`.
- [x] Do not change `CONTACT_RECIPIENT_EMAIL`.
- [x] Confirm the Contact Form continues sending notifications to `CONTACT_RECIPIENT_EMAIL`.
- [x] Confirm the Contact Form continues setting:

```js
replyTo: validation.data.email
```

- [x] Do not put visitor email addresses into environment variables.
- [x] Do not hard-code a visitor email address anywhere.

### Expected behavior

For a visitor `visitor@gmail.com`:

```text
From: ceo@ijidcr-asgard.in
To: ceo@ijidcr-asgard.in
Reply-To: visitor@gmail.com
```

---

# Phase 3 — Add Reply-To Extraction to the AI Worker

Target file:

```text
server/src/modules/ai-email/ai-email-worker.js
```

### TODO

- [x] Create a small helper function for extracting a valid Reply-To email.
- [x] Check the actual Hostinger webhook payload format.
- [x] Support the project's real field name first.
- [x] Optionally support safe fallbacks such as:

```js
data?.reply_to
data?.replyTo
data?.reply_to_email
data?.replyToEmail
data?.headers?.['reply-to']
data?.headers?.['Reply-To']
```

- [x] Reuse the existing `extractCleanEmail()` function where possible.
- [x] Return `null` when a valid Reply-To address is not available.
- [x] Do not throw an exception just because Reply-To is missing.

### Suggested helper

```js
function extractReplyTo(data) {
  const candidates = [
    data?.reply_to,
    data?.replyTo,
    data?.reply_to_email,
    data?.replyToEmail,
    data?.headers?.['reply-to'],
    data?.headers?.['Reply-To'],
  ]

  for (const candidate of candidates) {
    const email = extractCleanEmail(candidate)
    if (email) return email
  }

  return null
}
```

Adjust this to the actual webhook payload discovered during Phase 1.

---

# Phase 4 — Persist the Reply-To Address

## Preferred implementation

Add a dedicated field to the stored email record:

```text
reply_to_email
```

### TODO

- [x] Inspect the current `emails` table/schema.
- [x] Add `reply_to_email` using the project's existing migration/schema conventions.
- [x] Make the field nullable.
- [x] Do not modify existing `from_email` semantics.
- [x] Store the extracted Reply-To address separately from the original sender.
- [x] Update the email insert/save logic to populate `reply_to_email`.
- [x] Keep existing rows valid when `reply_to_email` is null.

### Why this matters

Do not overwrite:

```text
from_email
```

because that field should continue representing the actual sender.

Instead:

```text
from_email       = ceo@ijidcr-asgard.in
reply_to_email   = visitor@gmail.com
```

This preserves accurate email metadata.

---

# Phase 5 — Fix AI Reply Recipient Selection

This is the main functional fix.

### Current incorrect behavior

The worker currently uses logic equivalent to:

```js
const cleanRecipient = extractCleanEmail(emailData.from_email)
```

This causes the AI to respond to the journal mailbox for Contact Form inquiries.

### Required behavior

Recipient priority should be:

```text
1. reply_to_email
2. original from_email
3. no send if neither is valid
```

### Suggested logic

```js
const recipient =
  extractCleanEmail(emailData.reply_to_email) ||
  extractCleanEmail(emailData.from_email)
```

### TODO

- [x] Update the normal AI reply recipient logic.
- [x] Prefer `reply_to_email`.
- [x] Fall back to `from_email` for ordinary emails.
- [x] Do not use `CONTACT_RECIPIENT_EMAIL` as the AI reply destination.
- [x] Do not use `CONTACT_FROM_EMAIL` as the AI reply destination.
- [x] Abort safely when no valid recipient is available.
- [x] Log only safe recipient information as appropriate.

### Expected behavior

Contact Form:

```text
from_email     = ceo@ijidcr-asgard.in
reply_to_email = visitor@gmail.com
```

AI recipient:

```text
visitor@gmail.com
```

Ordinary incoming email:

```text
from_email     = customer@gmail.com
reply_to_email = null
```

AI recipient:

```text
customer@gmail.com
```

This preserves existing behavior for normal incoming emails.

---

# Phase 6 — Fix Failed Reply / Retry Logic

The retry path must use exactly the same recipient-selection rules as the normal AI reply path.

### TODO

- [x] Find the failed-reply retry section in `ai-email-worker.js`.
- [x] Replace direct `from_email` recipient selection with the same helper used by the normal path.
- [x] Prefer `reply_to_email`.
- [x] Fall back to `from_email`.
- [x] Do not duplicate separate recipient-selection rules.
- [x] Create a shared helper such as:

```js
function getAiReplyRecipient(emailData) {
  return (
    extractCleanEmail(emailData.reply_to_email) ||
    extractCleanEmail(emailData.from_email) ||
    null
  )
}
```

- [x] Use this helper in both normal-send and retry-send code.

---

# Phase 7 — Identify Contact Form Inquiries Reliably

A dedicated identifier is recommended so the AI worker knows that an email originated from the Contact Form.

### TODO

Add a custom header when the Contact Form notification is sent.

Example:

```js
headers: {
  "X-Journal-Source": "contact-form"
}
```

Optionally include:

```js
"X-Visitor-Email": inquiry.email
```

### TODO

- [x] Add a source header to Contact Form emails.
- [ ] Read the source header in the webhook/worker if the provider preserves it.
- [x] Prefer stored `reply_to_email` as the actual destination.
- [x] Use the source marker only as context/diagnostics, not as the only source of truth.
- [x] Do not expose internal markers in visitor-facing content.

---

# Phase 8 — Prevent AI Self-Reply Loops

The existing AI system must not reply to its own mailbox or to emails generated by itself.

### TODO

- [x] Add a guard against sending AI replies to the journal's own mailbox when that address represents the automated mailbox.
- [x] Add a marker/header to AI-generated outgoing emails, for example:

```js
headers: {
  "X-Journal-AI-Generated": "true"
}
```

- [x] In the webhook/worker, ignore messages marked as AI-generated where appropriate.
- [x] Add loop protection for system-generated emails.
- [x] Do not accidentally block legitimate visitor replies.

### Example safety check

```js
if (
  recipient &&
  recipient.toLowerCase() ===
    process.env.CONTACT_FROM_EMAIL.toLowerCase()
) {
  // Skip unsafe self-reply
}
```

Adapt this to the project's actual mailbox configuration.

---

# Phase 9 — Resend Outgoing AI Reply Configuration

The AI response should be sent through the existing Resend implementation.

### TODO

Ensure AI replies use:

```js
await resend.emails.send({
  from: process.env.CONTACT_FROM_EMAIL,
  to: recipient,
  subject: replySubject,
  html: aiReplyHtml
})
```

### TODO

- [x] `from` should be the configured journal sender.
- [x] `to` must be the resolved visitor/original sender.
- [x] Preserve the existing subject/reply subject convention.
- [x] Do not set `to` to `CONTACT_RECIPIENT_EMAIL` for AI responses.
- [x] Do not expose Resend credentials to the frontend.
- [x] Preserve the existing successful AI generation logic.

---

# Phase 10 — Validate the Complete Contact Inquiry Flow

Use a controlled test mailbox.

Example:

```text
Visitor email:
testvisitor@example.com
```

### Test sequence

```text
1. Submit Contact Form
2. Verify database inquiry
3. Verify notification email arrives at journal mailbox
4. Verify notification Reply-To is testvisitor@example.com
5. Verify Hostinger forwards webhook
6. Verify AI receives the inquiry
7. Verify AI generates a response
8. Verify AI sends response to testvisitor@example.com
9. Verify no AI response is sent to the journal mailbox
```

### TODO

- [ ] Verify database `from_email`.
- [ ] Verify database `reply_to_email`.
- [ ] Verify notification recipient.
- [ ] Verify notification Reply-To.
- [ ] Verify AI resolved recipient.
- [ ] Verify Resend send target.
- [ ] Verify visitor receives the AI reply.
- [ ] Verify journal mailbox does not receive an AI self-reply.
- [ ] Verify no duplicate AI reply is generated.

---

# Phase 11 — Test Existing Normal Email AI Replies

The Contact Form fix must not break your existing AI email system.

### Test

Send a normal email directly to the journal mailbox from:

```text
normaluser@example.com
```

### Expected

```text
from_email     = normaluser@example.com
reply_to_email = null OR actual Reply-To if supplied
AI recipient   = normaluser@example.com
```

### TODO

- [ ] Test normal incoming email.
- [ ] Verify AI still replies to the original sender.
- [ ] Test an email that contains its own Reply-To header.
- [ ] Verify Reply-To behavior is correct.
- [ ] Verify Contact Form routing and normal email routing remain separate.

---

# Phase 12 — Error Handling

### TODO

Handle these cases safely:

### Case A — Contact Form has valid Reply-To

```text
reply_to_email = visitor@gmail.com
```

Result:

```text
AI → visitor@gmail.com
```

### Case B — Reply-To missing

```text
reply_to_email = null
from_email = visitor@gmail.com
```

Result:

```text
AI → visitor@gmail.com
```

### Case C — Both missing/invalid

```text
reply_to_email = null
from_email = invalid
```

Result:

```text
Do not send
Log safe error
```

### Case D — Recipient resolves to the journal's own mailbox

Result:

```text
Do not send automatically
Log/flag the issue
```

### TODO

- [x] Never crash the worker because of malformed email metadata.
- [x] Never silently send to the wrong mailbox.
- [x] Never expose provider secrets in error output.
- [x] Preserve the inquiry in the database even when AI email delivery fails.

---

# Phase 13 — Security Review

### TODO

- [ ] Validate all email addresses before sending.
- [ ] Sanitize/escape user-generated values used in HTML email.
- [ ] Do not trust arbitrary webhook fields without validation.
- [ ] Do not allow a user-supplied field to override the sender address.
- [ ] Keep `from` controlled by server configuration.
- [ ] Keep Resend API keys server-side.
- [ ] Ensure webhook authentication/signature validation remains intact.
- [ ] Ensure database writes remain parameterized/safe.
- [ ] Prevent unauthorized modification of stored inquiry recipient data.

---

# Phase 14 — Logging and Debugging

Add temporary/structured logs during implementation.

### Recommended diagnostic data

```text
email id
from_email
reply_to_email
resolved AI recipient
source/contact-form marker
send result
```

### TODO

- [ ] Log the resolved recipient before sending during testing.
- [ ] Verify Contact Form logs show the visitor's address.
- [ ] Verify ordinary email logs still show the correct sender.
- [ ] Remove overly verbose/debug logging before production if not needed.
- [ ] Never log Resend API keys or other secrets.
- [ ] Avoid logging full inquiry message content unnecessarily.

---

# Phase 15 — Backward Compatibility / Migration

Existing emails may not have `reply_to_email`.

### TODO

- [x] Make `reply_to_email` nullable.
- [x] Do not require backfilling old records unless necessary.
- [x] Existing emails with null `reply_to_email` must continue to work.
- [x] Existing AI replies should fall back to `from_email`.
- [x] Ensure the database migration does not break production data.

### Backward-compatible recipient rule

```js
reply_to_email || from_email
```

---

# Phase 16 — Final Acceptance Checklist

The fix is complete only when all of the following are true:

- [ ] Contact Form continues sending inquiries to the journal mailbox.
- [ ] `CONTACT_FROM_EMAIL` remains the configured sender.
- [ ] `CONTACT_RECIPIENT_EMAIL` remains the journal mailbox.
- [ ] Contact Form continues setting visitor email as `Reply-To`.
- [ ] AI worker captures/stores Reply-To.
- [ ] AI worker prefers Reply-To over From.
- [ ] AI worker falls back to From for ordinary emails.
- [ ] AI worker never uses `CONTACT_RECIPIENT_EMAIL` as the automatic reply target.
- [ ] AI worker does not reply to its own mailbox.
- [ ] Failed-reply retry uses the same recipient-selection logic.
- [ ] Visitor receives the AI response.
- [ ] Journal mailbox does not receive an AI self-reply.
- [ ] Existing normal AI email replies continue working.
- [ ] No unrelated journal functionality is broken.

---

# Recommended Implementation Order

```text
Phase 1  → Inspect existing implementation
Phase 2  → Preserve current Contact Form environment configuration
Phase 3  → Add Reply-To extraction
Phase 4  → Persist reply_to_email
Phase 5  → Fix AI recipient selection
Phase 6  → Fix retry logic
Phase 7  → Identify Contact Form inquiries
Phase 8  → Prevent self-reply loops
Phase 9  → Verify Resend AI reply configuration
Phase 10 → Test Contact Form flow
Phase 11 → Test normal incoming email flow
Phase 12 → Error handling
Phase 13 → Security review
Phase 14 → Logging/debugging
Phase 15 → Backward compatibility
Phase 16 → Final acceptance
```

# Important Agent Instructions

- [x] Inspect the uploaded project before editing.
- [x] Work with the existing architecture instead of replacing the AI email system.
- [x] Do not change the existing `.env` values for `CONTACT_FROM_EMAIL` and `CONTACT_RECIPIENT_EMAIL` unless the project configuration itself is invalid.
- [x] Do not hard-code visitor email addresses.
- [x] Do not use the journal recipient address as the AI reply destination.
- [x] Preserve the existing behavior for ordinary incoming emails.
- [x] Prefer a single shared helper for AI recipient selection.
- [ ] Test the actual Hostinger webhook payload before finalizing Reply-To extraction.
- [ ] Test both Contact Form emails and ordinary incoming emails.
- [x] Do not modify unrelated journal modules.
- [x] At the end, report:
  - files changed
  - database migration changes
  - environment variables changed (expected: none)
  - recipient-selection logic changed
  - tests performed
  - production deployment considerations
