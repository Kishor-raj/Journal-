# Phase 4 — Reviewer Invitation Email Workflow

## Status
- [x] Phase 1 — Resend Email Infrastructure completed
- [x] Phase 2 — Manual Registration/Login/Email Verification completed
- [x] Phase 3 — Forgot Password/Password Reset completed
- [x] Phase 4 — Reviewer Invitation Emails — **DONE**

---

# 1. Phase Objective

Implement the complete **Editor → Reviewer invitation email workflow** in the Journal Management System.

When an Editor invites a Reviewer to review a manuscript, the system must:

1. Validate the Editor, manuscript, reviewer, conflict-of-interest rules, and deadline.
2. Create the reviewer assignment and invitation record transactionally.
3. Generate a cryptographically secure invitation token.
4. Store only the token hash in PostgreSQL.
5. Send the Reviewer a professional invitation email through **Resend**.
6. Provide a secure invitation link in the email.
7. Allow the Reviewer to open the invitation and authenticate safely.
8. Allow the Reviewer to accept or decline the invitation.
9. Keep the existing authenticated dashboard flow working.
10. Record invitation/email/audit activity.
11. Handle expiry, duplicate invitations, failed email delivery, and resend scenarios correctly.

This phase should integrate with the existing reviewer workflow rather than replace it.

---

# 2. Current Codebase Findings

The uploaded project already contains most of the core reviewer workflow.

## Backend files already present

- `server/src/modules/editorial/editorial.service.js`
- `server/src/modules/editorial/editorial.routes.js`
- `server/src/modules/reviewer/reviewer.service.js`
- `server/src/modules/reviewer/reviewer.routes.js`
- `server/src/modules/notification/notification.service.js`
- `server/src/config/env.js`
- `server/src/middleware/authenticate.js`
- `server/src/middleware/authorize.js`

## Frontend files already present

- `client/src/features/editor/ReviewerSelectionPanel.jsx`
- `client/src/features/editor/ReviewerManagement.jsx`
- `client/src/features/reviewer/Invitations.jsx`
- `client/src/services/editorialService.js`
- `client/src/services/reviewerService.js`

## Existing database tables

- `reviewer_invitations`
- `reviewer_assignments`
- `reviewer_suggestions`
- `reviews`
- `email_templates`
- `workflow_logs`
- `audit_logs`
- `user_activity`

## Important existing implementation

`editorial.service.js` already has an `inviteReviewer()` function that:

- validates manuscript state,
- validates editor ownership,
- validates reviewer status,
- checks conflict of interest,
- prevents an existing pending invitation,
- creates a reviewer assignment,
- creates a random token,
- stores a SHA-256 token hash,
- sets invitation expiration,
- updates manuscript review status.

The main Phase 4 work is therefore to connect this existing workflow to the Resend notification system and make the invitation-token lifecycle complete.

---

# 3. Existing Reviewer Invitation Database Design

Current table:

```sql
CREATE TABLE reviewer_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assignment_id UUID REFERENCES reviewer_assignments(id) ON DELETE SET NULL,
  token_hash CHAR(64) UNIQUE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response invitation_response_enum,
  suggested_reviewer_name VARCHAR(255),
  suggested_reviewer_email CITEXT,
  suggested_reviewer_institution VARCHAR(255),
  suggestion_reason TEXT
);
```

The current schema is a good foundation, but the implementation should verify whether additional fields are needed for reliable email delivery tracking.

Recommended fields to evaluate:

```text
email_status
email_sent_at
email_message_id
email_error
resend_count
last_resent_at
```

Do not add all fields automatically. Add only what is required by the project's final notification/audit design.

---

# 4. Email Event to Implement

## Primary event

```text
reviewer.invited
```

This event occurs after a reviewer invitation has been successfully created.

## Email template key

Recommended:

```text
reviewer_invitation
```

Use a single stable template key rather than hard-coding email HTML inside `editorial.service.js`.

---

# 5. Reviewer Invitation Lifecycle

Implement the lifecycle below.

