# Phase 7 — Admin Notification Center & Email Template Management

## Objective

Build the administrative interface and backend controls needed to manage the journal's email notification system after the authentication and manuscript-notification features from Phases 1–6 are complete.

This phase should **not** introduce a new authentication architecture.

Continue using:

- Existing Google OAuth
- Manual email/password authentication
- Existing server-side sessions
- Existing role-based authorization
- Resend as the email provider
- Centralized notification/email service
- Existing journal workflow and database structure

The Admin should be able to understand:

1. Which notification types exist.
2. Which email templates are active.
3. Whether email delivery succeeded or failed.
4. When a notification was sent.
5. Which manuscript/user/workflow event triggered it.
6. Whether a notification was retried.
7. Whether a template is enabled or disabled.
8. Whether an email needs to be resent manually.
9. Whether Resend configuration is healthy.

---

# 1. Phase Scope

## TODO

- [x] Add Admin Email/Notification area to the Admin dashboard.
- [x] Add Notification History page.
- [x] Add Email Templates management page.
- [x] Add Email Template editor.
- [x] Add Template Preview.
- [x] Add Send Test Email functionality.
- [x] Add delivery/error status display.
- [x] Add manual resend functionality where appropriate.
- [x] Add filtering and search.
- [x] Add notification detail view.
- [x] Add notification retry information.
- [x] Add Admin audit logging for email-related administrative actions.
- [x] Add provider health/configuration status.
- [x] Add safe template validation.
- [x] Add permission checks so only Admins can access these features.

---

# 2. Admin Navigation

Add a dedicated section to the Admin sidebar.

Recommended navigation:

```text
Admin Dashboard
│
├── User Management
├── Manuscripts
├── Available Manuscripts
├── Journal Management
├── Email & Notifications
│   ├── Notification History
│   ├── Email Templates
│   ├── Test Email
│   └── Provider Status
├── Audit Logs
└── Security Logs
```

## TODO

- [x] Add `Email & Notifications` menu item.
- [x] Ensure the menu is visible only to Admin users.
- [x] Add route guards on the frontend.
- [x] Add backend authorization checks independently of frontend visibility.
- [x] Prevent direct URL access by non-admin users.
- [x] Return `403 Forbidden` for unauthorized API access.
- [x] Make navigation responsive for desktop and tablet layouts.

---

# 3. Notification History

Create a page that gives Admins a complete view of application-generated email notifications.

## Recommended columns

```text
Date/Time
Recipient
Event
Manuscript
Subject
Status
Attempts
Last Attempt
Provider Message ID
Actions
```

Example:

```text
03 Sep 2026 10:30
author@example.com
MANUSCRIPT_ACCEPTED
MS-2026-00125
Manuscript Accepted
SENT
1
03 Sep 2026 10:30
resend_abc123
View
```

## TODO

- [x] Create Notification History API.
- [x] Add pagination.
- [x] Add sorting by newest notification.
- [x] Add search by recipient email.
- [x] Add search by manuscript ID.
- [ ] Add search by notification ID.
- [ ] Add search by provider message ID.
- [x] Add filter by event type.
- [x] Add filter by status.
- [ ] Add date-range filtering.
- [ ] Add retry/failure filtering.
- [x] Add an option to view notification details.
- [x] Avoid loading the entire notification table into memory.
- [ ] Add database indexes for common filters.

---

# 4. Notification Status Model

Use predictable statuses.

Recommended values:

```text
PENDING
PROCESSING
SENT
FAILED
RETRYING
CANCELLED
```

## TODO

- [x] Confirm status values exist in the notification persistence layer.
- [x] Ensure `SENT` means the application successfully submitted the message to Resend.
- [x] Do not incorrectly describe `SENT` as guaranteed inbox delivery.
- [x] Store provider response/message ID when available.
- [x] Store failure information in a safe normalized form.
- [x] Avoid storing sensitive provider payloads unnecessarily.
- [x] Store the number of attempts.
- [x] Store `sent_at`.
- [x] Store `last_attempt_at`.
- [x] Store `next_retry_at` where applicable.
- [x] Store failure timestamp.
- [x] Store a safe error summary.

---

# 5. Notification Detail Page

Clicking a notification should show a detailed audit-style page.

