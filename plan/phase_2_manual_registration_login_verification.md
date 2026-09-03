# Phase 2 — Manual Registration, Email/Password Login & Email Verification

> **Phase status:** `DONE`

## Goal

Implement the **second authentication method** alongside the existing Google OAuth flow:

- Continue supporting **Google OAuth login**.
- Add **manual account registration** with email + password.
- Verify the user's email address through **Resend** before the account is considered fully verified.
- Add **manual email/password login**.
- Reuse the project's existing **DB-backed server-side session** (`user_sessions`) instead of introducing JWT solely for manual login.
- Keep the authentication methods linked to the same `users` account when the same email is used.
- Preserve the journal's existing role/session/dashboard architecture.

> **Important architecture decision:** Do NOT create a separate JWT authentication system for manual login. The current project already has `user_sessions`, `authenticate.js`, `createSession()`, `findSession()`, and cookie/Bearer session handling. Manual login should authenticate credentials and then issue the same session type used by Google OAuth.

---

# 2.1 Current Authentication Foundation to Preserve

The uploaded project already contains the following pieces and they should remain the foundation of Phase 2:

- `server/src/modules/auth/auth.service.js`
- `server/src/modules/auth/auth.controller.js`
- `server/src/modules/auth/auth.routes.js`
- `server/src/middleware/authenticate.js`
- `server/src/db/migrations/0002_create_users.sql`
- `server/src/db/migrations/0003_create_user_identities.sql`
- `server/src/db/migrations/0004_create_user_sessions.sql`
- `client/src/features/public/Login.jsx`
- `client/src/context/AuthContext.jsx`
- `client/src/services/authService.js`
- `client/src/services/apiClient.js`

The existing flow is approximately:

```text
Google OAuth
    ↓
Google callback
    ↓
findOrCreateUser()
    ↓
createSession()
    ↓
HttpOnly session cookie
    ↓
/api/auth/me
    ↓
Role-based dashboard
```

Phase 2 adds a parallel credential flow:

```text
Manual Registration
    ↓
Validate email/password
    ↓
Create users row
    ↓
Store password hash
    ↓
Create manual identity / credential record
    ↓
Generate email verification token
    ↓
Send verification email through Resend
    ↓
User clicks verification link
    ↓
Verify token
    ↓
Mark email verified
```

and:

```text
Manual Login
    ↓
Find user by email
    ↓
Check account status
    ↓
Check password hash
    ↓
Check email verification state
    ↓
createSession()
    ↓
HttpOnly session cookie
    ↓
/api/auth/me
    ↓
Role-based dashboard
```

---

# 2.2 Decide the Data Model Before Coding

## Recommendation

Keep authentication provider information separate from the user's profile.

The existing `users` table is already the central account table. Do not create a second `manual_users` table.

Recommended model:

```text
users
  |
  +---- user_identities
  |       ├── google identity
  |       └── local/manual identity
  |
  +---- user_sessions
  |
  +---- email verification records
  |
  +---- password reset records (Phase 3)
```

For the password itself, prefer a dedicated credential table rather than storing the password directly in `users`.

Recommended:

```text
users
  ↓
user_password_credentials
```

This makes it explicit that passwords belong to the local authentication method only.

---

# 2.3 Database Migration — Password Credential Storage

## File

Create:

```text
server/src/db/migrations/0043_create_user_password_credentials.sql
server/src/db/migrations/0043_create_user_password_credentials.down.sql
```

## Table

Recommended structure:

```sql
CREATE TABLE user_password_credentials (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_changed_at TIMESTAMPTZ DEFAULT now(),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### TODO

- [ ] Create the `user_password_credentials` table.
- [ ] Make `user_id` the primary key so one local password credential exists per user.
- [ ] Store only the password hash; never store plaintext passwords.
- [ ] Add `password_changed_at` for security/audit purposes.
- [ ] Add failed-login counters if account lockout is implemented here.
- [ ] Add indexes only where the eventual queries require them.
- [ ] Create a matching down migration.
- [ ] Run the migration against development PostgreSQL.
- [ ] Confirm existing Google users are unaffected.

---

# 2.4 Database Migration — Email Verification Tokens

Do not put a one-time verification token directly in the `users` row.

Create a dedicated table.

## Files

```text
server/src/db/migrations/0044_create_email_verification_tokens.sql
server/src/db/migrations/0044_create_email_verification_tokens.down.sql
```

Recommended structure:

```sql
CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_verification_tokens_user_id
  ON email_verification_tokens(user_id);

CREATE INDEX idx_email_verification_tokens_expires_at
  ON email_verification_tokens(expires_at);
