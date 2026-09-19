# Journal- — Hostinger VPS Hosting: Implementation Plan

> Status: **Plan for review** — nothing in this document has been implemented yet.
> Once approved, this plan is executed into two final docs (mirroring the Bayhawk project's
> `Bayhawk_Docs/DEPLOYMENT.md` and `Bayhawk_Docs/HOSTING.md`): `docs/DEPLOYMENT.md` (step-by-step
> VPS setup) and `docs/HOSTING.md` (architecture + operations reference).

## 0. Why this plan differs from the Bayhawk reference

The Bayhawk project (used as the structural reference for this plan) has **two** React
frontends (user + admin, on separate subdomains), Prisma/Postgres, and was already fully
Dockerized. Journal- is a different shape:

| | Bayhawk | Journal- |
|---|---|---|
| Frontends | 2 (user + admin, separate subdomains) | 1 (`client`, role-based UI in one app) |
| DB access | Prisma | raw `pg` (`server/src/db/migrate.js`, `seed.js`) |
| Auth | JWT | **Session cookie** (`session_token`, `cookie-parser`) |
| Current hosting | Already on a VPS | **Split**: client → Vercel, server → Render |
| Current cross-origin cookie hack | N/A | `sameSite: 'none'` required because Vercel and Render are different origins |

The session-cookie auth is the key reason to land on a **single-domain** layout instead of
copying Bayhawk's `admin.domain` subdomain split: once the client and API share one origin,
the cross-site cookie workaround goes away and `sameSite` can be tightened later.

**Decisions confirmed with you:**
- VPS base: plain Ubuntu 22.04 + Docker (same tooling as Bayhawk: Docker Compose, no control panel)
- Domain layout: **single domain**, Nginx serves the built React app and reverse-proxies `/api/*` to the backend container (no separate `api.` subdomain)
- Migration mode: **full cutover** — Vercel + Render are decommissioned once the VPS is verified
- CI/CD: GitHub Actions auto-deploys on push to `main`, same flow as Bayhawk's `.github/workflows/deploy.yml`

---

## 1. Target Architecture

```
Internet
   │
   ▼
[ Nginx :80/:443 ]  ◄── SSL termination (Let's Encrypt), static files, reverse proxy
   │
   ├──► /              (Client React app — served from /var/www/journal/client/dist)
   ├──► /api/*    ────► [ Backend :3001 ] (Express, session-cookie auth)
   └──► /uploads/ (if any local file fallback) ────► same backend
                              │
                              ▼
                    [ PostgreSQL :5432 ]  (Docker named volume, or Hostinger managed DB — see §7)

Single domain (e.g. journal.yourdomain.com or yourdomain.com).
Only Nginx is exposed to the internet (ports 80/443).
Backend and Postgres sit on a private Docker network.
```

No `admin.` subdomain, no separate deploy for a second frontend — everything the current
`client` app already does with role-based routes stays as-is.

---

## 2. New / Changed Files in This Repo

All of these are **new for Journal-** (today there is only a dev-only `docker-compose.yml`
for local Postgres, no production Docker setup, no Nginx config, no deploy workflow).

| File | Purpose |
|---|---|
| `backend/Dockerfile` → `server/Dockerfile` | Node 20-alpine image, matches `server/package.json` engines `>=20 <25` |
| `server/docker-entrypoint.sh` | Run `node src/db/migrate.js` then `node src/index.js` — fail-fast if migration fails (same lesson as Bayhawk Bug #3) |
| `docker-compose.yml` (rewritten) | 3 services: `postgres`, `backend`, `nginx`, on a private `journal-net` bridge network, named volume `postgres_data` |
| `nginx/nginx.conf` | Global Nginx settings (gzip, client_max_body_size, mime types) |
| `nginx/conf.d/journal.conf` | Single server block: HTTP→HTTPS redirect + ACME challenge, then HTTPS server serving `client/dist` + proxying `/api/` and any upload routes to the backend |
| `nginx/conf.d/security.inc` | Shared security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) |
| `.github/workflows/deploy.yml` | On push to `main`: SSH to VPS → `git pull` → `npm run build` (client) → `docker compose up --build -d backend` → `nginx -s reload` → health check |
| `docs/DEPLOYMENT.md` | Full fresh-VPS setup guide (Hostinger-specific steps: hPanel firewall/DNS screens instead of a generic registrar) |
| `docs/HOSTING.md` | Architecture reference, env var table, deploy flow, troubleshooting runbook, "bugs fixed" log |

### Files that get updated (not replaced)

| File | Change |
|---|---|
| `server/.env.example` | Collapse `CLIENT_ORIGIN` / `SERVER_ORIGIN` / `AUTH_CALLBACK_ORIGIN` / `PUBLIC_APP_ORIGIN` / `CERTIFICATE_QR_ORIGIN` to all point at the **one** production domain instead of separate Vercel/Render values |
| `client/.env.example` / build | `VITE_API_BASE_URL=/api` already matches single-domain — **no change needed**, this already assumed same-origin |
| `client/vercel.json` | Removed once Vercel is decommissioned (§8) — kept until cutover is verified |
| `server/src/modules/auth/auth.controller.js` | Follow-up (not blocking): once same-origin, `sameSite: 'none'` can become `sameSite: 'lax'` for tighter cookie security. Documented as a post-migration hardening step, not part of the initial cutover. |
| Google OAuth console | Redirect URI changes from the Render callback URL to the new domain's callback URL |
| `HOSTINGER_MAIL_API_KEY` / `HOSTINGER_MAILBOX` | Already Hostinger-oriented in `.env.example` — no change, just populate with real values on the VPS |

