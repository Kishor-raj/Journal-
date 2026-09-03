# Journal Management System — Phase 1

# Resend Email Infrastructure + Authentication Foundation

> **Phase status:** `DONE`
>
> **Goal:** Build the reusable email-delivery foundation for the journal system and prepare the existing authentication module so later phases can safely implement manual registration, email verification, password reset, reviewer invitations, manuscript notifications, and draft reminders.
>
> **Scope of this phase:** Resend integration, server configuration, email service abstraction, delivery logging, template conventions, secure link/token utilities, and authentication prerequisites.
>
> **Out of scope for Phase 1:** Full manual registration/login UI, password reset UI, reviewer invitation notification wiring, manuscript lifecycle notification wiring, and scheduled draft-reminder jobs. Those are implemented in later phases.

---

## 1. Current Codebase Baseline

Before changing the code, preserve the architecture that is already present.

### Existing server authentication

The project currently uses:

- Express.js backend.
- PostgreSQL through `pg`.
- Google OAuth through `google-auth-library`.
- Database-backed `user_sessions`.
- Random session tokens whose SHA-256 hashes are stored in PostgreSQL.
- HTTP-only `session_token` cookies.
- `authenticate` middleware for protected API routes.
- `users.is_email_verified` for the user's email-verification state.
- `user_identities` for OAuth identities.

### Important architectural rule

**Do not introduce JWT authentication for manual login in this phase.**

Manual login should eventually create the same type of server-side session already used by Google OAuth:

```text
Manual Login
    ↓
Validate email/password
    ↓
Create user session
    ↓
Store only session token hash in DB
    ↓
Set HTTP-only session_token cookie
    ↓
Reuse existing authenticate middleware
```

This keeps Google OAuth and manual authentication on one authorization/session model.

### Existing notification foundation

The project already has:

- `server/src/modules/notification/notification.service.js`
- `email_templates` table
- `workflow_logs` table

However, `enqueueNotification()` currently records a notification workflow event but does **not actually send email through an email provider**.

Phase 1 changes this architecture so the notification module can eventually deliver real messages through Resend.

---

# 2. Phase 1 Objectives

Complete every item below before starting Phase 2.

- [x] Register/configure a Resend account for the journal.
- [x] Verify the sender domain or configured sender address.
- [x] Create a Resend API key with appropriate permissions.
- [x] Install the Resend Node.js package in the server.
- [x] Add Resend environment configuration.
- [x] Add a dedicated email provider module.
- [x] Add a reusable `sendEmail()` service.
- [x] Add structured email-delivery logging.
- [x] Make email templates compatible with Resend delivery.
- [x] Add secure token-generation/hash helpers for future verification/reset flows.
- [x] Add base application URLs needed by email links.
- [x] Make email delivery failures observable without exposing secrets.
- [x] Keep email sending failures from corrupting manuscript/authentication transactions.
- [x] Add test/dry-run capability for local development.
- [x] Verify the entire foundation with automated/manual tests.

---

# 3. Phase 1 Architecture

The target architecture is:

```text
                    ┌────────────────────────┐
                    │   Journal Application  │
                    └────────────┬───────────┘
                                 │
                    request to send email
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Notification Service   │
                    │ notification.service.js│
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Email Service          │
                    │ email.service.js       │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Resend Provider        │
                    │ resend.com              │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Author / Reviewer /    │
                    │ Editor / User mailbox  │
                    └────────────────────────┘
```

The application should not call the Resend SDK directly from manuscript, reviewer, or authentication business logic.

Instead:

```text
Feature module
   ↓
Notification service
   ↓
Email service
   ↓
Resend
```

This separation is important because later email requirements will come from many modules.

---

# 4. Step 1 — Resend Account Configuration

## 4.1 Create the Resend account

- [ ] Create or access the journal's Resend account.
- [ ] Use a journal-owned administrative email rather than a developer's personal mailbox.
- [ ] Enable appropriate account security/MFA where available.
- [ ] Keep ownership with the organization/client.

## 4.2 Configure the sending domain

Preferred production setup:

```text
mail.example-journal.org
```

or another domain/subdomain controlled by the journal.

Recommended sender pattern:

```text
Asgard Publications <no-reply@example-journal.org>
```

Do not use a random personal email address as the production sender.

## 4.3 Verify DNS

Complete the DNS records required by Resend for the selected sending domain.

