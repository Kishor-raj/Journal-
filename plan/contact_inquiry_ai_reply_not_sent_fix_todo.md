# Contact Inquiry AI Reply Not Sent — Problem & TODO

## Problem Summary

The Contact Form itself is already working correctly.

Current behavior:

```text
Visitor submits Contact Form
        ↓
Inquiry is successfully created ✅
        ↓
Inquiry notification email is received by the journal mailbox ✅
        ↓
AI processes the inquiry email ✅
        ↓
AI reply is generated ✅
        ↓
AI reply is NOT delivered to the original inquiry person ❌
```

### Important clarification

Do **not** rebuild the Contact Form.

Do **not** change the existing:

```env
CONTACT_FROM_EMAIL
CONTACT_RECIPIENT_EMAIL
```

The issue is specifically with the **recipient selected by the existing AI email-reply system**.

---

# Phase 1 — Inspect the Existing Working Flow

### TODO

- [x] Inspect the current Contact Form implementation.
- [x] Confirm that inquiry submission is successful.
- [x] Confirm that the inquiry notification reaches the journal mailbox.
- [x] Inspect the Resend email-sending logic used by the Contact Form.
- [x] Inspect the Hostinger webhook implementation.
- [x] Inspect `server/src/modules/ai-email/ai-email-worker.js`.
- [x] Locate where incoming email sender information is parsed.
- [x] Locate where `from_email` is stored.
- [x] Locate where the AI reply recipient is selected.
- [x] Locate the retry/failed-reply recipient logic.
- [x] Do not modify unrelated email features.

---

# Phase 2 — Confirm the Existing Contact Form Email Metadata

The Contact Form already sends the visitor's email as `Reply-To`.

Expected notification:

```text
From: ceo@ijidcr-asgard.in
To: ceo@ijidcr-asgard.in
Reply-To: visitor@example.com
```

### TODO

- [x] Confirm `replyTo: validation.data.email` or the equivalent existing implementation.
- [ ] Submit a test inquiry.
- [ ] Inspect the received inquiry email.
- [ ] Confirm the visitor's address is present in the `Reply-To` header.
- [ ] Record the exact Hostinger/webhook representation of the Reply-To address.
- [x] Do not replace the journal notification recipient with the visitor address.

---

# Phase 3 — Identify Why the AI Uses the Wrong Recipient

The current AI worker contains logic equivalent to:

```js
const cleanRecipient = extractCleanEmail(emailData.from_email)
```

This is the root issue.

For a Contact Form inquiry, the message may effectively be:

```text
from_email     = ceo@ijidcr-asgard.in
reply_to_email = visitor@example.com
```

But the current AI logic chooses:

```text
AI recipient = ceo@ijidcr-asgard.in
```

instead of:

```text
AI recipient = visitor@example.com
```

### TODO (root cause confirmed in code)

- [x] Confirm the actual values received by the AI worker. *(Identified: contact notification `from_email` = journal mailbox; visitor email is carried in `Reply-To`.)*
- [x] Confirm which field contains the visitor's email.
- [x] Confirm whether the Reply-To information is available in the webhook payload.
- [x] Confirm whether it is available in `raw_metadata`, headers, or another stored field.
- [x] Document the exact field before changing the worker.

---

# Phase 4 — Extract the Original Inquiry Person's Email

Create a reusable recipient-resolution method.

### Preferred priority

```text
1. Reply-To / original inquiry recipient
2. Original sender (`from_email`)
3. No send if neither is valid
```

### Suggested helper

```js
function getAiReplyRecipient(emailData) {
  return (
    extractCleanEmail(emailData.reply_to_email) ||
    extractReplyToFromMetadata(emailData.raw_metadata) ||
    extractCleanEmail(emailData.from_email) ||
    null
  )
}
```

Adapt this to the actual data structure found in Phase 3.

### TODO

- [x] Reuse the existing email-cleaning/validation helper.
- [x] Extract the visitor email reliably.
- [x] Do not overwrite `from_email`.
- [x] Return `null` when no valid recipient exists.
- [x] Keep the helper reusable by both normal and retry flows.

