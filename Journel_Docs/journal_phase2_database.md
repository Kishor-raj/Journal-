# Phase 2 — Database Design & Implementation

**Goal of this phase:** Implement the full 33-table PostgreSQL schema as versioned migrations, in an order that respects foreign key dependencies, with native ENUM types, the reviewer-cap trigger, and seed data — so every later phase (auth, submission, moderation, editorial, reviewer) has a stable data layer to build against.

By the end of this phase you should have: every table created via migration files (not manual SQL run once), all ENUM types defined, the 2-reviewer trigger active and tested, seed data for roles/journal/categories, and a way to run migrations up/down repeatably.

> **Storage note:** `manuscript_files` below reflects the **Cloudinary** switch from Phase 1 — columns are `public_id` and `resource_type` instead of R2's `bucket_name`/`object_key`.

---

## 2.1 Migration Strategy & Tooling

- [x] Confirm ORM/migration tool from Phase 1 (must support native ENUM types + raw SQL for triggers — Prisma and Drizzle both support this via raw migration escape hatches)
- [x] Create `server/src/db/migrations/` with sequential, timestamped filenames (e.g. `0001_create_roles.sql`, `0002_create_users.sql`)
- [x] Every migration must have a corresponding **down/rollback** step — never write one-way migrations
- [x] Set up an `npm run migrate` and `npm run migrate:rollback` script
- [x] Set up a separate `npm run seed` script, independent from migrations
- [x] Decide naming convention now and stick to it: `snake_case` for all tables/columns (matches the data dictionary already agreed)
- [x] Add a `schema_migrations` tracking table (most tools do this automatically — confirm yours does)

---

## 2.2 ENUM Type Definitions

Create these first — tables reference them.

```sql
CREATE TYPE account_status_enum AS ENUM ('active', 'disabled', 'locked');

CREATE TYPE manuscript_status_enum AS ENUM (
  'draft', 'submitted', 'under_moderation', 'desk_rejected',
  'editor_assignment', 'under_review', 'revision_requested',
  'resubmitted', 'accepted', 'rejected', 'withdrawn', 'published'
);

CREATE TYPE moderator_decision_enum AS ENUM ('proceed', 'return', 'reject');

CREATE TYPE editorial_decision_enum AS ENUM (
  'accept', 'reject', 'minor_revision', 'major_revision', 'desk_reject'
);

CREATE TYPE review_recommendation_enum AS ENUM (
  'accept', 'minor_revision', 'major_revision', 'reject'
);

CREATE TYPE assignment_status_enum AS ENUM (
  'invited', 'accepted', 'declined', 'completed', 'expired', 'revoked'
);

CREATE TYPE invitation_response_enum AS ENUM ('accepted', 'declined', 'expired');

CREATE TYPE withdrawal_status_enum AS ENUM ('requested', 'approved', 'rejected');

CREATE TYPE extension_status_enum AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE suggestion_type_enum AS ENUM ('suggest', 'oppose');

CREATE TYPE revision_response_status_enum AS ENUM ('draft', 'submitted', 'reviewed');
```

**Todos:**
- [x] Write migration `0000_create_enums.sql` with all ENUM types above
- [x] Review the `manuscript_status_enum` value list against your actual workflow language before locking it — this one is the most expensive to change later (adding a value is easy in Postgres; removing/renaming one used in existing rows is not)
- [ ] Document each enum's meaning in a `docs/enums.md` reference file for the whole team

---

## 2.3 Module 1 — Authentication & User Management (7 tables)

### `roles`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(50) | UNIQUE | admin, author, moderator, editor, reviewer |
| description | TEXT | | |
| is_active | BOOLEAN | | |
| created_at / updated_at | TIMESTAMPTZ | | |

### `users`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| role_id | UUID | FK → roles.id | |
| email | CITEXT | UNIQUE | |
| first_name, last_name, display_name | VARCHAR | | |
| phone, institution, department, country, bio, orcid_id | VARCHAR/TEXT | NULL | profile-completion fields |
| profile_image_url | TEXT | NULL | |
| is_email_verified | BOOLEAN | | |
| account_status | account_status_enum | | replaces old `is_disabled` boolean |
| created_at / updated_at | TIMESTAMPTZ | | |