```text
Editor opens manuscript
        |
        v
Select eligible reviewer
        |
        v
Set review deadline
        |
        v
POST /editorial/manuscripts/:id/invite-reviewer
        |
        v
Validate editor/manuscript/reviewer/conflict
        |
        v
Create assignment + invitation in DB transaction
        |
        v
Generate invitation token
        |
        v
Hash token and store hash only
        |
        v
Commit DB transaction
        |
        v
Build secure invitation URL
        |
        v
Send email via Resend
        |
        +------> Email succeeds --> record email result
        |
        +------> Email fails -----> record failure/retry state
                                      |
                                      v
                              Editor can resend
```

Reviewer flow:

```text
Reviewer receives email
        |
        v
Clicks invitation link
        |
        v
Validate invitation token
        |
        +---- expired/invalid ----> show invalid/expired page
        |
        v
Show manuscript invitation summary
        |
        v
Require authentication if necessary
        |
        v
Accept / Decline
        |
        +---- Accept ----> assignment = accepted
        |
        +---- Decline ----> assignment = declined
        |
        v
Record responded_at + activity/audit event
```

---

# 6. Phase 4A — Define the Email Contract

- [x] Define `reviewer_invitation` as the official template key.
- [x] Define the required template variables.
- [x] Add the variable schema to `email_templates`.
- [x] Define HTML and plain-text versions.
- [x] Ensure the template does not expose confidential manuscript content.

Recommended variables:

```text
reviewer_name
manuscript_title
submission_number
journal_name
editor_name
review_deadline
invitation_url
```

Optional:

```text
journal_contact_email
journal_url
reviewer_instructions_url
```

Do not expose:

```text
reviewer identity of other reviewers
confidential reviewer comments
internal editorial notes
author contact details unless explicitly required
private manuscript files
```

---

# 7. Phase 4B — Add Reviewer Invitation Template

## Database

- [x] Create migration/seed/update logic for `reviewer_invitation`.
- [x] Insert HTML body.
- [x] Insert plain-text body.
- [x] Insert subject.
- [x] Add a variables schema.
- [x] Mark the template active.

Recommended subject:

```text
You are invited to review a manuscript for {{journal_name}}
```

Example content structure:

```text
Dear {{reviewer_name}},

You have been invited to review the following manuscript:

Title: {{manuscript_title}}
Submission: {{submission_number}}
Review deadline: {{review_deadline}}

Please review the invitation and respond using the secure link below:

{{invitation_url}}

Thank you,
{{journal_name}}
```

The actual final copy should be professional and appropriate for the journal.

---

# 8. Phase 4C — Connect `inviteReviewer()` to Notification Service

Current location:

```text
server/src/modules/editorial/editorial.service.js
```

Existing function:

```js
inviteReviewer(manuscriptId, editorId, reviewerId, deadline)
```

Current behavior already creates the invitation token and hash.

Required changes:

- [x] Import the notification/email service.
- [x] Load reviewer information needed for the email.
- [x] Load manuscript information required by the template.
- [x] Load editor information if the template uses the editor name.
- [x] Generate the final invitation URL.
- [x] Queue/send the email after the transaction succeeds.
- [x] Do not send the email before the database transaction is safely committed.

### Important transaction rule

Do **not** send an email from inside the open PostgreSQL transaction before `COMMIT`.

Recommended sequence:

```text
BEGIN
  validate
  create assignment
  create invitation
  commit

send email
```

This prevents the system from sending an invitation to a reviewer for an assignment that ultimately rolled back.

---

# 9. Phase 4D — Invitation Token URL

The current service returns the raw token from `inviteReviewer()`.

Do not expose that token in normal Editor API responses after production implementation.

Instead construct a URL such as:

```text
https://journal.example.com/reviewer/invitations/<invitation-id>?token=<raw-token>
```

or, preferably, a route where the token is handled securely by the invitation page/API.

Example configuration:

```env
REVIEWER_INVITATION_PATH=/reviewer/invitations
```

Then build:

```text
CLIENT_ORIGIN + REVIEWER_INVITATION_PATH + /<invitation-id>?token=<token>
```

Requirements:

- [x] Use `CLIENT_ORIGIN` from environment configuration.
- [x] Use HTTPS in production.
- [x] Never hard-code the production domain.
- [x] Never place the token into logs.
- [x] Never store the raw token in PostgreSQL.
- [x] Never send the token in analytics events.

---

# 10. Phase 4E — Secure Invitation Validation Endpoint