- [ ] Add required DNS records.
- [ ] Wait for DNS propagation if required.
- [ ] Confirm the domain is verified in Resend.
- [ ] Send a test message.
- [ ] Verify delivery and sender authentication.

## 4.4 Create API key

- [ ] Create a production Resend API key.
- [ ] Create a separate development/testing key when appropriate.
- [ ] Never commit the API key into Git.
- [ ] Never put the server API key in React/Vite environment variables.
- [ ] Never expose the API key through a frontend endpoint.

---

# 5. Step 2 — Install Resend in the Server

Run from the server directory:

```bash
cd server
npm install resend
```

Then verify that `server/package.json` contains the dependency.

Expected direction:

```json
"dependencies": {
  "resend": "..."
}
```

After installation:

```bash
npm install
npm run build
```

The existing project uses Node.js ESM (`"type": "module"`), so the Resend integration should follow the same ESM style.

---

# 6. Step 3 — Update Server Environment Configuration

The project already centralizes environment variables in:

```text
server/src/config/env.js
```

Add the Resend configuration there.

## Required environment variables

Recommended variables:

```env
RESEND_API_KEY=
EMAIL_FROM_NAME=Asgard Publications
EMAIL_FROM_ADDRESS=no-reply@example-journal.org
```

Also add the public application URL used when constructing links in emails.

```env
PUBLIC_APP_ORIGIN=http://localhost:5173
```

Production example:

```env
PUBLIC_APP_ORIGIN=https://journal.example.org
```

## Optional configuration

For better operational control, add:

```env
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
EMAIL_REPLY_TO=
```

The implementation should allow local development to disable actual sending:

```env
EMAIL_ENABLED=false
```

## Update `env.js`

Add properties similar to:

```js
RESEND_API_KEY: process.env.RESEND_API_KEY,
EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'resend',
EMAIL_ENABLED: process.env.EMAIL_ENABLED !== 'false',
EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Asgard Publications',
EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || '',
PUBLIC_APP_ORIGIN: process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5173',
```

## Environment validation

Do not allow the application to silently run in production with missing email configuration.

Add validation rules such as:

```text
NODE_ENV=production
    +
EMAIL_ENABLED=true
    +
EMAIL_PROVIDER=resend
    +
RESEND_API_KEY present
    +
EMAIL_FROM_ADDRESS present
```

If these requirements are not satisfied in production, startup should fail clearly or email functionality should be explicitly disabled rather than failing unpredictably later.

---

# 7. Step 4 — Update `.env.example`

Update:

```text
server/.env.example
```

or create it if it does not exist.

Add placeholders only:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
EMAIL_FROM_NAME=Asgard Publications
EMAIL_FROM_ADDRESS=no-reply@example-journal.org
EMAIL_REPLY_TO=
PUBLIC_APP_ORIGIN=http://localhost:5173
```

Never put a real production Resend key into `.env.example`.

Also verify `.gitignore` excludes:

```text
.env
.env.*
```

while still permitting `.env.example` to be committed.

---

# 8. Step 5 — Create the Email Provider Module

Create a dedicated directory:

```text
server/src/modules/email/
```

Recommended structure:

```text
server/src/modules/email/
├── email.service.js
├── resend.provider.js
└── email.utils.js
```

## Responsibility of each file

### `resend.provider.js`

Only Resend-specific SDK code should live here.

Responsibilities:

- Create the Resend client.
- Call the Resend API.
- Translate the provider response into the application's internal format.
- Translate provider failures into controlled application errors.

### `email.service.js`

Provider-independent application-facing service.

Responsibilities:

- Validate email input.
- Apply common sender configuration.
- Call the provider implementation.
- Log delivery attempts.
- Return a predictable result.

### `email.utils.js`

Reusable helpers such as:

- Template variable replacement.
- URL construction.
- HTML/text normalization.
- Safe subject/body handling.
- Token generation helpers where appropriate.

---

# 9. Step 6 — Implement the Resend Provider

The provider should create one Resend client from the API key.

Conceptually:

```js
import { Resend } from 'resend'
import { env } from '../../config/env.js'