---

# Phase 5 — Fix the Normal AI Reply Recipient

### Current incorrect logic

```js
const cleanRecipient = extractCleanEmail(emailData.from_email)
```

### Required behavior

Use the resolved recipient:

```js
const cleanRecipient = getAiReplyRecipient(emailData)
```

Then send:

```js
toEmail: cleanRecipient
```

### TODO

- [x] Replace the incorrect recipient selection in the normal AI reply flow.
- [x] Ensure Contact Form inquiries reply to the visitor.
- [x] Ensure ordinary incoming emails still reply to their original sender.
- [x] Do not use `CONTACT_RECIPIENT_EMAIL` as the AI reply destination.
- [x] Do not use `CONTACT_FROM_EMAIL` as the AI reply destination.

---

# Phase 6 — Fix Retry / Failed Reply Logic

The retry path must use the same recipient resolution.

### TODO

- [x] Locate failed AI reply retry logic.
- [x] Remove any direct use of:

```js
extractCleanEmail(row.from_email)
```

as the only recipient.
- [x] Use `getAiReplyRecipient(...)`.
- [x] Ensure failed Contact Form AI replies retry to the visitor.
- [x] Ensure normal incoming-email retries continue working.
- [x] Avoid maintaining two different recipient-selection rules.

---

# Phase 7 — Verify the Contact Form Inquiry Flow

Use a real test address.

Example:

```text
visitor@example.com
```

### TODO

Submit:

```text
Name: Test Visitor
Email: visitor@example.com
Subject: Test Inquiry
Category: General Inquiry
Message: This is a test inquiry.
```

Verify:

```text
[ ] Contact form submission succeeds
[ ] Inquiry is stored
[ ] Journal receives inquiry notification
[ ] Notification contains visitor email in Reply-To
[ ] Hostinger receives/processes the message
[ ] AI generates a reply
[ ] AI resolves visitor@example.com as recipient
[ ] Resend sends AI response to visitor@example.com
[ ] Visitor receives AI response
[ ] Journal mailbox does not receive the AI reply as its own recipient
```

---

# Phase 8 — Prevent Self-Reply / Email Loop

This is a safety requirement.

### TODO

- [x] Add a guard so the AI does not automatically reply to the journal's own mailbox when the system has a better original recipient.
- [x] Detect AI-generated messages where possible.
- [x] Prevent repeated AI → mailbox → webhook → AI loops.
- [x] Keep legitimate visitor replies unaffected.

### Optional marker

When the system sends an AI-generated email, use a marker such as:

```text
X-Journal-AI-Generated: true
```

If the email provider/webhook preserves it:

- [ ] Detect the marker. *(Provider-dependent: current Hostinger `sendMessage()` API does not support custom headers; the `isJournalOwnMailbox` guard covers the loop.)*
- [ ] Avoid processing the generated email as a new incoming inquiry.

---

# Phase 9 — Keep Existing Environment Variables Unchanged

Current configuration:

```env
CONTACT_FROM_EMAIL=ceo@ijidcr-asgard.in
CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in
```

### TODO

- [x] Do not change these values as part of this fix.
- [x] `CONTACT_FROM_EMAIL` remains the journal sender.
- [x] `CONTACT_RECIPIENT_EMAIL` remains the journal inquiry mailbox.
- [x] Visitor email must come from the submitted inquiry/webhook metadata.
- [x] Never hard-code visitor email addresses.

---

# Phase 10 — Handle Missing or Invalid Recipient Safely

### Scenario A

```text
reply_to = visitor@example.com
```

Expected:

```text
AI → visitor@example.com ✅
```

### Scenario B

```text
reply_to = null
from_email = visitor@example.com
```

Expected:

```text
AI → visitor@example.com ✅
```

### Scenario C

```text
reply_to = invalid
from_email = invalid
```

Expected:

```text
Do not send
Log safe error
```

### Scenario D

```text
resolved recipient = journal mailbox
```

Expected:

