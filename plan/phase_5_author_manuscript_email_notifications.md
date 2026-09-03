# Phase 5 — Author Manuscript Email Notifications

## Goal

Implement the author-facing transactional email workflows required by the journal system using the Resend email infrastructure from Phase 1 and the authentication/session foundation from Phases 2–3.

This phase covers:

1. Email when an author successfully submits a manuscript.
2. Email when a Moderator desk-rejects a manuscript.
3. Email when an Editor rejects a manuscript.
4. Email when an Editor accepts a manuscript.
5. Email when an Editor requests a **minor revision**.
6. Email when an Editor requests a **major revision**.
7. Reminder email for authors who have unfinished/draft manuscripts.
8. Reliable, auditable notification delivery without breaking the manuscript workflow when an email provider temporarily fails.

## Scope Boundary

This phase does **not** implement:

- Google OAuth changes.
- Manual registration/login.
- Email verification.
- Forgot-password/password-reset.
- Reviewer invitation emails.
- Full revision-response workflow.
- Withdrawal workflow.
- Publication emails.

Those belong to earlier/later phases.

---

# 5.1 Current Codebase Findings

The uploaded project already contains the important workflow hooks this phase should use rather than creating a parallel workflow.

### Existing notification infrastructure

- `server/src/modules/notification/notification.service.js`
- `server/src/modules/notification/notification.routes.js`
- `email_templates` table
- `workflow_logs` used for notification queue logging

Current `enqueueNotification()` looks up an active template by `template_key`, substitutes variables, and writes an `email_queued` workflow log. It currently **does not actually send through Resend**, so Phase 5 must connect the existing queue abstraction to the Resend sender from Phase 1.

### Existing manuscript submission workflow

`server/src/modules/manuscripts/manuscripts.service.js` contains `submitManuscript()` and transitions:

`draft -> submitted`

It also creates `manuscript_versions`, updates `current_version_id`, updates files, writes `manuscript_status_history`, and creates `user_activity`.

The submission email should be triggered only after this transaction succeeds.

### Existing Moderator decision workflow

`server/src/modules/moderation/moderation.service.js` contains:

- `proceed -> editor_assignment`
- `return -> draft`
- `reject -> desk_rejected`

The Moderator workflow stores `reason` and `notes_to_author` in `moderator_decisions`.

The required author email for a desk rejection should be triggered specifically when the decision becomes `desk_rejected`.

### Existing Editor decision workflow

`server/src/modules/editorial/editorial.service.js` contains:

- `accept -> accepted`
- `reject -> rejected`
- `minor_revision -> revision_requested`
- `major_revision -> revision_requested`

The important detail is that **minor and major revisions have the same manuscript status** (`revision_requested`). Therefore the email event must preserve the original editor decision (`minor_revision` or `major_revision`) instead of relying only on the manuscript status.

The editor decision also stores:

- `comments_to_author`
- `internal_notes`
- `instructions`

Only author-safe fields must be included in author emails. Never expose `internal_notes`.

### Existing seeded email templates

The seed currently includes:

- `submission_received`
- `desk_rejected`
- `reviewer_invited`
- `decision_issued`

Phase 5 should extend/refine this template model instead of replacing it.

---

# 5.2 Notification Event Matrix

Create one explicit mapping between workflow events and email templates.

| Event | Trigger | Recipient | Template |
|---|---|---|---|
| Manuscript submitted | `draft -> submitted` | submitting author | `submission_received` |
| Desk rejected | `submitted/under_moderation -> desk_rejected` | submitting/corresponding author | `desk_rejected` |
| Editor rejected | editor decision `reject` | submitting/corresponding author | `editorial_rejected` |
| Editor accepted | editor decision `accept` | submitting/corresponding author | `editorial_accepted` |
| Minor revision | editor decision `minor_revision` | submitting/corresponding author | `minor_revision_requested` |
| Major revision | editor decision `major_revision` | submitting/corresponding author | `major_revision_requested` |
| Draft reminder | scheduled job finds stale draft | submitting author | `draft_reminder` |

### Recommendation

Do not use one ambiguous `decision_issued` template for all decisions unless its variables are deliberately designed for all four decision types. Prefer separate templates because the wording, subject, and action required by the author are materially different.

---

# 5.3 Define the Email Recipient Rule

The system must have one consistent recipient rule.

## Recommended rule