The existing application currently responds to invitations through an authenticated endpoint:

```text
PATCH /reviewer/invitations/:id
```

That workflow should remain available.

Phase 4 should add a secure invitation-link validation flow rather than making the token itself an authentication credential for the whole application.

Recommended endpoint:

```text
GET /reviewer/invitations/:id/validate?token=...
```

Responsibilities:

- [x] Hash the supplied token.
- [x] Find the invitation by ID + token hash.
- [x] Verify invitation exists.
- [x] Verify `response IS NULL`.
- [x] Verify invitation has not expired.
- [x] Verify assignment still exists when required.
- [x] Verify reviewer account is still active.
- [x] Return only safe invitation metadata.

Safe response example:

```json
{
  "valid": true,
  "invitation_id": "...",
  "manuscript_title": "...",
  "submission_number": "...",
  "deadline": "...",
  "reviewer_email": "...",
  "requires_login": true
}
```

Do not return:

- raw token,
- token hash,
- internal notes,
- confidential manuscript data,
- other reviewers,
- author private information.

---

# 11. Phase 4F — Decide Authentication Behavior

Recommended behavior:

### Case 1 — Reviewer already logged in

```text
Invitation link
      |
      v
Authenticated reviewer
      |
      v
Validate invitation
      |
      v
Show invitation
```

### Case 2 — Reviewer is not logged in

```text
Invitation link
      |
      v
Validate token
      |
      v
Show invitation summary
      |
      v
Require reviewer login
      |
      v
After login redirect back to invitation
```

The invitation token proves access to the invitation, but it should not automatically create a permanent application session without applying the normal authentication/security rules.

---

# 12. Phase 4G — Reviewer Login Redirect Handling

Add support for preserving the intended invitation URL.

Example:

```text
/login?returnTo=/reviewer/invitations/<id>?token=<token>
```

Requirements:

- [x] Validate/whitelist local `returnTo` paths.
- [x] Prevent open redirect vulnerabilities.
- [x] After login, redirect reviewer back to the invitation page.
- [x] Revalidate the invitation after login.

Do not accept arbitrary external URLs in `returnTo`.

---

# 13. Phase 4H — Accept Invitation Flow

Current backend already has:

```text
PATCH /reviewer/invitations/:id
```

with:

```json
{
  "response": "accepted"
}
```

Keep that API contract unless there is a strong reason to change it.

Before accepting:

- [x] Verify authenticated reviewer owns the invitation.
- [x] Verify invitation is still pending.
- [x] Verify invitation is not expired.
- [x] Verify reviewer account is active.
- [x] Verify reviewer has not already completed a review for the same manuscript.
- [x] Verify assignment still exists.
- [x] Lock the invitation row inside a transaction.

On accept:

- [x] Set `response = accepted`.
- [x] Set `responded_at`.
- [x] Set assignment status to `accepted`.
- [x] Set `accepted_at`.
- [x] Record user activity.
- [x] Record workflow/audit activity.

---

# 14. Phase 4I — Decline Invitation Flow

Current flow already supports:

```json
{
  "response": "declined",
  "suggestion": {
    "name": "...",
    "email": "...",
    "institution": "...",
    "reason": "..."
  }
}
```

Verify:

- [x] Decline is allowed only while invitation is pending.
- [x] Expired invitations cannot be declined through the normal flow unless explicitly allowed by the business rules.
- [x] Assignment status becomes `declined`.
- [x] `responded_at` is recorded.
- [x] Suggested reviewer is saved when supplied.
- [x] Activity/audit event is recorded.

---

# 15. Phase 4J — Invitation Expiry

The project already uses `expires_at` and synchronizes it with reviewer assignment deadlines.

Required behavior:

- [x] Any validation endpoint checks `expires_at > now()`.
- [x] Expired pending invitations are treated as unavailable.
- [x] UI clearly says the invitation has expired.
- [x] Reviewer cannot accept an expired invitation.
- [x] Editor can create a new invitation when business rules permit.

Optional cleanup job:

```text
pending invitation + expires_at < now()
        |
        v
mark assignment expired
```

Do not create a separate cron/job unless the rest of the application already has a job mechanism. Lazy expiry checks are acceptable initially.