const resend = new Resend(env.RESEND_API_KEY)
```

Do not instantiate a new SDK client for every message.

Create a function similar in responsibility to:

```js
sendViaResend({
  to,
  subject,
  html,
  text,
  replyTo,
})
```

Expected result abstraction:

```js
{
  success: true,
  provider: 'resend',
  providerMessageId: '...',
}
```

Failure result should be handled without exposing the API key:

```js
{
  success: false,
  provider: 'resend',
  error: 'Email delivery failed'
}
```

Detailed provider error information may be written to server logs, but secrets and authorization headers must never be logged.

---

# 10. Step 7 — Implement the Generic Email Service

Create:

```text
server/src/modules/email/email.service.js
```

Recommended API:

```js
sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  metadata,
})
```

## Required behavior

### Validate recipient

Reject:

- Missing recipient.
- Empty recipient.
- Invalid email format.

### Validate subject

Reject an empty subject.

### Validate body

At least one of:

```text
html
text
```

must be available.

### Apply sender

Use configuration:

```text
EMAIL_FROM_NAME
EMAIL_FROM_ADDRESS
```

### Respect `EMAIL_ENABLED`

If email sending is disabled in development:

```env
EMAIL_ENABLED=false
```

the application should not attempt to call Resend.

Return a controlled result such as:

```js
{
  success: true,
  skipped: true,
  reason: 'email_disabled'
}
```

This is useful for local development and automated tests.

---

# 11. Step 8 — Refactor Notification Service to Use Email Service

Current file:

```text
server/src/modules/notification/notification.service.js
```

Currently, `enqueueNotification()`:

1. Reads an email template.
2. Replaces variables.
3. Inserts a workflow log.
4. Prints `Notification queued`.
5. Returns success.

It does **not** deliver an email.

Phase 1 should prepare the service for real delivery.

## Recommended responsibilities

Change the logical flow to:

```text
Load active template
        ↓
Load recipient email
        ↓
Replace template variables
        ↓
Construct final email
        ↓
Call email.service.js
        ↓
Write workflow log
        ↓
Return delivery result
```

However, do not yet wire all business events into this function. That belongs to later phases.

## Important transaction rule

Do not make the database transaction depend on successful Resend delivery.

For example:

```text
Editor accepts manuscript
        ↓
Database transaction commits
        ↓
Notification is dispatched
        ↓
Resend succeeds/fails independently
```

The system must not rollback a valid manuscript decision just because the email provider is temporarily unavailable.

---

# 12. Step 9 — Fix the Workflow Log Contract

The current `workflow_logs` migration defines:

```sql
id
manuscript_id
workflow_name
event_name
source
status
payload
error_message
created_at
```

The notification service currently uses an outdated event-column naming pattern.

Phase 1 must standardize email logging around the actual schema.

Recommended email event values:

```text
workflow_name = 'notifications'
source        = 'resend'
```

Example event names:

```text
email_send_attempted
email_sent
email_failed
email_skipped
```

Example statuses:

```text
pending
sent
failed
skipped
```

Payload should contain only non-sensitive metadata, for example:

```json
{
  "template_key": "reviewer_invitation",
  "recipient_user_id": "uuid",
  "recipient_email": "reviewer@example.org",
  "provider": "resend",
  "provider_message_id": "..."
}
```

Do not store:

- Resend API keys.
- Passwords.
- Raw password-reset tokens.
- Raw email-verification tokens.
- OAuth access tokens.
- OAuth refresh tokens.

---

# 13. Step 10 — Add Email Delivery Logging

Create a consistent logging strategy.

For every email attempt:

```text
Attempt
  ↓