## Recommended sections

```text
Notification Information
------------------------
Notification ID
Event
Created At
Status
Attempts
Sent At
Recipient
Subject

Workflow Context
----------------
Manuscript ID
Manuscript Title
Author
Triggered By
Related Decision / Assignment / Submission

Provider Information
--------------------
Provider
Provider Message ID
Last Provider Status

Failure / Retry
---------------
Last Error
Retry Count
Next Retry
```

## TODO

- [x] Add notification detail endpoint.
- [x] Add notification detail page.
- [x] Sanitize all user-provided values before rendering.
- [x] Do not expose password reset tokens.
- [x] Do not expose verification tokens.
- [x] Do not expose invitation tokens.
- [x] Do not expose internal secrets.
- [x] Do not expose Resend API keys.
- [x] Limit provider payload visibility to fields needed for troubleshooting.
- [x] Show workflow context without exposing unrelated private data.

---

# 6. Email Templates Management

The journal already has an `email_templates` concept.

Use that as the central template source instead of hardcoding full email content inside controllers.

## Recommended template fields

```text
id
journal_id
template_key
name
description
subject_template
html_template
text_template
is_enabled
created_at
updated_at
updated_by
```

## Recommended template keys

```text
ACCOUNT_VERIFICATION
PASSWORD_RESET
REVIEWER_INVITATION
REVIEWER_INVITATION_REMINDER
MANUSCRIPT_SUBMITTED
MANUSCRIPT_DESK_REJECTED
MANUSCRIPT_REJECTED
MANUSCRIPT_ACCEPTED
MANUSCRIPT_MINOR_REVISION
MANUSCRIPT_MAJOR_REVISION
DRAFT_MANUSCRIPT_REMINDER
```

## TODO

- [x] Verify all required template keys exist.
- [x] Add unique constraint on template key + journal where appropriate.
- [x] Add template display names.
- [x] Add descriptions explaining when each email is used.
- [x] Add enabled/disabled state.
- [x] Add last updated information.
- [x] Record which Admin modified a template.
- [x] Prevent arbitrary template keys from being created unless explicitly supported.
- [x] Prevent templates from containing unsupported unsafe expressions.

---

# 7. Template Variable System

Templates should use controlled variables rather than arbitrary server-side code.

Example:

```text
{{firstName}}
{{lastName}}
{{email}}
{{manuscriptTitle}}
{{manuscriptId}}
{{decision}}
{{decisionComments}}
{{reviewDeadline}}
{{verificationUrl}}
{{resetPasswordUrl}}
{{invitationUrl}}
{{journalName}}
{{journalUrl}}
```

## TODO

- [x] Create a registry of supported variables for every template.
- [x] Validate variables before saving a template.
- [x] Reject unknown variables or provide a clear validation warning.
- [x] Ensure every required variable is available when rendering the associated event.
- [x] Do not allow templates to execute JavaScript.
- [x] Do not allow templates to execute SQL.
- [x] Do not expose server environment variables.
- [x] Do not expose internal objects directly to the template engine.
- [x] HTML-escape user-controlled values where appropriate.
- [x] Treat URLs carefully and validate generated URLs server-side.

---

# 8. Template Editor UI

Create a professional Admin template editor.

Recommended layout:

```text
--------------------------------------------------------
Email Template: Manuscript Accepted
--------------------------------------------------------

Name:
[ Manuscript Accepted ]

Template Key:
[ MANUSCRIPT_ACCEPTED ]  (read-only)

Status:
[ Enabled ]

Subject:
[ Your manuscript "{{manuscriptTitle}}" has been accepted ]

Available Variables:
{{firstName}}
{{manuscriptTitle}}
{{manuscriptId}}
{{journalName}}

HTML Template:
------------------------------------------------
|                                              |
|              Template Editor                |
|                                              |
------------------------------------------------

Plain Text Template:
------------------------------------------------
|                                              |
------------------------------------------------

[Save Changes] [Preview] [Send Test Email]
```

## TODO

