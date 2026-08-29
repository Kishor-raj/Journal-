# Phase 7 — Revision, Withdrawal, Notifications, Audit & Deployment

**Goal of this phase:** Close every remaining loop in the system — the revision cycle back through re-review, author withdrawal at any stage, real email notifications, admin-facing log visibility, and production hardening — so the platform is feature-complete and deployable.

This activates the "Revisions" and "Withdrawals" nav placeholders left disabled since Phase 5, and turns the `audit_logs`/`security_logs`/`workflow_logs` rows that every prior phase has been writing into something an Admin can actually see and act on.

---

## 7.1 Revision Request (Editor side)

Triggered automatically when Phase 6's editorial decision is `minor_revision` or `major_revision`.

- [x] On that decision, also create a `revision_requests` row: `manuscript_id`, `editorial_decision_id` (FK), `round_number`, `request_type` (minor/major), `instructions`, `due_at`, `requested_by`
- [x] `instructions` should be editor-composed text, potentially auto-seeded with a summary of both reviewers' `public_comments` so the editor isn't retyping what reviewers already said
- [x] `manuscripts.current_status = 'revision_requested'`

**Todos:**
- [x] Backend: extend `modules/editorial/editorial.service.js` decision handler from Phase 6 to also create this row in the same transaction
- [x] Frontend: editor's decision panel includes an instructions field pre-filled with reviewer comment excerpts, editable before sending

---

## 7.2 Author Revision Response

### Activate the "Revisions" nav item (Phase 5 placeholder)
- [x] `GET /api/revisions/mine` — manuscripts where the author has an open `revision_requests` row
- [x] Revision detail view: original editor instructions, both reviewers' `public_comments` (confidential comments remain hidden per Phase 6's separation), due date

### Point-by-point reviewer comment response
- [x] For each relevant `reviews` row, let the author write a structured response: `reviewer_comment_responses` — `comment_reference`, `author_response`, `change_reference` (where in the manuscript the change was made)
- [x] This does not need to be line-by-line automated matching — a simple "respond to this reviewer's comments" text area per review, optionally broken into numbered points by the author themselves, is sufficient for v1

### New version submission
- [x] Author uploads a revised manuscript file (reuses the Phase 5 `FileUpload` + Cloudinary flow exactly — no new upload logic needed, just a new `version_id`)
- [x] `POST /api/revisions/:requestId/respond`:
  ```
  BEGIN TRANSACTION
    1. INSERT manuscript_versions (version_number = previous + 1, version_type = 'revision')
    2. Attach uploaded files to this new version_id
    3. INSERT revision_responses (cover_letter, response_summary, status = 'submitted')
    4. INSERT reviewer_comment_responses (one per addressed review)
    5. UPDATE manuscripts SET current_version_id = <new version>, current_status = 'resubmitted'
    6. INSERT manuscript_status_history
  COMMIT
  ```
- [x] Cover letter field: free text summarizing changes at a high level, separate from the point-by-point responses

**Todos:**
- [x] Backend: `modules/revision/revision.routes.js`, `.controller.js`, `.service.js`
- [x] Frontend: `features/author/Revisions.jsx`, `RevisionResponseForm.jsx`
- [x] Enforce resource-level check: author can only respond to revision requests on their own manuscripts (Phase 3 pattern, applied here)
- [x] Lock editing once `status = 'submitted'` on the `revision_responses` row, same pattern as the original submission lock from Phase 5

---

## 7.3 Re-Review Cycle

- [x] On resubmission, editor decides: send back to the same two reviewers (preferred — they have prior context) or reassign
- [x] New `reviewer_assignments` rows created with `round_number` incremented — **the reviewer-cap trigger from Phase 2 applies per round_number, so this is a fresh round and correctly allows up to 2 active assignments again**, it does not conflict with the completed round 1 assignments
- [x] Same invitation/accept/decline flow from Phase 6 (6.4) applies unchanged — no new logic needed, just re-invoking the existing reviewer module for the new round
- [x] Reviewers submit new `reviews` rows for `round_number = 2` (or however many revision cycles occur)
- [x] Editor issues a new `editorial_decisions` row (`decision_round` incremented) — this can again route to another revision cycle, or to a terminal accept/reject

**Todos:**
- [x] Confirm the editorial decision UI (Phase 6) clearly shows decision history across all rounds, not just the latest — an editor making round 3's decision should see rounds 1 and 2 for context
- [x] Cap revision rounds at a sane limit in the UI (e.g. flag to the editor after 3 rounds that this may need a different resolution) — not a hard technical block, just a workflow nudge

---

## 7.4 Withdrawal Flow

Can happen at nearly any non-terminal stage — author-initiated, sometimes editor/admin-initiated on the author's behalf.