### `user_identities`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id | |
| provider | VARCHAR(30) | | 'google' |
| provider_subject | VARCHAR(255) | UNIQUE | match on this, never email |
| provider_email | CITEXT | | |
| provider_name | VARCHAR(255) | NULL | |
| access_token_encrypted, refresh_token_encrypted | TEXT | NULL | encrypt at rest if stored at all |
| token_expires_at | TIMESTAMPTZ | NULL | |
| created_at / updated_at | TIMESTAMPTZ | | |

### `user_sessions`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id | |
| session_token_hash | CHAR(64) | UNIQUE | never store raw token |
| ip_address | INET | | |
| user_agent | TEXT | NULL | |
| created_at, last_seen_at, expires_at | TIMESTAMPTZ | | |
| revoked_at | TIMESTAMPTZ | NULL | |

### `user_status_history`
id, user_id (FK), old_status/new_status (account_status_enum), changed_by (FK users), reason, created_at

### `user_role_history`
id, user_id (FK), old_role_id/new_role_id (FK roles), changed_by (FK users), reason, created_at

### `user_activity`
id, user_id (FK), activity_type, entity_type, entity_id, metadata (JSONB), ip_address, created_at

**Todos:**
- [x] Migration `0001_create_roles.sql` + seed 5 roles
- [x] Migration `0002_create_users.sql`
- [x] Migration `0003_create_user_identities.sql`
- [x] Migration `0004_create_user_sessions.sql`
- [x] Migration `0005_create_user_status_history.sql`
- [x] Migration `0006_create_user_role_history.sql`
- [x] Migration `0007_create_user_activity.sql`
- [x] Add index on `users.email`, `user_identities.provider_subject`, `user_sessions.session_token_hash`

---

## 2.4 Module 2 — Journal Management (3 tables)

### `journals`
id, name, short_name, issn_print, issn_online, description, publisher_name, contact_email, website_url, logo_url, is_active, created_at, updated_at

### `submission_guidelines`
id, journal_id (FK), version, title, content, is_published, published_at, created_by (FK users), created_at, updated_at

### `email_templates`
id, journal_id (FK), template_key, subject, body_html, body_text, variables_schema (JSONB), is_active, updated_by (FK users), created_at, updated_at

**Todos:**
- [x] Migration `0008_create_journals.sql` + seed one journal record
- [x] Migration `0009_create_submission_guidelines.sql`
- [x] Migration `0010_create_email_templates.sql` + seed placeholder templates for key events (submission received, desk rejection, decision issued — full trigger map comes in Phase 7)

---

## 2.5 Module 3 — Category & Expertise Matching (2 tables — new this design)

### `categories`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| name | VARCHAR(150) | UNIQUE | e.g. "Machine Learning", "Clinical Oncology" |
| description | TEXT | NULL | |
| is_active | BOOLEAN | | |
| created_at / updated_at | TIMESTAMPTZ | | |

### `reviewer_expertise`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| reviewer_id | UUID | FK → users.id | must be role = reviewer (enforce in app logic, not DB) |
| category_id | UUID | FK → categories.id | |
| proficiency_level | SMALLINT | NULL | optional 1–5 scale |
| created_at | TIMESTAMPTZ | | |

- [ ] Add a UNIQUE constraint on `(reviewer_id, category_id)` — a reviewer shouldn't have duplicate expertise rows for the same category

**Todos:**
- [x] Migration `0011_create_categories.sql` + seed initial category list from your journal's actual scope
- [x] Migration `0012_create_reviewer_expertise.sql`
- [x] Build the reusable query function now (even as a stub): "given category_id, return eligible reviewers ordered by proficiency" — Phase 6 (Editor module) will call this directly

---

## 2.6 Module 4 — Manuscript (5 tables)

### `manuscripts`
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| journal_id | UUID | FK → journals.id | |
| category_id | UUID | FK → categories.id | replaces free-text `article_type` |
| submission_number | VARCHAR(50) | UNIQUE | |
| title, abstract | TEXT | | |
| keywords | TEXT[] | NULL | |
| corresponding_author_id | UUID | FK → users.id | |
| submitted_by | UUID | FK → users.id | |
| current_version_id | UUID | FK → manuscript_versions.id, NULL | **circular dependency — see note below** |
| current_status | manuscript_status_enum | | |
| submitted_at | TIMESTAMPTZ | NULL | |
| created_at / updated_at | TIMESTAMPTZ | | |