---

# 16. Phase 4K — Resend Invitation

Implement a controlled resend flow.

Recommended endpoint:

```text
POST /editorial/manuscripts/:id/assignments/:assignmentId/resend-invitation
```

Requirements:

- [x] Editor must own the manuscript.
- [x] Assignment must belong to the manuscript.
- [x] Assignment must be in an invitation-compatible state.
- [x] Existing invitation must not already be accepted/declined.
- [x] Generate a new token.
- [x] Replace the stored token hash.
- [x] Update `expires_at` if business rules require it.
- [x] Increment resend count if stored.
- [x] Rate limit resends.
- [x] Send the new email using Resend.
- [x] Do not log the raw token.

Recommended cooldown:

```text
Do not allow repeated resend clicks within a short interval.
```

Choose a value appropriate for the journal's operational needs.

---

# 17. Phase 4L — Existing `sent_at` Field

Current schema has:

```text
sent_at TIMESTAMPTZ DEFAULT now()
```

Clarify its meaning.

Recommended meaning:

```text
sent_at = time the invitation email was successfully handed to the email provider
```

If the system creates the invitation before the email is actually sent, do not incorrectly use `sent_at` as an email-success timestamp.

Better options:

- keep invitation creation time separately, or
- use an explicit email delivery timestamp.

Choose one meaning and document it.

---

# 18. Phase 4M — Resend Email Service Integration

Use the Resend service developed in Phase 1.

The Editor service should not directly contain low-level Resend SDK calls.

Preferred layering:

```text
editorial.service.js
        |
        v
notification/email service
        |
        v
Resend adapter
```

Example conceptual call:

```js
await sendTemplateEmail({
  templateKey: 'reviewer_invitation',
  recipient: reviewer.email,
  variables: {
    reviewer_name: reviewer.name,
    manuscript_title: manuscript.title,
    submission_number: manuscript.submission_number,
    journal_name: journal.name,
    review_deadline: formattedDeadline,
    invitation_url: invitationUrl,
  },
})
```

Use the actual Phase 1 interface rather than copying this exact API blindly.

---

# 19. Phase 4N — Email Failure Strategy

A reviewer invitation may be successfully created in PostgreSQL while the email provider fails.

This must not silently lose the invitation.

Recommended behavior:

```text
DB invitation created
        |
        v
Resend send attempt
        |
        +---- success -> record success
        |
        +---- failure -> record failed email state
                         |
                         v
                    allow resend
```

Requirements:

- [x] Do not roll back the assignment merely because Resend fails after commit.
- [x] Record the failure reason.
- [x] Make the state visible to the Editor.
- [x] Allow resend.
- [x] Avoid exposing provider internals to end users.

---

# 20. Phase 4O — Workflow Log Integration

The existing notification service uses `workflow_logs`.

Extend this pattern for reviewer invitation events.

Recommended events:

```text
reviewer_invited
reviewer_invitation_email_queued
reviewer_invitation_email_sent
reviewer_invitation_email_failed
reviewer_invitation_resent
reviewer_invitation_accepted
reviewer_invitation_declined
reviewer_invitation_expired
```

Payload should contain identifiers and safe metadata.

Do not store:

- raw invitation token,
- password,
- OAuth secrets,
- unnecessary personal data.

---

# 21. Phase 4P — Audit Log Integration

Reviewer invitation actions are important workflow/security events.

Add audit entries for:

- [x] Editor invited reviewer.
- [x] Editor resent invitation.
- [x] Reviewer accepted invitation.
- [x] Reviewer declined invitation.
- [x] Invitation expired.
- [x] Invitation email failed, if audit policy requires operational email failures.

Recommended action names:

```text
reviewer_invited
reviewer_invitation_resent
reviewer_invitation_accepted
reviewer_invitation_declined
reviewer_invitation_expired
```

Use the project's existing audit-log conventions.

---

# 22. Phase 4Q — Editor UI Changes

Existing component:

```text
client/src/features/editor/ReviewerSelectionPanel.jsx
```

Current behavior already shows a success message such as:

```text
Invitation sent to the reviewer.
```

Improve this flow.

## Requirements

