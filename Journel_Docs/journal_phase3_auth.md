# Phase 3 — Authentication, Authorization & User Management

**Goal of this phase:** Implement Google OAuth login, custom session management backed by the `user_sessions` table from Phase 2, single-role-based routing, resource-level RBAC middleware, a **reusable conflict-of-interest engine** (used later by Moderator/Editor/Reviewer modules), and the Admin's user/role management screens.

By the end of this phase: a user can log in with Google, land on the correct dashboard for their role, complete their profile, and every protected API route enforces both role and resource-level checks — with all sensitive actions writing to history/audit tables.

---

## 3.1 Why sessions are custom here, not just `express-session` defaults

Phase 2 defined `user_sessions` with a `session_token_hash` column and an explicit note: *"raw token should not be stored."* This means:

- We generate a random opaque token on login
- We store only its **SHA-256 hash** in the database
- We send the **raw token** to the browser as an HttpOnly, Secure, SameSite cookie
- On every request, we hash the incoming cookie value and look up the match — never compare raw tokens

This is deliberately closer to how you'd build a revocable API-key system than to default `express-session` memory/Redis stores — it gives you real revocation (`revoked_at`), device/IP tracking, and an audit trail without extra infrastructure.

---

## 3.2 Google OAuth — Setup & Flow

### Setup
- [ ] Create OAuth 2.0 credentials in Google Cloud Console (Web application type)
- [ ] Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback` (and the `localhost` equivalent for dev)
- [ ] Install `google-auth-library` on the backend (recommended over Passport for this project — fewer moving parts since we're building custom sessions anyway, not Passport sessions)
- [ ] Store `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` (already scaffolded in Phase 1)

### Flow

```
1. GET /api/auth/google
   → backend builds Google OAuth consent URL (scope: profile, email)
   → redirects browser to Google

2. User approves on Google's screen

3. Google redirects to /api/auth/google/callback?code=...

4. Backend exchanges `code` for tokens + ID token claims
   (sub, email, given_name, family_name, email_verified, picture)

5. Backend looks up user_identities by provider_subject (the `sub` claim)
   - If found → fetch linked users row
   - If not found → check user_identities by provider_email as a fallback
     linking hint only (never auto-trust email alone as identity)
   - If truly new → create users row (role_id = NULL or a default
     'unassigned' state — see 3.2.1) + user_identities row in one transaction

6. Backend generates a random 32-byte token, computes SHA-256 hash,
   inserts into user_sessions (hash, ip, user_agent, expires_at)

7. Backend sets HttpOnly + Secure + SameSite=Lax cookie with the RAW token

8. Backend redirects to frontend: /auth/callback
   → frontend calls GET /api/auth/me to fetch current user + role
   → frontend routes to the correct dashboard (3.4)
