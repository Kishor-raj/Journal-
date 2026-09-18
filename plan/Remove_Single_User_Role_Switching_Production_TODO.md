# TODO: Remove Single-User Role Switching for Production

## Objective

Convert the journal authentication flow from the current **testing-oriented multi-role session model** into a production model where:

```text
One user account
      ↓
One assigned journal role
      ↓
Login
      ↓
Directly enter that role's dashboard
```

A user must **not** see a "Choose your role" screen and must **not** be able to change the effective session role through an API request.

### Production role model

Supported journal roles:

```text
admin
author
editor
moderator
reviewer
```

Each production account must have one effective role.

Example:

```text
Admin account     → admin
Author account    → author
Editor account    → editor
Moderator account → moderator
Reviewer account  → reviewer
```

Do **not** use:

```text
one account → admin + author + editor + moderator + reviewer
```

The previous multi-role behavior was introduced for testing the different journal workflows and must be removed before production deployment.

---

# Phase 1 — Audit the Existing Role-Switching Flow

## Frontend

- [x] Inspect `client/src/features/auth/RoleSelect.jsx`.
- [x] Confirm this component is only used for role selection after login.
- [x] Inspect `client/src/features/public/Login.jsx`.
- [x] Confirm successful login currently redirects to `/auth/select-role`.
- [x] Inspect `client/src/router/AppRouter.jsx`.
- [x] Identify the `/auth/select-role` route.
- [x] Inspect `client/src/context/AuthContext.jsx`.
- [x] Remove `/auth/select-role` from authentication-specific route checks where no longer needed.
- [x] Inspect `client/src/services/authService.js`.
- [x] Identify the `selectRole()` API helper.
- [x] Search the entire frontend for:
  - `RoleSelect`
  - `/auth/select-role`
  - `selectRole(`
  - `/auth/role`
  - `available_roles`
  - `assigned_roles`

## Backend

- [x] Inspect `server/src/modules/auth/auth.controller.js`.
- [x] Identify the `selectRole` controller and `POST /auth/role`.
- [x] Inspect `server/src/modules/auth/auth.routes.js`.
- [x] Remove the production role-switching endpoint.
- [x] Inspect `server/src/modules/auth/auth.service.js`.
- [x] Identify:
  - `selectRoleForSession()`
  - `getAssignedRoles()`
  - session role handling
  - multi-role insertion logic
- [x] Inspect `server/src/middleware/authorize.js`.
- [x] Keep backend role authorization; only remove the user's ability to choose/change the role.
- [x] Search the entire backend for:
  - `selectRoleForSession`
  - `getAssignedRoles`
  - `user_roles`
  - `role_id`
  - `available_roles`
  - `assigned_roles`
  - `POST /role`
  - `requireRole`

---

# Phase 2 — Remove the Role Selection UI

### Target file

```text
client/src/features/auth/RoleSelect.jsx
```

- [x] Remove the role-selection page from the normal authentication flow.
- [x] Remove the role dropdown:
  ```text
  Admin
  Author
  Editor
  Moderator
  Reviewer
  ```
- [x] Remove the "Choose your role" UI.
- [x] Remove the `selectRole()` call from the frontend authentication flow.
- [x] Remove the `ROLE_LABELS` testing list.
- [x] Do not replace the role selector with another client-side role switcher.
- [x] A user should not be able to modify their effective role from the browser.

After login, the flow must become:

```text
Login
  ↓
Session created using the user's stored role
  ↓
Fetch /auth/me
  ↓
Role-aware dashboard redirect
```

---

# Phase 3 — Change the Login Redirect

### Target file

```text
client/src/features/public/Login.jsx
```

Current testing flow:

```text
Successful login
      ↓
refetchUser()
      ↓
/auth/select-role
      ↓
User chooses role
      ↓
/dashboard
```

Replace it with:

```text
Successful login
      ↓
refetchUser()
      ↓
Read authenticated user's single effective role
      ↓
Redirect directly to that role's dashboard
```

### Required behavior

- [x] Remove navigation to:
  ```text
  /auth/select-role
  ```
- [x] Use the authenticated user's effective role.
- [x] Redirect to the existing role dashboard.
- [x] Preserve `returnTo` behavior only when the requested destination is authorized for the current role.
- [x] Do not trust a role supplied by the browser.
- [x] Do not allow a URL parameter such as `?role=admin` to change the user's role.

### Expected dashboard mapping