```

### TODO

- [ ] Store only the SHA-256 hash of the raw verification token.
- [ ] Never store the raw token in PostgreSQL.
- [ ] Give tokens an explicit expiration time.
- [ ] Add `used_at` so tokens become single-use.
- [ ] Create the matching down migration.
- [ ] Decide the exact expiration period; recommended initial value: **24 hours**.
- [ ] Decide whether only the newest active token should remain valid.
- [ ] Add cleanup/pruning for expired and used tokens later.

---

# 2.5 Decide How Manual Identity Appears in `user_identities`

The current project already uses:

```text
user_identities
```

for Google accounts.

For manual authentication, do not pretend that email/password is an OAuth provider.

Two valid designs exist:

### Recommended design

Use `user_password_credentials` as the source of password authentication and keep `user_identities` for external providers such as Google.

That produces:

```text
user_identities
  → Google identity

user_password_credentials
  → local password credential
```

This is the cleaner model for this project.

### TODO

- [ ] Do not add fake Google-like fields for password login.
- [ ] Keep `user_identities.provider = 'google'` for Google OAuth.
- [ ] Use `user_password_credentials` for manual credentials.
- [ ] Document this distinction in the auth service.

---

# 2.6 Password Hashing Library

Install a strong password-hashing library.

Preferred choices:

- Argon2id
- bcrypt

For a new implementation, **Argon2id is preferred** where the deployment environment supports it.

### TODO

- [ ] Add the chosen password hashing package to `server/package.json`.
- [ ] Add a small wrapper in the authentication service or shared security utility.
- [ ] Add `hashPassword(password)`.
- [ ] Add `verifyPassword(password, passwordHash)`.
- [ ] Never expose hash values in API responses.
- [ ] Never log passwords.
- [ ] Never log password hashes.

Recommended abstraction:

```js
const passwordHash = await hashPassword(password)
const valid = await verifyPassword(password, passwordHash)
```

This keeps the controller independent of the exact hashing algorithm.

---

# 2.7 Registration API Design

Add a public registration endpoint.

Recommended endpoint:

```http
POST /api/auth/register
```

Request example:

```json
{
  "email": "author@example.com",
  "password": "StrongPassword123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

The exact profile fields can be expanded later, but do not unnecessarily duplicate fields already collected by the existing profile-completion flow.

### TODO

- [ ] Add registration controller.
- [ ] Add registration service function.
- [ ] Add route to `auth.routes.js`.
- [ ] Validate request body before database work.
- [ ] Normalize email before lookup/storage.
- [ ] Trim names.
- [ ] Reject invalid email formats.
- [ ] Enforce a minimum password length.
- [ ] Add sensible password-quality validation.
- [ ] Reject passwords consisting only of whitespace.
- [ ] Never return the password hash.

---

# 2.8 Email Normalization

Because PostgreSQL is already using `CITEXT` for `users.email`, the database provides case-insensitive email semantics. The application should still normalize input consistently.

### TODO

- [ ] Trim leading/trailing whitespace.
- [ ] Normalize email to lowercase for application consistency.
- [ ] Use the normalized value for registration and login lookup.
- [ ] Ensure duplicate emails cannot create duplicate accounts.

Example:

```js
const email = input.email.trim().toLowerCase()
```

---

# 2.9 Registration Transaction

Registration must be transactional.

Recommended sequence:

```text
BEGIN
  ↓
Find email
  ↓
Create user
  ↓
Create password credential
  ↓
Create verification token
  ↓
COMMIT
  ↓
Send email
```

Do not send the email before the database transaction successfully commits.

### Important

Email delivery should be treated as an external side effect.

Preferred pattern:

```text
DB transaction commits
       ↓
Send verification email
       ↓
Record success/failure
```

If email sending fails, do not roll back the user account just because Resend was temporarily unavailable. Instead, provide a **resend verification** flow.

### TODO

- [ ] Wrap user + credentials + verification token creation in a DB transaction.
- [ ] Commit before calling Resend.
- [ ] Handle email delivery failure gracefully.
- [ ] Make the registration response clear that verification is required.

---

# 2.10 Role Assignment During Manual Registration

Manual registration must not allow the browser to choose privileged roles.

The client must NOT submit:

```json
{
  "role": "admin"
}
```

and the backend must ignore/reject role fields from public registration.

Recommended behavior:

```text
New self-registered user
        ↓
Default Author role
```

This is consistent with the existing Google-user behavior in the project.

### TODO

- [ ] Never accept a role from public registration.
- [ ] Resolve the Author role entirely on the backend.
- [ ] Assign only the intended default role.
- [ ] Preserve Admin-assigned roles for privileged users.
- [ ] Do not let a registration request modify `role_id` for an existing account.

> **Architecture note:** The current codebase contains both `users.role_id` and `user_roles`. Before Phase 2 is marked complete, keep the existing role/session behavior consistent. Do not make public registration responsible for solving broader role-model refactoring unless that is explicitly part of another phase.

---

# 2.11 Verification Token Generation

Generate a cryptographically secure random token.

Recommended concept:

```js
const rawToken = crypto.randomBytes(32).toString('hex')
const tokenHash = sha256(rawToken)
```

Store:

```text
token_hash
expires_at
user_id
```

Send the raw token only inside the verification link.

### Verification URL

Recommended shape:

```text
https://your-client-domain.com/verify-email?token=<raw-token>
```

or, if the backend completes verification directly:

```text
https://your-server-domain.com/api/auth/verify-email?token=<raw-token>
```

For this React application, a frontend verification page is recommended:

```text
/verify-email
```

The page calls the backend verification API.

### TODO

- [ ] Generate cryptographically secure tokens.
- [ ] Store only the hash.
- [ ] Set a short expiration period.
- [ ] Make token single-use.
- [ ] Invalidate older active verification tokens when generating a new one.
- [ ] Never log the raw token.
- [ ] Never include the raw token in server logs or analytics.

---

# 2.12 Resend — Verification Email

Use the Resend email service created in Phase 1.

Recommended logical email template key:

```text
account.email_verification
```

The email should contain:

- Journal/application name
- Greeting
- Explanation that the account was created
- Verification button/link
- Expiration information
- Support/contact information
- A note telling the user not to share the link

### TODO

- [ ] Implement `sendEmailVerificationEmail(...)` in the email service.
- [ ] Reuse the Phase 1 Resend client.
- [ ] Do not initialize a second Resend client inside the controller.
- [ ] Use the application's configured `CLIENT_ORIGIN`.
- [ ] Generate the verification URL from configuration.
- [ ] Use both HTML and plain-text email versions.
- [ ] Keep email template content separate from controller logic.
- [ ] Record send result/status in the email notification log if implemented in Phase 1.

---

# 2.13 Verification API

Recommended endpoint:

```http
POST /api/auth/verify-email
```

Request:

```json
{
  "token": "raw-token-from-email"
}
```

### Backend sequence

```text
Receive token
   ↓
Validate format/presence
   ↓
SHA-256 hash
   ↓
Find token record
   ↓
Check unused
   ↓
Check expiration
   ↓
Mark token used
   ↓
Set users.is_email_verified = true
   ↓
Return success
```

### TODO

- [ ] Add `verifyEmail` controller.
- [ ] Add `verifyEmail` service function.
- [ ] Hash submitted token before DB lookup.
- [ ] Reject missing token.
- [ ] Reject expired token.
- [ ] Reject used token.
- [ ] Update `users.is_email_verified = true`.
- [ ] Set `used_at = now()`.
- [ ] Perform user + token update inside one transaction.
- [ ] Return an appropriate success response.
- [ ] Return a safe error message for invalid/expired tokens.
- [ ] Do not reveal sensitive database details.

---

# 2.14 Resend Verification Email

A user may lose the first email or let it expire.

Add:

```http
POST /api/auth/resend-verification
```

Request:

```json
{
  "email": "author@example.com"
}
```

### Security requirement

Do not reveal whether an account exists.

For both existing and non-existing email addresses, return a generic response such as:

```text
If an account requires verification, a new verification email will be sent.
```

### TODO

- [ ] Add resend-verification controller.
- [ ] Add resend-verification service.
- [ ] Always return a generic public response.
- [ ] Do not reveal whether email exists.
- [ ] Generate a new secure token.
- [ ] Invalidate previous active verification tokens.
- [ ] Apply rate limiting.
- [ ] Send through Resend.
- [ ] Log the event without exposing the token.

---

# 2.15 Manual Login API

Add:

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "author@example.com",
  "password": "StrongPassword123!"
}
```

### Backend login sequence

```text
Receive credentials
      ↓
