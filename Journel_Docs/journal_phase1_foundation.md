# Phase 1 — Project Foundation & Architecture Setup

**Goal of this phase:** Stand up a clean, scalable project skeleton for both frontend and backend, organized around **reusable components/modules** from day one — so that Phase 4 onward (public UI, author dashboard, moderator/editor/reviewer dashboards) can be built by composing shared pieces instead of duplicating code.

By the end of this phase you should have: a working React+Vite app that renders a placeholder layout, a working Express server that responds to a health-check route, a PostgreSQL connection confirmed, and a folder structure that every later phase will plug into without restructuring.

---

## 1.1 Why folder structure matters here

This system has **5 roles**, each with its own dashboard, plus a public website. Without a deliberate structure, you end up with duplicated tables, duplicated status badges, duplicated form logic across Author/Moderator/Editor/Reviewer/Admin screens. The structure below separates:

- **`shared/`** — things every role/page can reuse (buttons, tables, badges, modals, upload widgets)
- **role folders** — screens and logic specific to one role only
- **`services/`** — API-calling logic, kept out of components so UI stays dumb/presentational
- **backend `modules/`** — one folder per domain (auth, manuscripts, moderation, editorial, reviewer, revision, admin) so business logic doesn't leak into route files

---

## 1.2 Recommended Folder Structure — Frontend (`/client`)

```
client/
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── router/
│   │   └── AppRouter.jsx          # role-based route guarding lives here
│   ├── layouts/
│   │   ├── PublicLayout.jsx
│   │   ├── DashboardLayout.jsx    # shared shell for all authenticated roles
│   │   └── AuthLayout.jsx
│   ├── shared/                    # REUSABLE — used across multiple roles
│   │   ├── components/
│   │   │   ├── Button/
│   │   │   ├── Table/
│   │   │   ├── StatusBadge/       # renders manuscript_status_enum visually
│   │   │   ├── Modal/
│   │   │   ├── FileUpload/
│   │   │   ├── FormField/
│   │   │   ├── Pagination/
│   │   │   ├── EmptyState/
│   │   │   └── Toast/
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useFetch.js
│   │   │   ├── usePagination.js
│   │   │   └── useRole.js
│   │   └── utils/
│   │       ├── formatDate.js
│   │       ├── validators.js
│   │       └── constants.js       # enum value lists mirrored from backend
│   ├── features/
│   │   ├── public/                # Home, About, Archives, etc. (Phase 4)
│   │   ├── auth/                  # Login, profile completion (Phase 3)
│   │   ├── admin/                 # Admin dashboard (Phase 3)
│   │   ├── author/                # Submission wizard, My Manuscripts (Phase 5)
│   │   ├── moderator/             # Screening queue (Phase 6)
│   │   ├── editor/                # Editorial queue, reviewer assignment (Phase 6)
│   │   └── reviewer/              # Invitations, review form (Phase 6)
│   ├── services/
│   │   ├── apiClient.js           # single axios/fetch instance, base URL, interceptors
│   │   ├── authService.js
│   │   ├── manuscriptService.js
│   │   ├── moderationService.js
│   │   ├── editorialService.js
│   │   ├── reviewerService.js
│   │   └── adminService.js
│   ├── context/
│   │   └── AuthContext.jsx
│   └── styles/
│       └── tokens.css             # design tokens: colors, spacing, typography
├── .env.example
├── vite.config.js
└── package.json
```

**Key rule going forward:** if a component is used by 2+ roles (e.g. a manuscript status badge, a file upload box, a data table), it belongs in `shared/components/`, never duplicated inside a `features/<role>/` folder.

---

## 1.3 Recommended Folder Structure — Backend (`/server`)

```
server/
├── src/
│   ├── index.js                   # app entrypoint
│   ├── app.js                     # express app config (middleware wiring)
│   ├── config/
│   │   ├── db.js                  # PostgreSQL pool/client
│   │   ├── cloudinary.js          # Cloudinary client config
│   │   ├── oauth.js               # Google OAuth config
│   │   └── env.js                 # centralized env var validation
│   ├── middleware/
│   │   ├── authenticate.js        # session/JWT validation
│   │   ├── authorize.js           # role + resource-level checks (Phase 3)
│   │   ├── errorHandler.js
│   │   ├── requestLogger.js
│   │   └── rateLimiter.js
│   ├── modules/                   # one folder per domain — mirrors DB modules
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   ├── users/
│   │   ├── journal/
│   │   ├── manuscripts/
│   │   ├── moderation/
│   │   ├── editorial/
│   │   ├── reviewer/
│   │   ├── revision/
│   │   ├── withdrawal/
│   │   ├── files/                 # Cloudinary upload/signed URL logic
│   │   └── audit/
│   ├── shared/
│   │   ├── errors/
│   │   │   └── AppError.js
│   │   ├── validators/            # shared schema validation (e.g. Zod/Joi)
│   │   └── utils/
│   │       ├── logger.js
│   │       └── conflictCheck.js   # reusable conflict-of-interest function (used in Phase 6)
│   └── db/
│       ├── migrations/
│       └── seeds/
├── .env.example
└── package.json
```

**Why `modules/` instead of the classic `routes/`, `controllers/`, `models/` split:** with 5 distinct roles and 9 workflow domains, a domain-based structure (everything about "editorial" in one folder) scales better than a type-based structure, and matches how you'll actually think about the system ("go work on the reviewer module").

---

## 1.4 Detailed Implementation Steps