Success OR Failure OR Skipped
```

## On success

Record:

```text
email_sent
status=sent
provider=resend
provider_message_id=<Resend ID>
```

## On failure

Record:

```text
email_failed
status=failed
provider=resend
error_message=<sanitized provider/application error>
```

## When disabled

Record:

```text
email_skipped
status=skipped
```

This will make future debugging of:

- verification emails,
- password-reset emails,
- reviewer invitations,
- decision notifications,
- draft reminders

much easier.

---

# 14. Step 11 — Establish Template Naming Convention

The project already has:

```text
email_templates
```

Use stable template keys rather than hard-coded template names throughout the application.

Reserve the following keys for upcoming phases:

```text
account_verification
password_reset
reviewer_invitation
manuscript_submitted
manuscript_rejected
manuscript_desk_rejected
manuscript_accepted
manuscript_minor_revision
manuscript_major_revision
manuscript_draft_reminder
```

Additional useful future keys may include:

```text
reviewer_invitation_expired
reviewer_assignment_reminder
review_submitted_confirmation
manuscript_withdrawal_confirmation
revision_submitted
```

Do not implement the complete business-event wiring in Phase 1.

The purpose now is to standardize the contract so later phases do not invent different names.

---

# 15. Step 12 — Establish Template Variables

Every template should have an explicit variable schema.

Examples:

## Account verification

```json
{
  "first_name": "string",
  "verification_url": "string",
  "expires_at": "string"
}
```

## Password reset

```json
{
  "first_name": "string",
  "reset_url": "string",
  "expires_at": "string"
}
```

## Reviewer invitation

```json
{
  "reviewer_name": "string",
  "manuscript_title": "string",
  "submission_number": "string",
  "invitation_url": "string",
  "expires_at": "string"
}
```

## Manuscript status

```json
{
  "author_name": "string",
  "manuscript_title": "string",
  "submission_number": "string",
  "status": "string",
  "manuscript_url": "string"
}
```

## Draft reminder

```json
{
  "author_name": "string",
  "manuscript_title": "string",
  "manuscript_url": "string"
}
```

Use the template system consistently so business logic only supplies variables.

---

# 16. Step 13 — Build a Safe Template Renderer

The current implementation performs direct string replacement such as:

```js
bodyHtml.replace(new RegExp(placeholder, 'g'), value || '')
```

This should be hardened before the email system becomes widely used.

## Requirements

- [x] Avoid regular-expression problems caused by variable names.
- [x] Convert non-string values safely.
- [x] Handle missing variables deterministically.
- [x] Do not accidentally substitute `undefined` or `null` into email content.
- [x] Keep HTML content controlled by trusted journal templates.
- [x] Do not treat arbitrary user input as trusted HTML.

For example, a value used in a message body should be escaped when inserted into an HTML template unless the variable is explicitly defined as trusted HTML.

---

# 17. Step 14 — Establish Email Link Construction

Later emails need links such as:

```text
https://journal.example.org/verify-email?token=...
https://journal.example.org/reset-password?token=...
https://journal.example.org/reviewer/invitations/...
https://journal.example.org/author/manuscripts/...
```

Do not hard-code production URLs into business modules.

Use:

```env
PUBLIC_APP_ORIGIN=
```

and a URL helper.

Recommended utility:

```text
server/src/modules/email/email.utils.js
```

Example responsibilities:

```js
buildAppUrl('/verify-email', { token })
buildAppUrl('/reset-password', { token })
```

This will prevent multiple modules from constructing URLs differently.

---

# 18. Step 15 — Prepare Secure Token Utilities

Manual email authentication will later require secure one-time tokens.

Examples:

- Account verification.
- Password reset.

Generate tokens using cryptographically secure randomness, not:

```js
Math.random()
```

A suitable pattern is based on Node's:

```js
crypto.randomBytes(...)
```

## Storage rule

The raw token should normally be sent to the user but not stored in plaintext in the database.

Instead:

```text
Generate random token
       ↓
Store token hash + metadata
       ↓
Send raw token in email URL
       ↓
User submits raw token
       ↓
Hash submitted token
       ↓
Compare with DB hash
```

Phase 1 only prepares the reusable utility pattern. The actual database tables and endpoints belong to the manual authentication phases.

---

# 19. Step 16 — Define Token Expiration Rules

Before implementing the database tables, establish fixed security rules.

Recommended starting values:

### Email verification

```text
Token lifetime: 24 hours
One-time use: yes
```

### Password reset

```text
Token lifetime: 30–60 minutes
One-time use: yes
```

The exact values can be changed later, but they must be centralized rather than scattered across controllers.

Recommended configuration:

```env
EMAIL_VERIFICATION_TOKEN_TTL_MINUTES=1440
PASSWORD_RESET_TOKEN_TTL_MINUTES=60
```

---

# 20. Step 17 — Prepare Manual Authentication Data Model Decisions

Phase 1 should document the fields that later migrations will need.

The existing `users` table already contains:

```text
is_email_verified
```

The later manual-login implementation will need a password credential model, for example:

```text
user_password_credentials
```

Possible fields:

```text
id
user_id
password_hash
password_changed_at
created_at
updated_at
```

Verification/reset tokens should preferably have separate tables, for example:

```text
email_verification_tokens
password_reset_tokens
```

Possible token fields:

```text
id
user_id
token_hash
expires_at
used_at
created_at
```

Do not add these tables in Phase 1 unless the implementation plan chooses to combine this phase with the database migration phase. The purpose here is to lock the design before coding.

---

# 21. Step 18 — Manual Login and OAuth Account Rules

The system supports both:

```text
Google OAuth
+
Manual Email/Password
```

They must share the same `users` table and session mechanism.

Expected identity model:

```text
                 users
                   │
         ┌─────────┴──────────┐
         │                    │
 user_identities       password_credentials
         │                    │
       Google              Manual Login
