# Journal- (IJIDCR / Asgard Publications) — Production Deployment Guide

> **Who this is for:** You have a fresh Hostinger **KVM 2** VPS and the domain
> **`ijidcr-asgard.in`** (also registered/managed through Hostinger). Every command is
> explained so you understand what it does, not just what to type.
>
> This mirrors the structure of the Bayhawk project's `DEPLOYMENT.md`, adapted for
> Journal-'s shape: **one** frontend (`client`) + **one** backend (`server`, raw `pg`,
> session-cookie auth) on a **single domain** — no separate admin subdomain.

---

## Architecture Overview

```
Internet
   │
   ▼
[ Nginx :80/:443 ]  ◄── SSL termination, static files, reverse proxy
   │
   ├──► /var/www/journal/client/dist   (React app — ijidcr-asgard.in)
   └──► proxy /api/  ────────────────────────►  [ Backend :3001 ] (Express)
                                                         │
                                                         ▼
                                              [ PostgreSQL :5432 ]

All services run inside Docker containers on the same private network.
Only Nginx is exposed to the internet (ports 80 and 443).
```

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [VPS Initial Setup (Hostinger)](#2-vps-initial-setup-hostinger)
3. [Install Required Software](#3-install-required-software)
4. [Configure DNS (Hostinger)](#4-configure-dns-hostinger)
5. [Clone the Repository](#5-clone-the-repository)
6. [Configure Environment Variables](#6-configure-environment-variables)
7. [Get SSL Certificates](#7-get-ssl-certificates)
8. [Build the Frontend and Start Everything](#8-build-the-frontend-and-start-everything)
9. [Verify the Deployment](#9-verify-the-deployment)
10. [Set Up GitHub Actions CI/CD](#10-set-up-github-actions-cicd)
11. [Maintenance](#11-maintenance)
12. [Troubleshooting](#12-troubleshooting)
13. [Decommissioning Vercel + Render](#13-decommissioning-vercel--render)

---

## 1. Prerequisites

| Item | Details |
|---|---|
| VPS | Hostinger **KVM 2** — 2 vCPU, 8 GB RAM, 100 GB NVMe disk |
| OS | Ubuntu 22.04 (choose this template in hPanel when provisioning) |
| Domain | `ijidcr-asgard.in`, registered/managed in Hostinger |
| SSH access | Root password or SSH key from hPanel → VPS → Overview |
| GitHub repo | `Kishor-raj/Journal-` — you need admin access to add secrets + a deploy key |

KVM 2's 8 GB RAM is comfortable for building the Vite React app — you should **not** need
the swap-space workaround Bayhawk's guide describes for 1 GB VPS plans, but the step is
included in §12 just in case.

---

## 2. VPS Initial Setup (Hostinger)

### 2.1 Get your VPS's IP and root password

In **hPanel → VPS → your KVM 2 instance → Overview**, note the **IP address**. If you didn't
set a password during provisioning, hPanel lets you reset the root password from the same
screen (or use the **Browser terminal** hPanel provides — no local SSH client needed for
this first step).

### 2.2 Connect to your VPS

```bash
ssh root@187.53.133.115
```

Type `yes` when asked about the fingerprint, then enter the root password from hPanel.

### 2.3 Create a non-root user (for security)

```bash
adduser journal
usermod -aG sudo journal
rsync --archive --chown=journal:journal ~/.ssh /home/journal
```

### 2.4 Set up a firewall

Hostinger KVM plans also have a firewall you can manage from **hPanel → VPS → Firewall** —
either configure the same rules there, or use `ufw` on the box itself (do both is fine,
`ufw` is the one that actually blocks traffic at the OS level):

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

Expected output:
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80                         ALLOW       Anywhere
443                        ALLOW       Anywhere
```

### 2.5 Log out and back in as the new user

```bash
exit
ssh journal@187.53.133.115
```

All remaining steps are done as the `journal` user.

---

## 3. Install Required Software

### 3.1 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Docker

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Allow your user to run Docker without `sudo`:

```bash
sudo usermod -aG docker journal
exit
ssh journal@187.53.133.115
```

Verify:

```bash
docker --version
docker compose version
```

### 3.3 Install Node.js 20

The `server/package.json` requires Node `>=20 <25`, and the VPS needs Node locally to build
the React frontend during deploys.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node --version   # v20.x.x
npm --version
```

### 3.4 Install Certbot

```bash
sudo apt install -y certbot
sudo mkdir -p /var/www/certbot
sudo chown journal:journal /var/www/certbot
```

---

## 4. Configure DNS (Hostinger)

Since the domain is also on Hostinger, this is done in **hPanel → Domains → ijidcr-asgard.in
→ DNS / Nameservers → DNS Zone Editor** (not a third-party registrar screen).

Add or edit these records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | 187.53.133.115 | 300 (or Hostinger's default) |
| A | `www` | 187.53.133.115 | 300 |

There is **no `admin` record** — Journal- has a single frontend.

If `ijidcr-asgard.in` currently has records pointing at Vercel (e.g. a `CNAME`/`A` for
`cname.vercel-dns.com` or similar), **remove or replace** them here — a domain can only
point at one place at a time. This is the point where the domain stops resolving to Vercel;
if you want to keep the current site live a little longer, do this step only when you're
ready to actually cut over (see §13).

Wait 5–15 minutes, then verify:

```bash
nslookup ijidcr-asgard.in
nslookup www.ijidcr-asgard.in
```

Both should return your VPS IP.

---

## 5. Clone the Repository

### 5.1 Create the project directory

```bash
sudo mkdir -p /var/www/journal
sudo chown journal:journal /var/www/journal
```

### 5.2 Set up a read-only deploy key for GitHub

```bash
ssh-keygen -t ed25519 -C "journal-vps-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Add it: **GitHub → `Kishor-raj/Journal-` → Settings → Deploy keys → Add deploy key**.
Title: `VPS Deploy Key`. Paste the public key. Leave **Allow write access** unchecked.

### 5.3 Clone

```bash
cd /var/www/journal
git clone git@github.com:Kishor-raj/Journal-.git .
ls
# Should show: client  server  docker-compose.yml  docker-compose.prod.yml  nginx  docs  ...
```

---

## 6. Configure Environment Variables

```bash
cd /var/www/journal/server
cp .env.example .env
nano .env
```

Fill in (see `server/.env.example` for the full list of every variable — this covers the
ones that change for this deployment):

```bash
# ─── Server ───────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production

# Single domain — the same origin serves the app and the API through Nginx
CLIENT_ORIGIN=https://ijidcr-asgard.in
SERVER_ORIGIN=https://ijidcr-asgard.in
AUTH_CALLBACK_ORIGIN=https://ijidcr-asgard.in
PUBLIC_APP_ORIGIN=https://ijidcr-asgard.in
CERTIFICATE_QR_ORIGIN=https://www.ijidcr-asgard.in

# ─── Session secret ───────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
SESSION_SECRET=

# ─── PostgreSQL (used by the postgres container in docker-compose.prod.yml) ──
POSTGRES_USER=journal
POSTGRES_PASSWORD=          # generate with: openssl rand -base64 24
POSTGRES_DB=journal_prod

# Host MUST be "postgres" (the Docker service name), not localhost
DATABASE_URL=postgresql://journal:SAME_PASSWORD_AS_ABOVE@postgres:5432/journal_prod?schema=public
DATABASE_SSL=false

# ─── Everything else (copy the real values currently set in Render's dashboard) ─
ADMIN_SEED_EMAIL=ceo@ijidcr-asgard.in
ADMIN_SEED_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_PRESET=
RESEND_API_KEY=
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
EMAIL_FROM_NAME=Asgard Publications
EMAIL_FROM_ADDRESS=no-reply@ijidcr-asgard.in
CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in
HOSTINGER_MAIL_API_KEY=
HOSTINGER_MAILBOX=editor@ijidcr-asgard.in
HOSTINGER_WEBHOOK_SECRET=
AI_PROVIDER=groq
GROQ_API_KEY=
```

Save (`Ctrl+O`, `Enter`) and exit (`Ctrl+X`).

> **Critical:** `DATABASE_URL`'s host must be `postgres`, never `localhost`. Inside Docker,
> containers reach each other by service name; `localhost` inside the backend container
> means the backend container itself, not the database.

> **Update Google OAuth:** In the Google Cloud Console, add
> `https://ijidcr-asgard.in/api/auth/google/callback` (or whatever `AUTH_CALLBACK_ORIGIN`
> resolves to in your auth routes) as an authorized redirect URI, and remove the old
> `onrender.com` one once this is live.

---

## 7. Get SSL Certificates

### 7.1 Temporarily serve a plain HTTP config for the ACME challenge

```bash
cat > /tmp/init.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Journal is alive';
        add_header Content-Type text/plain;
    }
}
EOF

sudo cp /tmp/init.conf /var/www/journal/nginx/conf.d/journal.conf
```

Start just Nginx and Postgres:

```bash
cd /var/www/journal
docker compose -f docker-compose.prod.yml up -d nginx postgres
docker compose -f docker-compose.prod.yml ps

curl http://187.53.133.115
# Should print: Journal is alive
```

### 7.2 Obtain the certificate

```bash
sudo certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d ijidcr-asgard.in \
  -d www.ijidcr-asgard.in \
  --email ceo@ijidcr-asgard.in \
  --agree-tos \
  --non-interactive
```

Expected:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/ijidcr-asgard.in/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/ijidcr-asgard.in/privkey.pem
```

### 7.3 Restore the real Nginx config

```bash
cd /var/www/journal
git checkout nginx/conf.d/journal.conf
```

### 7.4 Set up automatic renewal

```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

---

## 8. Build the Frontend and Start Everything

### 8.1 Build the client

```bash
cd /var/www/journal/client
npm install
npm run build
```

This creates `/var/www/journal/client/dist/`.

### 8.2 Start all services

```bash
cd /var/www/journal
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f
```

Press `Ctrl+C` to stop watching logs (services keep running).

### 8.3 Check health

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected: `journal-backend`, `journal-nginx`, `journal-postgres` all `Up`, backend and
postgres `(healthy)` after ~30–60 seconds. If not:

```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs postgres
```

### 8.4 Seed the admin account (first deploy only)

Check `server/src/db/seed.js` for the exact command — typically:

```bash
docker compose -f docker-compose.prod.yml exec backend node src/db/seed.js
```

---

## 9. Verify the Deployment

```bash
curl https://ijidcr-asgard.in/api/health
# {"status":"ok"}
```

Then in a browser:
- `https://ijidcr-asgard.in` → the app loads, padlock shows "Connection is secure"
- Log in via Google OAuth and via manual email/password — both exercise the session
  cookie, the part that's different now that client + API are same-origin
- Submit/view a manuscript, upload a file (Cloudinary), confirm an email actually sends
  (Resend) and that the Hostinger Mail webhook reaches `/api/...` if you use that AI email
  feature

---

## 10. Set Up GitHub Actions CI/CD

The workflow is already in the repo at `.github/workflows/deploy.yml` — it triggers on every
push to `main`. You only need to wire up the secrets.

### 10.1 Create a dedicated deploy SSH key

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/github_actions   # copy this entire private key
```

### 10.2 Add repository secrets

**GitHub → `Kishor-raj/Journal-` → Settings → Secrets and variables → Actions → New
repository secret:**

| Secret | Value |
|---|---|
| `VPS_HOST` | Your VPS IP |
| `VPS_USER` | `journal` |
| `VPS_SSH_KEY` | The private key from 10.1 |

### 10.3 Test it

```bash
git commit --allow-empty -m "test: trigger first CI/CD deploy"
git push origin main
```

Watch **GitHub → Actions → "Deploy to Production"**. It should finish green. What it does
on the VPS: backs up `server/.env`, hard-resets to `origin/main`, rebuilds the client,
backs up the database, rebuilds/restarts the backend (migrations run automatically via
`docker-entrypoint.sh`), force-recreates Nginx (so it picks up the fresh `client/dist`
mount), and runs a health check against `/api/health`.

---

## 11. Maintenance

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart / stop / start
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Manual backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U journal journal_prod > /var/www/journal/backups/backup_$(date +%Y-%m-%d).sql

# Manual deploy (emergency, CI down)
cd /var/www/journal
git pull origin main
cd client && npm install && npm run build && cd ..
docker compose -f docker-compose.prod.yml up --build -d backend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx

# Run migrations manually
docker compose -f docker-compose.prod.yml exec backend node src/db/migrate.js

# Update an env var
nano /var/www/journal/server/.env
docker compose -f docker-compose.prod.yml restart backend
```

**Automate daily backups** with cron:

```bash
mkdir -p /var/www/journal/backups
crontab -e
```

```
0 2 * * * docker compose -f /var/www/journal/docker-compose.prod.yml exec -T postgres pg_dump -U journal journal_prod > /var/www/journal/backups/backup_$(date +\%Y-\%m-\%d).sql
```

---

## 12. Troubleshooting

**`docker compose up` fails with "port already in use"**
```bash
sudo lsof -i :80
sudo lsof -i :443
sudo kill -9 PID
```

**Backend shows "Restarting"**
```bash
docker compose -f docker-compose.prod.yml logs backend
```
Common causes: `DATABASE_URL` host is `localhost` instead of `postgres`; missing env var;
Postgres not ready yet (wait 30s).

**Website loads but login/API calls fail**
Check `CLIENT_ORIGIN`/`SERVER_ORIGIN` in `server/.env` are exactly `https://ijidcr-asgard.in`
(no trailing slash), restart backend, check logs. Since client and API are now same-origin,
you should **not** see CORS errors at all in this setup — if you do, something is still
pointing at the old Render URL (check `client/.env` build-time `VITE_API_BASE_URL`, it
should be `/api`).

**404 on refreshing a client route (e.g. `/dashboard`)**
Confirm `nginx/conf.d/journal.conf` has `try_files $uri $uri/ /index.html;` in the `location /`
block.

**SSL certificate command fails**
Confirm DNS points at the VPS (`nslookup ijidcr-asgard.in`), port 80 is open, and Nginx
responds on port 80 (`curl http://187.53.133.115`).

**Out of memory during the client build**
Unlikely on KVM 2 (8 GB RAM), but if it happens:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**GitHub Actions deploy fails**
Check the failed run's log first. Common issues: wrong `VPS_HOST`/`VPS_USER`, SSH key not
in `~/.ssh/authorized_keys` on the VPS, VPS out of disk (`df -h`).

---

## 13. Decommissioning Vercel + Render

Only do this **after** §9 verification passes and DNS has been pointed at the VPS for a
day or two with no issues:

1. **Vercel:** Project settings → delete the `Journal-` project (or just remove the custom
   domain from it if you want to keep the project as a dormant fallback a while longer).
2. **Render:** Delete the `journal-d6mt` (or whatever it's named) web service, and its
   managed Postgres instance once you've confirmed the VPS's Postgres has everything (take
   one last `pg_dump` from Render first, for the archive).
3. Remove `client/vercel.json` from the repo — it's dead weight once Vercel is no longer
   deploying this project:
   ```bash
   git rm client/vercel.json
   git commit -m "chore: remove Vercel config after migrating to Hostinger VPS"
   ```
4. Rotate `GOOGLE_CLIENT_SECRET` origins in Google Cloud Console — remove the old
   `vercel.app` / `onrender.com` authorized origins and redirect URIs, keep only
   `https://ijidcr-asgard.in`.

---

## Quick Reference

| Task | Command |
|---|---|
| View all service status | `docker compose -f docker-compose.prod.yml ps` |
| View backend logs | `docker compose -f docker-compose.prod.yml logs -f backend` |
| Restart backend | `docker compose -f docker-compose.prod.yml restart backend` |
| Manual deploy | `git pull && npm run build (client) && docker compose -f docker-compose.prod.yml up --build -d backend` |
| Database backup | `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U journal journal_prod > backup.sql` |
| Run migrations | `docker compose -f docker-compose.prod.yml exec backend node src/db/migrate.js` |
| Reload nginx (config-only change) | `docker compose -f docker-compose.prod.yml exec nginx nginx -s reload` |
| Recreate nginx (after a new client build) | `docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx` |
| Stop everything | `docker compose -f docker-compose.prod.yml down` |
| Start everything | `docker compose -f docker-compose.prod.yml up -d` |
