# Phase 6 — Email Integration, Reliability, Testing & Production Hardening

## Objective

Complete the integration of all email/authentication features from Phases 1–5 and make the system reliable enough for production.

This phase does **not** introduce a second authentication architecture. Continue using the existing server-side session mechanism for authenticated users.

The final system should reliably support:

- Manual registration + email verification
- Manual login
- Google OAuth login
- Forgot password + password reset
- Reviewer invitation emails
- Reviewer invitation accept/decline flow
- Author submission confirmation
- Moderator desk rejection email
- Editor rejection email
- Editor acceptance email
- Minor revision email
- Major revision email
- Draft manuscript reminder emails
- Email notification logging
- Retry handling for temporary email failures
- Protection against duplicate notifications
- Production monitoring and operational troubleshooting

---

# 1. Verify the Complete Email Architecture

## TODO

- [ ] Confirm there is exactly one application-level email service used by all notification flows.
- [ ] Confirm all business modules call the email service rather than importing the Resend SDK directly.
- [ ] Confirm Resend credentials are read only from environment variables.
- [ ] Confirm no API key is committed to Git.
- [ ] Confirm the configured sender email is a verified Resend sender/domain.
- [ ] Confirm all generated links use the configured public application URL.
- [ ] Confirm development, staging, and production environment values are separated.
- [ ] Confirm email templates are centralized rather than duplicated inside route handlers.

## Expected architecture

```text
Manuscript/Auth/Reviewer Business Logic
                |
                v
        Notification Service
                |
                +---- Template Renderer
                |
                +---- Notification Log
                |
                +---- Email Queue / Retry Layer
                |
                v
              Resend
```

---

# 2. Create a Standard Notification Event Model

All emails should be associated with a predictable event type.

## TODO

- [ ] Define a notification-event enum/constants module.
- [ ] Add event names for every required email.

Recommended events:

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

- [ ] Ensure each notification has a stable event type.
- [ ] Ensure event naming does not depend on email subject text.
- [ ] Add a helper that maps workflow actions to notification events.

---

# 3. Add Idempotency / Duplicate Email Protection

A workflow operation can accidentally execute more than once because of retries, double-clicks, network retries, transaction retries, or repeated API calls.

## TODO

- [ ] Identify notifications that should normally be sent once per workflow event.
- [ ] Create a deterministic notification key.
- [ ] Prevent duplicate submission emails for the same manuscript submission event.
- [ ] Prevent duplicate decision emails for the same editorial decision event.
- [ ] Prevent duplicate reviewer invitation emails unless an explicit resend operation is requested.
- [ ] Prevent multiple verification emails from creating multiple active tokens unnecessarily.
- [ ] Prevent multiple reset requests from producing confusing active tokens.
- [ ] Allow intentional resend operations to bypass ordinary idempotency rules when appropriate.

## Recommended notification key examples

```text
submission:{manuscriptId}:{versionId}
decision:{manuscriptId}:{editorialDecisionId}
review-invite:{reviewerAssignmentId}:{invitationId}
verification:{userId}:{verificationTokenId}
password-reset:{userId}:{resetTokenId}
draft-reminder:{manuscriptId}:{reminderDate}
```

---

# 4. Add Notification Delivery States

The application should distinguish between an email that was requested and an email that was successfully delivered to the provider.

## TODO

- [ ] Review existing `email_notifications` structure.
- [ ] Ensure the notification record can represent lifecycle state.
- [ ] Add status values where necessary.

Recommended statuses:

```text
PENDING
SENDING
SENT
FAILED
RETRYING
CANCELLED
```

- [ ] Store provider message ID when Resend returns one.
- [ ] Store error information safely for troubleshooting.
- [ ] Do not store sensitive token values in notification logs.
- [ ] Store timestamps for created, attempted, sent, failed, and last retry.

---

# 5. Decide Synchronous vs Background Email Delivery

For production reliability, business transactions should not depend entirely on a remote email API call completing inside the HTTP request.

## TODO

- [ ] Identify which emails are acceptable to send synchronously.
- [ ] Identify emails that should be queued for background delivery.
- [ ] Prefer background processing for workflow notifications.
- [ ] Keep user-facing authentication responses independent from temporary Resend outages when practical.
- [ ] Ensure a failed email does not roll back the successful manuscript/authentication operation unless the product explicitly requires that behavior.

## Recommended pattern

```text
User Action
   |
   v
Database Transaction
   |
   +--> Business Operation committed
   |
   +--> Notification record = PENDING

Background Worker
   |
   v
Notification Service
   |
   v
Resend
```