```

## Important cases to support later

### Case A — New Google user

```text
Google OAuth
→ create users row
→ mark email verified from trusted provider response
→ create session
```

### Case B — New manual user

```text
Registration
→ create users row
→ mark email_verified=false
→ create password credential
→ send verification email
→ do not allow normal authenticated access until verified
```

### Case C — Existing Google user adds password login later

Possible later flow:

```text
Authenticated Google account
→ Set Password
→ Create password credential
→ Keep Google identity
→ Same user account
```

### Case D — Existing manual user signs in with Google

If the OAuth email matches an existing account, account-linking rules must prevent duplicate users and must be handled carefully.

Phase 1 only records these rules so the authentication implementation does not create inconsistent identities.

---

# 22. Step 19 — Do Not Create JWT Authentication

This is an explicit implementation decision.

The existing project already has:

```text
user_sessions
session_token_hash
session cookie
authenticate middleware
```

Therefore manual login should later call the existing:

```js
createSession(userId, ip, userAgent)
```

The flow will be:

```text
POST /api/auth/login
      ↓
Validate credentials
      ↓
Check account status
      ↓
Check email verification
      ↓
createSession(...)
      ↓
Set session_token cookie
      ↓
Return current user
```

Do not create:

```text
access_token JWT
refresh_token JWT
```

just because manual login is being added.

A JWT system would introduce another authentication mechanism that the existing application does not need.

---

# 23. Step 20 — Security Requirements for the Email Foundation

Before Phase 1 is marked complete, verify the following.

## Secrets

- [x] Resend API key is never committed.
- [x] Resend API key is server-side only.
- [x] API keys are not returned in API responses.
- [x] Logs do not print API keys.

## Email enumeration

Later password-reset endpoints should return generic messages such as:

```text
If an account exists for this email, a reset link has been sent.
```

Do not reveal whether an email is registered.

## Tokens

- [x] Tokens are random.
- [x] Token hashes are stored instead of raw tokens.
- [x] Tokens expire.
- [x] Tokens can be used only once.
- [x] Old tokens are invalidated when appropriate.

## Email content

- [x] No passwords in email bodies.
- [x] No session cookies in email bodies.
- [x] No OAuth access tokens in email bodies.
- [x] No raw sensitive internal data in workflow logs.

## Transport

Production cookies remain secure and HTTP-only.

Email links must use HTTPS in production.

---

# 24. Step 21 — Add Local Development Test Mode

A developer must be able to work locally without accidentally consuming Resend quota.

Recommended modes:

### Mode A — Disabled

```env
EMAIL_ENABLED=false
```

Application logs:

```text
[EMAIL] skipped
```

### Mode B — Real Resend development account

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
```

Use a test/development sender/domain where possible.

### Mode C — Test/mocked provider

Automated tests should be able to mock the email provider rather than sending real messages.

Example abstraction:

```text
EmailService
     ↓
Provider interface
    ├── ResendProvider
    └── MockEmailProvider
```

Do not tightly couple tests to the real Resend API.

---

# 25. Step 22 — Add an Email Health Check

Provide enough observability to know whether email is configured.

Do not expose the API key.

A health-check result can report only:

```json
{
  "provider": "resend",
  "enabled": true,
  "configured": true
}
```

Do not expose:

```text
API key
API authorization header
full provider credentials
```

This can later be included in an administrator/system health page.

---

# 26. Step 23 — Testing Checklist

## Unit tests

- [ ] `sendEmail()` rejects a missing recipient.
- [ ] `sendEmail()` rejects an empty subject.
- [ ] `sendEmail()` rejects a message with no body.
- [ ] `EMAIL_ENABLED=false` skips delivery.
- [ ] Resend provider success is translated to the internal success format.
- [ ] Resend provider failure is translated to the internal failure format.
- [ ] API secrets never appear in returned errors.
- [ ] Template substitution handles missing variables safely.
- [ ] Application URL builder creates valid URLs.
- [ ] Token generator creates sufficiently random tokens.

## Integration tests

- [ ] A test email is sent successfully through Resend.
- [ ] Workflow log records a successful send.
- [ ] Workflow log records a failed send.
- [ ] Email delivery failure does not break an unrelated DB transaction.
- [ ] Email-disabled development mode does not call Resend.

