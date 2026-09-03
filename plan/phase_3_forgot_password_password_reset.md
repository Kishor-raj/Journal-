# Journal Management System — Phase 3 Implementation TODO

## Forgot Password + Secure Password Reset

> **Phase status:** `DONE`

> **Purpose:** Implement the complete forgot-password and password-reset flow for manually registered users using the existing Express + PostgreSQL backend, Resend email infrastructure, and DB-backed server-side sessions.
>
> **Important architecture decision:** Do **not** introduce JWT authentication for this phase. Password-reset links use short-lived, single-use reset tokens, while authenticated login continues to use the existing `user_sessions` mechanism.

---

# Phase 3 Goal

Implement this complete flow:

```text
Login page
   |
   +--> Forgot Password
          |
          +--> Enter email
          |
          +--> Server creates short-lived reset token
          |
          +--> Store only token hash in DB
          |
          +--> Send reset email through Resend
          |
          +--> User clicks reset link
                     |
                     +--> Reset Password page
                              |
                              +--> Validate token
                              |
                              +--> Enter new password
                              |
                              +--> Hash password
                              |
                              +--> Update user password
                              |
                              +--> Mark reset token used
                              |
                              +--> Revoke existing sessions
                              |
                              +--> Send password-changed confirmation email
                              |
                              +--> Redirect to Login
```

---

# Existing Project Context

Before implementing Phase 3, preserve the current architecture:

- Backend: Express.js + PostgreSQL.
- Authentication already has Google OAuth.
- Authentication already uses `user_sessions` and hashed session tokens.
- `users` already contains `is_email_verified` and `account_status`.
- Google OAuth users do not necessarily have a local password.
- Resend is being introduced as the email provider in Phase 1.
- Manual email/password authentication is introduced in Phase 2.
- The client is React-based.

Do not create a second incompatible authentication system.

---

# 3.1 Database Design

## 3.1.1 Add Password Credential Storage

[x] Confirm the Phase 2 migration added a password field/credential table.

Preferred design:

```text
users
  |
  +--> local password credential
```

Either of these designs is acceptable:

### Option A — Password hash directly on users

```sql
password_hash TEXT NULL
```

### Option B — Separate credential table

```text
user_password_credentials
- user_id
- password_hash
- created_at
- updated_at
```

**Preferred for maintainability:** a separate credential table if the application may support additional authentication providers in the future.

[x] Do not store plain-text passwords.

[x] Do not store reversible/encrypted passwords.

[x] Do not expose password hashes through `/auth/me` or any API response.

---

## 3.1.2 Create Password Reset Token Table

Create a migration such as:

```text
00xx_create_password_reset_tokens.sql
```

Suggested structure:

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  requested_ip INET,
  user_agent TEXT
);
```

Recommended indexes:

```sql
CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);
```

[x] Token hash is unique.

[x] Token has an expiration timestamp.

[x] Token has a `used_at` field for one-time use.

[x] Token records user ID for lookup.

[x] Token table does not store the raw reset token.

---

# 3.2 Reset Token Rules

Implement the following rules:

[x] Generate the raw reset token using a cryptographically secure random generator.

Example concept:

```js
crypto.randomBytes(32)
```

[x] Hash the token before storing it in PostgreSQL.

Recommended:

```text
SHA-256(rawToken)
```

[x] Send only the raw token inside the reset URL.

[x] Never log the raw token.

[x] Never store the raw token in the database.

[x] Token expiration should be short-lived.

Recommended:

```text
15–30 minutes
```

[x] Token is single-use.

[x] A token must be rejected when:

- expired
- already used
- missing
- malformed
- not found after hashing

---

# 3.3 Forgot Password API

## 3.3.1 Create Route

Update:

```text
server/src/modules/auth/auth.routes.js
```

Add:

```http
POST /api/auth/forgot-password
```

Request:

```json
{
  "email": "author@example.com"
}
```

---

## 3.3.2 Controller

Update:

```text
server/src/modules/auth/auth.controller.js
```

Add controller function similar to:

```text
forgotPassword()
```

Responsibilities:

[x] Validate request body.

[x] Normalize email.

[x] Look up the user by email.

[x] Determine whether a local password account exists.

[x] Generate secure reset token.

[x] Store token hash.

[x] Create reset URL.

[x] Send email through the Resend email service.

[x] Return a generic success response.

---

# 3.4 Prevent User Enumeration

Do **not** return:

```text
Email does not exist
```

or:

```text
No account found
```

Use a generic response such as:

```json
{
  "message": "If an account exists for this email, a password reset link has been sent."
}
```

This must be returned whether the email:

- exists
- does not exist
- belongs to a Google-only account
- is disabled

Do not reveal account existence to unauthenticated callers.

---

# 3.5 Multiple Reset Requests

Decide how multiple requests are handled.

Recommended approach:

[x] Invalidate all previously active reset tokens for the same user.

Example:

```sql
UPDATE password_reset_tokens
SET used_at = now()
WHERE user_id = $1
  AND used_at IS NULL
  AND expires_at > now();