---

## 3. Docker Compose (target shape)

Same pattern as Bayhawk's compose file, adapted to Journal-'s single frontend + raw-`pg` backend:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: journal-postgres
    restart: always
    env_file: [./server/.env]
    volumes: [postgres_data:/var/lib/postgresql/data]
    networks: [journal-net]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]

  backend:
    build: { context: ./server }
    container_name: journal-backend
    restart: always
    env_file: [./server/.env]
    depends_on: { postgres: { condition: service_healthy } }
    networks: [journal-net]

  nginx:
    image: nginx:1.27-alpine
    container_name: journal-nginx
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./client/dist:/var/www/journal:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on: [backend]
    networks: [journal-net]

networks:
  journal-net: { driver: bridge }
volumes:
  postgres_data:
```

`server/.env` needs `DATABASE_URL` host changed to the Docker service name `postgres` (same
"must not be `localhost`" caveat as Bayhawk's guide, and it's an easy mistake to repeat since
the current dev value is `postgresql://postgres:postgres@localhost:5432/journal_dev`).

---

## 4. Nginx (target shape)

Single server block per domain (no second admin server block needed):

```nginx
server {
    listen 443 ssl; http2 on;
    server_name yourdomain.com www.yourdomain.com;
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/journal;
    index index.html;
    include /etc/nginx/conf.d/security.inc;

    location = /index.html { add_header Cache-Control "no-cache, no-store, must-revalidate" always; }
    location /assets/      { expires 1y; add_header Cache-Control "public, immutable" always; }

    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cookie_path / /;   # session_token cookie must survive the proxy hop
    }

    location / { try_files $uri $uri/ /index.html; }  # SPA fallback
}
```

No Socket.IO block (Journal- has none, unlike Bayhawk) and no second `admin.` server block.

---

## 5. GitHub Actions CI/CD (target shape)

Same 3-secret pattern as Bayhawk (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`), triggered on push to
`main`, running on the VPS:

```bash
git pull origin main
cd client && npm install && npm run build && cd ..
docker compose up --build -d backend
docker compose exec nginx nginx -s reload
curl -f https://yourdomain.com/api/health || exit 1
```

Repo is `Kishor-raj/Journal-` (current `origin`) — you'll need admin access on that repo to add
the three Action secrets and, on the VPS, a **read-only deploy key** added under
**Settings → Deploy keys** (same as Bayhawk §5.2).

---

## 6. Migration / Cutover Sequence

1. Provision Hostinger VPS (Ubuntu 22.04), point DNS A records at it (`@`, `www`) — domain is
   the Hostinger-registered one, no `admin.` record needed.
2. Bring the stack up on the VPS **without** switching production DNS yet — verify over the
   VPS's IP / a staging subdomain.
3. Run through the full auth flow (Google OAuth + manual login), file uploads (Cloudinary),
   email sending (Resend), and the Hostinger Mail webhook integration end-to-end on the VPS.
4. Update Google OAuth authorized redirect URI to the production domain.
5. Switch DNS to the VPS (this is the actual cutover moment — flag it to me before doing it,
   it's a shared/production-visible change).
6. Confirm the site is live and healthy on the new domain.
7. Decommission: remove the Vercel project and the Render service, delete `client/vercel.json`
   from the repo.

---

## 7. Open Items / Things I Need From You Before Writing `DEPLOYMENT.md`

- [ ] The actual domain name (Hostinger-registered) and VPS IP
- [ ] Confirm Postgres runs **inside Docker on the same VPS** (matches Bayhawk exactly) rather
      than Hostinger's managed database add-on, if it has one — Bayhawk's guide's Stage 2
      scaling section (separate DB) is out of scope unless you expect this journal site to need
      it soon
- [ ] Confirm you (or someone) has admin rights on `Kishor-raj/Journal-` to add GitHub secrets
      and a deploy key
- [ ] VPS resource spec purchased (RAM/vCPU) — affects whether a swapfile step is needed for
      the client build, same as Bayhawk §13 "Out of memory during frontend build"
- [ ] Current Render/Vercel env values for production secrets (Cloudinary, Resend, Google OAuth,
      Groq, Hostinger Mail API) that need to be copied into the VPS's `server/.env`

---

## 8. Deliverables After This Plan Is Approved

1. `server/Dockerfile` + `server/docker-entrypoint.sh`
2. Rewritten `docker-compose.yml`
3. `nginx/nginx.conf`, `nginx/conf.d/journal.conf`, `nginx/conf.d/security.inc`
4. `.github/workflows/deploy.yml`
5. `docs/DEPLOYMENT.md` — Hostinger-specific fresh-VPS walkthrough (hPanel firewall + DNS zone
   editor screens instead of Bayhawk's generic registrar instructions, otherwise same shape as
   `Bayhawk_Docs/DEPLOYMENT.md`)
6. `docs/HOSTING.md` — architecture reference, env var table, operations runbook, same shape as
   `Bayhawk_Docs/HOSTING.md`
7. Updated `server/.env.example` reflecting the single-domain origins
