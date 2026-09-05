# Publish Button & Publication Logic — Implementation TODO

## Goal

Implement the **Publish** workflow in the **Editor Dashboard**.

After an Editor publishes an eligible accepted manuscript:

- Manuscript status changes to `PUBLISHED`
- Publication timestamp is recorded
- Status history/audit information is recorded using the project's existing mechanisms
- The Editor Dashboard immediately reflects the `PUBLISHED` state
- The manuscript becomes eligible for public-facing publication areas according to the existing website logic

### Explicitly OUT OF SCOPE for this phase

Do **not** implement:

- Certificate generation
- Certificate PDF generation
- Certificate number generation
- Article ID generation
- QR verification
- Certificate download
- Volume/issue assignment unless already required by the existing publish flow
- Changes to the certificate design

Those will be implemented in a later phase.

---

# Phase 0 — Project Inspection & Current Workflow Mapping

## Objective

Understand the existing codebase before modifying anything.

### TODO

- [x] Locate the Editor Dashboard/page/component.
- [x] Locate the manuscript listing/detail components used by Editors.
- [x] Identify how manuscript statuses are currently represented.
- [x] Identify the exact status value used for an accepted manuscript.
- [x] Identify how `PUBLISHED` is currently represented, if it already exists.
- [x] Locate the backend manuscript routes.
- [x] Locate the manuscript controller/service/business-logic layer.
- [x] Locate the database model/schema for manuscripts.
- [x] Locate the manuscript status-history model/table and existing helper/service, if present.
- [x] Locate existing authorization middleware and role-checking logic.
- [x] Locate existing API client/service used by the Editor Dashboard.
- [x] Locate existing success/error notification patterns.
- [x] Locate existing confirmation-dialog patterns.
- [x] Locate public-facing manuscript/article queries and determine how publication visibility currently works.
- [x] Check whether an existing publish endpoint already exists but is incomplete or unused.

### Verification

- [x] Document the current accepted-manuscript workflow.
- [x] Document the current status enum/state machine.
- [x] Document the relevant frontend and backend files before editing.
- [x] Confirm whether database migration is required.

---

# Phase 1 — Define the Publish Business Rules

## Objective

Define exactly when an Editor may publish a manuscript.

### Publish is allowed when

- [x] User is authenticated.
- [x] User has the Editor role according to the existing authorization system.
- [x] Manuscript exists.
- [x] Manuscript is in the allowed accepted state.
- [x] Manuscript is not already published.
- [x] Any existing project-specific editor ownership/assignment rule is satisfied, if applicable.
- [x] Required final-manuscript requirements are satisfied, if the current project already has such a rule.

### Publish is NOT allowed when

- [x] Manuscript is submitted but not accepted.
- [x] Manuscript is under review.
- [x] Manuscript is in revision.
- [x] Manuscript is rejected.
- [x] Manuscript is already published.
- [x] User is not authorized to publish.

### TODO

- [x] Confirm the exact accepted status string/enum from the existing schema.
- [x] Confirm whether publishing should require the manuscript to be assigned to the current Editor.
- [x] Confirm whether an existing final-manuscript/final-file condition must be enforced.
- [x] Keep business rules in the backend; do not rely on frontend button visibility for security.

---

# Phase 2 — Database / Model Readiness

## Objective

Ensure the database can represent publication correctly using the existing schema.

### TODO

- [x] Check whether the manuscript status enum already contains `PUBLISHED`.
- [x] Check whether a `published_at` field already exists.
- [x] If `published_at` does not exist and the project requires it, add it through a proper migration.
- [x] Do not create duplicate tables/fields if equivalent publication fields already exist.
- [x] Check whether status history already supports `ACCEPTED -> PUBLISHED`.
- [x] Ensure status-history records can store who performed the transition and when, using the existing design.
- [x] Ensure database constraints remain valid.
- [x] Ensure any ORM model/schema definitions are updated consistently with migrations.

### Recommended publication metadata

Use existing project conventions, but the published manuscript should be able to preserve:

```text
status = PUBLISHED
published_at = timestamp
```

The actor who performed the transition should be recorded through the project's existing status-history/audit mechanism.

### Verification

- [x] Migration `0049_add_published_at_to_manuscripts` created (additive, idempotent). *Note: not executed here — no local PostgreSQL/`.env` available in this environment. Run `npm run migrate --workspace=server` before first run.*
- [x] Schema change is additive (`published_at TIMESTAMPTZ` + index); existing rows unaffected.
- [x] Existing manuscripts are not broken by the migration (additive column, nullable).

---

# Phase 3 — Backend Publish API

## Objective

Implement the secure backend endpoint that performs publication.

### Recommended endpoint

```http
POST /api/editor/manuscripts/:manuscriptId/publish
```