```text
admin      → /admin
author     → /author
editor     → /editor
moderator  → /moderator
reviewer   → /reviewer
```

If the project already has a centralized dashboard redirect component:

```text
client/src/shared/components/DashboardRedirect.jsx
```

prefer using it rather than duplicating role-to-route logic inside multiple login components.

---

# Phase 4 — Remove the Role-Switching API

### Target files

```text
server/src/modules/auth/auth.controller.js
server/src/modules/auth/auth.routes.js
server/src/modules/auth/auth.service.js
client/src/services/authService.js
```

- [x] Remove `selectRole()` from the frontend service.
- [x] Remove `selectRole` controller logic.
- [x] Remove `POST /auth/role`.
- [x] Remove `selectRoleForSession()`.
- [x] Remove any route comments/documentation describing session role selection.
- [x] Remove tests that expect a user to switch roles.
- [x] Search again for:
  ```text
  /auth/role
  selectRole
  selectRoleForSession
  ```
- [x] The production backend must return an error for requests to the old endpoint, preferably `404` after the route is removed.
- [x] Do not retain a hidden role-switching endpoint for convenience.

---

# Phase 5 — Make the Session Role Automatic

### Target file

```text
server/src/modules/auth/auth.service.js
```

The session must be created using the user's stored production role.

Current desired architecture:

```text
users.role_id
      ↓
createSession()
      ↓
user_sessions.role_id
      ↓
authenticate()
      ↓
req.user role
      ↓
requireRole(...)
```

### Tasks

- [x] Keep `createSession()` assigning the user's current role.
- [x] Do not accept a role from the login request.
- [x] Do not accept a role from query parameters, cookies, local storage, or request headers.
- [x] Do not let the client choose `user_sessions.role_id`.
- [x] Do not change `user_sessions.role_id` after login as part of normal user activity.
- [x] Verify that the authentication middleware uses the role stored for the authenticated session.
- [x] Verify that a forged frontend state cannot alter `req.user.role`.

### Important rule

The authoritative role must come from the server-side database.

```text
Browser
  ❌ chooses role

Server/database
  ✅ determines role
```

---

# Phase 6 — Remove Automatic Assignment of All Five Roles

## Critical backend cleanup

### Target file

```text
server/src/modules/auth/auth.service.js
```

The current Google-user flow contains logic equivalent to:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT $1, id
FROM roles
WHERE name IN ('admin', 'author', 'moderator', 'editor', 'reviewer')
```

- [x] Remove this multi-role assignment.
- [x] Do not automatically assign every role to new Google users.
- [x] New Google users must receive only the intended default role.
- [x] Existing users must retain their actual production role.
- [x] New public registrations must not become administrative/editorial accounts.

### New user default

Unless the business rules specify otherwise:

```text
New normal registration → author
```

The `admin`, `editor`, `moderator`, and `reviewer` roles must be assigned only through controlled administrative/provisioning workflows.

---

# Phase 7 — Remove the "All Roles" Fallback Logic

### Target file

```text
server/src/modules/auth/auth.service.js
```

The current code contains fallback behavior that can populate all standard roles when no `user_roles` rows exist.

- [x] Remove the code that inserts all five roles when `getAssignedRoles()` finds no assignments.
- [x] Remove the fallback:
  ```js
  ['admin', 'author', 'moderator', 'editor', 'reviewer']
  ```
- [x] `getAssignedRoles()` must never invent roles for a user.
- [x] If a user has no valid role, treat the account as invalid/incomplete and handle it explicitly.
- [x] Do not silently grant permissions because role data is missing.

Recommended behavior:

```text
User has exactly one valid production role
        ↓
Return that role

User has no role
        ↓
Do not authenticate into a privileged portal
        ↓