- [x] Add template list page.
- [x] Add edit template page.
- [ ] Show template description.
- [x] Show allowed variables.
- [x] Add subject editor.
- [x] Add HTML editor.
- [x] Add plain-text editor.
- [x] Add enabled/disabled toggle.
- [x] Add save confirmation.
- [ ] Add unsaved-changes warning.
- [x] Add validation messages.
- [x] Add preview action.
- [x] Add test-email action.
- [x] Display last updated Admin and timestamp.

---

# 9. Template Preview

Admin should be able to preview a template using safe sample data.

Example:

```text
First Name:
Kishor

Manuscript Title:
An Example Manuscript

Manuscript ID:
MS-2026-00125
```

## TODO

- [x] Create server-side preview endpoint.
- [x] Use sample data by default.
- [x] Never require a real password-reset token for preview.
- [x] Never display real user secrets.
- [x] Render both HTML and text versions.
- [x] Show subject preview.
- [x] Show missing-variable warnings.
- [x] Prevent arbitrary template execution.
- [x] Sanitize preview output where needed.
- [x] Make preview independent of actual email delivery.

---

# 10. Send Test Email

Add a test-email operation for Admins.

Example UI:

```text
Send Test Email
----------------

Template:
[ Manuscript Accepted v ]

Recipient:
[ admin@example.com ]

[ Send Test Email ]
```

## TODO

- [x] Add Admin-only test email endpoint.
- [x] Require a valid recipient email.
- [x] Validate email format.
- [x] Render the selected template with safe sample data.
- [x] Send using the same centralized email service as production.
- [x] Mark the operation clearly as a test notification.
- [x] Store the test-email action in audit logs.
- [x] Apply rate limiting.
- [x] Prevent abuse by repeated Admin requests.
- [x] Do not allow arbitrary sender addresses.
- [x] Do not allow an Admin to override the configured verified sender.
- [x] Show clear success/failure feedback.

---

# 11. Manual Resend

Some notifications may fail temporarily.

Admin should have a controlled resend option.

## TODO

- [x] Add `Resend` action for eligible failed notifications.
- [x] Do not expose resend for security-sensitive links after expiration.
- [x] Do not resend expired password reset links.
- [x] Do not resend expired verification tokens directly from notification history.
- [x] For reviewer invitations, use the existing invitation resend workflow rather than replaying an old email blindly.
- [x] For manuscript notifications, create a new notification event or explicit resend record.
- [x] Preserve the original notification for audit purposes.
- [x] Record who initiated the resend.
- [x] Record why/resend action.
- [x] Avoid infinite resend loops.
- [ ] Apply Admin rate limits.
- [x] Show confirmation before performing a resend.

---

# 12. Provider Status

Create a simple Resend/provider health page.

Recommended information:

```text
Email Provider
--------------
Provider: Resend

Configuration
-------------
Sender: notifications@journal.example
Application Environment: production

Connectivity
------------
Status: Healthy

Last Successful Test:
03 Sep 2026 10:30

Last Failure:
None
```

## TODO

- [x] Create provider-health API.
- [x] Confirm API key exists without returning its value.
- [x] Confirm sender configuration exists.
- [x] Confirm required environment configuration exists.
- [x] Never display the full API key.
- [x] Add a safe connectivity/test operation if supported by the application architecture.
- [x] Record the last successful email-provider operation.
- [x] Record the most recent provider failure.
- [x] Ensure provider health does not expose unnecessary secret information.

---

# 13. Admin Email Configuration

Expose safe operational settings only.

Recommended:

```text
Application URL
Sender Name
Sender Email
Reply-To
Draft Reminder Enabled
Invitation Reminder Enabled
Retry Enabled
Maximum Retries
```

Do NOT expose:

```text
RESEND_API_KEY
SESSION_SECRET
DATABASE_PASSWORD
OAuth Client Secret
Password hashing secret/configuration
```

## TODO

- [ ] Determine which values belong in environment variables.
- [ ] Determine which journal-specific values belong in the database.
- [ ] Keep secrets in environment/secret management.
- [ ] Keep business configuration in the database only when appropriate.
- [ ] Prevent UI from overwriting secret configuration accidentally.
- [ ] Document which configuration requires deployment/restart.

---

# 14. Notification Filters

Add practical filters to the Admin interface.

## TODO

