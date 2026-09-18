# TODO: Remove Hardcoded Admin Credentials and Secure the Initial Admin Account

## Objective

Remove all hardcoded admin credential details from the IJIDCR journal codebase and make the initial production admin account configurable through environment variables.

### Required admin email

The designated initial production admin email must be:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
```

### Critical security rule

The admin password must **never** be stored or provided as a fallback inside source code.

The current hardcoded fallback:

```js
process.env.ADMIN_SEED_PASSWORD || 'Admin@123'
```

must be removed.

There must be no default production password in the repository.

---

# Phase 1 — Audit Existing Admin Credential Code

- [x] Inspect the complete codebase for hardcoded admin email addresses.
- [x] Inspect the complete codebase for hardcoded admin passwords.
- [x] Search for:
  - `Admin@123`
  - `ADMIN_PASSWORD`
  - `ADMIN_SEED_PASSWORD`
  - `ADMIN_EMAIL`
  - `admin@jar-journal.org`
  - `password_hash`
  - `createAdmin`
  - admin seed/bootstrap logic
- [x] Check both frontend and backend code.
- [x] Check seed scripts, migrations, configuration files, documentation, test files, Docker files, and sample environment files.
- [x] Do not remove unrelated test credentials unless they are actually used as production/default admin credentials.

---

# Phase 2 — Remove Hardcoded Admin Password

The current backend seed logic contains a hardcoded fallback similar to:

```js
const ADMIN_EMAIL = 'admin@jar-journal.org'
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin@123'
```

Replace the password behavior with a required environment variable.

Expected behavior:

```js
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD

if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_SEED_PASSWORD is required')
}
```

### Production requirement

- [x] No password literal remains in `server/src/db/seed.js`.
- [x] No password literal remains in any production configuration.
- [x] No fallback password such as `Admin@123`, `admin123`, `password`, etc. exists.
- [x] If the password environment variable is missing, fail safely instead of creating/resetting an account with a known password.

---

# Phase 3 — Configure the Designated Admin Email

Use:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
```

The email is the designated initial administrator email.

Prefer reading it from the environment rather than embedding the production account identity directly in application logic.

Example:

```js
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL

if (!ADMIN_EMAIL) {
  throw new Error('ADMIN_SEED_EMAIL is required')
}
```

### Production value

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
```

### Important

- [x] Do not place the production email/password pair in GitHub.
- [x] Do not commit the production `.env` file.
- [x] The email itself is not a password/secret, but keeping the production admin identity configurable through an environment variable is preferred.
- [x] Do not create another default admin email such as `admin@jar-journal.org`.

---

# Phase 4 — Make Admin Bootstrap Production-Safe

Review the existing admin creation/update logic in:

```text
server/src/db/seed.js
```

The seed process must not behave like a password-reset mechanism on every deployment.

The current logic appears to use an upsert/update pattern similar to:

```sql
ON CONFLICT (user_id)
DO UPDATE SET password_hash = EXCLUDED.password_hash
```

Change this behavior so that:

- [x] The initial admin can be created when it does not exist.
- [x] Running the seed again does NOT unexpectedly reset an existing production admin password.
- [x] Existing production credentials are not overwritten during routine redeployment.
- [x] A deliberate password-reset workflow is separate from the initial seed/bootstrap workflow.

Recommended behavior:

```text
Admin does not exist
        ↓
Create admin using ADMIN_SEED_EMAIL
and ADMIN_SEED_PASSWORD
```

```text
Admin already exists
        ↓
Do not overwrite password
        ↓
Leave existing credentials unchanged
```

---

# Phase 5 — Validate the Admin Role

The account:

```text
ceo@ijidcr-asgard.in
```

must be created/assigned as:

```text
role = admin
```

Only.

Do not use the old testing behavior that assigned multiple roles to the same account.

Expected:

```text
ceo@ijidcr-asgard.in
        ↓
admin
```

Do NOT assign:

```text
admin + author + moderator + editor + reviewer
```

This task is primarily about credential cleanup, but the bootstrap must not reintroduce the old multi-role testing behavior.


---

# Phase 6 — Environment Variable Configuration

Document the production environment variables required by the seed/bootstrap process:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
ADMIN_SEED_PASSWORD=<strong-unique-password>
```

The actual production password must be generated independently and stored only in the hosting provider's secret/environment-variable system.

For example, in Render:

```text
Environment
────────────────────────────────
ADMIN_SEED_EMAIL      ceo@ijidcr-asgard.in
ADMIN_SEED_PASSWORD   <strong secret>
```

### Important

- [x] Never commit the real `ADMIN_SEED_PASSWORD`.
- [x] Never put it in source code.
- [x] Never put it in frontend code.
- [x] Never expose it through an API response.
- [x] Never log it.
- [x] Never print it during startup or seeding.

---

# Phase 7 — `.env` and Git Safety

Inspect:

```text
.env
.env.local
.env.production
.env.example
.gitignore
```

Make sure:

- [x] Production secret files are ignored by Git.
- [x] The real production password is not committed.
- [x] Existing `.env` files containing secrets are not tracked.
- [x] `.env.example` contains placeholders only.

Safe example:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
ADMIN_SEED_PASSWORD=
```

or:

```env
ADMIN_SEED_EMAIL=your-admin-email@example.com
ADMIN_SEED_PASSWORD=your-admin-password
```

Do not put an actual production password in `.env.example`.

---

# Phase 8 — Search for Credential Leaks

After modifying the codebase, perform a full repository search for:

```text
Admin@123
admin@jar-journal.org
ADMIN_PASSWORD
ADMIN_SEED_PASSWORD
ADMIN_SEED_EMAIL
password
```

Review every result manually.

The goal is:

- [x] No hardcoded production admin password.
- [x] No old default admin email.
- [x] No password printed in logs.
- [x] No admin password included in frontend bundles.
- [x] No password stored in comments or documentation.
- [x] No secret inside test fixtures that can accidentally become production data.

Do not blindly remove legitimate references to the variable name `ADMIN_SEED_PASSWORD`; the variable name itself is safe.

---

# Phase 9 — Existing Database Safety

Before changing seed behavior, check whether the production database already contains the old admin account:

```text
admin@jar-journal.org
```

and/or the new intended admin:

```text
ceo@ijidcr-asgard.in
```

Do not blindly create duplicate administrators.

Determine the correct migration/bootstrap strategy.

Expected final state:

```text
ceo@ijidcr-asgard.in
        ↓
admin
```

If the old admin account already exists in production:

- [x] Decide whether it should be migrated/renamed.
- [x] Preserve required audit/history records.
- [x] Do not expose or print the existing password.
- [x] Do not reset the password unless intentionally performing an admin credential rotation.
- [x] Do not delete production users without verifying the impact.

---

# Phase 10 — Admin Password Handling

For the first production deployment:

1. Set:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
```

2. Generate a strong unique password.

3. Set:

```env
ADMIN_SEED_PASSWORD=<generated-secret>
```

4. Run the controlled admin bootstrap/seed.

5. Verify that:

```text
ceo@ijidcr-asgard.in
```

can authenticate.

6. Verify that the account has:

```text
admin
```

role.

7. Confirm the password is not visible anywhere in application logs or source.

---

# Phase 11 — Prevent Accidental Password Reset on Deployment

The production deployment process must not reset the admin password every time:

```text
git push
    ↓
deployment
    ↓
database seed
```

Review deployment commands and startup scripts.

If the application automatically runs the seed during every deployment, make sure the seed is idempotent and does not overwrite the existing password.

Recommended production behavior:

```text
First bootstrap
    ↓
Create admin

Future deployments
    ↓
Keep existing admin password unchanged
```

---

# Phase 12 — Testing

## Development test

Use a development-only admin email/password through environment variables.

Do not restore hardcoded credentials just for testing.

Example:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
ADMIN_SEED_PASSWORD=<development-secret>
```

or use a separate development admin address if needed.

## Production test

Verify:

- [x] Admin login works with `ceo@ijidcr-asgard.in`.
- [x] The account has only the `admin` role.
- [x] Missing `ADMIN_SEED_PASSWORD` causes safe failure instead of using a fallback password.
- [x] Re-running the seed does not reset the admin password.
- [x] Redeploying the application does not reset the admin password.
- [x] Password does not appear in logs.
- [x] Password does not appear in browser/network responses.
- [x] Password is not included in the Git repository.

---

# Phase 13 — Final Security Verification

Run repository searches and confirm:

```text
[x] No "Admin@123"
[x] No "admin@jar-journal.org"
[x] No hardcoded admin password
[x] No password fallback
[x] No production password in .env.example
[x] No password in frontend code
[x] No password in logs
[x] ADMIN_SEED_EMAIL is configurable
[x] ADMIN_SEED_EMAIL production value = ceo@ijidcr-asgard.in
[x] ADMIN_SEED_PASSWORD comes only from environment/secrets
[x] Existing admin password is not overwritten by routine seed/deploy
[x] Initial admin has only the admin role
```


---

# Final Expected Production Configuration

The production server environment should contain:

```env
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
ADMIN_SEED_PASSWORD=<strong-unique-secret>
```

The source code should contain only references such as:

```js
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD
```

There must be **no actual production password in the codebase**.

# Out of Scope for This Task

Do not modify unrelated authentication behavior in this task.

Do not remove the Admin → User Management → Change Role feature here.

Do not implement the separate multi-role testing removal unless explicitly included in another task.

Focus this task on:

```text
Remove hardcoded admin credentials
+
Designate ceo@ijidcr-asgard.in as the initial admin email
+
Secure the initial admin password through environment variables
+
Prevent seed/deployment from unintentionally resetting the production password
```
