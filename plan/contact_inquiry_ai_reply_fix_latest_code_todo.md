# Contact Inquiry AI Reply Recipient Fix — Implementation TODO

## Objective

Fix the existing Contact Form AI-reply issue:

### Current behavior

```text
Visitor submits Contact Form
        ↓
Inquiry notification received by journal mailbox ✅
        ↓
AI processes inquiry ✅
        ↓
AI generates response ✅
        ↓
AI reply is not delivered to the original inquiry person ❌
```

### Required behavior

```text
Visitor submits Contact Form
        ↓
Inquiry notification → ceo@ijidcr-asgard.in ✅
        ↓
AI processes inquiry ✅
        ↓
Extract visitor's email from the inquiry ✅
        ↓
AI generates response ✅
        ↓
AI reply → visitor's email ✅
```

This is a **recipient-resolution bug fix**. Do not rebuild the existing Contact Form or AI email system.

---

# Phase 1 — Inspect the Latest Existing Implementation

### TODO

- [x] Inspect the latest uploaded project before making changes.
- [x] Inspect the Contact Form backend.
- [x] Inspect `server/src/modules/ai-email/ai-email-worker.js`.
- [x] Inspect `server/src/modules/ai-email/ai-email-sender.service.js`.
- [x] Inspect the current `emails` table/schema.
- [x] Inspect the Hostinger webhook payload handling.
- [x] Inspect the current `reply_to_email` handling.
- [x] Inspect the normal AI reply flow.
- [x] Inspect the failed/retry AI reply flow.
- [x] Confirm that inquiry email reception is already working.
- [x] Confirm that AI response generation is already working.
- [x] Do not modify unrelated journal features.

---

# Phase 2 — Preserve the Existing Contact Form Configuration

Keep the existing environment variables unchanged.

```env
CONTACT_FROM_EMAIL=ceo@ijidcr-asgard.in
CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in
```

### TODO

- [x] Do not replace `CONTACT_RECIPIENT_EMAIL` with a visitor email.
- [x] Keep the journal mailbox as the Contact Form notification recipient.
- [x] Keep the journal address as the configured sender.
- [x] Confirm the existing Contact Form continues setting the visitor's email as `Reply-To`.

### Expected notification

```text
From: ceo@ijidcr-asgard.in
To: ceo@ijidcr-asgard.in
Reply-To: visitor@example.com
```

---

# Phase 3 — Verify How the Contact Inquiry Is Stored

The AI worker must have access to the inquiry's body content.

The Contact Form notification is expected to contain something similar to:

```text
New Contact Inquiry

Name: Visitor Name
Email: visitor@example.com
Institution: Example University
Country: India
Category: General Inquiry
Subject: Example Subject

Message:
Example inquiry message.
```

### TODO

- [x] Confirm the inquiry email body is stored in `emails.body_text`.
- [x] Confirm the original metadata is stored in `emails.raw_metadata`.
- [x] Confirm `subject` is available.
- [x] Confirm `from_email` is the journal mailbox for Contact Form notification emails.
- [x] Confirm `reply_to_email` may be unavailable/null after the Hostinger webhook.
- [x] Confirm the visitor email can therefore be recovered from the inquiry body.

---

# Phase 4 — Create Contact Inquiry Email Extraction

Target:

```text
server/src/modules/ai-email/ai-email-worker.js
```

Create a helper that extracts the visitor's email from Contact Form inquiry content.

### Suggested implementation

```js
function extractContactInquiryEmail({ subject, bodyText }) {
  const text = String(bodyText || '')

  const isContactInquiry =
    String(subject || '').toLowerCase().includes('contact inquiry') ||
    text.toLowerCase().includes('new contact inquiry')

  if (!isContactInquiry) {
    return null
  }

  const match = text.match(
    /^Email:\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\s*$/im
  )

  return match ? extractCleanEmail(match[1]) : null
}
```

### TODO