- [x] Filter by notification event.
- [x] Filter by status.
- [x] Filter by recipient.
- [x] Search by manuscript.
- [ ] Filter by date range.
- [ ] Filter by retry state.
- [ ] Filter by provider message ID.
- [ ] Add clear/reset filters action.
- [x] Preserve filters during pagination.
- [x] Add empty-state messages.
- [x] Prevent expensive unindexed queries.

---

# 15. Search

Implement server-side search.

## TODO

- [ ] Search notification ID.
- [x] Search recipient email.
- [x] Search manuscript ID.
- [ ] Search manuscript title where appropriate.
- [ ] Search provider message ID.
- [x] Search template key.
- [x] Do not perform unrestricted full-table scans for every request.
- [ ] Add appropriate indexes.
- [x] Enforce reasonable page size limits.

---

# 16. Email Delivery Statistics

Add a small Admin summary dashboard.

Recommended cards:

```text
Emails Sent Today
Emails Failed Today
Emails Retrying
Emails Sent This Month
Failed Emails This Month
Active Templates
```

Optional:

```text
Verification Emails
Password Reset Emails
Reviewer Invitations
Submission Emails
Decision Emails
Draft Reminders
```

## TODO

- [x] Create aggregate statistics API.
- [x] Add time-zone-aware date handling.
- [x] Use database aggregation rather than loading all notifications.
- [x] Add status breakdown.
- [x] Add event breakdown.
- [x] Keep the dashboard performant.
- [x] Make statistics consistent with persisted notification records.

---

# 17. Admin Audit Logging

Every administrative email-management operation should be auditable.

Examples:

```text
EMAIL_TEMPLATE_CREATED
EMAIL_TEMPLATE_UPDATED
EMAIL_TEMPLATE_ENABLED
EMAIL_TEMPLATE_DISABLED
TEST_EMAIL_SENT
NOTIFICATION_RESEND_REQUESTED
EMAIL_PROVIDER_TESTED
```

## TODO

- [x] Add email-management audit event constants.
- [x] Record Admin user ID.
- [x] Record timestamp.
- [x] Record affected template/notification ID.
- [x] Record safe action metadata.
- [x] Never log API keys.
- [x] Never log password reset tokens.
- [x] Never log email verification tokens.
- [x] Never log reviewer invitation secret tokens.
- [x] Avoid unnecessarily logging full private email bodies.

---

# 18. Authorization

Admin email-management APIs must require the Admin role.

## TODO

- [x] Add backend middleware/guard.
- [x] Verify authenticated session.
- [x] Verify user account is active.
- [x] Verify user role is Admin.
- [x] Return appropriate authorization errors.
- [x] Verify the frontend cannot bypass restrictions by modifying API requests.
- [x] Add tests for Author attempting Admin endpoints.
- [x] Add tests for Editor attempting Admin endpoints.
- [x] Add tests for Reviewer attempting Admin endpoints.
- [ ] Add tests for disabled users attempting access.

---

# 19. Security Requirements

## TODO

- [x] Escape user-controlled variables in HTML templates.
- [x] Sanitize rich HTML according to the chosen email-editor policy.
- [x] Reject JavaScript in templates.
- [x] Reject dangerous URI schemes.
- [x] Validate all Admin input server-side.
- [x] Use CSRF protection where required by the existing session architecture.
- [x] Apply rate limiting to test-email and resend actions.
- [x] Avoid leaking notification details to unauthorized users.
- [x] Avoid leaking whether sensitive reset/verification tokens still exist.
- [x] Ensure notification detail pages do not reveal authentication secrets.
- [x] Ensure logs do not contain credentials/tokens.

---

# 20. Database Changes

Review the existing notification/email persistence schema from previous phases.

Possible fields/tables include:

```text
notifications
email_delivery_attempts
email_templates
email_template_versions
```

Do not create duplicate structures if an equivalent implementation already exists.

## TODO

- [x] Audit current notification tables.
- [x] Audit current email template table.
- [x] Add only missing columns/tables.
- [x] Add unique constraints.
- [ ] Add indexes for notification search.
- [ ] Add indexes for status + created_at.
- [ ] Add indexes for recipient.
- [ ] Add indexes for manuscript ID.
- [ ] Add indexes for event type.
- [ ] Add foreign keys where appropriate.
- [x] Add migration scripts.
- [ ] Verify migrations are reversible where practical.
- [x] Test migrations against a fresh database.
- [x] Test migrations against the current development database.