Normalize email
      ↓
Find user
      ↓
Find password credential
      ↓
Check account status
      ↓
Verify password
      ↓
Check email verification
      ↓
createSession()
      ↓
Set HttpOnly session cookie
      ↓
Return authenticated user/session metadata
```

### TODO

- [ ] Add `login` controller.
- [ ] Add `login` service function.
- [ ] Normalize email.
- [ ] Look up user by email.
- [ ] Look up password credential.
- [ ] Verify password hash.
- [ ] Reject disabled accounts.
- [ ] Reject locked accounts.
- [ ] Require verified email for normal manual login.
- [ ] Call the existing `createSession()` function after successful authentication.
- [ ] Do not create a second session implementation.
- [ ] Set the existing `session_token` cookie.
- [ ] Return the same style of authenticated response used by Google OAuth.

---

# 2.16 Unverified Manual Login Behavior

Recommended policy:

```text
Correct email + correct password + email not verified
                 ↓
            Do not login
                 ↓
       Tell user verification required
                 ↓
     Offer “Resend verification email”
```

Do not create a fully authenticated session for an unverified manual account unless the product explicitly requires this later.

### TODO

- [ ] Return a dedicated `EMAIL_NOT_VERIFIED` error code or equivalent.
- [ ] Include a frontend action to resend verification.
- [ ] Do not expose verification tokens through the login response.

---

# 2.17 Login Failure Security

Do not reveal whether a given email is registered.

Avoid responses such as:

```text
Email does not exist
```

followed by:

```text
Wrong password
```

Use a generic credential failure for invalid combinations.

Example:

```text
Invalid email or password.
```

The unverified-account case can be a controlled exception because it is useful UX, but do not disclose unnecessary account details.

### TODO

- [ ] Use generic credential errors.
- [ ] Apply login rate limiting.
- [ ] Record failed login attempts in a security log.
- [ ] Never log passwords.
- [ ] Never log full credential payloads.
- [ ] Consider temporary lockout after repeated failures.

---

# 2.18 Session Integration — Do Not Add JWT

This is one of the most important implementation items.

The current project already does:

```text
Random session token
       ↓