Primary recipient:

1. `manuscripts.submitted_by` user email.
2. If the project later supports a distinct corresponding-author account, allow the corresponding author to become the primary recipient.
3. Other authors should **not automatically receive every transactional email** in this phase unless explicitly required by product requirements.

### Todos

- [ ] Create a helper such as `getManuscriptNotificationRecipient(manuscriptId)`.
- [ ] Fetch only the recipient fields needed by the email sender.
- [ ] Normalize email addresses through the database's existing `CITEXT` behavior.
- [ ] Handle missing/disabled accounts gracefully.
- [ ] Never send an email to an internal reviewer/editor/moderator address by mistake.

---

# 5.4 Email Service Integration

Connect the notification service created in Phase 1 to Resend.

## Desired architecture

```text
Manuscript workflow
        |
        v
Notification event
        |
        v
notification.service.js
        |
        +----> Load email_templates
        |
        +----> Render variables
        |
        +----> Create notification record/log
        |
        v
Resend email service
        |
        v
Recipient inbox
```

### Todos

- [ ] Reuse the Resend client/service created in Phase 1.
- [ ] Keep `RESEND_API_KEY` server-side only.
- [ ] Keep sender identity configurable through environment variables.
- [ ] Add a stable `EMAIL_FROM` configuration.
- [ ] Add an application/public URL configuration used to construct action links.
- [ ] Return provider message/id metadata where available.
- [ ] Distinguish `queued`, `sent`, `failed` and `skipped` outcomes.
- [ ] Do not expose Resend provider errors directly to authors.

---

# 5.5 Improve Notification Persistence

The current `workflow_logs` approach is useful for workflow auditing but is not sufficient as a durable email-delivery ledger by itself.

## Recommended migration

Create a dedicated `email_notifications` table.

Suggested fields:

```text
id UUID PRIMARY KEY
journal_id UUID NULL/NOT NULL
manuscript_id UUID NULL
recipient_user_id UUID NULL
recipient_email CITEXT NOT NULL
template_key VARCHAR(100) NOT NULL
related_event_id UUID NULL
data JSONB
provider VARCHAR(50)
provider_message_id VARCHAR(255)
status VARCHAR(30)
attempt_count INTEGER DEFAULT 0
last_error TEXT
queued_at TIMESTAMPTZ DEFAULT now()
sent_at TIMESTAMPTZ NULL
failed_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### Recommended uniqueness/idempotency

For transactional manuscript events, introduce an event identity so that a retried HTTP request cannot accidentally send duplicate messages.

Example concept:

```text
event_key = "manuscript:<manuscript_id>:submission_received"
event_key = "manuscript:<manuscript_id>:editorial_decision:<decision_id>"
```

### Todos

- [ ] Add migration for `email_notifications`.
- [ ] Add index on `manuscript_id`.
- [ ] Add index on `recipient_user_id`.
- [ ] Add index on `status`.
- [ ] Add unique/idempotency constraint for event keys where appropriate.
- [ ] Add updated-at trigger if the project already uses a common trigger pattern.

---

# 5.6 Template Definitions

Add/update these templates in the seed data.

## 5.6.1 Submission Received

**Template key:** `submission_received`

Suggested subject:

```text
Your manuscript has been submitted — {{submission_number}}
```

Variables:

```text
{{author_name}}
{{submission_number}}
{{manuscript_title}}
{{journal_name}}
{{submitted_at}}
{{manuscript_url}}
```

Content should tell the author:

- Submission was successfully received.
- Submission number.
- Manuscript title.
- What happens next: moderation/editorial screening.
- Link to view submission status.

Do not claim peer review has started unless the workflow actually says so.

---

## 5.6.2 Desk Rejected

**Template key:** `desk_rejected`

Suggested subject:

```text
Update on manuscript {{submission_number}}
```

Variables:

```text
{{author_name}}
{{submission_number}}
{{manuscript_title}}
{{decision_reason}}
{{moderation_notes_to_author}}
{{manuscript_url}}
{{journal_name}}
```

Use author-safe `reason`/`notes_to_author` data from the Moderator decision.

Never include internal moderator notes that are not intended for the author.

---

## 5.6.3 Editorial Rejected

**Template key:** `editorial_rejected`

Variables:

```text
{{author_name}}
{{submission_number}}
{{manuscript_title}}
{{comments_to_author}}
{{decision_date}}
{{manuscript_url}}
{{journal_name}}
```

Do not include `internal_notes`.

---

## 5.6.4 Editorial Accepted

**Template key:** `editorial_accepted`

Variables:

```text
{{author_name}}
{{submission_number}}
{{manuscript_title}}
{{decision_date}}
{{manuscript_url}}
{{journal_name}}
```

State clearly that the manuscript has been accepted according to the journal's actual workflow.

Do not promise a publication date unless one exists.

---

## 5.6.5 Minor Revision Requested

**Template key:** `minor_revision_requested`

Variables:

```text
{{author_name}}
{{submission_number}}
{{manuscript_title}}
{{revision_instructions}}
{{revision_due_at}}
{{revision_url}}
{{journal_name}}
```

The email should tell the author:

- Minor revision is requested.
- What needs to be changed.
- Revision deadline.
- Where to submit the revision.

---

## 5.6.6 Major Revision Requested

**Template key:** `major_revision_requested`

Variables:

```text
{{author_name}}
{{submission_number}}
{{manuscript_title}}
{{revision_instructions}}
{{revision_due_at}}
{{revision_url}}
{{journal_name}}
```

Use stronger wording that clearly communicates that substantial changes are requested, without sounding punitive.

---

## 5.6.7 Draft Reminder

**Template key:** `draft_reminder`

Suggested subject:

```text
You have an unfinished manuscript draft
```

Variables:

```text
{{author_name}}
{{manuscript_title}}
{{submission_number}}
{{last_updated_at}}
{{draft_url}}
{{journal_name}}
```

The email should be informational and non-alarming.

---

# 5.7 Submission Received Trigger

Modify:

```text
server/src/modules/manuscripts/manuscripts.service.js
```

Current flow:

```text
BEGIN
  create version
  update files
  update manuscript status
  insert status history
  insert user activity
