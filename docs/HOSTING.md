# Journal- — Hosting & Infrastructure Reference

> **Who this is for:** Developers joining the project who need to understand how the
> production server works, why decisions were made, and how to operate it safely.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Server Details](#2-server-details)
3. [Project Structure](#3-project-structure)
4. [Docker Services](#4-docker-services)
5. [Environment Variables](#5-environment-variables)
6. [How Deployments Work](#6-how-deployments-work)
7. [Common Operations](#7-common-operations)
8. [Why Single-Domain Instead of Vercel + Render](#8-why-single-domain-instead-of-vercel--render)
9. [Known Limitations & Future Work](#9-known-limitations--future-work)
10. [Troubleshooting Runbook](#10-troubleshooting-runbook)

---

## 1. Architecture Overview

```
Internet
   │
   ▼
[ Nginx :80/:443 ]  — SSL termination, static file serving, reverse proxy
   │
   ├──► /var/www/journal/client/dist   (React app — ijidcr-asgard.in)
   └──► proxy /api/*  ──►  [ Backend :3001 ]  (Express, session-cookie auth)
                                    │
                                    ▼
                           [ PostgreSQL :5432 ]
```

### Key design decisions

- **Single domain.** Unlike a two-frontend setup with a separate admin subdomain, Journal-
  has one React app (`client`) with role-based routes/views — there is nothing to split
  across subdomains, so client and API share `ijidcr-asgard.in`.
- **Everything runs in Docker** on one VPS via `docker-compose.prod.yml`. The plain
  `docker-compose.yml` at the repo root stays local-dev-only (just Postgres, for
  `npm run dev`).
- **Only Nginx is exposed** to the internet. Backend and Postgres are on a private Docker
  network (`journal-net`) and cannot be reached directly from outside.
- **The client is pre-built static files.** Nginx serves `client/dist` directly; the
  backend only handles `/api/*`.
- **PostgreSQL data persists in a named Docker volume** (`journal_postgres_data`).
  Removing/recreating containers does not delete data.

---

## 2. Server Details

| Item | Value |
|---|---|
| Domain | `https://ijidcr-asgard.in` (and `www.`) |
| VPS | Hostinger KVM 2 — 2 vCPU, 8 GB RAM, 100 GB NVMe |
| OS | Ubuntu 22.04 |
| Deploy user | `journal` |
| Project directory | `/var/www/journal` |
| SSL certificates | `/etc/letsencrypt/live/ijidcr-asgard.in/` |
| SSL provider | Let's Encrypt (auto-renews via `certbot.timer`) |
| Database volume | `/var/lib/docker/volumes/journal_postgres_data/` |

---

## 3. Project Structure

```
/var/www/journal/
├── server/
│   ├── Dockerfile               ← builds the backend Docker image (Node 20-alpine)
│   ├── docker-entrypoint.sh     ← runs migrations, then starts the server
│   ├── src/
│   │   ├── index.js             ← Express app entry point
│   │   └── db/
│   │       ├── migrate.js       ← raw-SQL migration runner (no ORM)
│   │       └── seed.js          ← admin account bootstrap
│   └── .env                     ← all secrets and config (never committed)
│
├── client/
│   └── dist/                    ← built React app (served by Nginx)
│
├── nginx/
│   ├── nginx.conf                ← global Nginx settings (gzip, timeouts, upload size)
│   └── conf.d/
│       ├── journal.conf          ← HTTP redirect + single HTTPS server block
│       └── security.inc          ← shared security headers / CSP
│
├── docker-compose.yml            ← LOCAL DEV ONLY: just Postgres, for `npm run dev`
├── docker-compose.prod.yml       ← PRODUCTION: postgres + backend + nginx
│
├── .github/workflows/deploy.yml  ← CI/CD: push to main → auto-deploy
│
└── docs/
    ├── DEPLOYMENT.md              ← step-by-step guide to set up a fresh VPS
    ├── HOSTING.md                 ← this file
    └── VPS_HOSTING_PLAN.md        ← original planning doc (historical record)
```

---

## 4. Docker Services (`docker-compose.prod.yml`)

Three containers, all on the private network `journal-net`.

### postgres
- **Image:** `postgres:16-alpine`
- **Data persistence:** named volume `postgres_data`.
- **Health check:** `pg_isready` — backend waits for this before starting.
- **Not exposed** to the internet (host-bound only to `127.0.0.1:5433` for manual `psql`).

### backend
- **Image:** custom-built from `server/Dockerfile`.
- **Startup sequence:**
  1. Waits for `postgres` to be healthy
  2. `docker-entrypoint.sh` runs `node src/db/migrate.js`
  3. Starts `node src/index.js`
- **Rebuild required** when: source code changes, `package.json` changes, or a new SQL
  migration file is added.

### nginx
- **Image:** `nginx:1.27-alpine`
- **The only public-facing service.** Redirects HTTP → HTTPS, serves `client/dist`,
  proxies `/api/*` to the backend.
- **Config/frontend changes don't need a rebuild** — files are mounted read-only and read
  at runtime. Reload with `nginx -s reload` for a config-only change; the deploy workflow
  uses `--force-recreate` instead after a client rebuild, because the bind-mounted
  `client/dist` directory itself changed and a reload alone won't pick that up.

### Startup order
```
postgres (health check) → backend (migrate + start) → nginx
```
Enforced via `depends_on: condition: service_healthy`.

---

## 5. Environment Variables

All variables live in `server/.env` (never committed — see `server/.env.example` for the
full annotated list). The ones that changed for this deployment vs. the old Vercel+Render
setup:

| Variable | Before (split) | Now (single domain) |
|---|---|---|
| `CLIENT_ORIGIN` | `https://ijidcr-asgard.vercel.app` | `https://ijidcr-asgard.in` |
| `SERVER_ORIGIN` | `https://journal-api.onrender.com` | `https://ijidcr-asgard.in` |
| `AUTH_CALLBACK_ORIGIN` | Vercel URL | `https://ijidcr-asgard.in` |
| `PUBLIC_APP_ORIGIN` | Vercel URL | `https://ijidcr-asgard.in` |
| `DATABASE_URL` | Render-managed Postgres URL | `postgresql://journal:***@postgres:5432/journal_prod` |

> **Critical:** `DATABASE_URL`'s host must be `postgres` (the Docker service name), never
> `localhost` — inside Docker, containers reach each other by service name.

Everything else (Cloudinary, Google OAuth, Resend, Hostinger Mail API, Groq) keeps the same
values, just copied from Render's dashboard into the VPS's `server/.env`.

---

## 6. How Deployments Work

### Automated (normal workflow)

```
You push to main
        │
        ▼
GitHub Actions triggers (.github/workflows/deploy.yml)
        │
        ▼
SSH into VPS and:
  1. Back up server/.env
  2. git fetch + hard reset to origin/main
  3. Restore server/.env
  4. npm ci && npm run build (client)
  5. pg_dump a pre-deploy database backup
  6. docker compose -f docker-compose.prod.yml up --build -d backend
     (migrations run automatically inside docker-entrypoint.sh)
  7. Force-recreate nginx (picks up the new client/dist mount)
  8. curl /api/health to confirm the backend came up
        │
        ▼
Live on ijidcr-asgard.in
```

**Trigger:** every push to `main`. **Monitor:** GitHub → repo → Actions.

### When to SSH in manually

| Situation | What to do |
|---|---|
| `.env` change (new API key, secret rotation) | `nano server/.env` → `docker compose -f docker-compose.prod.yml restart backend` |
| CI/CD workflow fails | Check backend logs, fix, push again |
| Emergency hotfix (Actions is down) | Run the manual deploy steps in `DEPLOYMENT.md` §11 |
| Nginx config change only | `docker compose -f docker-compose.prod.yml exec nginx nginx -t` then `-s reload` |

---

## 7. Common Operations

See `DEPLOYMENT.md` §11 "Maintenance" for the full command list (logs, restart, backups,
manual migrations, manual deploy).

---

## 8. Why Single-Domain Instead of Vercel + Render

The previous split deployment (client on Vercel, API on Render) forced the session cookie
into cross-site mode:

```js
// server/src/modules/auth/auth.controller.js
sameSite: secureCookie ? 'none' : 'lax',
```

`sameSite: 'none'` is required whenever the cookie has to survive a request from a
different origin than the one that set it — which is exactly what happens when
`ijidcr-asgard.vercel.app` calls `journal-api.onrender.com`. It works, but it's the
weaker cookie posture and depends on the browser's third-party-cookie policies staying
lenient (browsers have been tightening these).

On the VPS, `client` and `server` are both served from `https://ijidcr-asgard.in` through
Nginx, so every request is same-origin. `sameSite: 'none'` still works here, but it is now
safe to tighten to `sameSite: 'lax'` as a follow-up hardening change — this is **not** part
of the initial migration (kept out to avoid mixing infra and auth-code changes in one
deploy), but is worth doing once the VPS has been stable for a while.

---

## 9. Known Limitations & Future Work

### No backend health check in `docker-compose.prod.yml`
Nginx starts as soon as the backend container starts; the backend takes a few seconds to
run migrations and bind the port. Under normal conditions this is fine. For stricter
guarantees, add:
```yaml
backend:
  healthcheck:
    test: ["CMD-SHELL", "wget -qO- http://localhost:3001/api/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Single-server architecture
Everything (DB, backend, Nginx) runs on one VPS. If it goes down, the whole application is
offline. Given the traffic profile of a journal submission site, this is an acceptable
trade-off for now; if it stops being one, the standard path is: bigger VPS → managed
Postgres (Neon/Supabase/Hostinger's own managed DB) → multiple app servers + load balancer.

### Automated backups
Set up via cron per `DEPLOYMENT.md` §11 — confirm this is actually installed after the
first deploy (`crontab -l` on the VPS) rather than assuming it from this doc.

### Background jobs run in the same process as the API
The email worker, draft-reminder scheduler, webhook-event worker, and AI email worker
(`BACKGROUND_JOBS_ENABLED`) all run inside the single `backend` container. This is fine at
current scale; if the workload grows, consider splitting them into a separate worker
container sharing the same image but a different `CMD`.

---

## 10. Troubleshooting Runbook

### All services down after a reboot
`restart: always` is set for all three services in `docker-compose.prod.yml`, so they
should auto-recover once Docker's daemon starts. If not:
```bash
cd /var/www/journal
docker compose -f docker-compose.prod.yml up -d
```

### Backend is "Restarting"
```bash
docker compose -f docker-compose.prod.yml logs --tail=50 backend
```
Common causes: `DATABASE_URL` host is `localhost` instead of `postgres`; missing env var; a
migration failed.

### Nginx is "Restarting"
```bash
docker compose -f docker-compose.prod.yml logs --tail=20 nginx
```
Common causes: syntax error in `nginx/conf.d/journal.conf` (test with
`docker compose -f docker-compose.prod.yml exec nginx nginx -t`); SSL cert files missing;
`host not found in upstream "backend:3001"` (backend container not running).

### 502 Bad Gateway
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=30 backend
docker compose -f docker-compose.prod.yml restart backend
```

### 404 on refreshing a client route
Confirm `nginx/conf.d/journal.conf` has `try_files $uri $uri/ /index.html;`.

### SSL certificate expired
```bash
sudo certbot renew
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Login works locally in testing but session doesn't persist in production
Check that `CLIENT_ORIGIN`/`SERVER_ORIGIN`/`AUTH_CALLBACK_ORIGIN` in `server/.env` are all
exactly `https://ijidcr-asgard.in` (no trailing slash, no leftover Vercel/Render value) —
a mismatch here is the most common cause of the session cookie being set for the wrong
origin.
