# Phase 8 — Final Authentication & Email Security Audit + Production Deployment

## Objective

Perform the final security, reliability, configuration, deployment, and acceptance review for the Journal Management System after completing Phases 1–7.

This phase does not introduce a new authentication architecture.

The final production system should continue using:

- Google OAuth
- Manual email/password authentication
- Server-side sessions
- Resend for transactional email
- Centralized notification service
- Database-backed notification records
- Existing role-based authorization
- Existing journal manuscript workflow

The goal is to move from:

```text
Feature Complete
      |
      v
Security Audited
      |
      v
Production Configured
      |
      v
Deployed
      |
      v
Monitored
      |
      v
Accepted
```

---

# 1. Final Architecture Review

Before production deployment, document and verify the complete authentication/email architecture.

Recommended architecture:

```text
                    Browser
                       |
             +---------+---------+
             |                   |
             v                   v
        Google OAuth        Manual Login
             |                   |
             +---------+---------+
                       |
                       v
                Authentication
                       |
                       v
              Server-side Session
                       |
                       v
                Role Authorization
                       |
          +------------+-------------+
          |            |             |
          v            v             v
        Author       Editor       Reviewer
          |
          v
   Manuscript Workflow
          |
          v
   Notification Service
          |
          v
       Resend
          |
          v
       Recipient
```

## TODO

- [ ] Confirm only one authentication/session mechanism is used for the application.
- [ ] Confirm Google OAuth continues to create/login through the same user/session model.
- [ ] Confirm manual login uses the same session model.
- [ ] Confirm authorization is based on the authenticated user's server-side identity/role.
- [ ] Confirm notification logic is centralized.
- [ ] Confirm Resend is accessed only through the centralized email provider/service.
- [ ] Remove duplicate authentication implementations.
- [ ] Remove obsolete email-sending implementations.
- [ ] Remove temporary development authentication bypasses.
- [ ] Remove debug/test routes from production.

---

# 2. Manual Authentication Security Audit

Audit every manual authentication endpoint.

Expected flow:

```text
Register
  |
  v
Validate Input
  |
  v
Hash Password
  |
  v
Create User
  |
  v
Create Verification Token
  |
  v
Send Verification Email
  |
  v
Verify Email
  |
  v
Login
  |
  v
Create Server Session
```

## TODO

- [ ] Passwords are never stored in plaintext.
- [ ] Password hashing uses the project's approved password-hashing implementation.
- [ ] Password hashes are never returned through API responses.
- [ ] Password hashes are never written to application logs.
- [ ] Password reset tokens are never stored in plaintext when the design supports hashed tokens.
- [ ] Email verification tokens are never exposed through normal API responses.
- [ ] Login requires the correct password.
- [ ] Disabled users cannot authenticate.
- [ ] Locked users cannot authenticate.
- [ ] Unverified accounts follow the intended verification policy.
- [ ] Login attempts have appropriate rate limiting.
- [ ] Registration has abuse protection.
- [ ] Password-reset requests have abuse protection.
- [ ] Authentication error responses do not unnecessarily reveal account existence.
- [ ] Password policy is enforced consistently.
- [ ] Session creation happens only after successful authentication.

---

# 3. Password Policy Audit

Recommended baseline:

```text
Minimum length: 8+ characters
Prefer a longer passphrase
Reject clearly invalid/unsafe inputs
```

Do not impose unnecessarily restrictive composition rules unless required by the journal's policy.

## TODO

- [ ] Define the final password policy.
- [ ] Apply the same policy during registration.
- [ ] Apply the same policy during password reset.
- [ ] Validate passwords server-side.
- [ ] Validate passwords client-side for usability only.
- [ ] Never depend only on frontend validation.
- [ ] Do not log passwords.
- [ ] Ensure password values are not returned after registration/reset.

---

# 4. Session Security Audit

The project uses server-side sessions rather than JWT for normal application authentication.

## TODO

- [ ] Verify session tokens are cryptographically random.
- [ ] Verify session tokens cannot be predicted.
- [ ] Verify stored session values are safely protected.
- [ ] Set secure session cookie attributes.
- [ ] Use `HttpOnly`.
- [ ] Use an appropriate `SameSite` policy.
- [ ] Use `Secure` in HTTPS production environments.
- [ ] Configure an appropriate session expiration.
- [ ] Consider idle/session lifetime policy.
- [ ] Invalidate session on logout.
- [ ] Invalidate all sessions after password reset where required by security policy.
- [ ] Support administrative session invalidation if needed.
- [ ] Prevent session fixation.
- [ ] Verify session ownership on protected APIs.
- [ ] Do not expose raw session tokens through APIs or logs.