COMMIT
```

Recommended Phase 5 flow:

```text
BEGIN
  create version
  update files
  update manuscript status
  insert status history
  insert user activity
COMMIT

queue/send submission_received email
```

### Critical rule

Do **not** call external Resend API while the PostgreSQL transaction is still open.

Why:

- Network calls can be slow.
- Resend could be unavailable.
- The database transaction should not remain locked while waiting on an external API.

### Todos

- [ ] After successful `COMMIT`, fetch the recipient and manuscript email data.
- [ ] Create an idempotent notification event.
- [ ] Send or queue `submission_received`.
- [ ] Log success/failure.
- [ ] Return the manuscript submission response regardless of email-provider failure.
- [ ] Ensure a failed email never rolls back the actual manuscript submission.

---

# 5.8 Moderator Desk-Rejection Email Trigger

Modify:

```text
server/src/modules/moderation/moderation.service.js
```

Current state transition:

```text
reject -> desk_rejected
```

### Required behavior

After the Moderator transaction commits:

```text
desk_rejected event
        |
        v
load author + manuscript + moderator decision
        |
        v
send desk_rejected email
```

### Todos

- [ ] Preserve the moderation decision ID returned/created by the transaction.
- [ ] After commit, load the author-facing decision data.
- [ ] Map `reason` and `notes_to_author` to the email template.
- [ ] Send `desk_rejected`.
- [ ] Add idempotency key based on `moderator_decision.id`.
- [ ] Record notification result.
- [ ] Do not send the email if the transaction rolls back.

---

# 5.9 Editor Decision Emails

Modify:

```text
server/src/modules/editorial/editorial.service.js
```

The existing `submitDecision()` already accepts:

```text
accept
reject
minor_revision
major_revision
```

### Important implementation rule

The notification should be triggered from the **editorial decision record**, not only from the final manuscript status.

Reason:

```text
minor_revision -> revision_requested
major_revision -> revision_requested
```

The manuscript status alone cannot tell the two decisions apart.

### Todos

- [ ] Capture `editorial_decisions.id` after insertion.
- [ ] Commit the decision/status transaction.
- [ ] After commit, switch on the original `decision` value.
- [ ] `accept` -> `editorial_accepted`.
- [ ] `reject` -> `editorial_rejected`.
- [ ] `minor_revision` -> `minor_revision_requested`.
- [ ] `major_revision` -> `major_revision_requested`.
- [ ] Include `comments_to_author` only in author-facing templates.
- [ ] Include revision instructions for revision requests.
- [ ] Include `due_at` for revision-request emails.
- [ ] Never include `internal_notes`.
- [ ] Use the decision ID for idempotency.

---

# 5.10 Recommended Refactor: Explicit Notification Event Dispatcher

Create a small service rather than embedding email logic throughout the manuscript services.

Suggested file:

```text
server/src/modules/notification/manuscript-notification.service.js
```

Suggested functions:

```js
sendSubmissionReceived(manuscriptId)
sendDeskRejected(manuscriptId, decisionId)
sendEditorialAccepted(manuscriptId, decisionId)
sendEditorialRejected(manuscriptId, decisionId)
sendMinorRevisionRequested(manuscriptId, decisionId)
sendMajorRevisionRequested(manuscriptId, decisionId)
sendDraftReminder(manuscriptId)
```

### Benefits

- Manuscript workflow code stays focused on state transitions.
- Email behavior is centralized.
- Tests become easier.
- Resend changes do not require rewriting manuscript services.
- Templates/variables remain consistent.

---

# 5.11 Draft Manuscript Reminder System

This is the only notification in this phase that should normally be scheduled rather than triggered directly by a workflow action.

## Recommended rule

A draft becomes eligible for a reminder after a configurable inactivity period.

Example configuration:

```env
DRAFT_REMINDER_AFTER_DAYS=3
DRAFT_REMINDER_COOLDOWN_DAYS=7
```

These values should be configurable rather than hard-coded.

### Important behavior

Do not send a reminder for every draft every day.

A draft should receive at most one reminder during the configured cooldown period.

### Query concept

Find manuscripts where:

```text
current_status = 'draft'
AND submitted_by IS NOT NULL
AND updated_at <= now() - reminder_age
AND author account is active
```

Exclude drafts that:

- have been deleted
- belong to disabled/locked users where the product should not send normal notifications
- already received a draft reminder within the cooldown window

### Scheduler implementation

Use the project's existing scheduling/background-job approach where available.

Do not put long-running reminder loops inside an Express request handler.

Possible implementation choices:

- cron/job runner
- queue worker
- scheduled Node process
- external scheduler calling an authenticated internal endpoint

### Todos

- [ ] Add configurable reminder age.
- [ ] Add configurable cooldown.
- [ ] Create `findDraftsEligibleForReminder()`.
- [ ] Create `sendDraftReminder()`.
- [ ] Record the reminder in `email_notifications`.
- [ ] Make reminder generation idempotent.
- [ ] Add a scheduled job.
- [ ] Add a manual admin/test command for triggering reminders in development.
- [ ] Ensure a failed reminder for one author does not stop reminders for other authors.

---

# 5.12 Avoid Duplicate Email Sends

Duplicate sends are especially likely when an HTTP request is retried or when a frontend accidentally double-submits a decision.

Use an idempotent event key.

Examples:

```text
submission:<manuscript_id>:received
moderator_decision:<decision_id>:author_email
editorial_decision:<decision_id>:author_email
```

Before sending:

```text
SELECT email_notifications WHERE event_key = $1
```

If an already successful notification exists:

```text
SKIP
```

If it failed and retry policy allows retries:

```text
RETRY
```

---

# 5.13 Email Failure Must Not Break Manuscript Workflow

This is a critical rule for every transactional email in Phase 5.

Example:

```text
Editor clicks Accept
        |
        v