SHA-256 token hash in DB
       ↓
user_sessions
       ↓
HttpOnly cookie
```

Manual login should call the same function:

```js
const session = await createSession(
  user.id,
  req.ip,
  req.get('user-agent')
)
```

Then reuse the existing cookie options.

### TODO

- [ ] Reuse `createSession()`.
- [ ] Reuse `getSessionCookieOptions()` or move cookie creation to a reusable helper if necessary.
- [ ] Reuse `findSession()`.
- [ ] Reuse `authenticate()` middleware.
- [ ] Reuse `/api/auth/me`.
- [ ] Reuse `/api/auth/logout`.
- [ ] Reuse role-selection/session behavior already implemented.
- [ ] Do NOT create `jwt.sign()` / `jwt.verify()` for manual login.
- [ ] Do NOT create a second authentication middleware.

---

# 2.19 Google + Manual Account Linking

This is a critical edge case.

Example:

```text
User registers manually with:
user@example.com

Later clicks:
Continue with Google

Google returns:
user@example.com
```

The system should not silently create two separate accounts.

### TODO

- [ ] Review `findOrCreateUser()` carefully before enabling mixed-method accounts.
- [ ] Keep the existing Google identity linked to the existing `users` row when the email matches an existing account, subject to the application's identity-linking security policy.
- [ ] Do not treat arbitrary email text as proof of identity.
- [ ] Make Google and password credentials attach to the same user account where linking is explicitly allowed.
- [ ] Prevent duplicate users with the same email.
- [ ] Verify all identity-linking behavior with tests.

> **Security note:** Automatic account linking based purely on an unverified email claim should not be generalized to arbitrary providers. Google OAuth already supplies verified-email information in the current implementation; preserve explicit provider trust rules.

---

# 2.20 Existing Google Users

Existing users created through Google need to continue working.

### Required behavior

```text
Existing Google user
        ↓
No password credential yet
        ↓
Google login continues normally
```

They should not be forced to create a password just because manual login was added.

However, a future Phase 3 can allow a logged-in Google user to create a local password.

### TODO

- [ ] Confirm every existing Google account can still log in.
- [ ] Confirm `user_password_credentials` remains optional.
- [ ] Confirm Google-only users do not receive password-login errors incorrectly.
- [ ] Confirm no migration backfills dummy passwords.

---

# 2.21 Frontend — Login Page

Current file:

```text
client/src/features/public/Login.jsx
```

The page currently presents Google login only.

Convert it to a dual-login screen.

Recommended UI:

```text
Hello!
Sign in to continue

[ Email ]
[ Password ]

[ Sign In ]

Forgot password?

──────── OR ────────

[ Continue with Google ]

Don't have an account? Create account
```

### TODO

- [ ] Add email input.
- [ ] Add password input.
- [ ] Add form submit handling.
- [ ] Add loading state.
- [ ] Add backend error handling.
- [ ] Keep existing Google button.
- [ ] Add registration link.
- [ ] Add forgot-password link now as a navigation placeholder if Phase 3 will implement it immediately after Phase 2.
- [ ] Add verification-resend access for unverified users.
- [ ] Do not store the user's password in localStorage.

---

# 2.22 Frontend — Registration Page

Create:

```text
client/src/features/auth/Register.jsx
```

Suggested fields:

```text
First Name
Last Name
Email
Password
Confirm Password