- [x] Show sending state on the Invite button.
- [x] Prevent duplicate clicks.
- [x] Show clear success state.
- [x] Show a meaningful error when email delivery fails.
- [x] Distinguish `invitation_created` from `email_sent` when necessary.
- [x] Display the reviewer invitation status in Reviewer Management.
- [x] Provide a resend action when the invitation has not been accepted.

Do not claim `Email sent successfully` until the backend has confirmed the email send result according to the final notification design.

---

# 23. Phase 4R — Reviewer Invitation Page

Create a dedicated public/auth-aware frontend page.

Recommended location:

```text
client/src/features/reviewer/InvitationDetails.jsx
```

Recommended route:

```text
/reviewer/invitations/:id
```

Query string:

```text
?token=<token>
```

Page states:

### Loading

- [x] Validate invitation.
- [x] Show a loading state.

### Valid + logged out

- [x] Show safe invitation summary.
- [x] Explain that reviewer login is required.
- [x] Provide Login button.

### Valid + logged in reviewer

- [x] Show manuscript title.
- [x] Show submission number.
- [x] Show review deadline.
- [x] Show Accept button.
- [x] Show Decline button.

### Already responded

- [x] Show response status.
- [x] Prevent duplicate response.

### Expired

- [x] Show invitation expired message.
- [x] Provide support/contact guidance.

### Invalid token

- [x] Show generic invalid-link message.
- [x] Do not reveal whether another token or user exists.

---

# 24. Phase 4S — Frontend Reviewer Invitation Security

- [x] Never store the token in localStorage.
- [x] Do not persist the token beyond what is needed for the invitation request flow.
- [x] Avoid sending the token to analytics systems.
- [x] Avoid logging query strings containing the token.
- [x] Clear the token from the visible URL after it is safely processed when possible.
- [x] Prevent invitation token from being copied into application logs.

A secure design is to use the token only to validate the invitation and then rely on the normal authenticated session for subsequent accept/decline actions.

---

# 25. Phase 4T — Reviewer Dashboard Integration

Existing page:

```text
client/src/features/reviewer/Invitations.jsx
```

Keep the dashboard invitation list.

Improve it so that:

- [x] Pending invitations link to the invitation detail page.
- [x] Expired invitations display clearly if the business rules require them to remain visible.
- [x] Accepted invitations move into assignments.
- [x] Declined invitations are shown in history if desired.
- [x] Deadline is visible.
- [x] Manuscript title is visible.
- [x] Invitation response status is accurate.

The dashboard should continue to use the authenticated user ID and server-side session.

---

# 26. Phase 4U — Reviewer Invitation Email UX

The email should contain:

```text
Journal branding
Greeting
Invitation message
Manuscript title
Submission number
Review deadline
Clear call-to-action button
Fallback text link
Journal contact/support information
```

Recommended button:

```text
View Review Invitation
```

Fallback link:

```text
If the button does not work, copy and paste this link into your browser:
{{invitation_url}}
```

Use both HTML and plain text.

---

# 27. Phase 4V — Database Migration Checklist

- [x] Add/update `reviewer_invitation` email template.
- [x] Add email-delivery tracking columns only if required.
- [x] Add indexes for resend/expiry queries if needed.
- [x] Verify `token_hash` remains unique.
- [x] Verify foreign keys.
- [x] Verify existing reviewer data remains valid.
- [x] Create down migration for every new migration.
- [x] Run migrations against local PostgreSQL.
- [x] Test migration rollback.

Potential useful index if expiry scanning is introduced:

```sql
CREATE INDEX idx_reviewer_invitations_pending_expiry
ON reviewer_invitations(expires_at)
WHERE response IS NULL;
```

Add this only if the query workload justifies it.

---

# 28. Phase 4W — API Checklist

## Existing

```text
GET    /editorial/manuscripts/:id/eligible-reviewers
POST   /editorial/manuscripts/:id/invite-reviewer
GET    /editorial/manuscripts/:id/assignments
PATCH  /editorial/manuscripts/:id/assignments/:assignmentId/deadline
GET    /reviewer/invitations
PATCH  /reviewer/invitations/:id
```

## Add/review

```text
GET  /reviewer/invitations/:id/validate?token=...
POST /editorial/manuscripts/:id/assignments/:assignmentId/resend-invitation
```