Return a controlled authentication/authorization error
```

---

# Phase 8 — Simplify `/auth/me`

### Target file

```text
server/src/modules/auth/auth.controller.js
```

The `/auth/me` response should expose the user's effective role, but it must not provide a role picker.

Current testing-oriented fields may include:

```text
available_roles
assigned_roles
```

- [x] Remove `available_roles` from the response if it is no longer needed.
- [x] Remove `assigned_roles` from the normal login response if the application no longer supports multi-role accounts.
- [x] Keep a single authoritative field such as:
  ```json
  {
    "role": "author"
  }
  ```
- [x] Ensure the role is derived server-side.
- [x] Do not allow the client to POST a replacement role.

---

# Phase 9 — Database Cleanup

## Existing migration

The codebase contains:

```text
server/src/db/migrations/0041_create_user_roles.sql
server/src/db/migrations/0042_grant_all_roles_to_existing_users.sql
```

Migration `0042` was specifically introduced for the testing behavior where existing users could access all five portals.

### Important production rule

Do **not** simply delete migration `0042` from source control if it has already been executed in a production database.

Changing or removing an already-applied migration can create migration-history/database consistency problems.

Instead:

- [x] Leave historical migrations intact if they have already run in deployed environments.
- [x] Create a new forward migration.
- [x] Use the new migration to clean the existing production data.

### Recommended new migration

Create the next migration after the current highest migration number, for example:

```text
server/src/db/migrations/0065_remove_multi_role_testing_assignments.sql
```

Use the actual next migration number after checking the repository's migration sequence before creating it.

### Migration objective

For each user:

```text
Keep the user's canonical users.role_id
        ↓
Remove every extra user_roles assignment
        ↓
Leave exactly one role assignment
```

Conceptually:

```text
Before

User A
 ├─ admin
 ├─ author
 ├─ editor
 ├─ moderator
 └─ reviewer

After

User A
 └─ author
