# Phase 5 — Author & Manuscript Submission Module

**Goal of this phase:** Build the complete author-side submission experience — draft creation, metadata entry, co-author management, file upload to Cloudinary, versioning, and the transaction that hands a manuscript off to the moderation queue.

**Scope boundary:** This phase covers *first submission* and the data model that later phases build on. Revision responses and withdrawals (author-initiated actions on an already-submitted manuscript) are deliberately deferred to **Phase 7**, since they depend on editorial decisions that don't exist yet. Building them here would mean revisiting this module twice — better to finish the submission path cleanly first.

By the end of this phase: an author can log in, complete a full submission wizard, upload files to Cloudinary correctly, add co-authors, and see their manuscript appear in "My Manuscripts" with an accurate status — with a full audit trail of the submission event.

---

## 5.1 Author Dashboard Structure

Using `DashboardLayout` and role-aware nav from Phase 4:

- [x] Sidebar items for author role: **Dashboard**, **New Submission**, **My Manuscripts**, **Profile**
- [x] Leave placeholder (disabled or "coming soon") nav entries for **Revisions** and **Withdrawals** — they'll activate in Phase 7 once the data exists to populate them; don't build dead-end pages now
- [x] Dashboard home: quick stats (manuscripts in draft, under review, needing action) + shortcut to New Submission

**Todos:**
- [x] Build `features/author/AuthorDashboard.jsx`
- [x] Wire sidebar nav config for the author role into `DashboardLayout` from Phase 4

---

## 5.2 Submission Wizard — Step by Step

Mirrors the UX flow from the original spec (Section 26), implemented as a multi-step form with a persisted draft between steps.

### Step 1 — Create draft
- [x] `POST /api/manuscripts` creates a `manuscripts` row immediately with `current_status = 'draft'`, `submitted_by = req.user.id`, and a generated `submission_number` (placeholder pattern until real submission — e.g. `DRAFT-{uuid_short}`, replaced with a real sequential number on actual submit)
- [x] Redirect into the wizard at `/author/submissions/:id/edit` — every subsequent step is an update to this same draft, not a new record