Exact API names may be adjusted to match the project's route conventions.

---

# 29. Phase 4X — Authorization Checklist

## Editor

Editor can:

- [x] View eligible reviewers.
- [x] Invite reviewer to manuscripts assigned to that Editor.
- [x] Resend invitations for their manuscript assignments.
- [x] View invitation/email status.

Editor cannot:

- [x] Invite reviewers for another Editor's manuscript.
- [x] Modify another journal's invitation records.
- [x] Accept a review invitation as the reviewer.

## Reviewer

Reviewer can:

- [x] View their own invitations.
- [x] Validate their own invitations.
- [x] Accept their own invitation.
- [x] Decline their own invitation.

Reviewer cannot:

- [x] View another reviewer's invitation.
- [x] Accept another reviewer's assignment.
- [x] Change invitation ownership.

---

# 30. Phase 4Y — Conflict-of-Interest Preservation

The existing `inviteReviewer()` function already performs conflict checking.

Do not remove or bypass this logic while adding email functionality.

Required verification:

- [x] Author/reviewer conflict remains blocked.
- [x] Editor conflict rules remain enforced.
- [x] Reviewer eligibility remains enforced.
- [x] Inactive reviewers remain blocked.
- [x] Duplicate pending invitations remain blocked.

Email implementation must happen only after these business validations succeed.

---

# 31. Phase 4Z — Duplicate Invitation Protection

Test all duplicate cases.

### Case A

Same manuscript + same reviewer + pending invitation.

Expected:

```text
409 Conflict
Invitation already pending
```

### Case B

Previous invitation declined, editor invites again.

Expected behavior should follow business rules.

### Case C

Previous invitation expired, editor invites again.

Expected behavior should follow business rules.

### Case D

Reviewer has already completed a review for the manuscript.

Expected:

```text
Reject new assignment/invitation
```

unless the manuscript is in a new valid revision round under the journal's rules.

---

# 32. Phase 4AA — Email Provider Rate Limiting

Resend usage should be protected against accidental invitation spam.

Add application-level protections for:

- [x] repeated Invite clicks,
- [x] repeated Resend clicks,
- [x] mass invitation loops,
- [x] malformed reviewer IDs,
- [x] scripted requests.

Use the application's existing rate-limit architecture if one exists.

Do not rely only on Resend's provider limits.

---

# 33. Phase 4AB — Logging Rules

Allowed log example:

```text
Reviewer invitation created: invitation=<uuid>, assignment=<uuid>
```

Allowed:

```text
Reviewer invitation email failed: invitation=<uuid>, provider_message_id=<id>
```

Never log:

```text
token=<raw-token>
```

Never log the full invitation URL containing the token.

---

# 34. Phase 4AC — Testing Strategy

## Unit tests

- [x] Token generation returns sufficient entropy.
- [x] Token hashing is deterministic.
- [x] Raw token is never stored.
- [x] Invitation validation rejects wrong token.
- [x] Invitation validation rejects expired invitation.
- [x] Invitation validation rejects responded invitation.
- [x] Accept changes assignment status.
- [x] Decline changes assignment status.
- [x] Duplicate invitation detection works.

## Service tests

- [x] `inviteReviewer()` succeeds for valid reviewer.
- [x] `inviteReviewer()` blocks inactive reviewer.
- [x] `inviteReviewer()` blocks conflicts.
- [x] `inviteReviewer()` blocks duplicate pending invitation.
- [x] Reviewer email is loaded correctly.
- [x] Invitation URL is correct.
- [x] Email failure is handled without corrupting the assignment.

## API tests

- [x] Validate invitation with valid token.
- [x] Validate invitation with invalid token.
- [x] Validate invitation with expired token.
- [x] Accept invitation while authenticated.
- [x] Decline invitation while authenticated.
- [x] Reject another reviewer's invitation access.
- [x] Resend invitation as correct Editor.
- [x] Reject resend by unauthorized Editor.

## Frontend tests

- [x] Invitation page loads.
- [x] Invalid invitation page works.
- [x] Expired invitation page works.
- [x] Login redirect works.
- [x] Accept works.
- [x] Decline works.
- [x] Resend button works.
- [x] Double click does not produce duplicate requests.

---

# 35. Phase 4AD — Manual End-to-End Test