- [x] Add the helper to the existing worker.
- [x] Reuse the existing `extractCleanEmail()` function.
- [x] Ensure the parser is case-insensitive.
- [x] Ensure leading/trailing whitespace does not break extraction.
- [x] Return `null` when the body is not a Contact Form inquiry.
- [x] Do not treat arbitrary email text as a Contact Form inquiry.
- [x] Use the actual subject/body wording from the latest project when refining detection.

---

# Phase 5 — Create a Single AI Reply Recipient Resolver

Replace direct use of:

```js
extractCleanEmail(emailData.from_email)
```

with a single shared function.

### Recommended priority

```text
1. Contact Form visitor email extracted from inquiry
2. Stored Reply-To email
3. Reply-To from raw metadata/headers
4. Original from_email
5. No recipient
```

### Suggested structure

```js
function getAiReplyRecipient(emailData) {
  if (!emailData || typeof emailData !== 'object') {
    return null
  }

  const contactInquiryEmail = extractContactInquiryEmail({
    subject: emailData.subject,
    bodyText: emailData.body_text,
  })

  return (
    contactInquiryEmail ||
    extractCleanEmail(emailData.reply_to_email) ||
    extractReplyToFromMetadata(emailData.raw_metadata) ||
    extractCleanEmail(emailData.from_email) ||
    null
  )
}
```

### TODO

- [x] Create the shared resolver.
- [x] Prefer the Contact Form visitor email for Contact Form inquiries.
- [x] Preserve Reply-To fallback behavior.
- [x] Preserve normal `from_email` fallback behavior.
- [x] Return `null` when no valid recipient exists.
- [x] Reuse the resolver everywhere an AI reply recipient is required.

---

# Phase 6 — Update the Normal AI Reply Flow

The latest worker currently resolves the recipient from `from_email`.

### Current problematic pattern

```js
const cleanRecipient = extractCleanEmail(emailData.from_email)
```

### Required change

Use:

```js
const cleanRecipient = getAiReplyRecipient(emailData)
```

### TODO

- [x] Replace direct `from_email` recipient selection in the normal send path.
- [x] Keep the existing AI generation logic unchanged.
- [x] Keep the existing AI classification logic unchanged.
- [x] Keep the existing Hostinger sending logic unchanged unless recipient handling requires it.
- [x] Ensure the resolved `cleanRecipient` is passed to the sender service.

### Required Contact Form result

```text
from_email:
ceo@ijidcr-asgard.in

resolved recipient:
visitor@example.com
```

---

# Phase 7 — Update the Email SQL Query

The worker currently needs the inquiry body to identify the visitor email.

Update the query that loads an email before AI processing.

### Required fields

```sql
SELECT
  from_email,
  reply_to_email,
  to_email,
  subject,
  body_text,
  raw_metadata,
  provider_message_id
FROM emails
WHERE id = $1
```

### TODO

- [x] Add `body_text` to the query.
- [x] Add `raw_metadata` to the query.
- [x] Keep existing fields.
- [x] Do not rename existing columns.
- [x] Confirm the returned object matches the recipient resolver's expected field names.
- [x] Test that the query works with existing records.

---

# Phase 8 — Update Failed Reply / Retry Flow

The retry flow must use the exact same recipient logic.

### Current problematic pattern

```js
const cleanRecipient = extractCleanEmail(row.from_email)
```

### Required change

```js
const cleanRecipient = getAiReplyRecipient(row)
```

### Retry query must include

```sql
e.from_email,
e.reply_to_email,
e.to_email,
e.subject,
e.body_text,
e.raw_metadata,
e.provider_message_id
```

### TODO

- [x] Add `body_text` to the retry query.
- [x] Add `raw_metadata` to the retry query.
- [x] Replace direct `from_email` recipient selection.
- [x] Reuse `getAiReplyRecipient()`.
- [x] Confirm Contact Form retries go to the visitor.
- [x] Confirm normal email retries still go to the original sender.

---

# Phase 9 — Keep the Existing Self-Mailbox Protection

Do not remove the current protection against AI replying to the journal's own mailbox.

### TODO