### Step 2 — Manuscript metadata
- [x] Form fields: title, abstract, keywords (tag input), **category** (dropdown sourced from `categories` table — this is what Phase 6's reviewer-matching will key off, so make it required, not optional)
- [x] `PATCH /api/manuscripts/:id` saves metadata to the draft
- [x] Use `FormField` and validation patterns from Phase 4's shared component library

### Step 3 — Authors & co-authors
- [x] Corresponding author defaults to the submitting user, editable
- [x] Add co-author by email: if the email matches an existing `users` row, link `user_id`; if not, store as an unlinked snapshot (name/email/institution only) per the `manuscript_authors` design — **an author does not need an account**
- [x] Author ordering (drag-to-reorder or numbered input) → `author_order`
- [x] Contribution roles (CRediT taxonomy checkboxes: Conceptualization, Data Curation, Writing, etc.) → `contribution_roles` array
- [x] Mark exactly one corresponding author (`is_corresponding`)
- [x] `POST /api/manuscripts/:id/authors`, `PATCH /api/manuscripts/:id/authors/:authorId`, `DELETE /api/manuscripts/:id/authors/:authorId`

### Step 4 — File upload
- [x] Required: main manuscript file
- [x] Optional: supplementary files, cover letter
- [x] Use `FileUpload` shared component from Phase 4
- [x] Full Cloudinary integration detailed in section 5.4 below
- [x] **Reminder to the author in the UI**: manuscript file must not contain author-identifying information (this is what Moderator will check in Phase 6) — surface this as inline guidance text, not just a guideline buried in the Submission Guidelines page

### Step 5 — Review summary
- [x] Read-only summary of everything entered: metadata, author list, uploaded files
- [x] Edit links back to each step

### Step 6 — Declarations & submit
- [x] Required checkboxes: originality declaration, ethics compliance, no conflicts declaration (exact wording pulled from `journals`/ethics policy — align with the Publication Ethics public page from Phase 4)
- [x] `POST /api/manuscripts/:id/submit` — the actual submission transaction (section 5.6)

**Todos:**
- [x] Build all 6 steps as a wizard component with a persisted step index (so a refresh doesn't lose progress)
- [x] Autosave each step's `PATCH` on blur/next, not just on final submit — authors should never lose work
- [x] Allow returning to an in-progress draft from "My Manuscripts" (status = draft rows should be resumable, not just visible)

---

## 5.3 Duplicate Submission Check

- [x] On Step 2 save (or Step 6 submit), run a check: same `submitted_by` + similar `title` (fuzzy match, e.g. trigram similarity via Postgres `pg_trgm`) within a recent time window
- [x] If a likely duplicate is found, show a non-blocking warning: "This looks similar to an existing submission — continue anyway?" — don't hard-block, since legitimate resubmissions/similar titles happen
- [x] Log the flagged duplicate to `user_activity` regardless of the author's choice, for moderator visibility later

---

## 5.4 File Upload — Cloudinary Integration

Direct-to-Cloudinary signed upload, so files never pass through your Express server as a bottleneck.

### Flow

```
1. Client requests an upload signature:
   POST /api/files/signature
   body: { manuscript_id, version_id, file_type }

2. Backend validates the requester owns/co-authors this manuscript
   (resource-level check from Phase 3), then generates:
   - timestamp
   - folder: `manuscripts/${manuscript_id}/${version_id}/`
   - signs the params using cloudinary.utils.api_sign_request(params, api_secret)

3. Backend returns: { signature, timestamp, api_key, cloud_name, folder }
   — NEVER returns the api_secret itself

4. Client uploads directly to:
   POST https://api.cloudinary.com/v1_1/{cloud_name}/raw/upload
   (multipart form: file, api_key, timestamp, signature, folder)
   — resource_type MUST be 'raw' for PDF/DOCX, not 'image'

5. Cloudinary responds with: public_id, secure_url, bytes, format, resource_type

6. Client confirms with backend:
   POST /api/manuscripts/:id/files
   body: { public_id, format, bytes, resource_type, original_filename, file_type, version_id }

7. Backend writes the manuscript_files row (is_accessible = false until
   validation + malware scan pass), returns the file record
```

### Validation (server-side, on step 6 confirmation — never trust the client)
- [x] Re-validate `file_type` against an allowed enum list (manuscript, supplementary, cover_letter)
- [x] Re-validate `format` against allowed extensions from `submission_guidelines` (typically pdf, doc, docx)
- [x] Re-validate `bytes` against a max size limit (define this limit now — e.g. 25MB per file)
- [x] Compute/verify checksum where feasible
- [x] Reject and delete the Cloudinary asset (via API) if any check fails — don't leave orphaned uploads

### Malware scan hook
- [x] Integrate a scanning step before flipping `is_accessible = true` — options: a third-party scanning API called async after upload, or a queued job that polls/webhooks back
- [x] Until the scan completes, the file is uploaded but `is_accessible = false` — no downstream role (Moderator included) can open it yet
- [x] Build this as a pluggable interface (`scanFile(publicId) => Promise<'clean' | 'infected' | 'error'>`) so the actual provider can be swapped without touching the rest of the flow

**Todos:**
- [x] Backend: `modules/files/files.routes.js` — `/signature`, and the confirmation endpoint
- [x] Backend: `modules/files/files.service.js` — signing logic, Cloudinary SDK calls, malware scan hook interface
- [x] Frontend: `services/fileService.js` — requests signature, performs the direct upload, confirms with backend
- [x] Handle upload failure/retry gracefully in the `FileUpload` component (network errors mid-upload shouldn't corrupt wizard state)
- [x] Never expose `CLOUDINARY_API_SECRET` to the frontend under any code path

---

## 5.5 Versioning Logic

- [x] On first real submission (Step 6), create `manuscript_versions` row: `version_number = 1`, `version_type = 'initial'`, `is_current = true`
- [x] All files uploaded during the wizard get `version_id` set to this version
- [x] `manuscripts.current_version_id` is set to this version's id (this is the deferred FK from Phase 2 — confirm it's wired correctly here)
- [x] Title/abstract on `manuscript_versions` are a snapshot at submission time — even if `manuscripts.title` is later edited for display purposes (it generally shouldn't be after submission), the version record stays immutable

---

## 5.6 Submission Transaction

This is the core state-changing action of the whole module — must be atomic.

```
BEGIN TRANSACTION
  1. Generate real submission_number (sequential, human-friendly)
  2. UPDATE manuscripts SET current_status = 'submitted', submitted_at = now()
  3. INSERT manuscript_versions (version 1, is_current = true)
  4. UPDATE manuscript_files SET version_id = <new version id> where relevant
  5. INSERT manuscript_status_history (from_status = 'draft', to_status = 'submitted')
  6. INSERT user_activity (action = 'manuscript_submitted')
  7. Enqueue notification to moderation queue (actual email sending is Phase 7 —
     for now, this can just be a workflow_logs entry marking the event,
     or a stub notification call)
COMMIT
```

**Todos:**
- [x] Implement as a single DB transaction — any failure rolls back all of it, no partial submissions
- [x] Confirm the author cannot edit metadata/files/authors after this point except through the Phase 7 revision flow (lock the draft-editing routes once `current_status != 'draft'`)
- [x] Confirm declarations (5.2 Step 6) are stored somewhere auditable (even a simple `declarations_accepted_at` timestamp + which version of the ethics text was shown)

---

## 5.7 My Manuscripts — List & Status Tracking

- [x] `GET /api/manuscripts/mine` — resource-scoped to manuscripts where the user is an author (via `manuscript_authors`) or `submitted_by`
- [x] Use the shared `Table` + `StatusBadge` components from Phase 4 — status values render using the same enum color mapping already built
- [x] Row click → manuscript detail view: metadata, current status, version history, file list (read-only at this stage — actions come from Phase 7)
- [x] Draft-status rows link back into the wizard at the step they left off; submitted+ rows show a read-only detail view

---

## 5.8 Authorization Tie-In

- [x] Every manuscript route in this module runs through `requireManuscriptAccess()` from Phase 3 — an author must never fetch/edit a manuscript they don't own or co-author
- [x] Co-author addition should not silently grant that new user account access retroactively to *other* manuscripts — the relationship is scoped to this one `manuscript_authors` row only
- [x] If an added co-author has an existing account with a non-author role (e.g. they happen to also be a Reviewer elsewhere in the system), this creates no conflict yet — conflicts are evaluated at assignment time in Phase 6, not at authorship-entry time here

---

## 5.9 Testing

- [x] Full wizard flow: draft → metadata → co-authors → file upload → summary → submit, confirm final state is correct across `manuscripts`, `manuscript_versions`, `manuscript_files`, `manuscript_status_history`
- [x] Refresh mid-wizard — confirm draft state persists and resumes correctly
- [x] Upload rejection: oversized file, disallowed format — confirm clear error and no orphaned Cloudinary asset
- [x] Duplicate check triggers correctly on a near-identical title
- [x] Co-author without an existing account: added as unlinked snapshot, later self-registers with matching email — confirm this is handled deliberately (decide now: auto-link on matching email, or require manual linking — recommend manual/admin-assisted linking to avoid identity spoofing via email guessing)
- [x] Author cannot access another author's manuscript via direct URL/ID manipulation
- [x] Submission transaction rollback: simulate a failure mid-transaction (e.g. bad file record) and confirm no partial state is left behind

---

## 5.10 Exit Criteria for Phase 5

You're ready for **Phase 6 — Moderator, Editorial & Reviewer Workflow Engine** when:
- [x] Full submission wizard works end-to-end
- [x] Files upload correctly to Cloudinary with signed, validated uploads
- [x] Malware scan hook exists (even if using a placeholder/mock provider for now) and gates `is_accessible`
- [x] Co-authors (linked and unlinked) are stored correctly with ordering and contribution roles
- [x] Submission transaction is atomic and produces a correct audit trail
- [x] "My Manuscripts" list correctly scopes to the logged-in author and displays accurate status
- [x] At least one real manuscript has been pushed through to `current_status = 'submitted'` and is visible in the (not-yet-built) moderation queue's underlying data