> **⚠️ Circular FK note:** `manuscripts.current_version_id` points to `manuscript_versions`, but `manuscript_versions.manuscript_id` points back to `manuscripts`. Resolve by: (1) create `manuscripts` first with `current_version_id` nullable and **no FK constraint yet**, (2) create `manuscript_versions`, (3) run an `ALTER TABLE manuscripts ADD CONSTRAINT ... FOREIGN KEY (current_version_id) REFERENCES manuscript_versions(id)` migration afterward.

### `manuscript_authors`
id, manuscript_id (FK), user_id (FK, NULL), author_order, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding, contribution_roles (TEXT[]), created_at

### `manuscript_versions`
id, manuscript_id (FK), version_number, version_type, title, abstract, submitted_by (FK users), submitted_at, is_current, notes, created_at

### `manuscript_files` — **updated for Cloudinary**
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| manuscript_id | UUID | FK → manuscripts.id | |
| version_id | UUID | FK → manuscript_versions.id | |
| file_type | VARCHAR(50) | | manuscript, supplementary, response_letter, etc. |
| original_filename | TEXT | | client-supplied, display only — never used as storage key |
| storage_provider | VARCHAR(30) | | 'cloudinary' |
| public_id | TEXT | UNIQUE | Cloudinary's identifier — replaces `object_key` |
| resource_type | VARCHAR(20) | | **must be `raw` for PDF/DOCX**, not `image`/`video` |
| format | VARCHAR(20) | NULL | pdf, docx, etc. (Cloudinary-reported) |
| mime_type | VARCHAR(150) | | |
| file_size_bytes | BIGINT | | Cloudinary calls this `bytes` — map on ingest |
| sha256_checksum | CHAR(64) | | compute server-side if Cloudinary doesn't provide it |
| uploaded_by | UUID | FK → users.id | |
| uploaded_at | TIMESTAMPTZ | | |
| is_accessible | BOOLEAN | | workflow-permission gate |

### `manuscript_status_history`
id, manuscript_id (FK), from_status/to_status (manuscript_status_enum, from nullable), changed_by (FK users, NULL for system), reason, created_at

**Todos:**
- [x] Migration `0013_create_manuscripts.sql` (current_version_id nullable, no FK yet)
- [x] Migration `0014_create_manuscript_authors.sql`
- [x] Migration `0015_create_manuscript_versions.sql`
- [x] Migration `0016_add_manuscripts_current_version_fk.sql` (the deferred FK from above)
- [x] Migration `0017_create_manuscript_files.sql` with Cloudinary columns
- [x] Migration `0018_create_manuscript_status_history.sql`
- [x] Index `manuscripts.submission_number`, `manuscripts.current_status`, `manuscript_files.public_id`

---

## 2.7 Module 5 — Moderator (2 tables)

### `moderator_checks`
id, manuscript_id (FK), moderator_id (FK users), checklist (JSONB), plagiarism_score (NUMERIC 5,2, NULL), ethics_check_status (VARCHAR, NULL), files_valid (BOOLEAN, NULL), decision (moderator_decision_enum), notes, checked_at

### `moderator_decisions`
id, manuscript_id (FK), moderator_id (FK users), decision (moderator_decision_enum), reason, notes_to_author (NULL), created_at

**Todos:**
- [x] Migration `0019_create_moderator_checks.sql`
- [x] Migration `0020_create_moderator_decisions.sql`
- [x] Decide the exact JSON shape for `checklist` now (e.g. `{ "scope": true, "formatting": true, "completeness": true, "ethics": true, "anonymization": true }`) so frontend and backend agree on the contract before Phase 6

---

## 2.8 Module 6 — Editor (2 tables)

### `editorial_assignments`
id, manuscript_id (FK), editor_id (FK users), assigned_by (FK users), assignment_status (assignment_status_enum), assigned_at, accepted_at (NULL), completed_at (NULL), notes

### `editorial_decisions`
id, manuscript_id (FK), editor_id (FK users), decision (editorial_decision_enum), decision_round, comments_to_author (NULL), internal_notes (NULL), created_at