---

# 21. Email Template Versioning

For a production journal system, consider keeping previous template versions.

Example:

```text
Current Template
        |
        +---- Version 5 (active)
        |
        +---- Version 4
        |
        +---- Version 3
```

## TODO

- [ ] Decide whether versioning is required for the production release.
- [ ] If implemented, add `email_template_versions`.
- [ ] Store template content snapshot.
- [ ] Store version number.
- [ ] Store updated_by.
- [ ] Store created_at.
- [ ] Allow Admin to view previous versions.
- [ ] Provide rollback to an earlier version.
- [ ] Record rollback in audit logs.
- [ ] Do not overwrite historical versions.

---

# 22. Template Reset to Default

Admins should have a controlled way to restore the journal's built-in template.

## TODO

- [ ] Add `Reset to Default` action.
- [ ] Require confirmation.
- [ ] Preserve previous template version.
- [ ] Restore approved system template content.
- [ ] Do not blindly delete historical versions.
- [ ] Add audit-log entry.
- [ ] Ensure only Admin users can perform reset.

---

# 23. Notification Retry Operations

The Admin UI should expose retry state without allowing dangerous manual manipulation.

## TODO

- [x] Display retry count.
- [x] Display next retry time.
- [x] Display last failure.
- [x] Display whether automatic retry is scheduled.
- [x] Provide manual retry only for safe notification types.
- [ ] Prevent manual retry while another retry is already processing.
- [x] Use idempotency checks before sending.
- [x] Record Admin-triggered retry separately from automatic retry.

---

# 24. Failed Notification Troubleshooting Workflow

Document an Admin troubleshooting workflow.

Recommended:

```text
Failed Email
     |
     v
Open Notification
     |
     v
Check Recipient
     |
     v
Check Template
     |
     v
Check Provider Response
     |
     v
Check Retry Status
     |
     +---- Retry Automatically Scheduled
     |
     +---- Manual Resend Allowed
     |
     +---- Permanent Failure
```

## TODO

- [x] Add user-friendly error categories.
- [x] Distinguish temporary vs permanent failures where possible.
- [x] Explain recommended action to Admin.
- [x] Avoid exposing raw provider/internal stack traces.
- [ ] Log full technical details only in protected server logs.

---

# 25. Frontend Pages

Create/modify these pages as needed:

```text
/admin/notifications
/admin/notifications/:id
/admin/email-templates
/admin/email-templates/:templateKey
/admin/email-templates/:templateKey/preview
/admin/email-test
/admin/email-provider
```

## TODO

- [x] Add page routes.
- [x] Add role guards.
- [x] Add loading states.
- [x] Add empty states.
- [x] Add error states.
- [x] Add success notifications.
- [x] Add confirmation dialogs for destructive actions.
- [x] Make tables responsive.
- [x] Add accessible labels/buttons.
- [x] Keep visual style consistent with the existing Admin dashboard.

---

# 26. Backend API Design

Recommended endpoint structure:

```text
GET    /api/admin/notifications
GET    /api/admin/notifications/:id

GET    /api/admin/email-templates
GET    /api/admin/email-templates/:key
PUT    /api/admin/email-templates/:key

POST   /api/admin/email-templates/:key/preview
POST   /api/admin/email-templates/:key/test

POST   /api/admin/notifications/:id/resend

GET    /api/admin/email-provider/status

GET    /api/admin/notification-stats
```

## TODO

- [x] Match endpoint names to the existing project's API conventions.
- [x] Add request validation.
- [x] Add response schemas/types if the project uses them.
- [x] Add Admin authorization to every endpoint.
- [x] Paginate notification list responses.
- [x] Avoid returning unnecessary sensitive fields.
- [x] Return consistent error formats.

---

# 27. Notification Detail Security Rules

The detail API must explicitly exclude:

```text
Password reset token
Email verification token
Reviewer invitation token
Session token
API keys
OAuth secrets
```

## TODO

- [x] Create a safe DTO/serializer.
- [x] Do not serialize the entire database row automatically.
- [x] Review every field returned by the endpoint.
- [ ] Add regression tests for secret leakage.

---

# 28. Email Body Privacy