---

# 5. Cookie / Cross-Origin Configuration

Review frontend/backend deployment topology.

Example:

```text
https://journal.example.com
        |
        v
https://api.journal.example.com
```

or:

```text
https://journal.example.com
        |
        v
Same-origin backend
```

## TODO

- [ ] Define the production frontend origin.
- [ ] Define the production backend/API origin.
- [ ] Configure CORS explicitly.
- [ ] Do not use wildcard origins for authenticated production APIs.
- [ ] Configure credentials correctly.
- [ ] Configure session cookie domain intentionally.
- [ ] Verify cookies are not sent to unrelated domains/subdomains.
- [ ] Verify HTTPS is enforced.
- [ ] Test login/logout across the deployed frontend/backend origins.

---

# 6. Google OAuth Production Audit

Google OAuth should coexist with manual login.

## TODO

- [ ] Verify production Google OAuth client configuration.
- [ ] Verify exact authorized redirect URI.
- [ ] Verify exact authorized JavaScript/origin configuration if applicable.
- [ ] Remove development redirect URIs from production configuration where appropriate.
- [ ] Ensure OAuth client secret is stored securely.
- [ ] Never expose the client secret in frontend code.
- [ ] Verify OAuth callback errors are handled safely.
- [ ] Verify an OAuth user receives the correct role/account state.
- [ ] Verify OAuth login uses the same server session architecture.
- [ ] Verify duplicate-user behavior by email according to the final account-linking policy.
- [ ] Verify an existing manually registered user does not accidentally receive an unintended duplicate account.
- [ ] Audit account-linking behavior before production.

---

# 7. Email Verification Security Audit

Expected behavior:

```text
Account Created
      |
      v
Verification Token
      |
      v
Resend Verification Email
      |
      v
User Clicks Link
      |
      v
Token Validation
      |
      v
Account Verified
```

## TODO

- [ ] Verification token is cryptographically random.
- [ ] Verification token has an expiration time.
- [ ] Verification token is single-use.
- [ ] Token cannot be reused after verification.
- [ ] Token cannot verify a different account.
- [ ] Verification endpoint safely handles invalid tokens.
- [ ] Verification endpoint safely handles expired tokens.
- [ ] Resend verification invalidates/replaces older active tokens where appropriate.
- [ ] Resend requests are rate limited.
- [ ] Verification success is audited.
- [ ] Verification failure does not leak sensitive information.

---

# 8. Password Reset Security Audit

Expected behavior:

```text
Forgot Password
       |
       v
Generic Response
       |
       v
Reset Email
       |
       v
User Opens Link
       |
       v
Token Validation
       |
       v
Set New Password
       |
       v
Invalidate Token
       |
       v
Revoke Sessions
```

## TODO

- [ ] Forgot-password response does not reveal whether an email exists.
- [ ] Reset token is cryptographically random.
- [ ] Token has a short expiration.
- [ ] Token is single-use.
- [ ] Old token is invalid after successful reset.
- [ ] New reset requests invalidate/revoke previous active reset tokens where appropriate.
- [ ] Reset endpoint is rate limited.
- [ ] New password is hashed securely.
- [ ] Existing authenticated sessions are revoked according to the security policy.
- [ ] Password-reset event is audited.
- [ ] Reset tokens never appear in logs.
- [ ] Reset tokens never appear in analytics/tracking URLs beyond the required reset link.
- [ ] Password reset email uses HTTPS production URLs.

---

# 9. Reviewer Invitation Security Audit

Expected behavior:

```text
Editor
  |
  v
Invite Reviewer
  |
  v
Invitation Record
  |
  v
Invitation Email
  |
  v
Reviewer
  |
  +--> Accept
  |
  +--> Decline
```

## TODO

- [ ] Invitation token is cryptographically random.
- [ ] Invitation token is single-use.
- [ ] Invitation expires.
- [ ] Accept operation validates token and invitation state.
- [ ] Decline operation validates token and invitation state.
- [ ] Used/expired invitation cannot be reused.
- [ ] Resend invitation follows the existing secure invitation workflow.
- [ ] Invitation URLs are HTTPS in production.
- [ ] Invitation token is never logged.
- [ ] Reviewer identity and invitation data are not leaked through unrelated APIs.
- [ ] Unauthorized users cannot manipulate another reviewer's invitation.

---

# 10. Notification Security Audit

Audit every workflow notification.

Required notification classes:

```text
ACCOUNT_VERIFICATION
PASSWORD_RESET
REVIEWER_INVITATION
MANUSCRIPT_SUBMITTED
MANUSCRIPT_DESK_REJECTED
MANUSCRIPT_REJECTED
MANUSCRIPT_ACCEPTED
MANUSCRIPT_MINOR_REVISION
MANUSCRIPT_MAJOR_REVISION
DRAFT_MANUSCRIPT_REMINDER
```