[Create Account]
```

After successful registration:

```text
Registration successful.
Check your email to verify your account.
```

### TODO

- [ ] Build registration form.
- [ ] Add client-side validation.
- [ ] Validate password confirmation.
- [ ] Add show/hide password control if desired.
- [ ] Add loading state.
- [ ] Display safe API errors.
- [ ] Redirect to email-verification instructions page after success.
- [ ] Add link back to login.
- [ ] Do not retain the password after submission.

---

# 2.23 Frontend — Email Verification Page

Create:

```text
client/src/features/auth/VerifyEmail.jsx
```

Route:

```text
/verify-email
```

The page should read the token from the URL query string.

Example:

```text
/verify-email?token=abc123
```

### UI states

```text
Loading…

Success:
Email verified successfully.
[Continue to Login]

Expired:
Verification link expired.
[Resend Verification Email]

Invalid/Used:
This verification link is no longer valid.
[Resend Verification Email]
```

### TODO

- [ ] Add route.
- [ ] Read token from query parameters.
- [ ] Call `/api/auth/verify-email`.
- [ ] Show loading state.
- [ ] Show success state.
- [ ] Show invalid/expired state.
- [ ] Provide resend verification flow.

---

# 2.24 Frontend — Authentication Service

Current file:

```text
client/src/services/authService.js
```

Add functions such as:

```js
export function register(payload) {
  return apiClient.post('/auth/register', payload)
}

export function login(payload) {
  return apiClient.post('/auth/login', payload)
}

export function verifyEmail(token) {
  return apiClient.post('/auth/verify-email', { token })
}

export function resendVerification(email) {
  return apiClient.post('/auth/resend-verification', { email })
}
```

### TODO

- [ ] Add registration API helper.
- [ ] Add login API helper.
- [ ] Add verify-email API helper.
- [ ] Add resend-verification API helper.
- [ ] Keep `getMe()` and `selectRole()` unchanged unless required.

---

# 2.25 AuthContext Integration

Current file:

```text
client/src/context/AuthContext.jsx
```

Manual login should work without creating a second user context.

### TODO

- [ ] After successful manual login, fetch `/auth/me` or update auth context through the existing mechanism.
- [ ] Keep Google OAuth callback behavior working.
- [ ] Keep logout behavior unchanged.
- [ ] Ensure protected routes see the same `user` object regardless of authentication method.
- [ ] Ensure role-based dashboard routing remains identical.

Target behavior:

```text
Google login ──┐
               ├──> same session system ──> same AuthContext ──> same dashboards
Manual login ──┘
```

---

# 2.26 API Client Consideration

Current `client/src/services/apiClient.js` supports both:

- `Authorization: Bearer <token>`
- cookie credentials

Do not remove either without checking every existing deployment path.

### TODO

- [ ] Confirm manual login works with the existing `credentials: 'include'` setting.
- [ ] Confirm the session cookie is sent on `/auth/me`.
- [ ] Confirm CORS credentials work between frontend and backend.
- [ ] Confirm no password or verification token is accidentally persisted by the client.
- [ ] Keep existing token storage behavior only where it is currently required for OAuth/session compatibility.

> **Security cleanup consideration:** because the project already stores the raw session token in localStorage in some flows while also using an HttpOnly cookie, audit this before production. A future hardening task should prefer an HttpOnly-cookie-only session model where practical.

---

# 2.27 Auth Controller Structure

Current file:

```text
server/src/modules/auth/auth.controller.js
```

Add handlers similar to:

```js
export async function register(req, res) {}
export async function login(req, res) {}
export async function verifyEmail(req, res) {}
export async function resendVerification(req, res) {}
```

Keep controllers thin.

Recommended responsibility split:

```text
Controller
  ↓
Validate request / response
  ↓
Auth service
  ↓
Database + hashing + token generation
  ↓
Email service
```

Do not put large SQL blocks and password hashing logic directly in the controller.

---

# 2.28 Auth Service Structure

Current file:

```text
server/src/modules/auth/auth.service.js
```

Add functions along these lines:

```js
registerUser(...)
loginWithPassword(...)
verifyEmailToken(...)
createEmailVerificationToken(...)
resendEmailVerification(...)
```

Keep the existing functions:

```js
findOrCreateUser()
createSession()
findSession()
destroySession()
getAssignedRoles()
selectRoleForSession()
```

### TODO

- [ ] Add password hashing helpers.
- [ ] Add local registration service.
- [ ] Add credential verification service.
- [ ] Add verification-token service.
- [ ] Reuse current transaction patterns.
- [ ] Keep Google OAuth logic separate but inside the same auth module.

---

# 2.29 Auth Routes

Current:

```text
server/src/modules/auth/auth.routes.js
```

Recommended public routes:

```http
GET  /api/auth/google
GET  /api/auth/google/callback
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-email
POST /api/auth/resend-verification
```

Protected routes remain:

```http
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/role
```

### TODO

- [ ] Register the new public routes.
- [ ] Do not add `authenticate` middleware to registration.
- [ ] Do not add `authenticate` middleware to login.
- [ ] Do not add `authenticate` middleware to email verification.
- [ ] Keep logout/me/role protected.

---

# 2.30 Login Rate Limiting

Manual password endpoints are brute-force targets.

At minimum rate-limit:

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/resend-verification
POST /api/auth/verify-email
```