Because journal communication may contain manuscript-related information, avoid excessive disclosure.

## TODO

- [ ] Only include information required for the notification.
- [ ] Do not include reviewer private identity information in author emails.
- [ ] Do not expose reviewer comments to the wrong recipient.
- [ ] Ensure decision emails are sent only to intended author/co-author recipients according to workflow requirements.
- [ ] Avoid putting sensitive manuscript content into notification logs.
- [ ] Store metadata rather than entire rendered email bodies unless there is a specific operational requirement.

---

# 29. Test Matrix

## Template tests

- [x] Template can be loaded.
- [x] Valid variables render correctly.
- [x] Unknown variables are rejected.
- [x] Missing required variables are detected.
- [x] HTML is safely rendered.
- [x] Plain text version renders correctly.
- [x] Disabled template is not sent unexpectedly.

## Admin authorization tests

- [x] Admin can access template APIs.
- [x] Editor receives `403`.
- [x] Author receives `403`.
- [x] Reviewer receives `403`.
- [x] Unauthenticated request receives `401`.

## Notification tests

- [x] Notification history loads.
- [x] Pagination works.
- [x] Filters work.
- [x] Search works.
- [x] Detail page loads.
- [x] Secret fields are excluded.
- [x] Failed notifications show failure state.
- [x] Retry count is displayed correctly.

## Resend tests

- [x] Eligible notification can be resent.
- [x] Ineligible notification cannot be resent.
- [x] Duplicate resend is prevented.
- [x] Audit log is generated.
- [x] Resend failure is displayed correctly.

## Test-email tests

- [x] Valid email succeeds.
- [x] Invalid email is rejected.
- [x] Non-admin cannot send.
- [x] Rate limit works.
- [x] Provider failure is handled correctly.
- [x] Test action is audited.

---

# 30. End-to-End Scenarios

## Scenario A — Author Accepted

```text
Editor accepts manuscript
        |
        v
Decision saved
        |
        v
MANUSCRIPT_ACCEPTED event
        |
        v
Notification created
        |
        v
Template loaded
        |
        v
Email sent by Resend
        |
        v
Notification marked SENT
        |
        v
Admin sees delivery in Notification History
```

- [x] Verify this complete flow.

## Scenario B — Reviewer Invitation

```text
Editor invites reviewer
        |
        v
Invitation created
        |
        v
Reviewer email sent
        |
        v
Admin sees notification
        |
        v
Reviewer accepts invitation
```

- [x] Verify this complete flow.

## Scenario C — Failed Email

```text
Business event
    |
    v
Notification created
    |
    v
Resend failure
    |
    v
Notification = RETRYING / FAILED
    |
    v
Automatic retry
    |
    v
Successful send
    |
    v
Notification = SENT
```

- [x] Verify this complete flow.

---

# 31. Performance

## TODO

- [ ] Add indexes before enabling large notification-history queries.
- [x] Use server-side pagination.
- [x] Use aggregation queries for statistics.
- [x] Avoid loading full email bodies in list views.
- [x] Lazy-load notification details.
- [x] Avoid rendering thousands of notifications in the browser.
- [x] Add reasonable API page-size limits.

---

# 32. Logging and Observability

## TODO

Log operational events such as:

```text
Template updated
Template reset
Test email requested
Notification resend requested
Provider test executed
```

Do not log:

```text
Password reset tokens
Verification tokens
Invitation tokens
API keys
Session tokens
Passwords
```

## TODO

- [x] Add structured logging.
- [ ] Include correlation/request ID where supported.
- [x] Include notification ID in logs.
- [x] Include provider message ID when safe.
- [x] Make error logs searchable.
- [x] Ensure production logs do not contain secrets.

---

# 33. Documentation

Create Admin documentation describing:

```text
How to edit an email template
How to preview a template
How to send a test email
How to inspect failed notifications
When to use manual resend
How draft reminders work
How reviewer invitations work
How manuscript decision emails work
```

## TODO

- [ ] Add internal developer documentation.
- [ ] Add short Admin-facing documentation.
- [ ] Document all notification event names.
- [ ] Document supported template variables.
- [ ] Document which notifications can be manually resent.
- [ ] Document common delivery failures.

---

# 34. Files/Modules to Review