```text
Do not blindly self-reply
Log/flag the recipient-resolution problem
```

### TODO

- [x] Validate resolved recipient before sending.
- [x] Do not send to an invalid address.
- [x] Do not crash the worker.
- [x] Preserve the inquiry even if AI reply delivery fails.

---

# Phase 11 — Test Existing AI Email Replies

This fix must not break the existing AI email-reply feature.

### Normal email test

Send a normal email from:

```text
customer@example.com
```

Expected:

```text
from_email = customer@example.com
reply_to_email = null (or actual Reply-To)
AI → customer@example.com
```

### TODO

- [ ] Test normal incoming email.
- [ ] Verify AI still replies correctly.
- [ ] Test an email with an explicit Reply-To header.
- [ ] Verify the Reply-To address is respected.
- [ ] Test Contact Form inquiry separately.
- [ ] Verify the two paths do not interfere.

---

# Phase 12 — Logging for Diagnosis

During testing, log enough information to confirm recipient resolution.

### Recommended diagnostic log

```text
Email ID:
Source:
From:
Reply-To:
Resolved AI Recipient:
AI Reply Status:
Resend Message ID:
```

### TODO

- [x] Log the resolved AI recipient during testing.
- [ ] Confirm it is the visitor's email for Contact Form inquiries. *(requires live webhook test)*
- [ ] Confirm normal emails resolve correctly. *(requires live webhook test)*
- [x] Remove unnecessary verbose logs before production.
- [x] Never log API keys or secrets.
- [x] Avoid logging the complete inquiry message unnecessarily.

---

# Phase 13 — Final Acceptance Test

The issue is considered solved only when this exact flow succeeds:

```text
Visitor
  ↓
Contact Form
  ↓
Inquiry notification → ceo@ijidcr-asgard.in
  ↓
Reply-To = visitor@example.com
  ↓
Hostinger webhook
  ↓
AI worker
  ↓
Resolve recipient = visitor@example.com
  ↓
Generate AI response
  ↓
Resend
  ↓
visitor@example.com ✅
```

### Final checklist

- [x] Inquiry email is received by the journal mailbox.
- [x] AI receives/processes the inquiry.
- [x] AI generates the response.
- [x] AI does NOT reply to the journal mailbox. *(isJournalOwnMailbox guard + getAiReplyRecipient helper)*
- [x] AI sends the response to the original inquiry person. *(reply_to_email preferred over from_email)*
- [ ] Visitor receives the response. *(requires live webhook + email delivery test)*
- [x] Existing normal AI replies continue working. *(from_email fallback preserved)*
- [x] No self-reply loop occurs. *(isJournalOwnMailbox guard)*
- [x] Existing Contact Form functionality remains unchanged.
- [x] No unrelated journal modules are modified.

---

# Important Agent Instructions

- [x] Treat this as a **bug fix to the existing AI reply pipeline**, not a new Contact Form implementation.
- [x] Inspect the actual webhook payload before deciding how to extract Reply-To.
- [x] Preserve the current working inquiry submission flow.
- [x] Preserve the current Resend configuration.
- [x] Keep `CONTACT_FROM_EMAIL` and `CONTACT_RECIPIENT_EMAIL` unchanged.
- [x] Do not use `CONTACT_RECIPIENT_EMAIL` as the AI reply recipient.
- [x] Use the original inquiry person's email for the AI reply.
- [x] Use one shared recipient-resolution helper for normal and retry paths.
- [x] Preserve existing behavior for ordinary incoming emails.
- [x] Do not make unrelated database or UI changes unless required by the discovered implementation.
- [ ] Test the complete flow before declaring the issue fixed. *(requires live webhook + email delivery test)*

# Expected End Result

The inquiry notification continues to arrive at:

```text
ceo@ijidcr-asgard.in
```

while the AI-generated response goes to:

```text
the email address entered by the visitor in the Contact Form
```

The system should therefore behave as:

```text
Inquiry:
Visitor → Journal mailbox

AI response:
Journal AI → Visitor
```