**Todos:**
- [x] Migration `0021_create_editorial_assignments.sql`
- [x] Migration `0022_create_editorial_decisions.sql`

---

## 2.9 Module 7 — Reviewer (5 tables — `reviewer_invitations` reshaped)

### `reviewer_assignments`
id, manuscript_id (FK), reviewer_id (FK users), editor_id (FK users), round_number, assignment_status (assignment_status_enum), assigned_at, accepted_at (NULL), due_at (NULL), completed_at (NULL)

### `reviewer_invitations` — **reshaped this design cycle**
| Column | Type | Key | Notes |
|---|---|---|---|
| id | UUID | PK | |
| manuscript_id | UUID | FK → manuscripts.id | |
| reviewer_id | UUID | FK → users.id | |
| assignment_id | UUID | FK → reviewer_assignments.id, NULL | |
| token_hash | CHAR(64) | UNIQUE | |
| sent_at, expires_at | TIMESTAMPTZ | | |
| responded_at | TIMESTAMPTZ | NULL | |
| response | invitation_response_enum | NULL | |
| suggested_reviewer_name | VARCHAR(255) | NULL | **new** — only populated on decline-with-suggestion |
| suggested_reviewer_email | CITEXT | NULL | **new** |
| suggested_reviewer_institution | VARCHAR(255) | NULL | **new** |
| suggestion_reason | TEXT | NULL | **new** |

### `reviewer_suggestions` (retained — for editor/author-initiated suggestions, separate from a decline)
id, manuscript_id (FK), suggested_by (FK users), reviewer_name, reviewer_email (NULL), institution (NULL), orcid_id (NULL), suggestion_type (suggestion_type_enum), reason (NULL), created_at

### `review_extension_requests`
id, assignment_id (FK reviewer_assignments), reviewer_id (FK users), requested_until, reason (NULL), status (extension_status_enum), decided_by (FK users, NULL), decided_at (NULL), created_at

### `reviews`
id, assignment_id (FK reviewer_assignments), reviewer_id (FK users), manuscript_id (FK), round_number, recommendation (review_recommendation_enum), public_comments (NULL), confidential_comments (NULL), score (JSONB, NULL), submitted_at, is_complete

**Todos:**
- [x] Migration `0023_create_reviewer_assignments.sql`
- [x] Migration `0024_create_reviewer_invitations.sql` (with the 4 new suggestion columns)
- [x] Migration `0025_create_reviewer_suggestions.sql`
- [x] Migration `0026_create_review_extension_requests.sql`
- [x] Migration `0027_create_reviews.sql`
- [x] **Write and test the reviewer-cap trigger now** (see section 2.11) — this module is where it lives

---

## 2.10 Module 8 — Revision & Withdrawal (4 tables)

### `revision_requests`
id, manuscript_id (FK), editorial_decision_id (FK editorial_decisions, NULL), round_number, request_type, instructions, due_at (NULL), requested_by (FK users), created_at

### `revision_responses`
id, revision_request_id (FK), manuscript_version_id (FK manuscript_versions), submitted_by (FK users), cover_letter (NULL), response_summary (NULL), submitted_at, status (revision_response_status_enum)

### `reviewer_comment_responses`
id, revision_response_id (FK), review_id (FK reviews), comment_reference (NULL), author_response, change_reference (NULL), created_at

### `manuscript_withdrawals`
id, manuscript_id (FK), requested_by (FK users), reason, status (withdrawal_status_enum), decided_by (FK users, NULL), decision_notes (NULL), requested_at, decided_at (NULL)

**Todos:**
- [x] Migration `0028_create_revision_requests.sql`
- [x] Migration `0029_create_revision_responses.sql`
- [x] Migration `0030_create_reviewer_comment_responses.sql`
- [x] Migration `0031_create_manuscript_withdrawals.sql`

---

## 2.11 Module 9 — System Logs (3 tables) + Reviewer-Cap Trigger

### `audit_logs`
id (BIGSERIAL), actor_user_id (FK users, NULL), action, entity_type (NULL), entity_id (NULL), old_values (JSONB, NULL), new_values (JSONB, NULL), ip_address (NULL), user_agent (NULL), created_at