Use the project's existing structure and modify existing modules where possible rather than creating parallel implementations.

## Backend areas

- [ ] Authentication/session middleware
- [ ] User routes/services
- [x] Email/notification service
- [x] Resend provider integration
- [x] Email template repository/service
- [x] Notification repository/service
- [ ] Manuscript submission service
- [ ] Editorial decision service
- [ ] Reviewer invitation service
- [ ] Draft reminder service
- [x] Audit logging service
- [x] Admin routes
- [x] Admin authorization middleware
- [x] Database migration directory

## Frontend areas

- [x] Admin layout/sidebar
- [ ] Admin dashboard
- [x] Email/notification pages
- [x] Template editor
- [x] Notification history table
- [x] Notification detail view
- [x] Provider status page
- [x] Shared form components
- [x] Shared confirmation dialogs
- [x] API client/service layer

---

# 35. Recommended Implementation Order

Do not build all UI screens at once.

Implement in this order:

### Step 1
- [x] Verify notification persistence from Phases 1–6.

### Step 2
- [x] Implement Admin notification-history backend API.

### Step 3
- [x] Implement Admin notification-history frontend.

### Step 4
- [x] Implement email-template backend API.

### Step 5
- [x] Implement template editor.

### Step 6
- [x] Implement template preview.

### Step 7
- [x] Implement test-email operation.

### Step 8
- [x] Implement notification resend.

### Step 9
- [x] Implement provider-status page.

### Step 10
- [x] Implement statistics dashboard.

### Step 11
- [x] Add audit logging.

### Step 12
- [x] Add security and rate-limit protections.

### Step 13
- [x] Run complete end-to-end tests.

---

# 36. Definition of Done

Phase 7 is complete only when:

- [x] Admin can view notification history.
- [x] Admin can search and filter notifications.
- [x] Admin can inspect a notification's workflow context.
- [x] Sensitive authentication tokens are never exposed.
- [x] Admin can view all supported email templates.
- [x] Admin can edit templates.
- [x] Admin can preview templates.
- [x] Admin can enable/disable supported templates.
- [x] Admin can send a controlled test email.
- [x] Admin can safely resend eligible notifications.
- [x] Resend/provider status is visible without exposing secrets.
- [x] Email delivery statistics are available.
- [x] All Admin actions are audited.
- [x] Non-admin users cannot access these APIs or pages.
- [x] Rate limits protect test/resend operations.
- [ ] Database indexes support the notification history.
- [x] All required tests pass.
- [x] Production logs contain no secrets.
- [x] Existing Google OAuth continues working.
- [x] Manual email/password authentication continues working.
- [x] Reviewer invitation workflow continues working.
- [x] Manuscript notification workflow continues working.
- [x] Draft reminder workflow continues working.
- [x] No duplicate email architecture has been introduced.

---

# Phase 7 Exit State

After Phase 7, the journal system should have not only working authentication and workflow emails, but also an operational Admin control center for those emails.

The overall flow becomes:

```text
                    JOURNAL SYSTEM
                          |
       +------------------+------------------+
       |                  |                  |
       v                  v                  v
 Authentication     Manuscript Workflow   Reviewer Workflow
       |                  |                  |
       +------------------+------------------+
                          |
                          v
                Notification Service
                          |
             +------------+------------+
             |                         |
             v                         v
        Email Templates          Notification Records
             |                         |
             +------------+------------+
                          |
                          v
                        Resend
                          |
                          v
                   Email Recipient

                          ^
                          |
                 Admin Notification
                       Center
                          |
       +------------------+------------------+
       |                  |                  |
       v                  v                  v
 Notification History  Templates       Provider Status
       |
       v
  Resend / Retry / Audit
```

---

# Next Phase

After this phase, the next logical phase should be:

**Phase 8 — Final Authentication & Email Security Audit + Production Deployment Checklist**

That phase should perform a final security review of:

- Google OAuth + manual login coexistence
- Server-side sessions
- Email verification
- Password reset
- Reviewer invitation tokens
- Rate limiting
- CSRF protection
- Notification security
- Resend production configuration
- Database migrations
- Environment variables
- Production deployment
- Monitoring
- Backup/recovery
- Final end-to-end acceptance testing
