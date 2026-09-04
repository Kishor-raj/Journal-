# Journal Management System — Author Manuscript Upload & Submission Number Requirements

## Objective

Implement the following two improvements in the **Author → Manuscript Submission** workflow:

1. Allow an author to remove a mistakenly selected manuscript file before final submission.
2. Replace internal-looking draft IDs such as `#DRAFT-82949E28` with a clean, sequential submission number format such as `IJIDCR-26-0001`.

The implementation must preserve existing manuscript workflow behavior and must not break drafts, revisions, reviewer/editor workflows, or existing submissions.

---

# Phase 1 — Manuscript Upload Remove Button ✅ COMPLETED

## TODO

### Frontend

- [x] Locate the Author manuscript upload component/page where selected files are displayed before submission.
- [x] Add a clearly visible **Remove** / **Delete** button for every selected file.
- [x] The Remove button must be available before the manuscript is finally submitted.
- [x] Clicking **Remove** must remove the selected file from the UI state immediately.
- [x] If the application uploads files immediately when selected, the Remove action must also remove/cancel the corresponding uploaded temporary file from server/cloud storage.
- [x] If files are only uploaded during final submission, remove the file only from the client-side pending-file list.
- [x] Prevent removed files from being included in the final submission request.
- [x] Add a confirmation prompt only if needed by the existing UI pattern; do not make removal unnecessarily difficult.
- [x] After removal, update the displayed file count and validation state.
- [x] Ensure the author can select another/correct file after removing the wrong one.
- [x] Ensure the Remove button does not remove files belonging to already-finalized submissions or immutable manuscript versions.

### Backend / Storage

- [x] Identify whether manuscript files are stored immediately on selection or only after final submission.
- [x] If temporary uploads exist, introduce/verify a safe mechanism for deleting an uncommitted temporary file.
- [x] Ensure deletion is authorized: an author may remove only files belonging to their own draft/pending submission.
- [x] Do not allow deletion of files that are already part of a submitted/finalized manuscript version unless the existing revision workflow explicitly permits it.
- [x] Clean up orphaned temporary files where applicable.

### Validation

- [x] Test selecting the wrong file → Remove → select the correct file → submit.
- [x] Test selecting multiple files and removing only one.
- [x] Test page refresh behavior according to the application's current upload model.
- [x] Verify removed files are not sent to the backend or stored as active manuscript files.
- [x] Verify unauthorized users cannot remove another author's files.

---

# Phase 2 — Submission Number Design & Generation ✅ COMPLETED

## Required Format

Replace IDs displayed to authors/editors such as:

`#DRAFT-82949E28`

with a submission number such as:

`IJIDCR-26-0001`

### Format Definition

`IJIDCR-YY-NNNN`

Where:

- [x] `IJIDCR` = fixed journal prefix.
- [x] `YY` = two-digit year of the submission/assigned publication workflow year.
  - Example: 2026 → `26`
- [x] `NNNN` = sequential 4-digit number.
  - Example: `0001`, `0002`, `0003`, ...
- [x] The sequence must start at `0001` for the first submission in a year.
- [x] The number must be unique.
- [x] The submission number must be stable once assigned; it must not change when the manuscript status changes.
- [x] A draft ID must not be reused as the visible submission number.

### Recommended Examples

- `IJIDCR-26-0001`
- `IJIDCR-26-0002`
- `IJIDCR-26-0003`
- `IJIDCR-27-0001` for the first qualifying submission in 2027

---

# Phase 3 — Database, Backend & Existing Data Handling ✅ COMPLETED

## Database

- [x] Inspect the current `manuscripts` table and identify the existing primary key / UUID / draft identifier.
- [x] **Do not replace the internal primary key solely to implement this display format.**
- [x] Add a dedicated field for the human-readable submission number, for example:
  - `submission_no`
  - type: `VARCHAR(20)` (or another appropriate length)
  - unique constraint/index
  - nullable only where the application intentionally supports pre-numbered drafts.
- [x] Preserve the existing internal manuscript ID for relationships and foreign keys.
- [x] Add the required database constraint so duplicate submission numbers cannot be created.

## Number Generation

- [x] Implement server-side generation; do not generate the official submission number only in the frontend.
- [x] Make generation concurrency-safe so two authors submitting at the same time cannot receive the same number.
- [x] Use a transaction/locking/sequence strategy appropriate for PostgreSQL.
- [x] Scope the sequence by year if the required format resets to `0001` each year.
- [x] Recommended logic:
  1. Determine the submission year using the server/database timestamp.
  2. Obtain the next sequence number for that year using a concurrency-safe mechanism.
  3. Format it as `IJIDCR-YY-NNNN`.
  4. Store it permanently on the manuscript record.
  5. Enforce uniqueness at the database level.