```

Then create one new token.

Benefits:

- only the newest link works
- old links stop working
- easier to reason about security

---

# 3.6 Rate Limiting / Abuse Protection

Forgot-password endpoints are abuse targets.

Implement protection appropriate for the current project architecture.

At minimum:

[x] Limit repeated requests from the same IP.

[x] Consider limiting repeated requests for the same normalized email.

[x] Do not send unlimited reset emails.

[x] Return the same generic response for rate-limited and successful requests where practical, avoiding account enumeration.

Example policy to start with:

```text
Maximum 3–5 reset requests / hour / IP
Maximum 3 reset emails / hour / account
```

Tune these values later after testing.

---

# 3.7 Reset URL Construction

Use the client application origin from environment configuration.

Example:

```text
${CLIENT_ORIGIN}/reset-password?token=${rawToken}
```

Example development URL:

```text
http://localhost:5173/reset-password?token=...
```

Production example:

```text
https://journal.example.com/reset-password?token=...
```

[x] Never hard-code production domain names.

[x] Never send the token to the wrong origin.

[x] Never include the token in server logs.

---

# 3.8 Resend Password Reset Email

Reuse the centralized Resend email service from Phase 1.

Do not create a second email-sending implementation inside `auth.controller.js`.

Suggested service API:

```js
sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresMinutes,
})
```

The email should contain:

- journal/application name
- recipient name where available
- clear explanation
- reset password CTA/link
- expiration time
- security warning
- instruction to ignore the message if they did not request it

---

# 3.9 Password Reset Email Content

Recommended structure:

```text
Subject:
Reset your Journal Management System password

Hello <Name>,

We received a request to reset the password for your account.

Reset Password

This link expires in 30 minutes.

If you did not request this change, you can safely ignore this email.

For security reasons, do not share this link.
```

[x] Use the common email layout from Phase 1.

[x] Use the configured sender address.

[x] Do not include the current password.

[x] Do not include the raw token as visible text.

---

# 3.10 Validate Reset Token API

There are two acceptable designs.

## Preferred

Validate the token when the user submits the new password.

Optionally provide a token validation endpoint for better frontend UX:

```http
GET /api/auth/reset-password/validate?token=...
```

Response example:

```json
{
  "valid": true,
  "expires_at": "..."
}
```

The server must still revalidate the token during the actual reset operation.

Never trust only frontend validation.

---

# 3.11 Reset Password API

## 3.11.1 Create Route

Add:

```http
POST /api/auth/reset-password
```

Request:

```json
{
  "token": "RAW_RESET_TOKEN",
  "password": "NewSecurePassword123!"
}
```

Optional future request field:

```json
{
  "token": "...",
  "password": "...",
  "confirm_password": "..."
}
```

Frontend confirmation is useful, but the backend must remain authoritative.

---

# 3.12 Reset Password Controller

Implement:

```text
resetPassword()
```

Flow:

[x] Validate token input.

[x] Validate password input.

[x] Hash token using the same hash function used when storing reset tokens.

[x] Find an unexpired, unused token.

[x] Load user account.

[x] Reject disabled/deactivated accounts according to application policy.

[x] Hash the new password with a strong password hashing algorithm.

[x] Update password credential.

[x] Mark reset token as used.

[x] Revoke existing authenticated sessions.

[x] Record security/audit activity.

[x] Send password-changed confirmation email.

[x] Return success.

All of these related DB changes should be handled atomically where possible.

---

# 3.13 Password Hashing

Use a password-specific slow hashing algorithm.

Recommended order:

```text
Argon2id
```

or, if your project already has bcrypt available and standardized:

```text
bcrypt
```

Do not use:

- SHA-256 as the password hash
- MD5
- SHA-1
- reversible encryption
- plain text

[x] Centralize password hashing into one utility/service.

Example concept:

```text
server/src/shared/security/password.js
```

Possible functions:

```js
hashPassword(password)
verifyPassword(password, passwordHash)
```

---

# 3.14 Password Policy

Use the same password rules established in Phase 2.

For example:

[x] Minimum length requirement.

[x] Reasonable maximum length.

[x] Reject obviously empty/invalid passwords.

[x] Do not impose unnecessarily complex rules that make passwords harder to use without meaningful security benefit.

[x] Frontend and backend validation messages should be consistent.

The backend remains authoritative.

---

# 3.15 Revoke Existing Sessions After Password Reset

This is an important security requirement.

After successful password reset:

```sql
UPDATE user_sessions
SET revoked_at = now()
WHERE user_id = $1
  AND revoked_at IS NULL;