### `security_logs`
id (BIGSERIAL), user_id (FK users, NULL), event_type, severity, ip_address (NULL), user_agent (NULL), details (JSONB, NULL), created_at

### `workflow_logs`
id (BIGSERIAL), manuscript_id (FK manuscripts, NULL), workflow_name, event_name, source, status, payload (JSONB, NULL), error_message (NULL), created_at

**Todos:**
- [x] Migration `0032_create_audit_logs.sql`
- [x] Migration `0033_create_security_logs.sql`
- [x] Migration `0034_create_workflow_logs.sql`

### Reviewer-cap trigger (the DB-enforced decision from design phase)

```sql
CREATE OR REPLACE FUNCTION check_reviewer_assignment_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM reviewer_assignments
  WHERE manuscript_id = NEW.manuscript_id
    AND round_number = NEW.round_number
    AND assignment_status IN ('invited', 'accepted')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'Cannot assign more than 2 active reviewers per manuscript round';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limit_reviewer_assignments
BEFORE INSERT OR UPDATE ON reviewer_assignments
FOR EACH ROW EXECUTE FUNCTION check_reviewer_assignment_limit();
```

**Todos:**
- [x] Migration `0035_create_reviewer_cap_trigger.sql` with the function + trigger above
- [x] Test: attempt to insert a 3rd active `reviewer_assignments` row for the same manuscript/round and confirm it raises an exception
- [x] Test: confirm inserting a 3rd row is allowed if one of the existing two is `declined` or `completed` (i.e. the trigger only counts `invited`/`accepted`)

---

## 2.12 Constraints, Indexes & Data Integrity

**Todos:**
- [x] Unique constraints: `users.email`, `user_identities.provider_subject`, `manuscripts.submission_number`, `manuscript_files.public_id`, `reviewer_expertise (reviewer_id, category_id)`
- [x] Foreign keys: verify every FK listed above is created with an explicit `ON DELETE` policy (recommendation: `RESTRICT` for core entities like `manuscripts`/`users`, `CASCADE` only for pure history/log children like `manuscript_status_history`)
- [x] Indexes on all FK columns (most ORMs do this automatically — verify, don't assume)
- [x] Additional indexes on frequently filtered columns: `manuscripts.current_status`, `users.role_id`, `reviewer_assignments.assignment_status`, `moderator_checks.decision`
- [x] `CHECK` constraint on `reviewer_expertise.proficiency_level` (e.g. between 1 and 5) if used
- [x] Add `updated_at` auto-touch trigger (generic, reusable across all tables with that column) so you don't rely on the app layer to remember it

---

## 2.13 Seed Data

- [x] Seed `roles`: admin, author, moderator, editor, reviewer
- [x] Seed one `journals` record with real journal metadata
- [x] Seed `categories` with your actual subject areas
- [x] Seed a placeholder `submission_guidelines` entry
- [x] Seed baseline `email_templates` rows (empty body is fine for now — content comes in Phase 7) for at least: submission_received, desk_rejected, reviewer_invited, decision_issued
- [x] Seed one Admin user manually (via direct insert or a one-time script) so there's a way into the system on first deploy — you cannot self-register as Admin through OAuth

---

## 2.14 Testing the Schema

- [x] Run all migrations up from empty database — confirm no errors
- [x] Run all migrations down — confirm clean rollback with no orphaned objects (types, triggers, functions)
- [x] Insert a full sample workflow manually via SQL (one manuscript → one moderator check → one editorial assignment → two reviewer assignments → two reviews → one editorial decision) to confirm every FK relationship actually holds together
- [x] Confirm the reviewer-cap trigger fires correctly (section 2.11 tests)
- [x] Confirm ENUM values reject invalid input (e.g. try inserting `current_status = 'bogus'`, expect failure)

---

## 2.15 Exit Criteria for Phase 2

You're ready for **Phase 3 — Authentication, Authorization & User Management** when:
- [x] All 33 tables exist via migration (not manual one-off SQL)
- [x] All ENUM types are created and in use
- [x] Reviewer-cap trigger is active and tested
- [x] Seed data is in place (roles, journal, categories, admin user, email template shells)
- [x] `manuscript_files` reflects Cloudinary fields, not R2
- [x] Full sample workflow insert test (2.14) passes end to end