## TODO

- [ ] Every notification has an explicit event type.
- [ ] Every event uses a centralized notification service.
- [ ] Every event selects an approved template.
- [ ] Recipient is derived server-side.
- [ ] Recipient is not trusted from arbitrary client input.
- [ ] Journal/manuscript authorization is checked before generating private notifications.
- [ ] Reviewer-related information is never accidentally sent to authors.
- [ ] Author-only information is never sent to reviewers.
- [ ] Internal editorial information is not exposed in inappropriate email templates.
- [ ] Notification creation is idempotent where required.
- [ ] Duplicate sends are prevented.
- [ ] Failed notifications are persisted.
- [ ] Retry behavior is controlled.

---

# 11. Resend Production Configuration

Use Resend only from the server.

Expected environment configuration should resemble:

```env
RESEND_API_KEY=********
EMAIL_FROM="Journal Name <notifications@journal.example.com>"
APP_URL=https://journal.example.com
API_URL=https://api.journal.example.com
```

Use the exact variable names already adopted by the project instead of creating duplicates.

## TODO

- [ ] Create production Resend account/project configuration.
- [ ] Verify sending domain.
- [ ] Configure required DNS records.
- [ ] Use a verified sender.
- [ ] Store API key only in server-side secret configuration.
- [ ] Never put `RESEND_API_KEY` in frontend environment variables.
- [ ] Never commit Resend secrets to Git.
- [ ] Remove development keys from production.
- [ ] Rotate exposed development/test keys if necessary.
- [ ] Verify production sender address.
- [ ] Verify reply-to configuration.
- [ ] Verify application URLs used in email links.
- [ ] Send a production test email before enabling workflow notifications.

---

# 12. Environment Variable Audit

Create a final production `.env.example` without real secrets.

Example structure:

```env
NODE_ENV=production

APP_URL=
API_URL=

DATABASE_URL=

SESSION_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
```

## TODO

- [ ] Audit all environment variables used by the code.
- [ ] Remove unused environment variables.
- [ ] Remove duplicate variable names.
- [ ] Ensure production and development configuration are clearly separated.
- [ ] Add `.env` to `.gitignore`.
- [ ] Search Git history for accidentally committed secrets.
- [ ] Rotate any exposed secrets.
- [ ] Add `.env.example`.
- [ ] Document each required variable.
- [ ] Mark which values are secrets.
- [ ] Validate required environment variables during application startup.

---

# 13. Environment Validation

The application should fail safely when critical configuration is missing.

## TODO

- [ ] Validate database configuration.
- [ ] Validate session secret.
- [ ] Validate OAuth configuration where OAuth is enabled.
- [ ] Validate Resend configuration in production.
- [ ] Validate sender address.
- [ ] Validate application URL.
- [ ] Validate production environment name.
- [ ] Provide clear startup errors.
- [ ] Do not print secret values in startup errors.

---

# 14. Database Production Audit

Review the database schema from all previous phases.

## TODO

- [ ] Run all migrations on a clean database.
- [ ] Run all migrations against a staging copy of the production schema.
- [ ] Verify foreign keys.
- [ ] Verify unique constraints.
- [ ] Verify notification indexes.
- [ ] Verify token-expiry indexes.
- [ ] Verify session indexes.
- [ ] Verify manuscript workflow indexes.
- [ ] Verify no migration silently deletes existing production data.
- [ ] Verify migration order.
- [ ] Create a tested database backup before production migration.
- [ ] Document migration rollback/recovery procedures.

---

# 15. Backup Strategy

Authentication and manuscript metadata are critical journal data.

## TODO

- [ ] Define automated database backup schedule.
- [ ] Keep backups outside the primary server where appropriate.
- [ ] Test restoring a backup.
- [ ] Document backup retention.
- [ ] Document who can access backups.
- [ ] Protect backups with appropriate access controls.
- [ ] Include restoration instructions in operational documentation.
- [ ] Verify backup procedure before production launch.

---

# 16. Cloud File / Manuscript Storage Audit

The journal system also handles manuscript files.

## TODO

- [ ] Verify production object storage configuration.
- [ ] Verify manuscript files are not accidentally public.
- [ ] Verify only authorized users can access private manuscript files.
- [ ] Verify signed URLs or equivalent controls where used.
- [ ] Verify email notifications do not expose direct private storage credentials.
- [ ] Verify deleted manuscripts/files follow the intended retention policy.

---