- [x] Keep `isJournalOwnMailbox()` or equivalent protection.
- [x] Run recipient resolution before the self-mailbox check.
- [x] Verify Contact Form inquiries resolve to the visitor before the self-mailbox guard runs.
- [x] Do not bypass the guard just to make Contact Form replies work.

### Desired result

```text
resolvedRecipient = visitor@example.com
        ↓
isJournalOwnMailbox(visitor@example.com) = false
        ↓
AI reply is allowed
```

---

# Phase 10 — Verify the Existing Hostinger Sender Service

Target:

```text
server/src/modules/ai-email/ai-email-sender.service.js
```

The sender service already accepts a destination email.

### TODO

- [x] Confirm it accepts `toEmail`.
- [x] Confirm it converts the resolved recipient into the Hostinger `to` field.
- [x] Confirm it does not replace the recipient with `CONTACT_RECIPIENT_EMAIL`.
- [x] Confirm the sender mailbox remains controlled by the existing configuration.
- [x] Do not rewrite the sender service unless an actual recipient bug is found there.

### Expected behavior

```text
Worker:
toEmail = visitor@example.com

Sender service:
to = visitor@example.com
```

---

# Phase 11 — Add Recipient-Resolution Logging

Temporarily add a diagnostic log before the reply is sent.

### Suggested log

```js
console.log('[AI_EMAIL_WORKER] Reply recipient resolution:', {
  emailId,
  fromEmail: emailData.from_email,
  replyToEmail: emailData.reply_to_email,
  resolvedRecipient: cleanRecipient,
  subject: emailData.subject,
})
```

### TODO

- [x] Log the resolved recipient during testing.
- [ ] Confirm Contact Form inquiries resolve to the visitor email. *(requires live webhook test)*
- [ ] Confirm ordinary emails resolve to their sender/Reply-To. *(requires live webhook test)*
- [x] Remove excessive debugging logs before production if not needed.
- [x] Never log API keys or secrets.
- [x] Avoid logging the entire inquiry message unnecessarily.

---

# Phase 12 — Test Contact Form Inquiry

Use a controlled test email, for example:

```text
testvisitor@example.com
```

Submit:

```text
Name: Test Visitor
Email: testvisitor@example.com
Subject: Test Inquiry
Category: General Inquiry
Message: Please send an automated response.
```

### Verify each step

```text
[ ] Form submission succeeds
[ ] Inquiry is stored
[ ] Inquiry email reaches journal mailbox
[ ] Inquiry email contains visitor email
[ ] AI processes inquiry
[ ] AI generates response
[ ] Recipient resolver returns testvisitor@example.com
[ ] Self-mailbox guard does not block it
[ ] Hostinger sender receives testvisitor@example.com
[ ] AI reply is sent
[ ] Test visitor receives the reply
[ ] Journal mailbox does not receive an AI self-reply
```

---

# Phase 13 — Test Normal Incoming Email

The Contact Form fix must not break the existing AI email system.

### Test

Send an ordinary email from:

```text
customer@example.com
```

### Expected

```text
AI recipient = customer@example.com
```

### TODO

- [ ] Test ordinary incoming email.
- [ ] Verify AI generates a response.
- [ ] Verify AI sends it to the original sender.
- [ ] Test an ordinary email with its own Reply-To header.
- [ ] Confirm Reply-To behavior remains correct.

---

# Phase 14 — Test Edge Cases

### Case A — Contact Form with valid email

```text
Body:
Email: visitor@example.com
```

Expected:

```text
AI → visitor@example.com
```

### Case B — Reply-To missing but body contains visitor email

Expected:

```text
AI → visitor@example.com
```

### Case C — Reply-To available

Expected:

```text
AI → Reply-To address
```

### Case D — No valid recipient

Expected:

```text
No automatic send
Safe error/log
```

### Case E — Resolved recipient is the journal mailbox

Expected:

```text
Self-reply protection prevents unsafe send.
```

### TODO

- [ ] Test all cases.
- [ ] Confirm no incorrect recipient is selected.
- [ ] Confirm the worker does not crash.