DB transaction
        |
        +--> editorial_decisions inserted
        +--> manuscript = accepted
        +--> status history inserted
        |
        COMMIT
        |
        v
Email attempt
        |
        X Resend temporarily unavailable
```

Expected result:

- Manuscript remains `accepted`.
- Decision remains persisted.
- User gets the correct application response.
- Email notification is marked failed/retryable.
- System can retry without creating another editorial decision.

Never roll back a valid manuscript decision only because email delivery failed.

---

# 5.14 Retry Strategy

Implement a simple retry mechanism for transient Resend/provider errors.

Recommended initial strategy:

```text
attempt 1 -> immediate
attempt 2 -> short delay
attempt 3 -> longer delay
then -> failed / requires later retry
```

Do not retry permanent errors such as obviously invalid recipient addresses indefinitely.

### Todos

- [ ] Categorize provider failures as transient/permanent where practical.
- [ ] Store `attempt_count`.
- [ ] Store `last_error`.
- [ ] Store `provider_message_id` on success.
- [ ] Add a retry worker or administrative retry command.
- [ ] Add monitoring/logging for repeated failures.

---

# 5.15 Email Links

Every relevant email should include an authenticated application link where appropriate.

Examples:

```text
{{manuscript_url}}
{{revision_url}}
{{draft_url}}
```

Construct links from a trusted server-side configuration such as:

```env
APP_BASE_URL=https://journal.example.com
```

### Security requirements

- [ ] Never construct URLs using untrusted `Host` headers.
- [ ] Never embed passwords, session tokens, reset tokens, or secrets in ordinary manuscript links.
- [ ] Do not put sensitive internal IDs in unnecessary public URLs.
- [ ] Ensure authorization is still enforced when the user opens the link.

---

# 5.16 Author Email Content Rules

All author-facing emails should follow these rules:

- [ ] Use the journal's configured name.
- [ ] Use the author's preferred display name.
- [ ] Use a consistent sender address.
- [ ] Include the manuscript submission number.
- [ ] Include the manuscript title.
- [ ] Clearly explain the action/state.
- [ ] Include the next action when one exists.
- [ ] Include a direct dashboard link where useful.
- [ ] Keep internal workflow notes private.
- [ ] Use both HTML and plain-text versions.
- [ ] Keep wording professional and neutral.

---

# 5.17 Template Management in Admin UI

The existing admin notification-template endpoints already expose:

```text
GET /api/notifications/templates
PATCH /api/notifications/templates/:key
```

Phase 5 should make these templates usable for the new email keys.

### Todos

- [ ] Display all Phase 5 template keys in the Admin email-template page.
- [ ] Display the supported variable names for each template.
- [ ] Validate template variables before saving.
- [ ] Prevent administrators from accidentally deleting required templates.
- [ ] Allow templates to be disabled intentionally.
- [ ] Show an informative warning when a required transactional template is inactive.
- [ ] Add a test-send feature later only if appropriate permissions and safeguards are implemented.

---

# 5.18 Recommended Database / Migration Work

Create migration(s) for notification delivery persistence.

Suggested naming after the existing latest migration number:

```text
00XX_create_email_notifications.sql
00XX_create_email_notifications.down.sql
```

### Migration todos

- [ ] Create table.
- [ ] Add foreign key to manuscript where appropriate.
- [ ] Add foreign key to recipient user where appropriate.
- [ ] Add `event_key`.
- [ ] Add `status` enum/check constraint.
- [ ] Add timestamps.
- [ ] Add provider metadata.
- [ ] Add useful indexes.
- [ ] Add rollback migration.
- [ ] Update seed templates.

---

# 5.19 Backend Files To Create / Modify

## Modify

```text
server/src/modules/notification/notification.service.js
server/src/modules/manuscripts/manuscripts.service.js
server/src/modules/moderation/moderation.service.js
server/src/modules/editorial/editorial.service.js
server/src/db/seed.js
```

## Likely create

```text
server/src/modules/notification/manuscript-notification.service.js
server/src/db/migrations/00XX_create_email_notifications.sql
server/src/db/migrations/00XX_create_email_notifications.down.sql
```

Exact migration numbering should follow the project's current highest migration number at implementation time.

---

# 5.20 Frontend Work

Author UI should not need a large redesign for transactional emails, but the status pages should reflect the same terminology used by emails.

### Todos

- [ ] Ensure submission detail page shows `Submitted` after successful submission.
- [ ] Ensure desk-rejected state is clearly visible.
- [ ] Ensure accepted state is clearly visible.
- [ ] Ensure rejected state is clearly visible.
- [ ] Ensure minor/major revision status is visible and distinguishable where possible.
- [ ] Add a clear `Revise Manuscript` CTA when revision workflow becomes available.
- [ ] Add a clear `Continue Draft` CTA for draft manuscripts.
- [ ] Ensure links opened from emails route to the correct author page.

---

# 5.21 Logging and Audit Requirements

For every email event, record enough information to answer:

```text
What happened?
Which manuscript?
Which author?
Which template?
When was it attempted?
Was it sent?
What provider message ID was returned?
Did it fail?
Why did it fail?
Was it retried?
```

### Do not log

- Resend API key.
- Passwords.
- Reset tokens.
- Session cookies.
- Full private manuscript content.

---

# 5.22 Testing Strategy

## Unit tests

- [ ] Template selection works for every event.
- [ ] Variable replacement works.
- [ ] Missing optional variables do not crash rendering.
- [ ] Internal-only variables are never sent to author templates.
- [ ] Event keys are deterministic.
- [ ] Duplicate event is skipped.

## Submission tests

- [ ] Successful submission triggers `submission_received`.
- [ ] Failed database transaction sends no email.
- [ ] Failed email does not undo successful submission.

## Moderator tests

- [ ] `reject` triggers `desk_rejected`.
- [ ] `proceed` sends no desk-rejection email.
- [ ] `return` to draft sends no desk-rejection email.
- [ ] Author-safe moderator reason is included.

## Editor tests

- [ ] `accept` triggers `editorial_accepted`.
- [ ] `reject` triggers `editorial_rejected`.
- [ ] `minor_revision` triggers `minor_revision_requested`.
- [ ] `major_revision` triggers `major_revision_requested`.
- [ ] `minor_revision` and `major_revision` are not confused because both result in `revision_requested`.
- [ ] `internal_notes` never appear in outgoing emails.

## Draft reminder tests

- [ ] Fresh drafts are not reminded.
- [ ] Stale drafts become eligible.
- [ ] Recent reminder prevents duplicate reminder within cooldown.
- [ ] Deleted drafts are ignored.
- [ ] Disabled/locked users follow the configured notification policy.
- [ ] Failure for one draft does not stop processing other drafts.

## Resend tests

Use a development/test sender flow before production delivery.

- [ ] Successful provider response is stored.
- [ ] Provider error is stored.
- [ ] Retry logic works.
- [ ] Permanent failure is not retried forever.

---

# 5.23 Manual End-to-End Test Matrix

Run these manually with a test author account.

### Scenario A — Submission

```text
Author creates draft
        -> completes manuscript
        -> clicks Submit
        -> DB status becomes submitted
        -> submission email received