---

# 6. Implement Retry Handling

Temporary provider/network errors should be retried without manually repeating the business operation.

## TODO

- [ ] Define retryable errors.
- [ ] Define non-retryable errors.
- [ ] Implement bounded retries.
- [ ] Add exponential backoff.
- [ ] Add maximum retry count.
- [ ] Preserve the original notification/event ID during retries.
- [ ] Do not create a new business event for every retry.
- [ ] Mark permanently failed emails as `FAILED` after retry exhaustion.

Recommended retry schedule:

```text
Attempt 1 -> immediate
Attempt 2 -> short delay
Attempt 3 -> longer delay
Attempt 4 -> longer delay
Then      -> FAILED
```

Do not retry invalid recipient addresses indefinitely.

---

# 7. Handle Resend Failures Correctly

## TODO

- [ ] Handle network timeout.
- [ ] Handle DNS/connection failures.
- [ ] Handle provider API errors.
- [ ] Handle rate limiting.
- [ ] Handle invalid sender configuration.
- [ ] Handle invalid recipient address.
- [ ] Handle malformed email payloads.
- [ ] Log provider errors without exposing API credentials.
- [ ] Return safe user-facing messages.

Example user-facing behavior:

```text
Your account was created, but we could not send the verification email right now.
Please try sending the verification email again.
```

Do not expose internal Resend error details to end users.

---

# 8. Protect Authentication Email Tokens

Review every token implemented in Phases 1–3 and Phase 4.

## TODO

- [ ] Never store raw verification/reset/invitation tokens if avoidable.
- [ ] Store a cryptographic hash of the token in the database.
- [ ] Generate tokens using a cryptographically secure random generator.
- [ ] Give tokens short and appropriate expiration periods.
- [ ] Mark tokens as consumed immediately after successful use.
- [ ] Prevent token reuse.
- [ ] Prevent token use after expiration.
- [ ] Prevent token use after account state makes it invalid.
- [ ] Avoid leaking whether an email exists in password-reset responses.

---

# 9. Session Security Review

Manual login must continue to use server-side sessions.

## TODO

- [ ] Verify session tokens are cryptographically random.
- [ ] Store only a hash of the session token if that is the application's established design.
- [ ] Set secure cookies in production.
- [ ] Set `HttpOnly` on authentication cookies.
- [ ] Configure an appropriate `SameSite` policy.
- [ ] Use `Secure` cookies under HTTPS.
- [ ] Rotate or revoke sessions after sensitive account events where required.
- [ ] Revoke existing sessions after a successful password reset if that is the chosen security policy.
- [ ] Verify logout invalidates the server-side session.
- [ ] Verify disabled/locked accounts cannot use an existing session.

---

# 10. Authentication Abuse Protection

## TODO

- [ ] Rate-limit registration requests.
- [ ] Rate-limit login attempts.
- [ ] Rate-limit verification-email resend.
- [ ] Rate-limit forgot-password requests.
- [ ] Rate-limit password-reset attempts.
- [ ] Rate-limit reviewer invitation resend.
- [ ] Rate-limit draft reminder generation if it can be manually triggered.
- [ ] Add account lockout or temporary throttling for repeated failed password attempts according to the project's security policy.

### Important

Password-reset responses should not reveal whether an email address exists.

Preferred behavior:

```text
If account exists:
    create/send reset email

If account does not exist:
    perform no reset operation

Response in both cases:
    If an account exists, a reset email has been sent.
```

Use wording that does not disclose account existence.

---

# 11. Integrate Notifications With Database Transactions

Email triggering should match committed workflow state.

## TODO

- [ ] Review manuscript submission transaction.
- [ ] Review moderator decision transaction.
- [ ] Review editor decision transaction.
- [ ] Review reviewer invitation transaction.
- [ ] Review password reset transaction.
- [ ] Review account verification transaction.
- [ ] Ensure notification records are created only for committed business events.
- [ ] Avoid sending an email for a transaction that later rolls back.
- [ ] Prefer an outbox-style pattern when practical.

Recommended:

```text
BEGIN TRANSACTION
    update business state
    insert notification/outbox event
COMMIT

Worker sends email
```

---

# 12. Complete Draft Reminder Scheduling

Phase 5 defines the draft reminder behavior. Phase 6 makes it operationally reliable.

## TODO