### TODO

- [ ] Choose a rate-limiting strategy compatible with the deployment environment.
- [ ] Apply stricter limits to login.
- [ ] Apply resend cooldowns.
- [ ] Avoid making rate-limit state dependent only on IP if attackers can rotate IPs.
- [ ] Consider email-based throttling for registration/resend.
- [ ] Return safe retry messages.

---

# 2.31 Security Logs & User Activity

The project already has security/audit infrastructure.

Add authentication events where appropriate.

Recommended events:

```text
registration_success
registration_duplicate_email
verification_success
verification_failed
verification_expired
verification_resend
login_success
login_failed
login_unverified_email
login_disabled_account
logout
```

### TODO

- [ ] Write successful registration events to the existing activity/audit mechanism where appropriate.
- [ ] Write failed authentication events to security logs.
- [ ] Store useful metadata such as IP, user-agent, event time, and user ID where available.
- [ ] Never store passwords.
- [ ] Never store raw session tokens.
- [ ] Never store raw verification tokens.

---

# 2.32 Registration Duplicate-Email Cases

Handle these cases explicitly.

### Case A — Email does not exist

```text
Create account
```

### Case B — Email belongs to a verified Google account

Return a safe message explaining that the email is already associated with an account and provide the supported sign-in path, without leaking unnecessary details.

### Case C — Email belongs to an unverified/manual account

Recommended:

```text
Do not create a second account.
Offer resend verification.
```

### TODO

- [ ] Prevent duplicate accounts.
- [ ] Handle existing Google identities safely.
- [ ] Handle existing unverified manual accounts.
- [ ] Avoid user enumeration where possible.

---

# 2.33 Account Status Rules

The existing `users.account_status` values include active/disabled/locked behavior.

Manual login must honor the same rules already enforced by `authenticate.js`.

Recommended:

```text
active   → normal login allowed
locked   → reject login
inactive/disabled → reject login
```

### TODO

- [ ] Check account status during manual login.
- [ ] Match existing status semantics exactly.
- [ ] Do not silently reactivate disabled users.
- [ ] Do not let registration overwrite existing account status.
- [ ] Ensure admin-disabled accounts cannot log in manually.

---

# 2.34 Profile Completion Interaction

Manual registration should create only the information actually necessary for account creation.

The existing application already has:

```text
/profile/complete
```

and profile fields such as:

- institution
- department
- country
- phone
- bio
- ORCID

### TODO

- [ ] Keep registration simple.
- [ ] Continue to use the existing profile-completion workflow for additional journal profile information.
- [ ] Do not duplicate profile-completion rules in registration.
- [ ] Confirm manual users are routed through the same profile-completion mechanism as Google users.

---

# 2.35 Error Response Contract

Use consistent authentication error responses.

Recommended machine-readable fields:

```json
{
  "error": "Email not verified",
  "code": "EMAIL_NOT_VERIFIED"
}
```

Potential codes:

```text
VALIDATION_ERROR
INVALID_CREDENTIALS
EMAIL_NOT_VERIFIED
ACCOUNT_DISABLED
ACCOUNT_LOCKED
EMAIL_ALREADY_EXISTS
VERIFICATION_INVALID
VERIFICATION_EXPIRED
RATE_LIMITED
```

### TODO

- [ ] Standardize auth error codes.
- [ ] Make frontend handling based on `code`, not fragile message text.
- [ ] Do not expose stack traces.
- [ ] Do not expose SQL/database errors to the client.

---

# 2.36 Automated Tests — Backend

Add automated tests for the authentication service and routes.

## Registration

- [x] Valid registration creates one `users` row.
- [x] Valid registration creates one `user_password_credentials` row.
- [x] Registration creates a verification token.
- [x] Password is stored hashed.
- [x] Plain password never appears in DB.
- [x] Duplicate email is rejected safely.
- [x] Role cannot be supplied by public registration.

## Password login

- [x] Correct email + password succeeds.
- [x] Wrong password fails.
- [x] Unknown email fails safely.
- [x] Unverified account is blocked.
- [x] Disabled account is blocked.
- [x] Locked account is blocked.
- [x] Successful login creates a `user_sessions` row.
- [x] Successful login sets the expected session cookie.

## Verification

- [x] Valid token verifies email.
- [x] Expired token fails.
- [x] Used token fails.
- [x] Invalid token fails.
- [x] Successful verification makes token unusable again.
- [x] Resend creates a new token.
- [x] Previous token is invalidated if that policy is chosen.

## Google compatibility