## Important Draft Behavior

- [x] Decide/implement the exact point when a number is assigned:
  - Preferred: assign the official submission number when the author performs the **actual/final submission**, not when a manuscript is merely saved as a draft.
- [x] Drafts may continue using the internal manuscript ID/status until final submission.
- [x] A draft that is abandoned should not consume an official submission number unless the existing business rules require otherwise.
- [x] Once an official submission number is assigned, keep it unchanged through:
  - Moderator checks
  - Editor assignment
  - Peer review
  - Revisions
  - Decisions
  - Acceptance/rejection
  - Withdrawal

## Existing `#DRAFT-*` Records

- [x] Identify all existing manuscripts currently using/displaying `#DRAFT-*`.
- [x] Do not blindly overwrite internal database IDs.
- [x] Define a migration/backfill strategy for existing records.
- [x] Determine whether existing **finalized/submitted** manuscripts should receive permanent submission numbers immediately.
- [x] Preserve traceability from any old draft identifier to the new submission number where required for audit/history.
- [x] Do not create duplicate submission numbers during migration.
- [x] Document the migration behavior in the implementation notes.

---

# Phase 4 — UI Replacement, API Integration & Testing ✅ COMPLETED

## Frontend Display

- [x] Replace user-facing `#DRAFT-*` display with `submission_no` wherever the manuscript is an official submission.
- [x] Update all relevant Author views/cards/pages.
- [x] Update Editor views.
- [x] Update Moderator views.
- [x] Update Reviewer-related views where manuscript/submission numbers are displayed.
- [x] Update Admin views and manuscript lists.
- [x] Update manuscript details pages.
- [x] Update notifications/emails/templates if they currently expose the draft ID.
- [x] Update PDF/download/reference areas only where the old ID is intended to be user-facing.
- [x] Keep the internal database ID available to backend logic/API relations where necessary.

## API

- [x] Update manuscript creation/submission responses to include `submission_no` when assigned.
- [x] Update manuscript list/detail API responses where the UI expects a displayable submission number.
- [x] Ensure the API does not accidentally expose internal IDs as the primary visible submission identifier.
- [x] Verify old clients/pages do not break if `submission_no` is initially null for drafts.

## Tests

- [x] Unit test submission number generation.
- [x] Test first submission in a year → `IJIDCR-26-0001`.
- [x] Test subsequent submissions increment correctly.
- [x] Test year rollover → first submission in the new year becomes `IJIDCR-27-0001`.
- [x] Test concurrent submissions and verify no duplicate numbers.
- [x] Test uniqueness constraint.
- [x] Test draft saved without final submission does not incorrectly consume a number, according to the chosen business rule.
- [x] Test submission number remains unchanged after status changes/revisions.
- [x] Test existing migrated records.
- [x] Test file remove flow.
- [x] Test removed files are not submitted/stored as active manuscript files.
- [x] Run existing regression tests for manuscript creation, upload, submission, revision, review, and decision workflows.

---

# Acceptance Criteria

## File Removal

- [ ] Author can select a manuscript file.
- [ ] Author sees a **Remove** button next to the selected file.
- [ ] Clicking Remove removes the file from the pending submission.
- [ ] Author can select a replacement file.
- [ ] Removed files are not included in the final submission.
- [ ] File deletion is properly authorized and does not affect other users.

## Submission Number

- [ ] New official submissions display numbers such as `IJIDCR-26-0001`.
- [ ] `#DRAFT-XXXXXXXX` is no longer used as the primary user-facing identifier for official submissions.
- [ ] Numbering is sequential and concurrency-safe.
- [ ] Numbers are unique.
- [ ] The number remains stable for the lifetime of the manuscript submission.
- [ ] Internal primary keys/UUIDs remain unchanged unless there is a separate architectural reason to change them.
- [ ] All relevant dashboards, manuscript pages, APIs, and emails use the new submission number where appropriate.

# Agent Implementation Notes

- [ ] Inspect the existing project structure and reuse existing upload, storage, manuscript, authentication, and transaction patterns instead of introducing duplicate infrastructure.
- [ ] Prefer the smallest safe schema/API/UI changes needed to satisfy these requirements.
- [ ] Do not change unrelated journal workflow behavior.
- [ ] Before modifying database migrations, inspect the current schema and migration strategy.
- [ ] Before modifying file deletion behavior, inspect whether uploads are local, object storage, or another provider.
- [ ] After implementation, provide a concise summary of changed files, migrations, API changes, and tests performed.