# 17. Rate Limiting Audit

Protect high-risk endpoints.

Required areas:

```text
Login
Registration
Forgot Password
Password Reset
Email Verification Resend
Reviewer Invitation Resend
Test Email
Notification Resend
OAuth initiation/callback where appropriate
```

## TODO

- [ ] Define per-IP rate limits.
- [ ] Define per-account/email rate limits where appropriate.
- [ ] Avoid overly aggressive limits that block legitimate users.
- [ ] Return safe rate-limit responses.
- [ ] Log abuse/security events.
- [ ] Ensure rate limiter storage works correctly in the production deployment model.
- [ ] If multiple application instances are used, use shared rate-limit state where necessary.

---

# 18. CSRF Audit

Because authentication uses browser sessions/cookies, review CSRF protection.

## TODO

- [ ] Identify all state-changing cookie-authenticated endpoints.
- [ ] Confirm the chosen CSRF protection strategy.
- [ ] Verify login/registration/reset state changes are appropriately protected.
- [ ] Verify manuscript state changes are protected.
- [ ] Verify reviewer invitation actions are protected.
- [ ] Verify Admin actions are protected.
- [ ] Test requests originating from an unauthorized site.
- [ ] Do not rely on frontend restrictions as CSRF protection.

---

# 19. Security Headers

Configure appropriate production HTTP security headers.

Examples:

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Frame protection
Permissions-Policy
```

## TODO

- [ ] Review headers already provided by the project/server.
- [ ] Add required headers.
- [ ] Test CSP against Google OAuth requirements.
- [ ] Test CSP against the frontend application.
- [ ] Enable HSTS only when HTTPS deployment is confirmed.
- [ ] Avoid configurations that break required application functionality.
- [ ] Verify headers on authenticated and unauthenticated pages.

---

# 20. Production Error Handling

Do not expose stack traces or internal implementation details to users.

## TODO

- [ ] Create consistent API error responses.
- [ ] Hide stack traces in production.
- [ ] Hide database errors from users.
- [ ] Hide provider internals from users.
- [ ] Log technical details server-side.
- [ ] Return correlation/request IDs where useful.
- [ ] Ensure authentication errors remain appropriately generic.

---

# 21. Logging Audit

Separate operational logs from audit/security logs where appropriate.

## Operational events

```text
Email sent
Email failed
Email retry scheduled
OAuth success/failure
Database connectivity failure
Background worker failure
```

## Security/audit events

```text
Login
Logout
Password changed
Password reset
Email verified
Admin template changed
Admin notification resent
Reviewer invitation accepted
Reviewer invitation declined
Account disabled/enabled
```

## TODO

- [ ] Standardize log format.
- [ ] Include timestamps.
- [ ] Include user ID where appropriate.
- [ ] Include request/correlation ID.
- [ ] Include notification ID where appropriate.
- [ ] Never log passwords.
- [ ] Never log session tokens.
- [ ] Never log verification tokens.
- [ ] Never log reset tokens.
- [ ] Never log reviewer invitation tokens.
- [ ] Never log API keys.
- [ ] Review application logs before launch.

---

# 22. Monitoring

Production monitoring should detect failures without exposing private data.

## TODO

Monitor:

- [ ] API availability.
- [ ] Database availability.
- [ ] Authentication failure rate.
- [ ] Password reset failure rate.
- [ ] Email send failure rate.
- [ ] Notification retry backlog.
- [ ] Background worker health.
- [ ] High rate-limit activity.
- [ ] Unexpected OAuth errors.
- [ ] Application CPU/memory usage.
- [ ] Database connection pool usage.
- [ ] Storage failures.

---

# 23. Email Monitoring

Create operational alerts for:

```text
High email failure rate
Repeated Resend API errors
Notification backlog
Large retry queue
Unexpected increase in password-reset requests
Unexpected increase in verification emails
Unexpected increase in invitation emails
```

## TODO

- [ ] Define thresholds.
- [ ] Define alert recipients.
- [ ] Avoid putting sensitive email contents into alert messages.
- [ ] Add alert escalation procedure.
- [ ] Verify alerts in staging.

---

# 24. Background Worker Audit

If email retries and scheduled draft reminders use a background worker/queue:

```text
Application
     |
     v
Notification Queue
     |
     v
Worker
     |
     v
