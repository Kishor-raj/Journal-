# Journal Management — Phase Plan and Work Tracker

Updated: 2026-09-10  
Current phase: Phase 1 — Profile data and author lookup  
Status: Audit complete; implementation backlog ready

## Tracking rules

- `[x]` Completed and verified from the repository.
- `[ ]` Pending implementation or runtime verification.
- `~~text~~` Explicitly out of scope, not required, or superseded.
- A task is checked only when the code and its verification are complete.

## Product goal

Support this flow without duplicating profile data:

```text
Author profile → New Submission → Add registered co-author(s)
                              → Save manuscript-author relationships
Published article → Authors link → Article-specific author profiles
Certificate service logic only; no new certificate UI
```

## Repository baseline audit — Phase 0

### Architecture

- [x] Frontend identified: React + Vite in `client/`.
- [x] Backend identified: Express in `server/`.
- [x] Database identified: PostgreSQL with SQL migrations in `server/src/db/migrations/`.
- [x] Authentication/current-user flow identified: `AuthContext`, `/api/auth/me`, and `authenticate` middleware.
- [x] Submission UI identified: `client/src/features/author/SubmissionWizard.jsx`.
- [x] Submission API identified: `server/src/modules/manuscripts/`.
- [x] Profile API identified: `server/src/modules/users/users.routes.js` and `client/src/services/userService.js`.
- [x] Published-article API identified: `server/src/modules/public/public.routes.js` and `public.service.js`.
- [x] Published-article UI identified: `client/src/features/public/CurrentIssue.jsx` and `Home.jsx`.
- [x] Article-author relationship identified: `manuscript_authors`.
- [x] Certificate logic identified: `publication.service.js`, `certificate.renderer.js`, `certificate.storage.js`, and publication migrations.

### Existing capabilities

- [x] New drafts automatically insert the authenticated user as the primary/corresponding author.
- [x] Drafts load persisted authors through `GET /api/manuscripts/:id`.
- [x] Authors can currently be added by email through the draft-author endpoint.
- [x] Author order and corresponding-author state are stored.
- [x] Final submission uses a database transaction and rolls back on failure.
- [x] Published article queries already return an ordered author list.
- [x] Certificate generation is already backend/service based.
- [x] No new certificate UI will be added for this work.

### Known gaps confirmed by audit

- [x] Protected profile lookup is available at `GET /api/users/search`.
- [x] `college`, `state`, and `course` fields are added through forward migration `0055_add_author_profile_fields.sql`.
- [x] The Authors step displays persisted author profile data and registered-user search results.
- [x] The Review step displays complete available author profiles.
- [x] Add-author validation now rejects unresolved, duplicate, self, and unauthorized additions server-side.
- [x] Published article cards expose an article-specific Authors action/details view.
- [x] Public author responses join the latest registered-user profile fields with snapshot fallback.

## Phase 1 — Profile data and lookup

### Profile source of truth

- [x] Reuse `users.first_name`, `users.last_name`, `users.email`, `users.institution`, `users.department`, `users.country`, and `users.orcid_id` where available.
- [x] Keep `manuscript_authors` as the manuscript relationship and historical snapshot.
- [x] Avoid copying unrelated profile tables or creating a duplicate user model.
- [x] Implement explicit Institute/College/State/Course profile fields.
- [x] Add genuinely missing profile columns with a forward migration.
- [x] Expose a protected, limited user search/profile endpoint for registered co-author selection.
- [x] Return only fields allowed for co-author selection; do not expose credentials or private security fields.

### Verification

- [x] Current-user profile endpoint exists.
- [x] Current-user profile returns every field required by the submission UI.
- [x] A registered co-author can be found by stable user ID or normalized email.
- [x] Missing optional fields render safely.

## Phase 2 — Main author in New Submission

- [x] Use the authenticated user ID when creating a draft.
- [x] Automatically create the primary author relationship on draft creation.
- [x] Load the persisted primary-author row into the Authors step before rendering.
- [x] Display first name, last name, full name, email, and available affiliation/profile fields.
- [x] Mark the primary/corresponding author from persisted relationship data.
- [x] Keep article fields separate from profile fields.
- [ ] Verify a page refresh cannot display another user’s profile.

## Phase 3 — Add registered co-author(s)

- [x] Keep the existing Add Co-Author interaction in the submission wizard.
- [x] Keep removal available while the manuscript is still a draft.
- [x] Preserve author order through `author_order`.
- [x] Replace email-only/manual fallback with registered-user search or selection.
- [x] Fetch the selected user profile from the backend before display.
- [x] Reject a co-author whose user ID equals the primary author’s ID.
- [x] Reject duplicate co-author relationships on the backend.
- [x] Support multiple registered co-authors.
- [x] Remove the current temporary-author fallback when the API call fails.

### Verification

- [ ] Main author and co-authors render as separate, labeled profile cards.
- [ ] Duplicate and self-author attempts show useful errors.
- [ ] Removing a co-author updates both the UI and draft relationship.
- [ ] Multiple co-authors retain their input order.

## Phase 4 — Persist manuscript-author relationships

- [x] Use `manuscript_authors` for article-author relationships.
- [x] Store `user_id` when a registered user is resolved.
- [x] Store primary/corresponding status.
- [x] Store author order.
- [x] Allow multiple relationship rows per manuscript.
- [x] Preserve a manuscript author snapshot for historical publication/certificate output.
- [x] Enforce duplicate relationship protection at the database/service boundary.
- [x] Ensure profile joins use `user_id` as the authoritative current-profile link.

## Phase 5 — Full submission and validation