- [x] Activate the "Withdrawals" nav item (Phase 5 placeholder)
- [x] `POST /api/withdrawals` — `manuscript_id`, `reason` — creates `manuscript_withdrawals` row (`status = 'requested'`)
- [x] Decide now: does a withdrawal request take effect immediately, or does it require editor/admin approval first? Recommendation: **require approval** for manuscripts already past moderator screening (protects against accidental or bad-faith withdrawal mid-review), but allow **immediate self-withdrawal** for still-`draft`/`submitted`-not-yet-screened manuscripts
- [x] Approval: `PATCH /api/withdrawals/:id` (editor/admin) → `status = 'approved'`, `manuscripts.current_status = 'withdrawn'` (terminal), `manuscript_status_history` row
- [x] Rejection of a withdrawal request: `status = 'rejected'`, manuscript continues in its prior workflow state, `decision_notes` explains why

**Todos:**
- [x] Backend: `modules/withdrawal/withdrawal.routes.js`, `.controller.js`, `.service.js`
- [x] Frontend: `features/author/Withdrawals.jsx` (request form + status view), plus an approval surface in the editor/admin dashboard
- [x] Confirm withdrawal never deletes anything — `manuscript_status_history`, all versions, and all reviews remain queryable after withdrawal, only `current_status` changes

---

## 7.5 Notifications & Email

### Provider setup
- [x] Choose a transactional email provider (e.g. Postmark, SendGrid, Amazon SES) and install its SDK
- [x] Store provider credentials in `.env`

### Template rendering
- [x] Build a renderer that takes `email_templates.body_html`/`body_text` + a variables object, and interpolates against `variables_schema`
- [x] Validate at send-time that all required variables in `variables_schema` are present — fail loudly in logs if a template is sent with missing data, rather than silently emailing a broken template

### Full trigger map — build this table now, then implement each row

| Event | Template key | Recipient | Fires from |
|---|---|---|---|
| Manuscript submitted | `submission_received` | Author | Phase 5 submission transaction |
| Desk rejected | `desk_rejected` | Author | Phase 6 moderator decision |
| Passed moderation | `moderation_passed` | Author (optional) | Phase 6 moderator decision |
| Reviewer invited | `reviewer_invited` | Reviewer | Phase 6 invitation creation |
| Reviewer accepted/declined | `reviewer_response_editor_notice` | Editor | Phase 6 invitation response |
| Review deadline approaching | `review_deadline_reminder` | Reviewer | Scheduled job (see below) |
| Review submitted | `review_submitted_editor_notice` | Editor | Phase 6 review submission |
| Editorial decision issued | `decision_issued` | Author | Phase 6 decision |
| Revision requested | `revision_requested` | Author | Phase 7.1 |
| Revision submitted | `revision_submitted_editor_notice` | Editor | Phase 7.2 |
| Withdrawal requested | `withdrawal_requested_notice` | Editor/Admin | Phase 7.4 |
| Withdrawal approved | `withdrawal_approved` | Author | Phase 7.4 |
| Account role changed | `role_changed` | Affected user | Phase 3 admin action |
| Account disabled | `account_disabled` | Affected user | Phase 3 admin action |

**Todos:**
- [x] Seed real content for every template row above (Phase 2 only seeded placeholder shells)
- [x] Implement an `enqueueNotification(templateKey, recipientUserId, variables)` function called **after** each transaction commits, never inside it — an email failure must never roll back a completed workflow action
- [x] Build a simple send queue (even an in-process async call is fine for v1; move to a real job queue like BullMQ if volume grows) with retry-on-failure and a dead-letter log for permanently failed sends
- [x] Scheduled job: daily check for `reviewer_assignments` approaching `due_at` → fire `review_deadline_reminder`
- [x] Log every send attempt (success/failure) — this can live in `workflow_logs` with `workflow_name = 'notifications'`

---

## 7.6 Audit, Security & Workflow Logging — Admin Visibility

Every prior phase has been writing to `audit_logs`, `security_logs`, and `workflow_logs`. This phase builds the screens to actually use that data.

- [x] Admin UI: filterable/searchable log viewer for each of the three tables (filter by date range, actor, entity_type, severity)
- [x] `audit_logs` view: shows old/new value diffs in a readable format, not raw JSON dumps
- [x] `security_logs` view: sortable by severity, with critical/high events visually flagged
- [x] `workflow_logs` view: useful for debugging stuck manuscripts — filter by `manuscript_id` to see its full technical event trail

### Retention policy (decide now — was an open item since Phase 1's doc)
- [x] `audit_logs`: recommend 2 years minimum (accountability/compliance value)
- [x] `security_logs`: recommend 1 year, with critical-severity events retained longer or exported before deletion
- [x] `workflow_logs`: recommend 6 months — these are debugging aids, not long-term compliance records
- [x] Implement retention via a scheduled cleanup job, not manual deletion

### Alerting
- [x] Optional but recommended: hook `security_logs` inserts with `severity = 'critical'` to an alert channel (email to admin, Slack webhook, etc.) so incidents aren't only discovered by someone browsing the log viewer later