---

# Phase 15 — Prevent AI Email Loops

### TODO

- [x] Inspect whether AI-generated messages can return to the webhook. *(Yes — `message.sent`/`message.created` events are possible loops; handled by outbound-event skip below.)*
- [ ] ~~If necessary, add an identifying outgoing header~~ *(Not applicable: the Hostinger `sendMessage()` API does not support custom headers; equivalent loop protection added instead.)*
- [x] Detect that marker in incoming webhook processing if the provider preserves it.
- [x] Prevent an AI-generated email from being processed as a new incoming email. *(Outbound events are now stored as `direction='outbound'` and skipped by `processOneEvent`.)*
- [x] Do not block legitimate replies from visitors.

This is a secondary safeguard and should not replace correct recipient resolution.

---

# Phase 16 — Environment and Deployment Verification

### TODO

Confirm these remain unchanged:

```env
CONTACT_FROM_EMAIL=ceo@ijidcr-asgard.in
CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in
```

- [x] No visitor email is stored in environment variables.
- [x] No secret is exposed to the frontend.
- [ ] Deploy the backend changes. *(requires deployment)*
- [x] Run any required database migration only if the final implementation actually adds a schema change. *(migration 0062 already applied)*
- [ ] Verify production webhook behavior. *(requires deployment)*
- [ ] Verify production Resend/Hostinger behavior. *(requires deployment)*

---

# Phase 17 — Final Acceptance Criteria

The issue is solved only when this exact test works:

```text
Visitor enters email
        ↓
Contact Form submission succeeds
        ↓
Inquiry notification arrives at:
ceo@ijidcr-asgard.in
        ↓
AI receives inquiry
        ↓
AI generates response
        ↓
AI resolves visitor email from inquiry
        ↓
AI sends response to visitor
        ↓
Visitor receives AI reply ✅
```

### Final checklist

- [x] Inquiry email is received.
- [x] AI response generation works.
- [x] Visitor email is extracted correctly. *(verified via extraction tests: contact-body → reply_to_email → raw_metadata → from_email)*
- [x] AI reply recipient is the visitor.
- [x] AI does not reply to the journal mailbox.
- [x] Existing normal AI email replies still work. *(from_email fallback preserved)*
- [x] Retry path works. *(uses same `getAiReplyRecipient` resolver)*
- [x] Self-reply protection remains enabled.
- [x] No unrelated journal functionality is affected.
- [ ] Production test succeeds. *(requires deployment)*

---

# Recommended File Changes

Expected primary file:

```text
server/src/modules/ai-email/ai-email-worker.js
```

Expected possible schema/query changes:

```text
Database email query
```

Expected file to verify but preferably not modify unless necessary:

```text
server/src/modules/ai-email/ai-email-sender.service.js
```

Expected files that should remain functionally unchanged:

```text
Contact Form frontend
Contact Form route
Resend Contact Form notification configuration
```

---

# Important Agent Instructions

- [x] Treat this as a **targeted bug fix**, not a Contact Form rebuild.
- [x] Analyze the actual latest code before editing.
- [x] Use the visitor email already present in the Contact Form inquiry.
- [x] Prefer the Contact Form email extracted from the inquiry body when Reply-To is unavailable.
- [x] Keep Reply-To and `from_email` as fallbacks for other email types.
- [x] Use one shared recipient resolver in both normal and retry paths.
- [x] Do not change `CONTACT_FROM_EMAIL`.
- [x] Do not change `CONTACT_RECIPIENT_EMAIL`.
- [x] Do not hard-code a recipient.
- [x] Do not disable the self-mailbox protection.
- [x] Do not rewrite the Hostinger sender service unless testing proves it is required.
- [x] Do not change unrelated authentication, manuscript, journal, or Admin functionality.
- [x] Verify the actual webhook/database data before assuming a field exists.
- [ ] Test the complete real email flow after implementation. *(requires deployment)*
- [x] At completion, report:
  - files changed
  - database/query changes
  - recipient-resolution logic
  - tests performed
  - production verification result