Resend
```

## TODO

- [ ] Verify worker starts correctly.
- [ ] Verify worker reconnects after failure.
- [ ] Verify failed jobs do not disappear.
- [ ] Verify retry count is bounded.
- [ ] Verify dead/failed jobs are inspectable.
- [ ] Verify jobs are idempotent.
- [ ] Verify multiple workers cannot incorrectly send duplicates.
- [ ] Verify worker shutdown is graceful.
- [ ] Verify scheduled draft reminders are not duplicated.

---

# 25. Draft Reminder Audit

Draft reminders can easily become noisy.

## TODO

- [ ] Define exact reminder criteria.
- [ ] Define minimum draft age before reminder.
- [ ] Define reminder frequency.
- [ ] Prevent multiple reminders within the same interval.
- [ ] Stop reminders after submission.
- [ ] Stop reminders after withdrawal where appropriate.
- [ ] Stop reminders after the manuscript is no longer a draft.
- [ ] Respect disabled users.
- [ ] Provide Admin configuration/visibility.
- [ ] Test time-zone behavior.

---

# 26. Email Deliverability Review

## TODO

- [ ] Verify sender domain.
- [ ] Verify SPF/DKIM configuration according to Resend/domain requirements.
- [ ] Confirm sender/reply-to values.
- [ ] Use recognizable journal branding.
- [ ] Avoid misleading subject lines.
- [ ] Include required unsubscribe/notification handling only where applicable to the specific message category.
- [ ] Make transactional email purpose clear.
- [ ] Test Gmail delivery.
- [ ] Test Outlook/Microsoft delivery.
- [ ] Test at least one additional major provider.
- [ ] Verify HTML email renders correctly.
- [ ] Verify plain-text email is readable.
- [ ] Verify URLs work in production.

---

# 27. User Experience Audit

## Registration

- [ ] User understands that verification is required.
- [ ] Success message is clear.
- [ ] User can request another verification email.
- [ ] Verification failure is understandable.
- [ ] Expired verification link provides a recovery path.

## Login

- [ ] Manual login is clearly separated from Google login.
- [ ] Error messages are clear but safe.
- [ ] Unverified account flow is understandable.
- [ ] Forgot Password is easy to find.
- [ ] Logout works reliably.

## Password Reset

- [ ] User sees generic forgot-password confirmation.
- [ ] Reset link opens correctly.
- [ ] Expired reset link has a useful message.
- [ ] Password reset confirmation is clear.
- [ ] User can return to Login.

## Reviewer

- [ ] Invitation email is understandable.
- [ ] Accept/decline actions are clear.
- [ ] Expired invitation provides a recovery path.
- [ ] Reviewer sees only appropriate manuscript information.

## Author

- [ ] Submission email is clear.
- [ ] Decision email is understandable.
- [ ] Minor and major revision messages are distinct.
- [ ] Draft reminder is not confusing or excessive.

---

# 28. Accessibility Audit

## TODO

- [ ] Keyboard navigation works.
- [ ] Form controls have labels.
- [ ] Error messages are accessible.
- [ ] Buttons have clear accessible names.
- [ ] Email templates remain readable with normal font scaling.
- [ ] Color is not the only status indicator.
- [ ] Admin tables are usable with keyboard/screen-reader support where practical.

---

# 29. Browser Compatibility Testing

Test:

```text
Firefox
Chrome/Chromium
Microsoft Edge
Safari
```

## TODO

- [ ] Registration works.
- [ ] Manual login works.
- [ ] Google OAuth works.
- [ ] Logout works.
- [ ] Password reset works.
- [ ] Email verification works.
- [ ] Admin notification pages work.
- [ ] Reviewer invitation pages work.
- [ ] Responsive layouts work.

---

# 30. Full Authentication Test Matrix

## Registration

- [ ] Valid registration.
- [ ] Duplicate email.
- [ ] Invalid email.
- [ ] Weak password.
- [ ] Missing required fields.
- [ ] Email verification.
- [ ] Expired verification token.
- [ ] Invalid verification token.
- [ ] Reused verification token.
- [ ] Resend verification email.

## Manual Login

- [ ] Valid login.
- [ ] Wrong password.
- [ ] Unknown email.
- [ ] Disabled user.
- [ ] Locked user.
- [ ] Unverified user according to policy.
- [ ] Session creation.
- [ ] Session persistence.
- [ ] Logout.
- [ ] Session invalidation.

## Google OAuth

- [ ] New OAuth user.
- [ ] Existing OAuth user.
- [ ] Existing manually registered account.
- [ ] OAuth callback failure.
- [ ] OAuth session creation.
- [ ] Logout after OAuth login.

## Password Reset

- [ ] Existing email.
- [ ] Unknown email.
- [ ] Valid reset token.
- [ ] Expired reset token.
- [ ] Invalid reset token.
- [ ] Reused token.
- [ ] Session revocation after reset.
- [ ] Login with new password.

---

# 31. Full Email Test Matrix

## Account

- [ ] Verification email.
- [ ] Verification resend.

## Password

- [ ] Forgot-password email.
- [ ] Password-reset completion.

## Reviewer

- [ ] Invitation email.
- [ ] Invitation resend.
- [ ] Invitation acceptance.
- [ ] Invitation decline.

## Manuscript

- [ ] Submission confirmation.
- [ ] Desk rejection.
- [ ] Editor rejection.
- [ ] Acceptance.
- [ ] Minor revision.
- [ ] Major revision.
- [ ] Draft reminder.

## Admin

- [ ] Test email.
- [ ] Manual resend.
- [ ] Failed notification display.
- [ ] Retry display.

---

# 32. End-to-End Production-Like Scenario

Run the following scenario in staging.

```text
1. Create Author account manually
2. Receive verification email
3. Verify account
4. Log in manually
5. Create manuscript draft
6. Receive draft reminder according to configured schedule
7. Submit manuscript
8. Receive submission confirmation
9. Moderator desk rejects manuscript
10. Author receives desk-rejection email
11. Create another manuscript
12. Moderator passes manuscript
13. Editor invites Reviewer
14. Reviewer receives invitation
15. Reviewer accepts
16. Editor requests minor revision
17. Author receives minor-revision email
18. Editor accepts final manuscript
19. Author receives acceptance email
20. Admin opens Notification History
21. Admin verifies all notification records
22. Admin edits an email template
23. Admin previews it
24. Admin sends a test email
25. Admin verifies audit log
```

## TODO

- [ ] Execute entire scenario.
- [ ] Record failures.
- [ ] Fix failures before production.
- [ ] Repeat after fixes.

---

# 33. Production Deployment Checklist

## Infrastructure

- [ ] Production server ready.
- [ ] HTTPS configured.
- [ ] Domain configured.
- [ ] Reverse proxy configured.
- [ ] Application process manager configured.
- [ ] Database production instance ready.
- [ ] Object storage configured.
- [ ] Backup configured.
- [ ] Monitoring configured.

## Application

- [ ] Production build succeeds.
- [ ] Database migrations succeed.
- [ ] Environment variables configured.
- [ ] Debug mode disabled.
- [ ] Development seed/test routes disabled.
- [ ] Production logging enabled.
- [ ] Error monitoring enabled.
- [ ] Background workers running.

## Email

- [ ] Resend production credentials configured.
- [ ] Sending domain verified.
- [ ] Sender configured.
- [ ] Email links use production HTTPS URLs.
- [ ] Test email delivered successfully.

---

# 34. Deployment Sequence

Use a controlled sequence.

```text
Backup Database
      |
      v