```

Reason:

If an attacker already has an active session and the legitimate user resets their password, the attacker's old session should not remain valid.

[x] Revoke all active sessions.

[x] Force the user to sign in again using the new password.

Do not automatically create a new authenticated session from the password-reset request.

---

# 3.16 Password Changed Confirmation Email

After a successful reset, send a second email.

Suggested service API:

```js
sendPasswordChangedEmail({
  to,
  name,
})
```

Purpose:

- notify the user that the password changed
- provide an early warning if the reset was unauthorized

Email content should include:

```text
Your password was changed successfully.

If you did not make this change, contact the journal administrator/support immediately.
```

Do not send another reset link automatically from this email.

---

# 3.17 Password Reset Transaction

Prefer a database transaction for the core update.

Conceptually:

```text
BEGIN

1. SELECT reset token FOR UPDATE
2. Verify unused + unexpired
3. UPDATE password credential
4. Mark reset token used
5. Revoke existing sessions
6. Insert security/audit event

COMMIT
```

If anything fails:

```text
ROLLBACK
```

This prevents a partially completed reset state.

---

# 3.18 Security / Audit Logging

Use the project's existing audit/security logging mechanisms where available.

Record events such as:

```text
PASSWORD_RESET_REQUESTED
PASSWORD_RESET_COMPLETED
PASSWORD_RESET_FAILED
PASSWORD_CHANGE_EMAIL_SENT
```

Store useful metadata:

- user ID when known
- timestamp
- IP address
- user agent
- action
- success/failure
- reason category

Never log:

- raw password
- password hash in application logs
- raw reset token
- reset URL containing raw token

---

# 3.19 Cleanup Expired Reset Tokens

Expired tokens should eventually be removed.

Possible cleanup query:

```sql
DELETE FROM password_reset_tokens
WHERE expires_at < now()
   OR used_at IS NOT NULL;
