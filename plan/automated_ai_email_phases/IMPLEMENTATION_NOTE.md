# AI Email System — Implementation Note

> Generated during Phase 1 inspection. This document guides the placement of all new code.

---

## Existing Backend

- **Framework:** Express.js 4.21 (ES modules, `server/src/app.js`)
- **Entry point:** `server/src/index.js` — loads dotenv, tests DB, starts background jobs, listens on `PORT` (default 3001)
- **Route mounting:** All routes mounted under `/api` prefix in `app.js`
- **Error handling:** Global `errorHandler` middleware, async errors via `express-async-errors`
- **Security:** Helmet, CORS (origin allowlist), rate limiting per-route

## Existing Database Layer

- **Driver:** `pg` (node-postgres) — raw SQL, no ORM
- **Connection:** `server/src/config/db.js` exports a singleton `pool`
- **Migrations:** Custom runner at `server/src/db/migrate.js`, reads `.sql` files from `server/src/db/migrations/`
- **Current migration version:** 0051 (52 migrations total)
- **Naming convention:** `NNNN_description.sql` + `NNNN_description.down.sql`
- **Transaction pattern:** `pool.connect()` + `BEGIN`/`COMMIT`/`ROLLBACK`

## Existing Email Implementation

- **Provider:** Resend (`resend` npm package v6.25.0)
- **Module:** `server/src/modules/email/` — `resend.provider.js`, `email.service.js`, `email.utils.js`, `email.templates.js`
- **Templates:** Custom `{{variable}}` mustache-like engine, templates stored in DB `email_templates` table (12 pre-seeded)
- **Notification orchestration:** `server/src/modules/notification/notification.service.js`
- **Delivery ledger:** `email_notifications` table with idempotency (`event_key` UNIQUE) and retry support

## Existing Queue/Worker

- **No external queue** (no Bull, BullMQ, Redis)
- **Custom polling worker:** `server/src/modules/notification/email.worker.js`
  - `startEmailWorker()` — polls `email_notifications` every 30s, processes queued/failed emails
  - `startDraftReminderScheduler()` — polls every 6h for stale drafts
  - Both use `setInterval` pattern
- **Background job orchestration:** `startBackgroundJobs()` in `email.worker.js`, called from `index.js`

## Existing Journal Tables (relevant subset)

| Table | Purpose |
|---|---|
| `users` | Users with role FK, CITEXT email, profile fields |
| `user_sessions` | Session tokens (hashed) |
| `roles` | admin, author, moderator, editor, reviewer |
| `manuscripts` | Core manuscript table with status lifecycle |
| `manuscript_authors` | Author details per manuscript |
| `reviews` | Reviewer reviews with recommendations |
| `editorial_decisions` | Editor accept/reject/revision decisions |
| `email_templates` | Jinja-like templates per journal |
| `email_notifications` | Email delivery ledger |
| `audit_logs` / `security_logs` / `workflow_logs` | Audit trails |

## Existing Deployment

- **Database:** PostgreSQL 16 (Alpine via Docker Compose)
- **Client:** Vercel (React 19 + Vite)
- **Server:** Render (Express)
- **No Dockerfile** for the application itself

## Existing Environment Variable Strategy

- Root `.env` loaded by both `index.js` and `env.js`
- `server/src/config/env.js` centralizes all env access via `env` export
- Secrets never exposed to frontend

---

## Potential Files to Modify

| File | Change |
|---|---|
| `server/src/config/env.js` | Add Hostinger env vars |
| `server/src/app.js` | Mount new email webhook + API routes |
| `server/src/index.js` | Start AI email processing worker |
| `server/src/modules/notification/email.worker.js` | Add webhook event processing job |
| `.env` | Add `HOSTINGER_MAIL_API_KEY`, `HOSTINGER_MAILBOX`, `HOSTINGER_WEBHOOK_SECRET` |

## Potential Files to Add

| File | Purpose |
|---|---|
| `server/src/services/email/hostinger/client.js` | Hostinger API HTTP client |
| `server/src/services/email/hostinger/mailbox.js` | Mailbox operations |
| `server/src/services/email/hostinger/messages.js` | Message CRUD |
| `server/src/services/email/hostinger/threads.js` | Thread operations |
| `server/src/services/email/hostinger/index.js` | Barrel export |
| `server/src/modules/ai-email/ai-email.routes.js` | Webhook + email API routes |
| `server/src/modules/ai-email/ai-email.controller.js` | Request handlers |
| `server/src/modules/ai-email/ai-email.service.js` | Business logic |
| `server/src/db/migrations/0052_create_email_webhook_events.sql` | Webhook events table |
| `server/src/db/migrations/0053_create_ai_email_storage.sql` | Email threads + messages + AI processing tables |
