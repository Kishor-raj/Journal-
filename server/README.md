# Journal Management Server

Express + PostgreSQL backend for the Journal Management System. This server provides REST APIs for the client, including authentication (Google OAuth, manual email/password, forgot-password, and password reset) and the journal/manuscript workflow.

## Authentication Endpoints

The authentication module (`server/src/modules/auth/`) supports two login methods and the full manual password lifecycle.

### Public endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/auth/google` | Start Google OAuth flow |
| GET  | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/register` | Register a manual email/password account |
| POST | `/api/auth/login` | Log in with email and password |
| POST | `/api/auth/verify-email` | Verify an email address using a verification token |
| POST | `/api/auth/resend-verification` | Resend the email verification link |
| POST | `/api/auth/forgot-password` | Request a password reset email |
| GET  | `/api/auth/reset-password/validate?token=...` | Validate a password reset token |
| POST | `/api/auth/reset-password` | Set a new password using a reset token |

### Protected endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/logout` | End the current session |
| GET  | `/api/auth/me` | Return the authenticated user |
| POST | `/api/auth/role` | Select the effective role for the session |

## Forgot Password

`POST /api/auth/forgot-password`

Request:

```json
{ "email": "author@example.com" }
```

The endpoint always returns a generic response to prevent account enumeration:

```json
{ "message": "If an account exists for this email, a password reset link has been sent." }
```

If the email belongs to a registered account, the server generates a reset token, stores only its SHA-256 hash, and sends a password reset email through the email provider.

## Reset Password

`POST /api/auth/reset-password`

Request:

```json
{ "token": "RAW_RESET_TOKEN", "password": "NewSecurePassword123!" }
```

The server re-validates the token server-side (it is never trusted from the client), applies the password policy, hashes the new password, marks the token used, and revokes all active sessions for the user. It then sends a password-changed confirmation email.

### Validate token

`GET /api/auth/reset-password/validate?token=...` returns `{ "valid": true }` or `{ "valid": false }` and is used for frontend UX only. The actual reset operation always re-validates the token.

## Token Expiration Policy

- **Email verification tokens** expire after `EMAIL_VERIFICATION_TOKEN_TTL_MINUTES` (default `1440` minutes / 24 hours).
- **Password reset tokens** expire after `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default `30` minutes).

Both token types are single-use (a `used_at` timestamp is set on use) and only the SHA-256 hash of the raw token is stored in PostgreSQL. Issuing a new token for the same purpose invalidates previously active (unused, unexpired) tokens for that user. Expired and used tokens can be cleaned up opportunistically; see the migrations in `server/src/db/migrations/`.

## Password Hashing

Passwords are hashed with **bcrypt** (cost factor 12) via `server/src/modules/auth/password.js`. Plaintext passwords and their hashes are never returned by any API and are never written to logs.

## Session Revocation

After a successful password reset, all existing sessions for the user are revoked (`user_sessions.revoked_at` is set). The user must sign in again with the new password. Manual login reuses the same DB-backed server-side session mechanism (`user_sessions`) as Google OAuth; no JWT is introduced.

## Local Development Setup

Prerequisites: Node.js, Docker (for PostgreSQL), and a configured `server/.env`.

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Copy `server/.env.example` to `server/.env` and fill in the required values (see below).

3. Start PostgreSQL. A `docker-compose.yml` is provided at the repository root.

4. Run migrations and (optionally) seed the database:

   ```bash
   npm run migrate --workspace=server
   npm run seed --workspace=server
   ```

5. Start the server:

   ```bash
   npm run dev --workspace=server
   ```

The server listens on `PORT` (default `3001`).

## Email Provider Requirements

Email is delivered through **Resend** (configured in Phase 1). The server requires these environment variables when email is enabled:

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM_NAME=Asgard Publications
EMAIL_FROM_ADDRESS=...
EMAIL_REPLY_TO=...
PUBLIC_APP_ORIGIN=http://localhost:5173
```

Set `EMAIL_ENABLED=false` in development to skip actual delivery while still tracking the workflow. For production, use a real `RESEND_API_KEY` and a verified sender domain, and point `PUBLIC_APP_ORIGIN`/`CLIENT_ORIGIN` at the production HTTPS client origin.

## Security Notes

- Authentication endpoints are rate-limited (see `server/src/modules/auth/auth.routes.js`).
- Failed/blocked auth events and password reset events are written to the security log.
- Raw reset tokens and passwords are never logged.
- In production, all reset links use the configured HTTPS client origin.