```

For the first implementation, this can run opportunistically during reset requests.

Later it can become:

```text
scheduled cleanup job
```

[x] Do not allow the table to grow indefinitely in production.

---

# 3.20 Frontend — Forgot Password Page

Add a React page/component such as:

```text
client/src/features/auth/ForgotPassword.jsx
```

UI requirements:

[x] Email input.

[x] Submit button.

[x] Loading state.

[x] Validation error state.

[x] Generic success message.

[x] Link back to Login.

Recommended success message:

```text
If an account exists for that email, we have sent instructions to reset your password.
```

Do not display:

```text
This email is not registered.
```

---

# 3.21 Frontend — Reset Password Page

Create:

```text
client/src/features/auth/ResetPassword.jsx
```

Read the token from:

```text
/reset-password?token=...
```

UI requirements:

[x] New password field.

[x] Confirm password field.

[x] Show/hide password controls.

[x] Password validation.

[x] Submit button.

[x] Loading state.

[x] Invalid/expired token state.

[x] Success state.

[x] Link back to Login.

---

# 3.22 Reset Page UX States

Implement these states explicitly:

### Loading

```text
Checking reset link…
```

### Valid token

Show password form.

### Invalid token

```text
This password reset link is invalid or has expired.
Please request a new password reset link.
```

### Successful reset

```text
Your password has been reset successfully.
Please sign in with your new password.
```

---

# 3.23 React Router

Update the client routing to include:

```text
/forgot-password
/reset-password
```

These routes must be publicly accessible.

Do not protect them with `authenticate`.

---

# 3.24 Login Page Integration

Update the existing Login UI.

Add:

```text
Forgot password?
```

Clicking it navigates to:

```text
/forgot-password
```

Do not remove:

```text
Continue with Google
```

The final login screen should support both:

```text
Google OAuth
+
Manual Email/Password Login
```

---

# 3.25 Google OAuth Consideration

A Google OAuth user may have:

```text
No local password
```

When such a user requests forgot password:

- do not create a password unless the application explicitly supports password creation for OAuth users
- do not reveal that the email belongs to a Google account
- return the same generic forgot-password response

Recommended future feature if needed:

```text
Set a password
```

for users who already have a verified Google identity.

That is separate from Phase 3 unless the product specifically requires it.

---

# 3.26 Account Status Rules

Define expected behavior for disabled/locked accounts.

Recommended:

### Disabled account

[x] Do not permit password login.

[x] Do not allow password reset to restore the account automatically.

[x] Forgot-password response remains generic.

### Locked account

Follow the project's account-lockout policy.

[x] Password reset must not silently bypass administrative account restrictions.

### Active account

Normal reset flow applies.

---

# 3.27 Resend Error Handling

If Resend fails while processing a reset request:

Do not expose provider/internal errors to the client.

Do not return:

```text
Resend API failed
```

or:

```text
Email service authentication failed
```

Log the internal error securely and return an appropriate generic response.

For production, consider:

```text
email delivery outbox / retry queue
```

as a later improvement.

---

# 3.28 Email Delivery Logging

Use the email infrastructure from Phase 1.

Record enough information to troubleshoot:

```text
email type
recipient/user ID
provider message ID if available
send status
created_at
error category
```

Do not store sensitive reset tokens in email logs.

---

# 3.29 Backend File Checklist

Review/update these project areas:

```text
server/src/modules/auth/auth.routes.js
server/src/modules/auth/auth.controller.js
server/src/modules/auth/auth.service.js
server/src/config/env.js
server/src/middleware/authenticate.js
```

Potential new files:

```text
server/src/modules/auth/password.service.js
server/src/shared/security/password.js
server/src/shared/security/tokens.js
```

Potential migration:

```text
server/src/db/migrations/00xx_create_password_reset_tokens.sql
```

Add down migration as required by the project's migration convention.

---

# 3.30 Frontend File Checklist

Review/update:

```text
client/src/context/AuthContext.jsx
client/src/services/apiClient.js
```

Add/update:

```text
client/src/features/auth/ForgotPassword.jsx
client/src/features/auth/ResetPassword.jsx
```

Update routing files according to the project's current router structure.

Update existing Login UI.

---

# 3.31 API Contract Checklist

## Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com"
}
```

Generic response:

```json
{
  "message": "If an account exists for this email, a password reset link has been sent."
}
```

---

## Optional Reset Token Validation

```http
GET /api/auth/reset-password/validate?token=...
```

Response:

```json
{
  "valid": true
}
```

or generic invalid response.

---

## Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json
```

Request:

```json
{
  "token": "...",
  "password": "..."
}
```

Success:

```json
{
  "message": "Password reset successfully."
}
```

---

# 3.32 Security Checklist

[x] Reset token generated with cryptographically secure randomness.

[x] Only token hash stored in DB.

[x] Reset token expires quickly.

[x] Reset token is single-use.

[x] Existing reset tokens are invalidated when a new one is issued.

[x] Existing sessions are revoked after successful reset.

[x] Raw token never appears in logs.

[x] Password never appears in logs.

[x] Password hash never appears in API responses.

[x] Forgot-password endpoint prevents user enumeration.

[x] Forgot-password endpoint is rate limited.

[x] Reset endpoint is rate limited where appropriate.

[x] HTTPS used in production.

[x] Reset link uses production HTTPS origin.

[x] Account status rules cannot be bypassed through reset.

---

# 3.33 Test Plan

## Test 1 — Existing Active Manual User

[x] Register manual account.

[x] Verify email.

[x] Request forgot password.

[x] Receive Resend email.

[x] Click link.

[x] Set new password.

[x] Confirm success.

[x] Login with old password fails.

[x] Login with new password succeeds.

---

## Test 2 — Invalid Email

[x] Enter a non-existing email.

[x] Response is generic.

[x] No account information is exposed.

[x] No email is sent.

---

## Test 3 — Expired Token

[x] Create or simulate expired reset token.

[x] Open reset page.

[x] Token is rejected.

[x] Password is not changed.

[x] User can request a new link.

---

## Test 4 — Reused Token

[x] Successfully reset password once.

[x] Reuse same reset URL.

[x] Reset is rejected.

---

## Test 5 — Multiple Requests

[x] Request reset twice.

[x] First link becomes invalid.

[x] Second/latest link works.

---

## Test 6 — Session Revocation

Before reset:

```text
Browser A -> authenticated session
Browser B -> authenticated session
```

After password reset:

[x] Session A is invalid.

[x] Session B is invalid.

[x] User must authenticate again.

---

## Test 7 — Google OAuth User

[x] Request forgot password for Google-only account.

[x] Response remains generic.

[x] Existing Google login still works.

[x] No accidental password credential is created unless explicitly designed.

---

## Test 8 — Disabled Account

[x] Disable account.

[x] Request password reset.

[x] No account enumeration occurs.

[x] Reset cannot reactivate account.

---

## Test 9 — Resend Failure

[x] Simulate Resend failure.

[x] Client receives safe response.

[x] Internal failure is logged.

[x] Application does not crash.

---

## Test 10 — Rate Limit

[x] Send repeated reset requests.

[x] Rate limiting is triggered.

[x] Application remains responsive.

[x] Account enumeration is still prevented.

---

# 3.34 Migration Testing

Run:

```bash
npm run migrate
```

Verify:

[x] Migration succeeds on a clean database.

[x] Migration succeeds on the existing development database.

[x] Down migration works if the project supports rollback.

[x] Indexes are created.

[x] Foreign keys are correct.

[x] Existing users are unaffected.

---

# 3.35 Build / Lint Testing

Backend:

```bash
npm run build
npm run lint
```

Frontend:

```bash
npm run build
```

[x] No syntax errors.

[x] No broken imports.

[x] No unused security helpers.

[x] No production environment values hard-coded.

---

# 3.36 Manual End-to-End Test

Perform this exact test with a real development email address:

```text
1. Open Login
2. Click Forgot Password
3. Enter registered manual account email
4. Submit
5. Check Resend delivery
6. Open reset email
7. Click reset link
8. Enter new password
9. Submit
10. Verify success page
11. Login with new password
12. Confirm old sessions are revoked
13. Request password reset again
14. Confirm old reset token no longer works
```

---

# 3.37 Environment Configuration

Confirm environment values required by Phase 3 exist.

Example:

```env
CLIENT_ORIGIN=http://localhost:5173
SERVER_ORIGIN=http://localhost:3001
```

Resend values come from Phase 1.

Do not commit real API keys.

Example `.env` entries should remain placeholders in `.env.example`.

---

# 3.38 Documentation

Update the server README/documentation with:

[x] Forgot-password endpoint.

[x] Reset-password endpoint.

[x] Token expiration policy.

[x] Password hashing method.

[x] Session revocation behavior.

[x] Local development setup.

[x] Email provider requirements.

---

# 3.39 Phase 3 Definition of Done

Phase 3 is complete only when all of the following are true:

[x] A registered user can request a password reset.

[x] Resend sends the reset email.

[x] Reset tokens are cryptographically secure.

[x] Only token hashes are stored.

[x] Tokens expire.

[x] Tokens are single-use.

[x] Previous active reset tokens are invalidated when appropriate.

[x] User enumeration is prevented.

[x] Reset endpoint validates the token server-side.

[x] New password is securely hashed.

[x] Password is updated successfully.

[x] Existing sessions are revoked after reset.

[x] Password-change confirmation email is sent.

[x] Google OAuth continues to work.

[x] Manual login continues to work.

[x] Disabled-account restrictions are preserved.

[x] Rate limiting exists for reset requests.

[x] Security/audit events are recorded.

[x] Expired/used reset tokens are cleaned up.

[x] Frontend forgot-password page works.

[x] Frontend reset-password page works.

[x] Invalid and expired token states are handled.

[x] Production reset URLs use HTTPS.

[x] Backend build passes.

[x] Backend lint passes.

[x] Frontend build passes.

[x] End-to-end reset testing passes.

---

# Phase 3 Exit State

After completing this phase, authentication should support:

```text
                    +-------------------+
                    |      Login        |
                    +---------+---------+
                              |
             +----------------+----------------+
             |                                 |
       Google OAuth                     Email + Password
             |                                 |
             |                         Forgot Password
             |                                 |
             |                         Resend Reset Email
             |                                 |
             |                         Reset Password
             |                                 |
             +----------------+----------------+
                              |
                      Server-side Session
```

The user should have a complete and secure manual password lifecycle before moving to the manuscript/reviewer notification phases.

---

# Recommended Next Phase

## Phase 4 — Reviewer Invitation Emails

After Phase 3, implement:

- Editor invites reviewer to manuscript.
- Reviewer invitation email through Resend.
- Secure invitation/acceptance link.
- Reviewer accept/decline flow.
- Invitation expiration.
- Invitation reminders.
- Reviewer assignment status synchronization.
- Audit/security/workflow logs.