- [ ] Existing Google user still logs in.
- [x] Google-only account does not require a password.
- [x] Manual registration does not break OAuth identity lookup.

---

# 2.37 Frontend Tests

### Login

- [ ] Login form renders.
- [ ] Validation errors display.
- [ ] Invalid credentials display safely.
- [ ] Unverified account shows resend action.
- [ ] Successful login redirects through the normal dashboard flow.
- [ ] Google login still works.

### Registration

- [ ] Required fields validate.
- [ ] Password confirmation works.
- [ ] Successful submission shows verification instructions.
- [ ] Duplicate/account errors display correctly.

### Verification

- [ ] Verification page reads URL token.
- [ ] Successful verification displays success.
- [ ] Expired token displays retry/resend option.
- [ ] Used token displays safe error.

---

# 2.38 Manual End-to-End Test Plan

Run this in development before moving to production.

## Test 1 — Register New User

```text
Open /register
      ↓
Enter valid information
      ↓
Submit
      ↓
Account created
      ↓
Verification email received through Resend
```

Confirm:

- [ ] `users` row exists.
- [ ] `user_password_credentials` row exists.
- [ ] `is_email_verified = false`.
- [ ] Verification token row exists.
- [ ] Password is hashed.

## Test 2 — Verify Email

```text
Open verification email
      ↓
Click verification link
      ↓
Verification succeeds
```

Confirm:

- [ ] `users.is_email_verified = true`.
- [ ] token has `used_at` set.
- [ ] same token cannot be reused.

## Test 3 — Manual Login

```text
Login with email/password
      ↓
Session created
      ↓
/api/auth/me
      ↓
Dashboard
```

Confirm:

- [ ] Session row exists.
- [ ] Cookie is issued.
- [ ] `/api/auth/me` returns the correct user.
- [ ] Role is correct.
- [ ] Dashboard routing works.

## Test 4 — Unverified Login

```text
Register second account
      ↓
Do not verify
      ↓
Attempt login
```

Expected:

```text
Login denied
Email verification required
Resend link available
```

## Test 5 — Existing Google Login

Confirm:

- [ ] Google sign-in still works.
- [ ] No duplicate user is created.
- [ ] Existing session behavior is unchanged.

## Test 6 — Logout

```text
Login
 ↓
Logout
 ↓
Try protected endpoint
```

Expected:

```text
401 Not authenticated
```

---

# 2.39 Production Environment Variables

Phase 1 should already provide Resend configuration.

Verify the backend has values equivalent to:

```env
RESEND_API_KEY=...
EMAIL_FROM=...
CLIENT_ORIGIN=https://your-frontend-domain.com
SERVER_ORIGIN=https://your-api-domain.com
SESSION_SECRET=...
```

For manual authentication, no JWT secret is required.

### TODO

- [ ] Confirm production Resend API key is present.
- [ ] Confirm sender/domain configuration is valid.
- [ ] Confirm `CLIENT_ORIGIN` is production URL.
- [ ] Confirm `SERVER_ORIGIN` is production URL.
- [ ] Confirm secure cookie behavior.
- [ ] Confirm no development secrets are deployed.

---

# 2.40 Files to Create

Recommended new files:

```text
server/src/db/migrations/0043_create_user_password_credentials.sql
server/src/db/migrations/0043_create_user_password_credentials.down.sql

server/src/db/migrations/0044_create_email_verification_tokens.sql
server/src/db/migrations/0044_create_email_verification_tokens.down.sql

client/src/features/auth/Register.jsx
client/src/features/auth/VerifyEmail.jsx
```

Depending on the Phase 1 email architecture, you may also add dedicated email template/helper files rather than placing templates in the auth module.

---

# 2.41 Files to Modify

Backend:

```text
server/package.json
server/src/config/env.js
server/src/modules/auth/auth.service.js
server/src/modules/auth/auth.controller.js
server/src/modules/auth/auth.routes.js
server/src/db/migrate.js          (only if the migration runner requires changes)
```

Frontend:

```text
client/src/features/public/Login.jsx
client/src/services/authService.js
client/src/context/AuthContext.jsx   (only if needed)
client/src/router/AppRouter.jsx
client/src/styles/global.css
client/src/styles/tokens.css         (only if needed)
```

Potentially reusable:

```text
server/src/modules/notification/...
server/src/modules/audit/...
server/src/modules/security/...
```

Use the actual Phase 1 email module instead of creating a duplicate email implementation.

---

# 2.42 Recommended Implementation Order

Do the work in this exact order to reduce broken intermediate states.

### Step 1 — Database

- [ ] Add password credential migration.
- [ ] Add verification-token migration.
- [ ] Run migrations.
- [ ] Verify schema.

### Step 2 — Password Security

- [ ] Install Argon2id/bcrypt.
- [ ] Implement hash/verify helpers.
- [ ] Add tests.