**Todos:**
- [x] Backend: `modules/audit/audit.routes.js` — read-only, admin-only endpoints for all three log tables
- [x] Frontend: `features/admin/AuditLogs.jsx`, `SecurityLogs.jsx`, `WorkflowLogs.jsx`
- [x] Confirm these routes are heavily rate-limited and admin-only — log data itself is sensitive

---

## 7.7 Security Hardening & Deployment

Final pass against the security baseline established back in the original spec.

- [ ] HTTPS enforced everywhere outside local dev (confirm reverse proxy from Phase 1 is correctly terminating TLS in staging/production)
- [ ] Session cookies: confirm `Secure`, `HttpOnly`, `SameSite` flags are all correctly set in production config (Phase 3 built this — verify it didn't regress)
- [ ] CSRF protection confirmed active on all cookie-authenticated state-changing routes
- [ ] Rate limiting confirmed on: auth endpoints, admin endpoints, file upload signature endpoint, review/decision submission endpoints
- [ ] CORS locked to the exact production frontend origin — no wildcards, no leftover dev origins
- [ ] Input validation/sanitization audit: confirm every route validates its inputs (a schema validation library like Zod/Joi should already be wired from Phase 1 — verify coverage isn't patchy)
- [ ] Database backup schedule configured (automated daily snapshots at minimum) + one actual restore drill performed before go-live
- [ ] Cloudinary retention/recovery: confirm you understand Cloudinary's own backup/versioning behavior for your plan tier, and that deleted-asset behavior matches your expectations (e.g. does deleting a `manuscript_files` row also delete the Cloudinary asset, or leave it orphaned — decide and implement consistently)
- [ ] Environment separation confirmed: dev/staging/production have fully separate databases, Cloudinary folders/credentials, and OAuth client credentials — never share production credentials into a dev environment
- [ ] Dependency audit (`npm audit` or equivalent) on both client and server before go-live
- [ ] Error monitoring/alerting wired (e.g. Sentry or equivalent) so production errors surface actively rather than requiring someone to check logs

---

## 7.8 Final End-to-End Testing

Beyond each phase's individual test checklist, run these full-system scenarios before launch:

- [ ] **Full happy path, multi-round:** submit → moderate → assign → review round 1 → major revision → resubmit → review round 2 → accept
- [ ] **Desk rejection path:** confirm no editor/reviewer resources are ever created
- [ ] **Withdrawal mid-review:** author withdraws while reviewers have active assignments — confirm reviewer assignments are handled sensibly (e.g. marked stale/cancelled, reviewers notified their assignment is no longer needed)
- [ ] **Conflict-of-interest, full system:** an author who also holds an editor account elsewhere in the system cannot touch their own manuscript at any stage — assignment, invitation, or decision
- [ ] **Double-blind, full system:** trace a manuscript from submission through review as a reviewer test account, confirming author identity never leaks through any screen or API response at any workflow stage
- [ ] **Notification delivery:** confirm every row in the 7.5 trigger map actually fires in a real end-to-end run, not just in isolated unit tests
- [ ] **Account disable mid-session:** admin disables a user who has an active session — confirm their next request is rejected immediately
- [ ] **Load sanity check:** simulate a reasonable number of concurrent submissions/reviews to confirm no obvious bottlenecks (this doesn't need to be a full load-test suite for v1, just a sanity pass)
- [ ] **Backup/restore drill:** restore the database from a backup snapshot into a clean environment and confirm the application boots and functions against it

---

## 7.9 Deployment Checklist

- [ ] Production environment variables fully populated and verified (no `.env.example` placeholder values leaking through)
- [ ] Database migrations run against production, confirmed clean
- [ ] Seed data (roles, journal profile, categories, admin account, email templates with real content) present in production
- [ ] DNS, TLS certificates, and reverse proxy configuration verified
- [ ] Monitoring/alerting live before the first real user traffic
- [ ] Rollback plan documented: if a deploy breaks something, what's the fastest safe path back to the last known-good state
- [ ] Post-launch smoke test: log in as each of the 5 roles in production and confirm each dashboard loads correctly

---

## 7.10 Exit Criteria — Project Complete

The Journal Management System is ready for real use when:
- [x] Revision cycles work across multiple rounds, correctly reusing the reviewer-cap trigger per round
- [x] Withdrawal works at every applicable stage with correct approval gating
- [x] All notification trigger map events fire with real content
- [x] Admin can view and filter all three log types
- [x] Log retention policy is implemented, not just decided
- [ ] Full security hardening checklist (7.7) is complete
- [ ] All final end-to-end scenarios (7.8) pass
- [ ] Deployment checklist (7.9) is complete and the system is live

**This closes out all 7 phases.** Everything from the original architecture discussion — public site, single-role auth, the 33-table schema, moderator/editor/reviewer workflow, double-blind enforcement, and Cloudinary-based storage — is now implemented end to end.