- [ ] Create the scheduled/background task for draft reminders.
- [ ] Define exactly when a draft becomes eligible.
- [ ] Define reminder frequency.
- [ ] Define a maximum number of reminders.
- [ ] Do not remind authors after submission.
- [ ] Do not remind authors after withdrawal if withdrawn drafts should no longer be reminded.
- [ ] Do not remind disabled accounts unless explicitly required.
- [ ] Prevent duplicate reminders within the same reminder window.
- [ ] Record each reminder event.
- [ ] Provide a safe unsubscribe/notification preference strategy if product requirements later introduce one.

---

# 13. Email Template Validation

Review every template before production.

## TODO

- [ ] Verify subject is present.
- [ ] Verify HTML is valid.
- [ ] Verify plain-text fallback exists where supported.
- [ ] Verify application URL is correct.
- [ ] Verify manuscript IDs are not exposed unnecessarily.
- [ ] Verify reviewer invitation links are valid.
- [ ] Verify reset links are valid.
- [ ] Verify verification links are valid.
- [ ] Verify names are escaped before insertion into HTML.
- [ ] Verify manuscript titles are escaped before insertion into HTML.
- [ ] Verify editor/reviewer comments are never inserted as raw untrusted HTML.
- [ ] Verify no internal database IDs are unnecessarily exposed.

---

# 14. Test Email Links Across Environments

## TODO

- [ ] Local development URL tested.
- [ ] Staging URL tested.
- [ ] Production URL tested.
- [ ] HTTPS production URL tested.
- [ ] Verify frontend route exists for each token-based link.
- [ ] Verify frontend passes the token to the backend correctly.
- [ ] Verify expired token pages show a clear recovery path.
- [ ] Verify already-used token pages show a clear message.

---

# 15. Google OAuth + Manual Login Regression Testing

Both authentication systems must remain functional.

## TODO

- [ ] Test Google sign-in for an existing OAuth user.
- [ ] Test Google sign-in for a new user.
- [ ] Test manual registration for a new email.
- [ ] Test manual login for a verified account.
- [ ] Test manual login before email verification.
- [ ] Test Google account + manual credential interaction according to the linking policy.
- [ ] Confirm role assignment remains correct.
- [ ] Confirm session creation is consistent for both providers.
- [ ] Confirm logout works for both providers.
- [ ] Confirm disabled users cannot authenticate through either path.

---

# 16. Full Email Test Matrix

## Account verification

- [ ] Registration creates user.
- [ ] User receives verification email.
- [ ] Verification link works.
- [ ] Token expires correctly.
- [ ] Token cannot be reused.
- [ ] Resend works.

## Password reset

- [ ] Forgot-password request works.
- [ ] Unknown email receives generic response.
- [ ] Reset email is sent for valid account.
- [ ] Expired reset token is rejected.
- [ ] Used reset token is rejected.
- [ ] Password changes successfully.
- [ ] Old password stops working.
- [ ] Session revocation behavior works.

## Reviewer invitation

- [ ] Editor sends invitation.
- [ ] Reviewer receives invitation.
- [ ] Invitation link works.
- [ ] Reviewer accepts.
- [ ] Reviewer declines.
- [ ] Invitation expires.
- [ ] Resend works.
- [ ] Duplicate invitations are controlled.

## Author notifications

- [ ] Submission email arrives.
- [ ] Desk rejection email arrives.
- [ ] Editor rejection email arrives.
- [ ] Acceptance email arrives.
- [ ] Minor revision email arrives.
- [ ] Major revision email arrives.
- [ ] Draft reminder arrives.
- [ ] Correct author receives the email.
- [ ] Co-authors do not accidentally receive author-only notifications unless explicitly configured.

---

# 17. End-to-End Manuscript Workflow Test

Run the entire workflow in a real test environment.

```text
Author Registration
      |
      v
Email Verification
      |
      v
Manual Login
      |
      v
Create Draft
      |
      v
Draft Reminder
      |
      v
Submit Manuscript
      |
      v
Submission Email
      |
      v
Moderator Check
      |
      +---- Desk Reject -> Author Email
      |
      v
Editor Assignment
      |
      v
Reviewer Invitation
      |
      v
Reviewer Accepts
      |
      v
Review Submitted
      |
      v
Editor Decision
      |
      +---- Reject -> Author Email
      |
      +---- Accept -> Author Email
      |
      +---- Minor Revision -> Author Email
      |
      +---- Major Revision -> Author Email
```

- [ ] Execute every branch at least once.
- [ ] Confirm database state and email state remain consistent.

---

# 18. Automated Backend Tests

## TODO

Add unit/integration tests for:

- [ ] Password hashing.
- [ ] Password verification.
- [ ] Registration validation.
- [ ] Verification token generation.
- [ ] Verification token validation.
- [ ] Password-reset token generation.
- [ ] Password-reset token validation.
- [ ] Session creation.
- [ ] Session revocation.
- [ ] Notification creation.
- [ ] Notification idempotency.
- [ ] Retry handling.
- [ ] Reviewer invitation token validation.
- [ ] Decision-to-email event mapping.
- [ ] Draft reminder eligibility.

---

# 19. Automated API Tests

## TODO

Test endpoints for:

- [ ] Register.
- [ ] Verify email.
- [ ] Resend verification.
- [ ] Login.
- [ ] Logout.
- [ ] Forgot password.
- [ ] Reset password.
- [ ] Reviewer invitation.
- [ ] Invitation accept.
- [ ] Invitation decline.
- [ ] Manuscript submission.
- [ ] Moderator rejection.
- [ ] Editor decisions.

For each endpoint test:

- [ ] Authentication behavior.
- [ ] Authorization behavior.
- [ ] Validation errors.
- [ ] Rate limits.
- [ ] Database changes.
- [ ] Notification generation.
- [ ] Duplicate request behavior.

---

# 20. Frontend Regression Testing

## TODO

- [ ] Register page.
- [ ] Login page.
- [ ] Verification page.
- [ ] Forgot-password page.
- [ ] Reset-password page.
- [ ] Reviewer invitation page.
- [ ] Submission success page.
- [ ] Decision status display.
- [ ] Error messages.
- [ ] Loading states.
- [ ] Token-expired states.
- [ ] Mobile responsive behavior.

Avoid showing technical errors such as raw database or provider exceptions to users.

---

# 21. Email Provider Quota Monitoring

Because the project uses Resend, monitor usage against the configured account limits and current plan.

## TODO

- [ ] Monitor daily sending volume.
- [ ] Monitor monthly sending volume.
- [ ] Add application-side metrics for generated emails.
- [ ] Identify abnormal spikes.
- [ ] Identify loops causing repeated emails.
- [ ] Add alerts/log warnings when email volume exceeds expected thresholds.
- [ ] Document how to upgrade/change the email provider later.

Do not hard-code assumptions about provider pricing or quotas into business logic.

---

# 22. Logging and Observability

## TODO

Add structured logs for:

- [ ] Email requested.
- [ ] Email queued.
- [ ] Email send started.
- [ ] Email sent successfully.
- [ ] Email failed.
- [ ] Email retry scheduled.
- [ ] Email permanently failed.
- [ ] Verification success/failure.
- [ ] Password reset success/failure.
- [ ] Invitation accept/decline.

Never log:

- [ ] Passwords.
- [ ] Password reset tokens.
- [ ] Verification tokens.
- [ ] Invitation tokens.
- [ ] Resend API keys.
- [ ] Session secrets.

---

# 23. Admin Troubleshooting Support

Admin should be able to determine why a notification failed without viewing sensitive token values.

## TODO

Consider adding an admin email-delivery view with:

- [ ] Notification ID.
- [ ] Event type.
- [ ] Recipient email.
- [ ] Manuscript reference where applicable.
- [ ] Status.
- [ ] Created time.
- [ ] Last attempt time.
- [ ] Retry count.
- [ ] Provider message ID.
- [ ] Sanitized failure reason.

Do not expose token values or passwords.

---

# 24. Database Integrity Checks

## TODO

Review all migrations created in Phases 1–5.

- [ ] Foreign keys are correct.
- [ ] Unique constraints prevent duplicates.
- [ ] Expiration columns have appropriate indexes.
- [ ] Notification lookup columns are indexed.
- [ ] Session lookup columns are indexed.
- [ ] Verification/reset token hash columns are indexed where needed.
- [ ] Reviewer invitation lookup columns are indexed.
- [ ] Timestamp columns are consistent.
- [ ] Enum/check constraints match application code.
- [ ] No unnecessary sensitive data is stored.

---

# 25. Production Environment Checklist

## Environment variables

- [ ] Production database URL configured.
- [ ] Resend API key configured securely.
- [ ] Verified sender email/domain configured.
- [ ] Public application URL configured.
- [ ] Session secret is strong and unique.
- [ ] Node environment set to production.
- [ ] OAuth credentials configured separately for production.

## Infrastructure

- [ ] HTTPS enabled.
- [ ] Secure cookies enabled.
- [ ] Database migrations applied.
- [ ] Background worker/scheduler deployed if used.
- [ ] Logs available.
- [ ] Error monitoring enabled.
- [ ] Backups configured.