```

### Scenario B — Desk rejection

```text
Moderator opens submitted manuscript
        -> selects Reject
        -> saves author-facing reason
        -> manuscript becomes desk_rejected
        -> desk rejection email received
```

### Scenario C — Editor rejection

```text
Editor opens manuscript
        -> selects Reject
        -> enters comments_to_author
        -> submits decision
        -> manuscript becomes rejected
        -> rejection email received
```

### Scenario D — Acceptance

```text
Editor selects Accept
        -> manuscript becomes accepted
        -> author receives acceptance email
```

### Scenario E — Minor revision

```text
Editor selects Minor Revision
        -> enters instructions
        -> revision request created
        -> manuscript becomes revision_requested
        -> author receives minor revision email
```

### Scenario F — Major revision

```text
Editor selects Major Revision
        -> enters instructions
        -> revision request created
        -> manuscript becomes revision_requested
        -> author receives major revision email
```

### Scenario G — Draft reminder

```text
Author leaves a draft untouched
        -> scheduler runs
        -> draft qualifies
        -> reminder email sent
        -> second scheduler run does not duplicate the reminder
```

---

# 5.24 Error Scenarios

Test the following deliberately:

- [ ] Resend API is unavailable.
- [ ] Resend API key is invalid.
- [ ] Sender address is invalid.
- [ ] Recipient email is invalid.
- [ ] Email template is missing.
- [ ] Email template is inactive.
- [ ] Template has an invalid variable.
- [ ] Database is temporarily unavailable while creating notification record.
- [ ] Database commit succeeds but provider send fails.
- [ ] Request is retried after a successful decision.
- [ ] Two simultaneous requests try to create the same notification.

Expected outcome: manuscript state remains correct and notification state is independently recoverable.

---

# 5.25 Security Checklist

- [ ] Resend API key is server-only.
- [ ] Sender address is validated/configured server-side.
- [ ] Author authorization remains enforced on dashboard links.
- [ ] No internal notes are exposed.
- [ ] No session/reset token is placed in ordinary notification URLs.
- [ ] Email content is treated as untrusted output when inserting user-provided strings into HTML.
- [ ] HTML escaping is applied to variables before insertion into HTML templates.
- [ ] Plain-text templates remain available.
- [ ] Notification endpoints remain admin-protected.
- [ ] Draft reminders do not disclose manuscript information to the wrong recipient.

---

# 5.26 Observability

Add logs/metrics that make delivery issues obvious.

Recommended counters/logs:

```text
email_attempted
email_sent
email_failed
email_retry
email_skipped_duplicate
email_template_missing
email_template_disabled
```

Useful dimensions:

```text
template_key
provider
status
```

Do not log entire email bodies in production unless there is a deliberate privacy/security reason.

---

# 5.27 Production Readiness

Before enabling these emails in production:

- [ ] Resend production API key configured.
- [ ] Sending domain verified in Resend.
- [ ] SPF/DKIM configuration completed according to Resend requirements.
- [ ] Production `APP_BASE_URL` configured.
- [ ] Production sender configured.
- [ ] Templates reviewed by journal/client.
- [ ] Reply-to address configured if required.
- [ ] Failure monitoring enabled.
- [ ] Retry strategy verified.
- [ ] Draft reminder schedule reviewed with client.
- [ ] Rate limits and provider limits considered.
- [ ] Test accounts removed/disabled where appropriate.

---

# 5.28 Implementation Order

Implement the work in this order so each step remains testable.

## Step 1 — Notification persistence

- [ ] Create `email_notifications` migration.
- [ ] Add model/service functions.
- [ ] Add event/idempotency key support.

## Step 2 — Resend sender

- [ ] Connect existing notification service to Resend.
- [ ] Implement send result persistence.
- [ ] Implement error handling.

## Step 3 — Templates

- [ ] Add all seven templates.
- [ ] Add variables schemas.
- [ ] Seed default HTML/text content.

## Step 4 — Submission email

- [ ] Integrate with `submitManuscript()`.
- [ ] Trigger only after successful commit.
- [ ] Test.

## Step 5 — Moderator desk rejection email

- [ ] Integrate after moderation decision commit.
- [ ] Test `reject`, `return`, and `proceed` paths.

## Step 6 — Editor decision emails

- [ ] Integrate after `submitDecision()` commit.
- [ ] Handle all four decision values.
- [ ] Test internal-note isolation.

## Step 7 — Draft reminder job

- [ ] Add eligibility query.
- [ ] Add cooldown/idempotency handling.
- [ ] Add scheduler.
- [ ] Test repeated executions.

## Step 8 — Admin template verification

- [ ] Verify templates appear in Admin UI.
- [ ] Verify edit/save behavior.
- [ ] Verify inactive-template behavior.

## Step 9 — Full end-to-end testing

- [ ] Execute all scenarios in Section 5.23.
- [ ] Execute all failure cases in Section 5.24.

---

# 5.29 Definition of Done

Phase 5 is complete only when all of the following are true:

- [ ] A submitted manuscript generates a `submission_received` email.
- [ ] A Moderator desk rejection generates a `desk_rejected` email.
- [ ] An Editor rejection generates an `editorial_rejected` email.
- [ ] An Editor acceptance generates an `editorial_accepted` email.
- [ ] A minor revision generates a `minor_revision_requested` email.
- [ ] A major revision generates a `major_revision_requested` email.
- [ ] Stale author drafts generate reminder emails according to configurable rules.
- [ ] Emails are sent through Resend.
- [ ] Email delivery attempts are persisted and auditable.
- [ ] Duplicate transactional emails are prevented through idempotency.
- [ ] Email failures never roll back successful manuscript state changes.
- [ ] Retryable email failures can be retried.
- [ ] Internal notes are never exposed to authors.
- [ ] HTML and plain-text versions exist for each required template.
- [ ] Admin can manage the templates through the existing notification-template UI.
- [ ] Production sender/domain configuration has been tested.

---

# 5.30 Exit Criteria / Next Phase

After this phase, the remaining email-related requirements are primarily operational/advanced workflow notifications such as:

- Revision submitted/received notifications.
- Withdrawal notifications.
- Reviewer completion/reminder notifications.
- Publication notifications.
- Additional editor/moderator internal notifications.

Phase 5 should not block the core journal workflow on any of these additional emails.

---

# Final Implementation Rule

The most important architectural rule for Phase 5 is:

```text
DATABASE WORKFLOW STATE
        |
        |  commit first
        v
EMAIL NOTIFICATION
        |
        v
RESEND
```

Never make a manuscript submission or editorial decision depend on the availability of Resend.

The database is the source of truth for the manuscript workflow. Resend is the delivery mechanism for communicating that already-committed state to the author.