- [x] Final submission is transaction-based.
- [x] A manuscript must have at least one author before submission.
- [x] The primary author is restored if a legacy draft has no author row.
- [x] Submission status/history/activity are written in the same transaction.
- [x] Validate every author user ID before final submission.
- [x] Reject unresolved co-author emails instead of silently creating incomplete rows.
- [x] Reject duplicate authors and self-coauthoring server-side.
- [x] Verify failed relationship validation leaves no partial submission through the existing transaction.
- [x] Return clear validation errors to the wizard.

## Phase 6 — Review page author details

- [x] Review component located: `StepReview` in `SubmissionWizard.jsx`.
- [x] Review data is scoped to the current manuscript object.
- [x] Enrich manuscript-author responses from the stored user profile.
- [x] Display first name and last name.
- [x] Display full name.
- [x] Display email.
- [x] Display institution/available affiliation fields.
- [x] Display requested College/State/Course fields.
- [x] Display primary/corresponding status.
- [x] Preserve author order.
- [x] Handle missing optional fields without crashing.
- [ ] Verify the final Submit action still works after the review changes.

## Phase 7 — Published article Authors action

- [x] Published articles are restricted to `current_status = 'published'`.
- [x] Existing publication responses include authors in database order.
- [x] Add a small text/link-style Authors action to every published article.
- [x] Pass the current article ID when the action is activated.
- [x] Add an article-specific author-details response and detail panel.
- [x] Return only authors belonging to that article.
- [x] Preserve primary author/co-author roles and author order.
- [x] Never reuse author state from another article.
- [x] Keep the existing article layout and visual style.

## Phase 8 — Published author profile details

- [x] Join `manuscript_authors.user_id` to the latest safe profile fields.
- [x] Fall back to the manuscript snapshot where the user is unavailable.
- [x] Return first name, last name, full name, email, and available affiliation fields.
- [x] Return corresponding/primary status and author order.
- [x] Safely represent missing optional fields.
- [ ] Verify Article A cannot display Article B’s authors.
- [ ] Verify both Home and Current Issue use the correct article ID.

## Phase 9 — Certificate-generation logic only

- [x] Certificate number generation exists in `publication.service.js`.
- [x] Certificate rows are linked to manuscript authors.
- [x] Certificate generation supports one certificate per manuscript author.
- [x] Duplicate certificate rows are protected by a unique constraint.
- [x] Certificate profile-name resolution has snapshot/profile fallbacks.
- [x] Certificate logic is independent from the public Authors UI.
- [x] No new certificate button/page/card/application UI will be added.
- [x] Re-run certificate service tests after author/profile changes.
- [ ] Confirm existing certificate UI is unchanged and outside this feature scope.

## Phase 10 — Security and API validation

- [x] Protected manuscript routes use authentication middleware.
- [x] Manuscript access checks include submitter/author relationship access.
- [x] Draft-only author modification rules exist.
- [x] Final submission verifies the authenticated submitter.
- [x] Validate co-author existence and account status server-side.
- [x] Prevent profile spoofing by ignoring client-supplied profile values for registered users.
- [x] Prevent duplicate and self relationships server-side.
- [ ] Add focused tests for unauthorized, invalid, duplicate, and self-author requests.

## Phase 11 — Automated and end-to-end verification

- [x] Run client lint/build.
- [x] Run server lint.
- [x] Run targeted server tests (14 passed).
- [x] Run the complete server test suite without the environment-specific listener failure.
- [ ] Test primary-author-only submission.
- [ ] Test one registered co-author.
- [ ] Test multiple registered co-authors.
- [ ] Test duplicate co-author rejection.
- [ ] Test self-coauthor rejection.
- [ ] Test review-page author details after refresh.
- [ ] Test two published articles for author isolation.
- [x] Test certificate generation regression.

## Phase 12 — Regression verification

- [ ] Login and logout.
- [ ] Registration/profile completion.
- [ ] Draft creation and editing.
- [ ] File upload and removal.
- [ ] Manuscript submission and status history.
- [ ] Editorial/publication workflow.
- [ ] Current Issue/Home published article rendering.
- [ ] Existing admin, author, reviewer, moderator, and editor flows.
- [ ] Browser console and backend log review.
- [x] Database migration verification: migrations applied successfully to local PostgreSQL.

## Explicitly out of scope

- ~~Build a new certificate UI.~~ Certificate UI is not part of this change; existing certificate UI is only regression-tested.
- ~~Redesign the submission wizard.~~ Keep the current design and make only data/display changes needed for author profiles.
- ~~Create a second profile/user model.~~ Use the existing `users` record and `manuscript_authors.user_id` relationship.
- ~~Expose private authentication, credential, or security fields in public author responses.~~

## Current execution log

- [x] Phase 0 repository audit completed.
- [x] Existing implementation and known gaps recorded in this file.
- [x] Phase 1 implementation started.
- [ ] Phase 1 verification completed.
- [ ] Phases 2–12 completed and verified.

### Verification notes

- Client lint and production build pass with existing warnings.
- Server lint passes with existing certificate-renderer warnings.
- Targeted server tests pass: 14/14.
- Full server suite passes outside the sandbox: 9 test files and 76 tests passed.
- Live server health check passes: `GET /api/health` returned HTTP 200 on local port 3010.

## Definition of done

- [ ] Main author profile loads automatically from the authenticated user relationship.
- [ ] Registered co-author profiles can be selected, displayed, removed, and persisted.
- [ ] Review shows complete available author details in the correct order.
- [ ] Backend rejects invalid, duplicate, self, and unauthorized author relationships.
- [ ] Every published article has an article-specific Authors action/details view.
- [ ] Published author details never mix between articles.
- [ ] Existing certificate-generation logic remains correct without adding certificate UI.
- [ ] Lint, build, automated tests, and focused end-to-end checks pass.