```

### 3.2.1 Handling brand-new users (no role yet)
- [x] Decide: does a new Google sign-in default to `author` role, or land in a "pending/unassigned" state requiring Admin approval?
  - Recommendation: default to `author` (lowest-privilege, self-service role) since anyone can submit a manuscript; Moderator/Editor/Reviewer/Admin roles should only ever be **granted by an Admin**, never self-selected
- [x] Enforce at the backend: the OAuth callback path must never accept a role parameter from the client

**Todos:**
- [x] Build `modules/auth/auth.routes.js`: `/google`, `/google/callback`, `/logout`, `/me`
- [x] Build `modules/auth/auth.service.js`: token exchange, identity lookup/creation, session issuance
- [x] Wrap steps 5–6 above in a single DB transaction (new user + identity + session must succeed or fail together)
- [x] Write `user_activity` row on every login/logout
- [x] Write `security_logs` row on failed/invalid OAuth callback (bad state param, token exchange failure, etc.)

---

## 3.3 Session Middleware

```js
// middleware/authenticate.js (conceptual)
async function authenticate(req, res, next) {
  const rawToken = req.cookies.session_token;
  if (!rawToken) return res.status(401).json({ error: 'Not authenticated' });

  const tokenHash = sha256(rawToken);
  const session = await db.query(
    `SELECT s.*, u.* FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_token_hash = $1
       AND s.revoked_at IS NULL
       AND s.expires_at > now()`,
    [tokenHash]
  );

  if (!session) return res.status(401).json({ error: 'Session expired or invalid' });
  if (session.account_status !== 'active') return res.status(403).json({ error: 'Account not active' });

  req.user = session; // { id, role_id, account_status, ... }
  await touchLastSeen(session.id); // fire-and-forget update to last_seen_at
  next();
}
```

**Todos:**
- [x] Implement `authenticate.js` as above
- [x] Implement `logout` route: set `revoked_at = now()` on the matching session, clear the cookie
- [x] Implement session expiry sweep (a scheduled job or lazy check) — expired sessions should eventually be prunable from `user_sessions`
- [x] Reject requests where `account_status` is `disabled` or `locked` even if the session itself is technically valid — **this is the enforcement point for "user disables own account" and Admin-disabled accounts** (Edge Case from the original spec)

---

## 3.4 Single-Role Routing

### Backend
- [x] `/api/auth/me` returns `{ id, email, role, account_status, profile_complete }`
- [x] `profile_complete` = computed boolean: are all journal-required profile fields (institution, department, country — decide the exact required set) non-null?

### Frontend
- [x] `AuthContext` fetches `/api/auth/me` on app load, exposes `{ user, role, loading }`
- [x] `useRole()` hook reads role from context
- [x] `ProtectedRoute` component: redirects to `/login` if unauthenticated, to `/profile/complete` if `profile_complete === false`, or to `/unauthorized` if the route's required role doesn't match `user.role`
- [x] Route table mapping role → default dashboard landing path:
  - admin → `/admin/dashboard`
  - author → `/author/dashboard`
  - moderator → `/moderator/dashboard`
  - editor → `/editor/dashboard`
  - reviewer → `/reviewer/dashboard`
- [x] **Navigation must not render links to other roles' tools** — this is a UX requirement from the spec, not just a route guard; the sidebar component itself should read `role` and render only that role's menu items

---

## 3.5 Profile Completion

- [x] Build `/profile/complete` page: institution, department, country, phone (optional), bio (optional), ORCID (optional)
- [x] `PATCH /api/users/me/profile` — updates the `users` row, journal-owned fields only (never touches `role_id`, `account_status`, or OAuth-sourced fields)
- [x] Block access to any dashboard route until profile completion is satisfied (enforced both in `ProtectedRoute` and as backend middleware on sensitive write routes — frontend gating is not the real boundary)
- [x] Allow editing profile later from a standard `/profile` settings page (not just the first-login flow)

---

## 3.6 RBAC Middleware (role-level check)

```js
// middleware/authorize.js (conceptual)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role_name)) {
      logSecurityEvent(req.user.id, 'access_denied', { route: req.originalUrl });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// usage: router.post('/editorial/assign', authenticate, requireRole('editor'), assignController)