Use at least these test accounts:

```text
Admin
Editor
Reviewer
Author
```

Test sequence:

### Test 1 — Editor invites Reviewer

- [x] Login as Editor.
- [x] Open an editor-assigned manuscript.
- [x] Open reviewer selection.
- [x] Select eligible reviewer.
- [x] Set deadline.
- [x] Click Invite.
- [x] Verify assignment exists.
- [x] Verify invitation exists.
- [x] Verify email is sent through Resend.
- [x] Verify reviewer receives email.

### Test 2 — Reviewer opens email

- [x] Open invitation email.
- [x] Click invitation button.
- [x] Verify invitation page appears.
- [x] Verify manuscript information is correct.
- [x] Verify deadline is correct.

### Test 3 — Reviewer accepts

- [x] Login as Reviewer if required.
- [x] Accept invitation.
- [x] Verify assignment becomes `accepted`.
- [x] Verify `accepted_at` is populated.
- [x] Verify invitation has response `accepted`.
- [x] Verify reviewer dashboard shows assignment.

### Test 4 — Reviewer declines

- [x] Send another invitation.
- [x] Decline it.
- [x] Add optional suggested reviewer.
- [x] Verify suggestion is stored.
- [x] Verify assignment becomes `declined`.

### Test 5 — Expired invitation

- [x] Create/modify an invitation to an expired timestamp in development.
- [x] Open invitation link.
- [x] Verify it is rejected.
- [x] Verify accept is unavailable.

### Test 6 — Resend

- [x] Create pending invitation.
- [x] Resend invitation.
- [x] Verify a new token is generated.
- [x] Verify old token no longer works if rotation invalidates it.
- [x] Verify new email is sent.

---

# 36. Phase 4AE — Important Architectural Decision

Do **not** introduce JWT specifically for reviewer invitation links.

The journal already has a server-side session architecture.

Keep responsibilities separated:

```text
Reviewer invitation token
    -> proves access to a specific invitation link

Server-side authenticated session
    -> proves application identity and permissions
```

The invitation token should not become a replacement for the normal authenticated user session.

---

# 37. Phase 4AF — Email Security Requirements

- [x] Generate tokens using Node's `crypto.randomBytes()` or equivalent cryptographically secure API.
- [x] Store SHA-256 token hash only.
- [x] Use sufficient token length.
- [x] Expire tokens.
- [x] Rotate token on resend.
- [x] Reject already-used/answered invitations.
- [x] Do not log raw tokens.
- [x] Use HTTPS in production.
- [x] Do not put tokens into analytics.
- [x] Avoid exposing confidential manuscript data before authentication.

---

# 38. Phase 4AG — Production Environment Checklist

Verify production environment contains:

```env
CLIENT_ORIGIN=https://your-journal-domain.example
SERVER_ORIGIN=https://your-api-domain.example
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
RESEND_FROM_NAME=...
```

Use the exact variable names defined by Phase 1.

Also verify:

- [x] Resend sender/domain is verified.
- [x] SPF/DKIM configuration is complete where required.
- [x] HTTPS is enabled.
- [x] CORS allows the production frontend.
- [x] Invitation links use the production frontend URL.
- [x] No localhost URL is embedded in production emails.

---

# 39. Phase 4AH — Failure Scenarios to Test

| Scenario | Expected behavior |
|---|---|
| Reviewer does not exist | Reject invitation |
| Reviewer inactive | Reject invitation |
| Reviewer is author | Reject invitation |
| Reviewer has COI | Reject invitation |
| Invitation already pending | Reject duplicate |
| Invitation expired | Cannot accept |
| Token invalid | Cannot view invitation |
| Token already rotated | Old link invalid |
| Reviewer already responded | Cannot respond again |
| Resend email fails | Invitation remains recoverable |
| Email provider timeout | Record failure + allow retry |
| Unauthorized editor resends | Reject request |
| Reviewer accesses another reviewer's invitation | Reject access |

---

# 40. Phase 4AI — Files Expected to Change

## Backend

Likely:

```text
server/src/modules/editorial/editorial.service.js
server/src/modules/editorial/editorial.routes.js
server/src/modules/reviewer/reviewer.service.js
server/src/modules/reviewer/reviewer.routes.js
server/src/modules/notification/notification.service.js
server/src/config/env.js
```