Deploy Application
      |
      v
Run Database Migrations
      |
      v
Start/Restart Workers
      |
      v
Run Health Checks
      |
      v
Run Authentication Smoke Tests
      |
      v
Run Email Smoke Tests
      |
      v
Monitor
```

## TODO

- [ ] Create deployment checklist.
- [ ] Backup production database before migration.
- [ ] Deploy application artifact.
- [ ] Run migrations.
- [ ] Restart affected workers/services.
- [ ] Verify health endpoint.
- [ ] Verify database connection.
- [ ] Verify Resend configuration.
- [ ] Verify Google OAuth.
- [ ] Verify manual login.
- [ ] Verify email verification.
- [ ] Verify password reset.
- [ ] Verify one manuscript notification.
- [ ] Verify one reviewer invitation.
- [ ] Monitor after deployment.

---

# 35. Rollback Plan

A production deployment must have a documented recovery strategy.

## TODO

- [ ] Document application rollback.
- [ ] Document database migration rollback/recovery.
- [ ] Document environment rollback.
- [ ] Document worker rollback.
- [ ] Document notification queue handling during rollback.
- [ ] Prevent duplicate email sending after rollback.
- [ ] Define who can execute rollback.
- [ ] Test rollback procedure in staging.

---

# 36. Incident Response

Prepare procedures for common failures.

## Resend outage

```text
Resend unavailable
      |
      v
Notification remains pending/retrying
      |
      v
Retry when provider recovers
```

## Database outage

```text
Database unavailable
      |
      v
Application reports service error
      |
      v
No secrets exposed
      |
      v
Restore database connectivity
```

## OAuth outage

```text
Google OAuth unavailable
      |
      v
Manual authentication remains available
      |
      v