```

**Todos:**
- [x] Implement `requireRole(...)` as above
- [x] Apply to every route in every module — **no route should rely on frontend hiding alone**
- [x] Write a `security_logs` entry (severity: warning) on every 403 from this middleware — this is your "unexpected access denial" event category from the audit spec

---

## 3.7 Resource-Level Authorization (role alone is not enough)

Role tells you *what kind* of actions a user might take. It does not tell you *which specific manuscripts* they may act on. Build a second layer:

| Role | Resource-level rule |
|---|---|
| Author | `manuscript.id IN (SELECT manuscript_id FROM manuscript_authors WHERE user_id = req.user.id)` |
| Moderator | manuscript is currently in a status this moderator is eligible to screen (queue-based, not ownership-based unless you add per-moderator queues later) |
| Editor | `manuscript.id IN (SELECT manuscript_id FROM editorial_assignments WHERE editor_id = req.user.id AND assignment_status IN ('assigned','accepted'))` |
| Reviewer | `manuscript.id IN (SELECT manuscript_id FROM reviewer_assignments WHERE reviewer_id = req.user.id AND assignment_status = 'accepted')` |
| Admin | global, but every action still writes to `audit_logs` |

**Todos:**
- [x] Build `requireManuscriptAccess()` middleware/helper — takes `req.user` + `manuscript_id` param, runs the appropriate query above based on role, attaches the manuscript record to `req.manuscript` or rejects with 403
- [x] Never rely on the frontend having only shown the user manuscripts they're allowed to see — every GET/POST/PATCH on a manuscript resource re-checks this server-side

---

## 3.8 Conflict-of-Interest Engine (reusable — critical shared module)

This is the single function that Moderator, Editor, and Reviewer modules will all call in Phase 6. Build and test it now so it's a trusted primitive later.

```js
// shared/utils/conflictCheck.js (conceptual)
async function isConflicted(userId, manuscriptId) {
  const result = await db.query(
    `SELECT 1 FROM manuscript_authors
     WHERE manuscript_id = $1 AND user_id = $2
     LIMIT 1`,
    [manuscriptId, userId]
  );
  return result.rowCount > 0;
}
```

**Todos:**
- [x] Implement `isConflicted(userId, manuscriptId)` exactly as above — single source of truth, used in three places later:
  - Editor self-assignment (`editorial_assignments` creation)
  - Reviewer invitation creation (`reviewer_invitations` creation)
  - Moderator decision (defense-in-depth, in case a moderator is ever also a listed author)
- [x] Write unit tests now: author-as-editor case, author-as-reviewer case, non-conflicted case
- [x] Decide the failure behavior consistently: conflicted actions should return a clear 409 Conflict (not a generic 403), with a message the frontend can surface meaningfully ("You cannot perform this action because you are listed as an author on this manuscript.")
- [x] Log every blocked conflict attempt to `audit_logs` — conflicts being caught is itself evidence the system is working correctly, worth keeping a record of

---

## 3.9 Admin — User & Role Management

### Screens
- [x] Users list: searchable/filterable by role, account_status, email
- [x] User detail view: profile info, current role, role history (`user_role_history`), status history (`user_status_history`), recent activity (`user_activity`)
- [x] Role change action: dropdown to select new role + required reason field → writes `user_role_history` row + updates `users.role_id`
- [x] Enable/disable/lock action: writes `user_status_history` row + updates `users.account_status`
- [x] On disable/lock: also revoke all active sessions for that user (`user_sessions.revoked_at`) so the change takes effect immediately, not just on their next token expiry

### API
- [x] `GET /api/admin/users` (paginated, filterable)
- [x] `GET /api/admin/users/:id`
- [x] `PATCH /api/admin/users/:id/role` (requireRole('admin'))
- [x] `PATCH /api/admin/users/:id/status` (requireRole('admin'))
- [x] `GET /api/admin/users/:id/activity`

**Todos:**
- [x] All admin mutation routes write to `audit_logs` (old_values/new_values snapshot)
- [x] Prevent an Admin from disabling their own account through this UI (or at minimum require a confirmation step) — self-lockout is a real risk with only one privileged role able to fix it
- [x] Confirm role changes take effect immediately for that user's *next* request (session isn't automatically invalidated on role change unless you choose to revoke sessions on role change too — decide this deliberately)

---

## 3.10 Security Hardening for This Phase

- [x] Rate-limit `/api/auth/google/callback` and `/api/admin/*` routes
- [x] CSRF protection: since sessions are cookie-based, add CSRF tokens on state-changing requests (double-submit cookie pattern or a CSRF middleware library)
- [x] Ensure cookies are `Secure` in production (HTTPS-only) and `SameSite=Lax` at minimum
- [x] Never log raw session tokens or OAuth tokens, even in error logs
- [x] Validate the OAuth `state` parameter to prevent CSRF on the login flow itself

---

## 3.11 Testing

- [ ] New user Google login → creates `users` + `user_identities` rows correctly
- [ ] Returning user Google login → matches existing `user_identities.provider_subject`, does not create a duplicate user
- [ ] Session cookie round-trip: login → authenticated request succeeds → logout → same cookie now fails
- [ ] Disabled account: valid session + `account_status = 'disabled'` → request rejected
- [ ] Role-guarded route: reviewer hitting an editor-only route → 403 + security log entry
- [ ] Resource-level check: author A cannot fetch manuscript belonging to author B
- [ ] Conflict engine: user who is a manuscript's author cannot be assigned as its editor or reviewer (test via the engine directly, not just through the UI)
- [ ] Admin role change writes correct `user_role_history` row with actor and reason
- [ ] Admin disable revokes all active sessions for that user immediately

---

## 3.12 Exit Criteria for Phase 3

You're ready for **Phase 4 — Public Website & Shared UI Component Library** when:
- [x] Google OAuth login/logout works end-to-end
- [x] Sessions are DB-backed, hashed, and revocable
- [x] Role-based dashboard routing works for all 5 roles
- [x] Profile completion gate works
- [x] RBAC middleware protects every route (no route reachable by the wrong role)
- [x] Resource-level authorization is enforced, not just role checks
- [x] Conflict-of-interest engine exists, is tested, and is ready to be called from Phase 6
- [x] Admin can list users, change roles, and enable/disable accounts, all producing audit trail rows