### Step 1 — Repository & tooling
- [x] Create the repository (monorepo with `/client` and `/server`, or two repos — pick one and stay consistent)
- [x] Initialize `package.json` in both `client/` and `server/`
- [x] Set up a root `.gitignore` (node_modules, `.env`, build output, `.DS_Store`)
- [x] Install and configure ESLint + Prettier in both projects with a shared config where possible
- [x] Set up a pre-commit hook (e.g. Husky + lint-staged) to catch lint errors before commit

### Step 2 — Frontend scaffold
- [x] `npm create vite@latest client -- --template react`
- [x] Install routing library (React Router)
- [x] Create the folder structure from section 1.2
- [x] Build `PublicLayout.jsx` and `DashboardLayout.jsx` as empty shells with a header/sidebar placeholder
- [x] Set up `AppRouter.jsx` with placeholder routes for `/`, `/login`, `/dashboard`
- [x] Create `apiClient.js` with a configurable base URL from `.env`
- [x] Add design tokens file (`tokens.css`) — colors, spacing scale, font stack (even placeholder values; refine in Phase 4)
- [x] Confirm `npm run dev` renders a blank layout with no console errors

### Step 3 — Backend scaffold
- [x] `npm init` in `server/`, install Express, `pg` (or chosen ORM), `dotenv`, `cors`, `helmet`
- [x] Create the folder structure from section 1.3
- [x] Build `app.js`: wire up `helmet`, `cors` (locked to frontend origin from env), JSON body parsing, `errorHandler` middleware
- [x] Build `index.js`: starts the server on a configurable port
- [x] Create `config/db.js`: PostgreSQL connection pool, test connection on boot, fail fast with clear error if unreachable
- [x] Add a `/api/health` route returning `{ status: "ok" }` — this is your first end-to-end smoke test
- [x] Confirm frontend can successfully call `/api/health` through `apiClient.js`

### Step 4 — Database connection
- [x] Provision PostgreSQL (local Docker container for dev, managed instance for staging/prod)
- [x] Add `docker-compose.yml` for local Postgres if using Docker (recommended for team consistency)
- [x] Confirm connection string works from `config/db.js`
- [x] Decide and install ORM/query layer **[BLOCKING — affects Phase 2 migration format]**
  - Options: Prisma (schema-first, strong typing, easy migrations), Drizzle (lightweight, SQL-close), or raw `pg` + manual SQL (max control, more boilerplate)
  - Recommendation for this project: something with first-class native ENUM + trigger support in migrations, since Phase 2 requires both

### Step 5 — Cloudinary setup (connection only — full integration in Phase 5)
- [x] Create a Cloudinary account and note the cloud name from the dashboard
- [x] Create a dedicated upload preset scoped for manuscript files (unsigned presets are NOT recommended here — use signed uploads since files are private/access-controlled)
- [x] Organize storage using Cloudinary folders (e.g. `manuscripts/{manuscript_id}/{version_number}/`) for logical separation, since Cloudinary doesn't use separate buckets the way R2/S3 does
- [x] Install the official Cloudinary SDK (`cloudinary` npm package) on the backend
- [x] Add `config/cloudinary.js` with `cloud_name`, `api_key`, `api_secret` configuration
- [x] Restrict allowed formats at the preset level (PDF/DOCX for manuscripts; images for supplementary files) as a first layer of validation, on top of server-side checks
- [x] Store credentials in `.env`, never commit them
- [x] Confirm a test file can be uploaded (signed) and retrieved via a throwaway script
- [x] Note: Cloudinary resource type must be set to `raw` for non-image documents (PDF/DOCX) — `image`/`video` resource types won't handle manuscript files correctly

### Step 6 — Environment & secrets management
- [x] Create `.env.example` for both client and server listing every required variable (no real values)
- [x] Document required env vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`, `CLIENT_ORIGIN`, `PORT`
- [x] Add `config/env.js` on the backend that validates all required vars exist at boot and crashes early with a clear message if not

### Step 7 — Reverse proxy & CORS baseline
- [x] Set up local Nginx config (or document the plan for staging/prod) for TLS termination and routing `/api` to Express, everything else to the Vite build
- [x] Lock CORS in `app.js` to the exact frontend origin (no wildcard `*`)
- [x] Confirm cookies (to be used for sessions in Phase 3) will work cross-origin in dev (may require `credentials: true` + matching `SameSite` settings)

### Step 8 — Sanity checks before moving to Phase 2
- [x] Frontend builds and runs (`npm run dev`, `npm run build`)
- [x] Backend runs and responds to `/api/health`
- [x] Backend can connect to PostgreSQL on boot
- [x] Cloudinary test upload/download works from a script
- [x] `.env.example` is complete and `.env` is gitignored
- [x] Folder structures match sections 1.2 and 1.3 exactly (deviations should be deliberate, not accidental)

---

## 1.5 What NOT to build yet

To keep this phase focused, explicitly avoid starting these now — they belong to later phases:
- Any real authentication logic (Phase 3)
- Any database tables/migrations (Phase 2)
- Any actual dashboard content (Phase 4+)
- Any file upload UI (Phase 5)

This phase is infrastructure only. Resist the urge to jump ahead — a clean foundation here saves rework in every later phase.

---

## 1.6 Exit Criteria for Phase 1

You're ready for **Phase 2 — Database Design & Implementation** when:
- [x] Both apps run locally without errors
- [x] Health-check round trip works (frontend → backend → response)
- [x] PostgreSQL and Cloudinary connections are both confirmed working
- [x] ORM/migration tool is chosen and installed
- [x] Folder structure is in place and committed to version control