## Manual test

Send one test email to a controlled mailbox and verify:

```text
From address
Subject
HTML rendering
Plain text version
Links
Reply-To
Delivery
```

Also inspect the Resend dashboard for the message event.

---

# 27. Step 24 — Files to Create/Modify

## Create

```text
server/src/modules/email/email.service.js
server/src/modules/email/resend.provider.js
server/src/modules/email/email.utils.js
```

Potential test files:

```text
server/src/modules/email/*.test.js
```

## Modify

```text
server/src/config/env.js
server/package.json
server/.env.example
server/src/modules/notification/notification.service.js
```

Potential database changes only if required by the selected logging implementation:

```text
server/src/db/migrations/<new_migration>.sql
server/src/db/migrations/<new_migration>.down.sql
```

Do not modify the existing Google OAuth flow unnecessarily during this phase.

---

# 28. Step 25 — Suggested Implementation Order

Complete the coding in this exact order:

```text
1. Configure Resend account/domain
        ↓
2. Install resend package
        ↓
3. Add env variables
        ↓
4. Add email provider module
        ↓
5. Add generic email service
        ↓
6. Add safe template rendering
        ↓
7. Add application URL helpers
        ↓
8. Standardize email workflow logging
        ↓
9. Refactor notification service to call email service
        ↓
10. Add mock/test mode
        ↓
11. Send one real test email
        ↓
12. Run lint/build/tests
```

---

# 29. Definition of Done

Phase 1 is complete only when all of the following are true.

- [x] Resend sender/domain is configured.
- [x] Resend API key exists only on the backend.
- [x] `resend` package is installed.
- [x] Server environment configuration contains email settings.
- [x] `.env.example` documents required variables without real secrets.
- [x] `email.service.js` exists and exposes a stable application-level API.
- [x] `resend.provider.js` is the only module that knows Resend-specific SDK details.
- [x] Email sending can be disabled in local development.
- [x] Notification service can use the generic email service.
- [x] Email attempts have observable workflow logging.
- [x] Workflow log events match the actual `workflow_logs` schema.
- [x] Templates have stable keys and variable definitions.
- [x] Application URLs are centralized.
- [x] Secure-token generation strategy is documented and reusable.
- [x] No JWT authentication is introduced for manual login.
- [x] Existing Google OAuth login continues to work.
- [x] Existing session-cookie authentication continues to work.
- [x] A real test email can be delivered successfully.
- [x] `npm run build` passes.
- [x] `npm run lint` passes.
- [x] No secrets are present in Git-tracked files.

---

# 30. Phase 1 Result

After Phase 1, the project should have this foundation:

```text
                         JOURNAL SYSTEM
                              │
             ┌────────────────┴────────────────┐
             │                                 │
       Google OAuth                     Future Manual Login
             │                                 │
             └──────────────┬──────────────────┘
                            │
                    Existing User Session
                            │
                            ▼
                       users table
                            │
              ┌─────────────┴─────────────┐
              │                           │
        OAuth identity              Password credential
              │                           │
              └─────────────┬─────────────┘
                            │
                         Session
                            │
                            ▼
                    Protected application

Email side:

Auth / Reviewer / Manuscript / Reminder features
                    │
                    ▼
             Notification Service
                    │
                    ▼
                Email Service
                    │
                    ▼
              Resend Provider
                    │
                    ▼
              User's mailbox
```

The next phase can safely implement the actual **manual account registration + password storage + email verification + login flow** on top of this foundation.

---

# 31. Developer Notes

### Do not do these things in Phase 1

- [ ] Do not replace Google OAuth.
- [ ] Do not introduce JWTs.
- [ ] Do not duplicate user accounts for OAuth and manual login.
- [ ] Do not put Resend calls inside React components.
- [ ] Do not put Resend API keys in Vite environment variables.
- [ ] Do not send passwords by email.
- [ ] Do not store raw verification/reset tokens in PostgreSQL.
- [ ] Do not make critical manuscript transactions depend on email delivery success.
- [ ] Do not create separate session implementations for Google and manual authentication.

### Preferred final principle

```text
Authentication method ≠ authorization/session mechanism

Google OAuth ──────┐
                   ├──> same users ──> same session system
Manual Email/Pass ─┘

All email-producing features ──> Notification Service ──> Resend
```

This keeps the implementation modular and makes the later email requirements much easier to add without rewriting the authentication or manuscript workflow.