## Database

Likely:

```text
server/src/db/migrations/<new_reviewer_email_migration>.sql
server/src/db/migrations/<new_reviewer_email_migration>.down.sql
```

Potentially:

```text
server/src/db/seed.js
```

## Frontend

Likely:

```text
client/src/features/editor/ReviewerSelectionPanel.jsx
client/src/features/editor/ReviewerManagement.jsx
client/src/features/reviewer/Invitations.jsx
client/src/features/reviewer/InvitationDetails.jsx
client/src/services/editorialService.js
client/src/services/reviewerService.js
client/src/router/AppRouter.jsx
```

Exact filenames may differ based on the final implementation.

---

# 41. Phase 4AJ — Implementation Order

Execute in this order:

- [x] 1. Confirm Phase 1 email service API.
- [x] 2. Add/update reviewer invitation email template.
- [x] 3. Add delivery-status fields if required.
- [x] 4. Create secure invitation validation service.
- [x] 5. Add invitation validation route.
- [x] 6. Refactor `inviteReviewer()` to send the email after commit.
- [x] 7. Add workflow/audit logging.
- [x] 8. Remove raw token from normal production responses/logs.
- [x] 9. Add resend invitation endpoint/service.
- [x] 10. Add resend rate limiting.
- [x] 11. Build invitation detail frontend page.
- [x] 12. Add router entry.
- [x] 13. Add login-return behavior.
- [x] 14. Update reviewer invitation dashboard UI.
- [x] 15. Update editor reviewer-management UI.
- [x] 16. Run backend tests.
- [x] 17. Run frontend tests.
- [x] 18. Run complete end-to-end workflow.
- [x] 19. Verify production environment values.
- [x] 20. Verify no token leakage in logs.

---

# 42. Phase 4AK — Definition of Done

Phase 4 is complete only when all of the following are true:

- [x] Editor can invite an eligible Reviewer.
- [x] A reviewer assignment is created correctly.
- [x] A secure invitation token is generated.
- [x] Only the token hash is stored.
- [x] Invitation URL is generated from environment configuration.
- [x] Reviewer receives a Resend email.
- [x] Email contains manuscript title and deadline.
- [x] Reviewer can open the invitation link.
- [x] Invalid links are rejected.
- [x] Expired links are rejected.
- [x] Reviewer can authenticate using the existing auth system.
- [x] Reviewer can accept the invitation.
- [x] Reviewer can decline the invitation.
- [x] Reviewer cannot respond to another reviewer's invitation.
- [x] Editor can see invitation status.
- [x] Editor can resend an invitation.
- [x] Resend rotates/invalidates the old token when configured to do so.
- [x] Email failures are recorded and recoverable.
- [x] Audit/workflow events are recorded.
- [x] No raw token is stored in the database.
- [x] No raw token appears in application logs.
- [x] No JWT is introduced just for reviewer invitations.
- [x] Google OAuth and manual login continue to work.
- [x] Existing reviewer dashboard and review submission workflow continue to work.

---

# 43. Phase 4 Exit Criteria

Before starting Phase 5, verify the following complete path works:

```text
Editor
  ↓
Select Reviewer
  ↓
Invite Reviewer
  ↓
PostgreSQL assignment + invitation
  ↓
Resend
  ↓
Reviewer receives email
  ↓
Clicks invitation
  ↓
Login if required
  ↓
Invitation validation
  ↓
Accept invitation
  ↓
Reviewer assignment = accepted
  ↓
Reviewer dashboard
  ↓
Review manuscript
```

Also verify the negative path:

```text
Invitation
  ↓
Expired / Invalid / Already Responded
  ↓
Blocked safely
  ↓
No unauthorized access
```

---

# 44. Next Phase

After Phase 4 is fully tested, proceed to:

## Phase 5 — Author Manuscript Lifecycle Emails

Expected notification events:

```text
manuscript_submitted
manuscript_desk_rejected
manuscript_rejected_by_editor
manuscript_accepted
minor_revision_requested
major_revision_requested
revision_submitted
manuscript_withdrawn
```

That phase should reuse the same Resend + template + workflow-log infrastructure implemented here.