Users can still access the system where permitted
```

## TODO

- [ ] Document Resend outage response.
- [ ] Document database outage response.
- [ ] Document OAuth outage response.
- [ ] Document session/authentication incident response.
- [ ] Document suspected credential compromise response.
- [ ] Define secret-rotation procedure.

---

# 37. Secret Rotation Checklist

## TODO

- [ ] Rotate Resend API key when required.
- [ ] Rotate session secret according to operational policy.
- [ ] Rotate Google OAuth secret if exposed.
- [ ] Update production secret manager.
- [ ] Restart affected services.
- [ ] Verify authentication after session-secret rotation according to intended behavior.
- [ ] Verify email sending after Resend key rotation.
- [ ] Document rotation date and responsible operator.
- [ ] Never store rotated secrets in Git.

---

# 38. Security Review of Git Repository

Run a final repository audit.

## TODO

Search for:

```text
password=
PASSWORD=
SESSION_SECRET=
RESEND_API_KEY=
GOOGLE_CLIENT_SECRET=
Bearer
secret
token
```

- [ ] Confirm no real credentials are committed.
- [ ] Confirm no real API tokens are committed.
- [ ] Confirm no production `.env` is tracked.
- [ ] Confirm test fixtures do not contain live credentials.
- [ ] Confirm logs do not contain secrets.
- [ ] Confirm documentation contains placeholders rather than real secrets.

---

# 39. Dependency Audit

## TODO

- [ ] Run dependency vulnerability audit.
- [ ] Review critical/high severity findings.
- [ ] Update vulnerable packages where compatible.
- [ ] Remove unused packages.
- [ ] Verify production lockfile is committed.
- [ ] Re-run tests after dependency updates.
- [ ] Verify authentication libraries remain supported.
- [ ] Verify Resend SDK/version is compatible with the production Node.js version.

---

# 40. Performance / Load Smoke Test

At minimum, test:

```text
Concurrent login
Concurrent API access
Notification creation burst
Reviewer invitation burst
Admin notification list
Notification statistics
Password reset request burst
```

## TODO

- [ ] Identify bottlenecks.
- [ ] Verify database indexes.
- [ ] Verify connection pool limits.
- [ ] Verify notification queue behavior.
- [ ] Verify Resend calls do not block normal request processing unnecessarily.
- [ ] Verify one slow email provider response does not freeze the application.

---

# 41. Data Retention Review

Determine how long the journal retains:

```text
Sessions
Verification tokens
Password reset tokens
Reviewer invitations
Notification records
Audit logs
Security logs
Failed email attempts
```

## TODO

- [ ] Define retention periods.
- [ ] Delete expired authentication tokens.
- [ ] Clean old sessions according to policy.
- [ ] Clean old notification-attempt data where appropriate.
- [ ] Preserve required journal/audit records.
- [ ] Document retention policy.
- [ ] Ensure cleanup jobs cannot delete active records.

---

# 42. Privacy Review

## TODO

- [ ] Review what personal data is sent by email.
- [ ] Review what personal data is stored in notification records.
- [ ] Review audit log contents.
- [ ] Avoid storing full rendered email bodies unless required.
- [ ] Avoid exposing reviewer personal information.
- [ ] Avoid exposing unpublished manuscript information unnecessarily.
- [ ] Restrict Admin access to notification history.
- [ ] Document access controls.

---

# 43. Final Admin Verification

The Admin should verify:

- [ ] User management works.
- [ ] Email templates work.
- [ ] Notification history works.
- [ ] Notification filters work.
- [ ] Failed notifications are visible.
- [ ] Safe resend works.
- [ ] Test email works.
- [ ] Provider status works.
- [ ] Audit logs work.
- [ ] No secret values are visible.

---

# 44. Final Author Verification

The Author should verify:

- [ ] Registration.
- [ ] Verification.
- [ ] Login.
- [ ] Logout.
- [ ] Forgot password.
- [ ] Password reset.
- [ ] Draft creation.
- [ ] Draft reminder.
- [ ] Submission confirmation.
- [ ] Desk rejection email.
- [ ] Editor rejection email.
- [ ] Acceptance email.
- [ ] Minor revision email.
- [ ] Major revision email.
- [ ] Manuscript status visibility.

---

# 45. Final Reviewer Verification

The Reviewer should verify:

- [ ] Invitation email.
- [ ] Invitation link.
- [ ] Accept invitation.
- [ ] Decline invitation.
- [ ] Expired invitation handling.
- [ ] Reviewer assignment visibility.
- [ ] Review submission workflow.
- [ ] Deadline/reminder notifications where implemented.

---

# 46. Final Editor Verification

The Editor should verify:

- [ ] Reviewer invitation.
- [ ] Reviewer invitation resend.
- [ ] Review tracking.
- [ ] Decision creation.
- [ ] Author notification after decision.
- [ ] Minor revision notification.
- [ ] Major revision notification.
- [ ] Acceptance notification.
- [ ] Rejection notification.

---

# 47. Final Security Acceptance Criteria

Do not release until all are true:

- [ ] No plaintext passwords exist.
- [ ] No production secrets exist in Git.
- [ ] No JWT dependency is required solely for manual login.
- [ ] Server-side sessions are secure.
- [ ] CSRF protection is reviewed.
- [ ] Authentication endpoints are rate limited.
- [ ] Password reset tokens are protected.
- [ ] Verification tokens are protected.
- [ ] Reviewer invitation tokens are protected.
- [ ] Notification authorization is enforced.
- [ ] Sensitive email data is protected.
- [ ] Admin email operations are audited.
- [ ] Production logs contain no credentials/tokens.
- [ ] HTTPS is enforced.
- [ ] Resend API key is server-side only.
- [ ] Google OAuth secret is server-side only.

---

# 48. Final Email Acceptance Criteria

- [ ] Verification email works.
- [ ] Password reset email works.
- [ ] Reviewer invitation email works.
- [ ] Manuscript submitted email works.
- [ ] Desk rejection email works.
- [ ] Editor rejection email works.
- [ ] Acceptance email works.
- [ ] Minor revision email works.
- [ ] Major revision email works.
- [ ] Draft reminder works.
- [ ] Duplicate notifications are prevented.
- [ ] Failed emails are retried where appropriate.
- [ ] Failed email state is visible to Admin.
- [ ] Templates are editable.
- [ ] Test emails work.
- [ ] Production URLs are correct.
- [ ] Email sender is verified.
- [ ] HTML and text versions render properly.

---

# 49. Final Definition of Done

Phase 8 is complete only when:

## Authentication

- [ ] Google OAuth works in production.
- [ ] Manual registration works.
- [ ] Manual login works.
- [ ] Email verification works.
- [ ] Forgot password works.
- [ ] Password reset works.
- [ ] Logout works.
- [ ] Sessions are secure.
- [ ] Role authorization works.

## Email

- [ ] Resend is configured for production.
- [ ] Sender domain is verified.
- [ ] Required email workflows work.
- [ ] Draft reminders work.
- [ ] Reviewer invitations work.
- [ ] Notification retries work.
- [ ] Duplicate sends are prevented.

## Administration

- [ ] Notification history works.
- [ ] Templates work.
- [ ] Test email works.
- [ ] Safe resend works.
- [ ] Provider status works.
- [ ] Audit logging works.

## Security

- [ ] Secrets are protected.
- [ ] Tokens are protected.
- [ ] CSRF protection is reviewed.
- [ ] Rate limits are active.
- [ ] Security logging is active.
- [ ] Production error handling is safe.
- [ ] Dependency vulnerabilities are reviewed.

## Operations

- [ ] Backups work.
- [ ] Restore procedure is tested.
- [ ] Monitoring is active.
- [ ] Alerts are configured.
- [ ] Rollback plan exists.
- [ ] Incident procedures are documented.

## Testing

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] End-to-end tests pass.
- [ ] Production-like staging tests pass.
- [ ] Browser tests pass.
- [ ] Email delivery tests pass.

---

# 50. Final Production Release Checklist

```text
[ ] Code reviewed
[ ] Security audit completed
[ ] Dependencies audited
[ ] Database backup created
[ ] Database migration verified
[ ] Resend domain verified
[ ] Resend key configured securely
[ ] Google OAuth production config verified
[ ] Manual authentication verified
[ ] Email verification verified
[ ] Password reset verified
[ ] Reviewer invitation verified
[ ] Submission email verified
[ ] Decision emails verified
[ ] Draft reminder verified
[ ] Notification history verified
[ ] Admin template editor verified
[ ] Monitoring enabled
[ ] Backup verified
[ ] Rollback plan verified
[ ] End-to-end acceptance completed
```

---

# Final System State

After Phase 8, the complete feature set should look like:

```text
                        JOURNAL SYSTEM
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
      Google OAuth       Manual Auth        Role System
                              |
                              v
                    Server-side Sessions
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
       Authors             Editors            Reviewers
          |
          v
    Manuscript Workflow
          |
          v
   Notification Events
          |
          v
   Notification Service
          |
       +--+------------------+
       |                     |
       v                     v
   Email Templates        Queue/Retry
       |                     |
       +----------+----------+
                  |
                  v
                Resend
                  |
                  v
              Recipients

                  ^
                  |
          Admin Control Center
                  |
       +----------+----------+
       |          |          |
       v          v          v
   History    Templates   Provider
       |
       v
      Audit
```

The system is ready for production only after every required checkbox in this phase is satisfied and all unresolved security/operational issues have been reviewed and accepted.