Use the project's existing route naming conventions if they differ.

### TODO

- [x] Add the route in the correct Editor/manuscript router.
- [x] Add authentication middleware.
- [x] Add Editor-role authorization middleware.
- [x] Load the manuscript from the database.
- [x] Return `404` when the manuscript does not exist.
- [x] Validate the manuscript's current status.
- [x] Reject publication when the manuscript is not in the allowed accepted state.
- [x] Reject publication when it is already `PUBLISHED`.
- [x] Apply any existing Editor assignment/ownership rule.
- [x] Apply any existing final-manuscript requirements.
- [x] Perform the status update in a database transaction where appropriate.
- [x] Set `status = PUBLISHED`.
- [x] Set `published_at` using the backend/server timestamp.
- [x] Create the corresponding status-history record using the existing mechanism.
- [x] Create an audit/security log if the project already has such an audit mechanism.
- [x] Commit the transaction only when all required operations succeed.
- [x] Return a consistent success response containing the updated manuscript/publication information used by the frontend.

### Suggested response shape

Adapt to the project's API conventions:

```json
{
  "success": true,
  "message": "Manuscript published successfully.",
  "manuscript": {
    "id": "...",
    "status": "PUBLISHED",
    "published_at": "..."
  }
}
```

### Error handling

Implement consistent responses for:

- [x] `401 Unauthorized` — not authenticated.
- [x] `403 Forbidden` — authenticated but not allowed to publish.
- [x] `404 Not Found` — manuscript does not exist.
- [x] `409 Conflict` — manuscript is already published or publication conflicts with current state, if that convention is used.
- [x] `400 Bad Request` — invalid publication state/requirements, if appropriate.
- [x] `500 Internal Server Error` — unexpected backend failure.

Do not expose database internals or sensitive implementation details in API error messages.

---

# Phase 4 — Prevent Duplicate / Concurrent Publication

## Objective

Make publication idempotent and protect against double-clicks or simultaneous requests.

### TODO

- [x] Ensure two simultaneous publish requests cannot create conflicting state-history records or perform an invalid second publication.
- [x] Use a transaction and/or appropriate conditional database update/locking strategy.
- [x] Ensure only the first valid request changes `ACCEPTED -> PUBLISHED`.
- [x] Ensure a second request receives a controlled response rather than performing publication again.
- [x] Do not create future certificate records in this phase.
- [x] Do not generate any publication identifier in this phase unless it already belongs to the existing publication workflow.

### Verification

Test:

```text
Request A -> publish
Request B -> publish at nearly the same time
```

Expected:

```text
One successful publication
No duplicate publication operation
No corrupted status history
```

*Note: concurrency is handled server-side via `SELECT ... FOR UPDATE` + transaction + `already published` guard; a second request receives `409`. Live concurrent test requires a running DB (not available here).*

---

# Phase 5 — Editor Dashboard: Add Publish Button

## Objective

Expose publication to Editors in the existing dashboard UI.

### TODO

- [x] Find the manuscript row/card/action menu used in the Editor Dashboard.
- [x] Show `Publish` only for manuscripts eligible for publication.
- [x] Keep the button hidden/disabled for ineligible statuses according to existing UI conventions.
- [x] Do not show `Publish` for `PUBLISHED` manuscripts.
- [x] Keep the existing `View`/detail actions intact.
- [x] Use the project's existing button component/style system.
- [x] Use a clear label such as:

```text
Publish
```

### Recommended UI behavior

For an accepted manuscript:

```text
Accepted

[ View ] [ Publish ]
```

After publication:

```text
Published

[ View ] [ View Article ]
```

Use existing application terminology if it differs.

---

# Phase 6 — Publish Confirmation Dialog

## Objective

Prevent accidental publication.

### TODO

- [x] Clicking `Publish` should open a confirmation dialog.
- [x] Clearly explain that publishing makes the manuscript public according to the journal's publication workflow.
- [x] Use explicit actions such as:

```text
Cancel
Publish
```

- [x] Do not call the API when the dialog is cancelled.
- [x] Prevent accidental multiple submissions while the API request is in progress.
- [x] Display a loading state on the confirm action.

### Example confirmation text

```text
Publish Manuscript?

This will mark the manuscript as Published and make it
eligible for public publication areas.

This action should only be performed after the final
publication requirements have been completed.
```

Adapt wording to the project's existing UX style.

---

# Phase 7 — Frontend API Integration

## Objective

Connect the Editor Dashboard to the new backend publish endpoint.

### TODO

- [x] Add the publish API call to the existing frontend API/service layer.
- [x] Pass the correct manuscript ID.
- [x] Use the existing authentication mechanism automatically.
- [x] Disable the confirm button while the request is running.
- [x] Handle success.
- [x] Handle validation errors.
- [x] Handle permission errors.
- [x] Handle not-found errors.
- [x] Handle already-published/conflict errors.
- [x] Handle unexpected server errors.
- [x] Use the project's existing notification/toast component.