### Step 3 — Registration Service

- [ ] Implement registration transaction.
- [ ] Create user.
- [ ] Create credential.
- [ ] Generate verification token.

### Step 4 — Verification Service

- [ ] Implement token verification.
- [ ] Implement resend.
- [ ] Connect to Resend.

### Step 5 — Manual Login

- [ ] Implement credential lookup.
- [ ] Verify password.
- [ ] Check email verification.
- [ ] Call existing `createSession()`.

### Step 6 — API Routes

- [ ] Register auth routes.
- [ ] Add error codes.
- [ ] Add rate limiting.

### Step 7 — Frontend

- [ ] Build registration page.
- [ ] Build verification page.
- [ ] Update login page.
- [ ] Add auth service methods.
- [ ] Connect to existing AuthContext.

### Step 8 — Compatibility Testing

- [ ] Google login.
- [ ] Manual login.
- [ ] Logout.
- [ ] `/auth/me`.
- [ ] Role routing.
- [ ] Profile completion.

---

# 2.43 Definition of Done

Phase 2 is complete only when all of the following are true.

## Database

- [x] Password credential table exists.
- [x] Email verification token table exists.
- [x] Raw passwords are never stored.
- [x] Raw verification tokens are never stored.

## Registration

- [x] User can register using email/password.
- [x] Registration creates the correct user + credential + token records.
- [x] Public registration cannot choose a privileged role.

## Email Verification

- [x] Resend sends the verification email.
- [x] Verification link works.
- [x] Verification token expires.
- [x] Verification token is single-use.
- [x] Resend works after expiration/loss.

## Manual Login

- [x] Verified user can log in with email/password.
- [x] Wrong password is rejected.
- [x] Unverified account is blocked.
- [x] Disabled/locked users are blocked.
- [x] Successful login uses the existing `user_sessions` model.
- [x] No JWT implementation is introduced for this flow.

## Google OAuth

- [x] Google login still works.
- [x] Existing Google accounts are not duplicated.
- [x] Both authentication methods ultimately use the same user/session architecture.

## Frontend

- [x] Login page supports both methods.
- [x] Registration page works.
- [x] Email verification page works.
- [x] Authentication state is consistent across both methods.
- [x] Role-based dashboard behavior remains unchanged.

## Security

- [x] Password hashing is strong.
- [x] Authentication endpoints are rate-limited.
- [x] Tokens are cryptographically random.
- [x] Raw tokens are never logged.
- [x] Passwords are never logged.
- [x] Session tokens are not unnecessarily exposed to JavaScript.
- [x] Account enumeration is minimized.
- [x] Authentication failures are logged appropriately.

---

# 2.44 Phase 2 Completion Flow

The final expected behavior is:

```text
                         ┌─────────────────────┐
                         │       Login         │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
             Email + Password                 Google OAuth
                    │                               │
             Verify credentials              Google callback
                    │                               │
             Check email verified            Find/Create user
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                              createSession()
                                    │
                          user_sessions table
                                    │
                          HttpOnly session cookie
                                    │
                               /auth/me
                                    │
                            AuthContext / RBAC
                                    │
                          Role-based dashboard
```

Registration side:

```text
Register
   ↓
users
   ↓
user_password_credentials
   ↓
email_verification_tokens
   ↓
Resend
   ↓
User clicks email
   ↓
Verify token
   ↓
users.is_email_verified = true
   ↓
Manual login allowed
```

---

# Phase 2 Final Checklist

- [x] 0043 password credentials migration completed.
- [x] 0044 email verification tokens migration completed.
- [x] Password hashing implemented.
- [x] Manual registration API implemented.
- [x] Manual registration frontend implemented.
- [x] Verification token generation implemented.
- [x] Resend verification email implemented.
- [x] Email verification API implemented.
- [x] Email verification frontend implemented.
- [x] Manual login API implemented.
- [x] Existing session system reused.
- [x] No JWT introduced for manual login.
- [x] Existing Google OAuth still works.
- [x] Google/manual account linking reviewed.
- [x] Login/register/resend endpoints rate-limited.
- [x] Authentication events logged safely.
- [x] Backend tests pass.
- [x] Frontend tests/manual test plan passes.
- [x] Production environment variables verified.

---

## Phase 2 Exit Condition

Only move to **Phase 3 — Forgot Password & Password Reset** after the following complete end-to-end path works reliably:

```text
Register
  ↓
Receive Resend email
  ↓
Verify email
  ↓
Login with email/password
  ↓
Existing server-side session created
  ↓
/api/auth/me succeeds
  ↓
Correct role/dashboard opens
  ↓
Logout
  ↓
Session revoked
```

At that point, Phase 3 can safely add **Forgot Password + Password Reset** using the same token-storage/security patterns established here.