---

# 26. Security Review Before Release

Perform a manual security review before enabling the features in production.

- [ ] No plaintext passwords.
- [ ] No plaintext reset tokens.
- [ ] No plaintext verification tokens.
- [ ] No plaintext invitation tokens.
- [ ] No JWT added unnecessarily for manual login.
- [ ] Session fixation protections reviewed.
- [ ] CSRF strategy reviewed for cookie-authenticated state-changing requests.
- [ ] XSS protections reviewed in email templates.
- [ ] SQL injection protections reviewed.
- [ ] Rate limiting enabled.
- [ ] Account enumeration protections enabled for password reset.
- [ ] Authorization checked for Editor-only invitation actions.
- [ ] Authorization checked for Moderator/Editor decision notifications.

---

# 27. Deployment Strategy

## TODO

- [ ] Merge Phase 1–5 changes into a dedicated integration branch.
- [ ] Apply database migrations in staging first.
- [ ] Configure Resend staging sender/domain if available.
- [ ] Run complete end-to-end tests.
- [ ] Verify Google OAuth still works.
- [ ] Verify manual authentication still works.
- [ ] Verify all required emails.
- [ ] Monitor logs after deployment.
- [ ] Deploy to production.
- [ ] Perform one controlled production email test.
- [ ] Monitor delivery/failure rates after release.

---

# 28. Rollback Plan

A production email failure should not require rolling back unrelated manuscript functionality.

## TODO

- [ ] Document how to disable outbound email temporarily.
- [ ] Document how to pause the email worker.
- [ ] Preserve notification records during an outage.
- [ ] Allow failed notifications to be retried after recovery.
- [ ] Document database migration rollback procedures where safe.
- [ ] Keep authentication and manuscript state changes independent from email delivery whenever possible.

---

# 29. Final Acceptance Checklist

## Authentication

- [ ] Google OAuth works.
- [ ] Manual registration works.
- [ ] Email verification works.
- [ ] Manual login works.
- [ ] Logout works.
- [ ] Forgot password works.
- [ ] Password reset works.
- [ ] Sessions remain secure.

## Reviewer workflow

- [ ] Editor can invite reviewer.
- [ ] Reviewer receives email.
- [ ] Reviewer can accept.
- [ ] Reviewer can decline.
- [ ] Expired invitations fail safely.
- [ ] Resends work.

## Manuscript workflow

- [ ] Submission email works.
- [ ] Desk rejection email works.
- [ ] Editor rejection email works.
- [ ] Acceptance email works.
- [ ] Minor revision email works.
- [ ] Major revision email works.
- [ ] Draft reminder works.

## Reliability

- [ ] Duplicate notifications are prevented.
- [ ] Retry mechanism works.
- [ ] Failed notifications are visible in logs/database.
- [ ] Provider failures do not corrupt manuscript/authentication state.
- [ ] Production configuration is secure.

---

# 30. Definition of Done

Phase 6 is complete only when:

- [ ] All Phase 1–5 features are integrated.
- [ ] All required email events are generated from the correct workflow transitions.
- [ ] Manual authentication and Google OAuth both work.
- [ ] All sensitive tokens are secure and non-reusable.
- [ ] All authentication flows use secure server-side sessions.
- [ ] Duplicate emails are controlled.
- [ ] Temporary Resend failures are retried.
- [ ] Permanent failures are recorded for troubleshooting.
- [ ] Draft reminders run on a controlled schedule.
- [ ] Automated tests cover the major authentication and notification paths.
- [ ] End-to-end journal workflow testing passes.
- [ ] Production environment variables and secrets are secured.
- [ ] Logging does not leak sensitive credentials or tokens.
- [ ] Deployment and rollback procedures are documented.
- [ ] The application is ready for controlled production release.

---

# Recommended Implementation Order

```text
1. Notification event model
       |
       v
2. Idempotency + notification states
       |
       v
3. Queue/outbox + retry handling
       |
       v
4. Draft reminder scheduler
       |
       v
5. Authentication/security review
       |
       v
6. Automated backend/API tests
       |
       v
7. End-to-end manuscript workflow tests
       |
       v
8. Production environment setup
       |
       v
9. Staging validation
       |
       v
10. Production deployment + monitoring
```

# Next Phase

After Phase 6, the core Resend + Manual Login implementation should be feature-complete. Any further phase should focus on optional improvements such as email preferences, delivery analytics, admin notification management, template versioning, or replacing the basic notification worker with a more advanced queue system.