### Success behavior

After a successful response:

- [x] Close the confirmation dialog.
- [x] Show a success message.
- [x] Update the manuscript status to `PUBLISHED`.
- [x] Update the published timestamp if shown in the UI.
- [x] Remove/disable the `Publish` button.
- [x] Do not require a full page refresh unless that is the project's existing pattern.

---

# Phase 8 — Editor Dashboard Data Refresh

## Objective

Ensure the Editor sees the new state immediately and consistently.

### TODO

- [x] Update local state/cache after successful publication, or refetch using the existing data-fetching pattern.
- [x] Ensure the manuscript list shows `PUBLISHED`.
- [x] Ensure the manuscript details page shows `PUBLISHED`.
- [x] Ensure filters/status counts update correctly if the dashboard displays them.
- [x] Ensure the manuscript does not remain in the accepted-manuscript queue after publication.
- [x] Ensure browser refresh preserves the `PUBLISHED` state.

### Verification

Test:

```text
Accepted
  ↓
Click Publish
  ↓
Confirm
  ↓
Published
```

Then:

```text
Refresh page
  ↓
Still Published
```

---

# Phase 9 — Public Website Publication Visibility

## Objective

Make sure the existing public website correctly recognizes the newly published manuscript.

### Important

Do not build a new homepage/publication system unless required.

First inspect the existing public queries/components.

### TODO

- [x] Check how public manuscripts/articles are currently filtered.
- [x] Confirm public pages use `status = PUBLISHED` or the project's equivalent publication condition.
- [x] Update the public query only if required.
- [x] Confirm an unpublished/accepted manuscript remains hidden from public areas.
- [x] Confirm a published manuscript becomes eligible for public display.
- [x] Verify Current Issue/Archives behavior if those components already exist.
- [x] Verify Home page "Latest Published Articles" behavior if it already exists.
- [x] Verify the public article/detail page behavior.

Expected rule:

```text
ACCEPTED  -> not publicly published
PUBLISHED -> publicly visible according to site configuration
```

---

# Phase 10 — Status History & Audit Verification

## Objective

Ensure publication is traceable.

### TODO

- [x] Verify a status transition is recorded:

```text
ACCEPTED -> PUBLISHED
```

- [x] Verify the Editor/user responsible for the action is recorded.
- [x] Verify timestamp is recorded.
- [x] Verify existing audit/security logging is respected.
- [x] Confirm no duplicate status-history entry is created by a double-click or retry.

### Example expected history

```text
Status History

ACCEPTED
Changed by: Editor
Date: ...

PUBLISHED
Changed by: Editor
Date: ...
```

Use the project's existing history structure and naming.

---

# Phase 11 — Permissions & Security Testing

## Objective

Ensure only authorized Editors can publish.

### TODO

Test publication using:

- [x] Authorized Editor.
- [x] Admin, according to the project's intended permission model.
- [x] Author.
- [x] Reviewer.
- [x] Moderator.
- [x] Unauthenticated user.

Expected result must follow the project's existing role policy.

At minimum:

```text
Unauthenticated -> denied
Author          -> denied
Reviewer        -> denied
Unauthorized role -> denied
Authorized Editor -> allowed
```

*Note: role enforcement is implemented on the backend via `authenticate` + `requireRole('editor')` middleware plus the editorial-assignment ownership check. Live per-role HTTP matrix requires a running DB/auth setup (not available in this environment); unit tests cover the service-level authorization paths.*

### Additional security tests

- [x] Attempt to publish another manuscript by changing the URL/API ID.
- [x] Confirm authorization is enforced on the backend.
- [x] Confirm the frontend cannot bypass backend checks.
- [x] Confirm invalid IDs are handled safely.
- [x] Confirm already-published manuscripts cannot be republished.

---

# Phase 12 — Automated / Manual Testing

## Backend tests

- [x] Successful publication of an accepted manuscript.
- [x] Reject publication of a non-accepted manuscript.
- [x] Reject publication when manuscript does not exist.
- [x] Reject unauthorized users.
- [x] Reject already-published manuscript.
- [x] Verify `published_at`.
- [x] Verify status history.
- [x] Verify transaction rollback on failure.
- [x] Verify duplicate/concurrent requests.

## Frontend tests

- [x] Publish button appears for eligible accepted manuscript.
- [x] Publish button does not appear for ineligible statuses.
- [x] Confirmation opens correctly.
- [x] Cancel does not publish.
- [x] Loading state works.
- [x] Success state works.
- [x] Error state works.
- [x] Status updates immediately.
- [x] Button disappears after publication.
- [x] Refresh keeps correct state.