```

### Database migration checks

- [x] Identify users whose `users.role_id` is `NULL`.
- [x] Identify users with more than one `user_roles` record.
- [x] Identify users whose `user_roles` does not match `users.role_id`.
- [x] Define a deterministic remediation for invalid records before deployment.
- [x] Preserve the canonical `users.role_id` where it is already valid.
- [x] Delete extra `user_roles` rows.
- [x] Verify each production user has exactly one valid role.

### Optional stronger database enforcement

If the final business rule is permanently:

```text
one user = one role
```

consider enforcing this at database level.

Possible direction:

```text
user_roles.user_id UNIQUE
```

or, if `user_roles` is no longer required for the production model, simplify the schema and use only:

```text
users.role_id
```

Do not remove the table blindly; first inspect all application code using `user_roles`.

---

# Phase 10 — Admin Account Cleanup

### Target files

```text
server/src/db/seed.js
server/src/db/migrations/*
```

The production admin account must have:

```text
role = admin
```

only.

Example:

```text
ceo@ijidcr-asgard.in
        ↓
admin only
```

- [x] Confirm the production admin account is assigned only `admin`.
- [x] Remove any `author`, `editor`, `moderator`, or `reviewer` role assignments from that account.
- [x] Ensure the seed process does not re-add all five roles.
- [x] Keep the existing production admin password intact during redeployment.
- [x] Do not use the previous testing account as an all-role account.

---

# Phase 11 — Registration and User Provisioning

Inspect:

```text
server/src/modules/auth/auth.service.js
server/src/modules/auth/auth.controller.js
client/src/features/auth/Register.jsx
```

### Registration rules

- [x] Normal registration creates an `author` account.
- [x] A normal user cannot select `admin`.
- [x] A normal user cannot select `editor`.
- [x] A normal user cannot select `moderator`.
- [x] A normal user cannot select `reviewer`.
- [x] Remove any client-side registration role selector.
- [x] Ignore or reject unexpected `role` values sent manually to the registration endpoint.
- [x] Administrative/editorial roles must only be granted by a controlled backend operation.

---

# Phase 12 — Role Management Must Be Server-Controlled

If administrators can change a user's role from the user-management interface, keep that functionality separate from login role selection.

The distinction must be:

```text
Administrator changes user's assigned role
        ✅ controlled administrative operation
```

versus:

```text
User changes their own role during login
        ❌ prohibited
```

### Tasks

- [x] Review `client/src/features/admin/UserManagement.jsx`.
- [x] Review the corresponding backend user-management routes/services.
- [x] Ensure only authorized administrators can change a user's role.
- [x] Prevent users from changing their own role through public APIs.
- [x] Log administrative role changes in the audit/security log.
- [x] Do not allow a user to assign themselves `admin`.

---

# Phase 13 — Frontend Route Protection

Keep role-based route protection.

### Existing component

```text
client/src/shared/components/ProtectedRoute.jsx
```

- [x] Keep `allowedRoles` checks.
- [x] Do not remove authorization merely because the role selector is removed.
- [x] Ensure a user with:
  ```text
  role = author
  ```
  cannot access:
  ```text
  /admin/*
  /editor/*
  /moderator/*
  /reviewer/*
  ```
- [x] Ensure frontend route protection matches backend authorization.
- [x] Do not treat frontend route protection as the primary security boundary.

---

# Phase 14 — Backend Authorization Verification

Keep server-side enforcement in every protected module.

Examples already present in the codebase include:

```js
requireRole('admin')
requireRole('author')
requireRole('editor')
requireRole('moderator')
requireRole('reviewer')
```

### Tasks

- [x] Verify every privileged route uses `authenticate`.
- [x] Verify every privileged route uses the correct `requireRole(...)`.
- [x] Verify `req.user.role` cannot be modified by request input.
- [x] Verify session role comes from the database.
- [x] Verify authorization fails closed.
- [x] Never use `available_roles` from the browser for backend authorization.

---

# Phase 15 — Remove Dead Frontend/Backend Code

After the new flow works:

- [x] Delete `client/src/features/auth/RoleSelect.jsx` if it has no remaining purpose.
- [x] Remove unused imports.
- [x] Remove `selectRole()` from `client/src/services/authService.js`.
- [x] Remove the `/auth/select-role` route.
- [x] Remove `/auth/select-role` from `AuthContext.jsx`.
- [x] Remove obsolete comments describing role switching.
- [x] Remove role-switching-related tests and mocks.
- [x] Remove unused `available_roles` UI logic.
- [x] Remove unused session-role switching code from backend.
- [x] Run lint/build after cleanup.

---

# Phase 16 — Update Authentication Flow

The final production flow should be:

```text
                    ┌─────────────────────┐
                    │       Login         │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Authenticate user   │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Read users.role_id  │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │ Create session      │
                    │ with that role      │
                    └──────────┬──────────┘
                               ↓
                    ┌─────────────────────┐
                    │     /auth/me        │
                    │     role: author    │
                    └──────────┬──────────┘
                               ↓
                     ┌──────────────────┐
                     │ DashboardRedirect│
                     └────────┬─────────┘
                              ↓
                         /author
```

There must be **no step** containing:

```text
Choose your role
```

and no client-controlled:

```text
POST /auth/role
```

---

# Phase 17 — Security Tests

## Login tests

- [x] Login as an `author`.
- [x] Confirm the user is automatically redirected to `/author`.
- [x] Login as an `editor`.
- [x] Confirm automatic redirect to `/editor`.
- [x] Login as a `moderator`.
- [x] Confirm automatic redirect to `/moderator`.
- [x] Login as a `reviewer`.
- [x] Confirm automatic redirect to `/reviewer`.
- [x] Login as the production `admin`.
- [x] Confirm automatic redirect to `/admin`.

## Role-switching tests

- [x] Confirm `/auth/select-role` is no longer reachable.
- [x] Confirm the role-selection UI is absent.
- [x] Confirm `POST /auth/role` no longer exists.
- [x] Attempt a manual request to the old endpoint.
- [x] Confirm it cannot change `user_sessions.role_id`.
- [x] Attempt to submit:
  ```json
  {
    "role": "admin"
  }
  ```
  during login.
- [x] Confirm the request cannot change the stored role.
- [x] Attempt to manipulate local storage.
- [x] Confirm local storage cannot change the server-side role.
- [x] Attempt to modify the `role` field in the browser's network request.
- [x] Confirm backend authorization still uses the server-side role.

---

# Phase 18 — Authorization Tests

### Author account

- [x] Can access author pages.
- [x] Cannot access admin pages.
- [x] Cannot access editor pages.
- [x] Cannot access moderator pages.
- [x] Cannot access reviewer pages.

### Editor account

- [x] Can access editor pages.
- [x] Cannot access admin pages unless explicitly assigned as admin by authorized administration.
- [x] Cannot access moderator pages.
- [x] Cannot access reviewer pages.

### Moderator account

- [x] Can access moderator pages.
- [x] Cannot access admin pages.
- [x] Cannot access editor pages.
- [x] Cannot access reviewer pages.

### Reviewer account

- [x] Can access reviewer pages.
- [x] Cannot access admin pages.
- [x] Cannot access editor pages.
- [x] Cannot access moderator pages.

### Admin account

- [x] Can access admin pages.
- [x] Confirm the admin account is not simultaneously assigned other workflow roles unless the production role policy explicitly requires it.

---

# Phase 19 — Database Validation Before Production

Run read-only checks against the production database before enabling the new application build.

### Check users with multiple roles

```sql
SELECT user_id, COUNT(*) AS role_count
FROM user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Expected:

```text
0 rows
```

### Check users with a missing canonical role

```sql
SELECT id, email
FROM users
WHERE role_id IS NULL;
```

Expected:

```text
0 rows
```

unless a documented exception exists.

### Check role mismatch

```sql
SELECT
  u.id,
  u.email,
  ur.role_id,
  u.role_id
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role_id <> u.role_id;
```

Expected:

```text
0 rows
```

### Check active roles

```sql
SELECT
  r.name,
  COUNT(*) AS users
FROM users u
JOIN roles r ON r.id = u.role_id
GROUP BY r.name
ORDER BY r.name;
```

Review the counts manually before production launch.

---

# Phase 20 — Production Deployment Validation

- [x] Run database migrations before deploying the application change.
- [x] Back up the production database before the role-cleanup migration.
- [x] Deploy the backend.
- [x] Deploy the frontend.
- [x] Clear/revoke old sessions if necessary.
- [x] Force existing users to re-authenticate if old sessions may contain testing roles.
- [x] Verify `user_sessions.role_id` contains only the user's canonical role.
- [x] Test one account for each production role.
- [x] Confirm no user sees the role selector.
- [x] Confirm no user can switch into another portal.
- [x] Check server logs for authorization failures or unexpected role changes.
- [x] Check audit/security logs for unexpected role mutations.

---

# Phase 21 — Regression Testing

- [x] Email/password login still works.
- [x] Google login still works.
- [x] Registration still works.
- [x] Email verification still works.
- [x] Forgot-password flow still works.
- [x] Reset-password flow still works.
- [x] Profile completion still works.
- [x] Dashboard redirection works.
- [x] All five dashboards still load for their correctly assigned users.
- [x] Protected API endpoints still enforce role permissions.
- [x] Logout still revokes the session.
- [x] Expired sessions cannot access protected resources.
- [x] Revoked sessions cannot access protected resources.

---

# Phase 22 — Repository Search After Implementation

Run a complete source search for:

```text
/auth/select-role
/auth/role
RoleSelect
selectRole
selectRoleForSession
available_roles
assigned_roles
grant_all_roles
ALL five roles
admin + author + editor + moderator + reviewer
```

### Acceptance condition

No production code should provide a path for a user to select/change their own effective role during login.

Historical migration files may still contain references to the previous testing implementation. Those migrations should remain as historical records when already applied; the new production migration must correct the database state.

---

# Phase 23 — Final Production Acceptance Criteria

The implementation is complete only when all of the following are true:

- [x] There is no role-selection page after login.
- [x] There is no user-facing role dropdown.
- [x] `/auth/role` is removed.
- [x] `selectRoleForSession()` is removed.
- [x] Login automatically uses the user's server-side role.
- [x] New normal users receive only the intended default role.
- [x] Existing test accounts no longer have all five roles.
- [x] Each production user has one effective role.
- [x] The production admin account has only the `admin` role.
- [x] Missing role data does not trigger an all-roles fallback.
- [x] Backend authorization remains active.
- [x] Frontend route protection remains active.
- [x] A user cannot modify their role using browser tools, request payloads, query parameters, local storage, or cookies.
- [x] Production database contains no unintended multi-role assignments.
- [x] Old sessions containing testing roles are invalidated or safely handled.
- [x] All role-specific login and authorization tests pass.

---

# Final Production Architecture

```text
                    USER
                      │
                      ▼
                 ┌─────────┐
                 │  LOGIN  │
                 └────┬────┘
                      │
                      ▼
              ┌───────────────┐
              │ Authenticate  │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ users.role_id │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Create Session│
              │ with Role     │
              └───────┬───────┘
                      │
                      ▼
                ┌──────────┐
                │ /auth/me │
                └────┬─────┘
                     │
                     ▼
             ┌───────────────┐
             │ Dashboard      │
             │ Redirect       │
             └───────┬────────┘
                     │
       ┌─────────────┼──────────────┬─────────────┐
       ▼             ▼              ▼             ▼
    /admin        /author        /editor      /moderator
                     │
                     └───────────────┐
                                     ▼
                                  /reviewer
```

## Core production rule

```text
ONE USER ACCOUNT
       ↓
ONE EFFECTIVE ROLE
       ↓
ONE AUTHENTICATED SESSION ROLE
       ↓
ONE AUTHORIZED WORKFLOW
```

There must be **no self-service role switching** in the production authentication flow.