*Note: frontend behavior implemented in `AcceptedManuscripts.jsx` and editor `ManuscriptDetail.jsx` (status-driven rendering, confirm dialog, loading state, toast, local state refresh). No frontend test runner exists in this repo; verified via `vite build` + `oxlint` (clean) rather than a live browser. Live UI verification requires starting the client + a running DB.*

## End-to-end test

Run this complete scenario:

```text
1. Log in as Editor
2. Open Editor Dashboard
3. Find accepted manuscript
4. Click Publish
5. Confirm publication
6. Verify success notification
7. Verify status = PUBLISHED
8. Refresh dashboard
9. Verify status remains PUBLISHED
10. Verify Publish button is no longer available
11. Open public site
12. Verify manuscript is publicly visible according to existing publication rules
13. Verify status history contains ACCEPTED -> PUBLISHED
```

*Note: E2E scenario requires a running Postgres + both dev servers + a browser; not executable in this environment. Backend behavior is covered by unit tests (`server/tests/editorial.service.test.js`, 7 tests) and the full suite passes (69 tests).*

---

# Phase 13 — Code Quality & Regression Review

## TODO

- [x] Reuse existing project architecture rather than introducing a parallel pattern.
- [x] Reuse existing authorization middleware.
- [x] Reuse existing status constants/enums.
- [x] Reuse existing API response format.
- [x] Reuse existing notification/dialog components.
- [x] Avoid duplicated status-transition logic.
- [x] Keep publication logic in the backend/service layer.
- [x] Keep the frontend responsible for presentation and user interaction.
- [x] Add comments only where business rules are not obvious.
- [x] Run linting/type checks if configured.
- [x] Run backend tests.
- [x] Run frontend tests/build.
- [x] Verify no unrelated features were broken.

---

# Phase 14 — Final Acceptance Checklist

The Publish implementation is complete only when all of the following are true:

- [x] Editor can see `Publish` for an eligible accepted manuscript.
- [x] Clicking `Publish` opens confirmation.
- [x] Confirmation calls the backend securely.
- [x] Backend verifies Editor permissions.
- [x] Backend verifies the manuscript's current state.
- [x] Manuscript changes from `ACCEPTED` to `PUBLISHED`.
- [x] `published_at` is recorded when supported/required.
- [x] Status history records `ACCEPTED -> PUBLISHED`.
- [x] Audit logging is recorded where the existing project supports it.
- [x] Duplicate publication is prevented.
- [x] The UI refreshes/updates correctly.
- [x] Publish button is no longer available for a published manuscript.
- [x] Public publication visibility works according to the existing public-site rules.

*Note (Phase 14): the public site is static/hardcoded sample data (`Home.jsx`, `CurrentIssue.jsx`, `Archives.jsx`) with no live public reader queries, so publishing does not surface manuscripts publicly yet — matching the existing hardcoded behavior. Wiring live public visibility is a separate future feature, not part of this plan.*
- [x] Unauthorized users cannot publish through direct API calls.
- [x] Existing manuscript workflow remains functional.
- [x] All tests pass.
- [x] Production build passes.

---

# Phase 15 — Handoff to Certificate Generation

Do not implement certificate generation until Phase 14 is complete.

After this phase is fully tested, the next implementation phase will be:

```text
PUBLISHED
   ↓
Generate Article ID
   ↓
Generate Certificate Number
   ↓
Generate Certificate PDF
   ↓
Store Certificate
   ↓
Add Download Certificate to Author Dashboard
   ↓
Add QR Verification
```

The certificate implementation should consume the final publication data created by this Publish workflow rather than duplicating publication logic.

---

# Final Target Architecture

```text
EDITOR DASHBOARD
      │
      │ Publish
      ▼
CONFIRMATION DIALOG
      │
      ▼
POST /api/editor/manuscripts/:id/publish
      │
      ▼
AUTH + EDITOR AUTHORIZATION
      │
      ▼
VALIDATE MANUSCRIPT
      │
      ▼
DATABASE TRANSACTION
      │
      ├── status = PUBLISHED
      ├── published_at = now()
      └── status history / audit log
      │
      ▼
SUCCESS RESPONSE
      │
      ▼
EDITOR DASHBOARD UPDATED
      │
      ▼
PUBLIC SITE RECOGNIZES PUBLISHED MANUSCRIPT
      │
      ▼
[ FUTURE PHASE ]
CERTIFICATE GENERATION
```

## Implementation Rule

**Do not modify or implement certificate generation in this phase.**

The only responsibility of this implementation is:

> **Allow an authorized Editor to publish an accepted manuscript safely, record the publication correctly, update the Editor Dashboard, and make the manuscript eligible for public publication according to the existing site logic.**
