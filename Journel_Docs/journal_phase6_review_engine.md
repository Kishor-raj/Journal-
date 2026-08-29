# Phase 6 — Moderator, Editorial & Reviewer Workflow Engine

**Goal of this phase:** Build the three connected workflow stages that move a manuscript from `submitted` to a final editorial decision — Moderator screening, Editor assignment + reviewer matching, and Reviewer review submission — with the conflict-of-interest engine and double-blind access rules enforced at every handoff.

This is the largest phase because it's where every earlier design decision converges: the conflict engine from Phase 3, the category/expertise tables and reviewer-cap trigger from Phase 2, and the manuscript/file model from Phase 5 all get exercised together here.

By the end of this phase: a manuscript can move from `submitted` → moderator screening → editor assignment → two reviewer invitations → two completed reviews → an editorial decision, with conflicts blocked automatically and reviewers never seeing author-identifying data.

---

## 6.1 How the Three Roles Connect

```
submitted
   │
   ▼
[MODERATOR] screening queue
   │  desk_reject ──────────────► desk_rejected (terminal, author notified)
   │  proceed
   ▼
editor_assignment
   │
   ▼
[EDITOR] claims/assigned (conflict check)
   │
   ▼
[EDITOR] selects reviewers by category (conflict check, max 2 active — DB trigger)
   │
   ▼
[REVIEWER ×2] invited → accept/decline (decline may include a suggestion)
   │
   ▼
under_review
   │
   ▼
[REVIEWER ×2] submit reviews (recommendation + comments)
   │
   ▼
[EDITOR] views both reports → issues editorial decision
   │
   ├─ accept / reject ─────────► terminal (this round)
   └─ minor/major revision ────► Phase 7 revision cycle
```

---

## 6.2 Moderator Workflow

### Screening queue
- [x] `GET /api/moderation/queue` — manuscripts where `current_status = 'submitted'` (or `under_moderation` once claimed)
- [x] Optional: claim-based queue (moderator claims a manuscript to screen, preventing two moderators duplicating work) — add a lightweight `claimed_by`/`claimed_at` pair on `moderator_checks` if you want this; otherwise a shared open queue is fine for a small team

### Checklist UI
- [x] Renders the JSON contract agreed in Phase 2 (2.7): `{ scope, formatting, completeness, ethics, anonymization }` as toggles/checkboxes
- [x] **Anonymization check is the double-blind linchpin**: moderator explicitly confirms the manuscript file contains no author-identifying information before it can ever reach a reviewer — make this checkbox impossible to skip or bulk-approve
- [x] Plagiarism: score input (`NUMERIC(5,2)`) + evidence reference field (URL/attachment/notes) — never just a single free-text flag, per the original design decision
- [x] Notes field for internal moderator commentary

### Decision
- [x] **Proceed** → `moderator_decisions` (decision = 'proceed') + `manuscripts.current_status = 'editor_assignment'` + `manuscript_status_history` row
- [x] **Return** → sends back to author for correction before re-screening (status back to `draft` or a dedicated `returned_for_correction` — decide and add to the enum if needed) + author-facing notes required
- [x] **Reject (desk rejection)** → `manuscripts.current_status = 'desk_rejected'` (terminal) + `notes_to_author` required + author notification (stub for Phase 7)

**Todos:**
- [x] Backend: `modules/moderation/moderation.routes.js`, `.controller.js`, `.service.js`
- [x] Frontend: `features/moderator/ScreeningQueue.jsx`, `ChecklistForm.jsx`
- [x] Wrap the decision action in a transaction (checklist row + decision row + status update + history row, all or nothing)
- [x] Defense-in-depth: run `isConflicted(moderatorId, manuscriptId)` from Phase 3 before allowing a decision — a moderator should never rule on their own manuscript even though moderators aren't typically authors in practice

---

## 6.3 Editor Assignment & Reviewer Selection

### Editorial queue
- [x] `GET /api/editorial/queue` — manuscripts where `current_status = 'editor_assignment'`
- [x] Editor claims a manuscript: `POST /api/editorial/assignments` → creates `editorial_assignments` row

### Conflict check — **[BLOCKING]**
```js
// before creating editorial_assignments
if (await isConflicted(editorId, manuscriptId)) {
  throw new ConflictError('You are listed as an author on this manuscript and cannot handle it editorially.');
}
```
- [x] Run this check server-side before the assignment insert — never rely on the UI simply not showing the claim button to a conflicted editor (an editor could otherwise hit the API directly)
- [x] Log blocked attempts to `audit_logs` per the Phase 3 design

### Category-based reviewer matching
```sql
SELECT u.id, u.display_name, u.institution, re.proficiency_level
FROM reviewer_expertise re
JOIN users u ON u.id = re.reviewer_id
WHERE re.category_id = $1
  AND u.role_id = (SELECT id FROM roles WHERE name = 'reviewer')
  AND u.account_status = 'active'
ORDER BY re.proficiency_level DESC NULLS LAST;
```
- [x] Build `GET /api/editorial/manuscripts/:id/eligible-reviewers` using the manuscript's `category_id`
- [x] Filter out any reviewer where `isConflicted(reviewerId, manuscriptId)` is true — **exclude conflicted reviewers from the candidate list entirely**, don't just warn about them after selection
- [x] Surface reviewer institution/proficiency in the UI so the editor can make an informed pick, without exposing anything manuscript-identifying to the reviewer side of this relationship

### Sending invitations
- [x] `POST /api/editorial/manuscripts/:id/invite-reviewer` — creates `reviewer_invitations` row (+ a corresponding `reviewer_assignments` row with `assignment_status = 'invited'`)
- [x] **The reviewer-cap trigger from Phase 2 enforces the limit of 2 active assignments per round at the database level** — the API should catch this constraint violation and surface a clean error ("This manuscript already has 2 active reviewer assignments for this round"), not a raw DB error
- [x] Set `due_at` on `reviewer_assignments` based on journal-configured review period (define a default, e.g. 21 days, configurable per journal later)
- [x] Once both reviewer invitations are sent, `manuscripts.current_status = 'under_review'`

**Todos:**
- [x] Backend: `modules/editorial/editorial.routes.js`, `.controller.js`, `.service.js`
- [x] Frontend: `features/editor/EditorialQueue.jsx`, `ReviewerSelectionPanel.jsx`
- [x] Deadline monitoring dashboard: list of assignments approaching/past `due_at` (feeds the extension/reassignment flow in 6.5)

---

## 6.4 Reviewer Invitation Response & Decline-with-Suggestion

### Reviewer dashboard — Invitations
- [x] `GET /api/reviews/invitations` — scoped to the logged-in reviewer
- [x] Accept: `PATCH /api/reviews/invitations/:id` `{ response: 'accepted' }` → updates `reviewer_assignments.assignment_status = 'accepted'`, `accepted_at = now()`
- [x] Decline: `{ response: 'declined' }`, optionally with the merged suggestion fields from Phase 2's reshaped `reviewer_invitations` table:
  ```json
  {
    "response": "declined",
    "suggested_reviewer_name": "Dr. Jane Smith",
    "suggested_reviewer_email": "jane@example.edu",
    "suggested_reviewer_institution": "State University",
    "suggestion_reason": "Closer expertise match in this subfield"
  }
  ```
- [x] On decline, the corresponding `reviewer_assignments.assignment_status = 'declined'` — this frees a slot, so the DB trigger will now allow a new invitation for this round

### Editor handling a decline
- [x] Editor's queue surfaces declined invitations with any attached suggestion prominently
- [x] Editor can: invite the suggested reviewer directly (pre-fills the invite form with the suggested contact — note: if the suggested person has no `users` account yet, this may require an out-of-band invitation process; for v1, require the suggested reviewer to already exist in `users` with reviewer role, or flag as "manual follow-up needed" otherwise), or pick a different reviewer from the category-matched list
- [x] Re-run the conflict check and the reviewer-cap logic identically to the original invitation flow — this is not a special path, it's the same invitation function called again

**Todos:**
- [x] Backend: `modules/reviewer/reviewer.routes.js` — invitations sub-resource
- [x] Frontend: `features/reviewer/Invitations.jsx`
- [x] Frontend: surface declined-with-suggestion prominently in `features/editor/EditorialQueue.jsx`

---

## 6.5 Double-Blind Access Enforcement — **[BLOCKING — core guarantee]**

Per the design decision: single file per version, blinding enforced at the access layer (not a separately stored redacted copy). This means every response payload sent to a reviewer must be filtered.

### Build a role-aware manuscript view function
```js
// modules/manuscripts/manuscript.service.js (conceptual)
async function getManuscriptForRole(manuscriptId, userId, role) {
  const manuscript = await fetchManuscriptCore(manuscriptId);

  if (role === 'reviewer') {
    // Confirm active accepted assignment first (resource-level check, Phase 3)
    delete manuscript.corresponding_author_id;
    delete manuscript.submitted_by;
    manuscript.authors = undefined;       // never attach manuscript_authors to reviewer payloads
    manuscript.files = manuscript.files.map(f => ({
      id: f.id,
      file_type: f.file_type,
      format: f.format,
      // uploaded_by intentionally omitted
    }));
  }

  return manuscript;
}
```
- [x] Every API endpoint a reviewer can hit for manuscript data must route through this function (or an equivalent shared filter) — **never let a reviewer-facing route query `manuscripts`/`manuscript_authors` directly and forget to strip fields**
- [x] File download URLs: when generating a Cloudinary signed/delivery URL for a reviewer, confirm the response to the client contains no metadata beyond what's needed to render/download the file (no `uploaded_by`, no original author-supplied filename if that filename itself could be identifying — consider serving a generic filename like `manuscript.pdf` to reviewers instead of the author's original filename)
- [x] Re-confirm the moderator's anonymization check (6.2) actually happened and passed before a manuscript ever reaches `under_review` status — this is the upstream guarantee that access-layer blinding depends on; the two work together, not independently

**Todos:**
- [x] Write `getManuscriptForRole()` once in `shared/` (or `modules/manuscripts/`) and use it everywhere — do not duplicate this filtering logic per route
- [x] Unit test: call this function as `role='reviewer'` and assert no author-identifying field appears anywhere in the output, including nested objects
- [x] Unit test: call as `role='editor'`/`role='moderator'` and confirm full data is still available to them (blinding is reviewer-specific, not universal)
- [x] Manual QA: log in as a test reviewer account and confirm the browser network tab shows zero author-identifying data in any response, not just what the UI happens to render

---

## 6.6 Reviewer Review Submission

### Review form
- [x] `recommendation` — one of `review_recommendation_enum` (accept, minor_revision, major_revision, reject)
- [x] `public_comments` — visible to author later (via Phase 7 revision flow)
- [x] `confidential_comments` — editor-only, never shown to author
- [x] `score` (JSONB) — optional structured rubric if the journal uses one (define fields now if known, e.g. `{ originality: 4, methodology: 3, clarity: 5 }`, otherwise leave freeform for v1)
- [x] `POST /api/reviews` — creates the `reviews` row, sets `reviewer_assignments.completed_at = now()`, `assignment_status = 'completed'`

### Extension requests
- [x] `POST /api/reviews/assignments/:id/extension` — creates `review_extension_requests` (status = 'pending')
- [x] Editor approves/rejects: `PATCH /api/editorial/extensions/:id` — updates `due_at` on `reviewer_assignments` if approved

**Todos:**
- [x] Backend: review submission endpoint, extension endpoints
- [x] Frontend: `features/reviewer/ReviewForm.jsx`, `features/reviewer/ExtensionRequest.jsx`
- [x] Once both reviews for a round are `is_complete = true`, surface this to the editor's queue as "ready for decision" — a simple derived query, not a stored flag, to avoid sync issues

---

## 6.7 Editorial Decision

- [x] Editor's manuscript detail view: both reviews side by side (public + confidential comments), recommendation values highlighted
- [x] `POST /api/editorial/manuscripts/:id/decision` — creates `editorial_decisions` row: `decision` (editorial_decision_enum), `decision_round`, `comments_to_author`, `internal_notes`
- [x] Route based on decision:
  - `accept` → `manuscripts.current_status = 'accepted'`
  - `reject` → `manuscripts.current_status = 'rejected'`
  - `minor_revision` / `major_revision` → `manuscripts.current_status = 'revision_requested'`, hands off to **Phase 7**
- [x] All transitions write `manuscript_status_history`

**Todos:**
- [x] Backend: decision endpoint with the routing logic above, wrapped in a transaction
- [x] Frontend: `features/editor/DecisionPanel.jsx`
- [x] Confirm the editor conflict check (6.3) is re-verified at decision time too, not just at assignment time — an edge case worth guarding: assignment and decision could theoretically be separated in time, don't assume the earlier check still holds without re-checking

---

## 6.8 Reviewer Suggestions (standalone — not decline-triggered)

Separate from the merged decline-suggestion fields in 6.4 — this covers editor- or author-initiated suggestions unrelated to a decline (e.g. an editor proactively logs "avoid this reviewer, known conflict" or an author suggests reviewers at submission time if your journal supports that).

- [x] `POST /api/manuscripts/:id/reviewer-suggestions` — `suggestion_type` = suggest/oppose
- [x] Surface "opposed" reviewers as an exclusion filter in the eligible-reviewers query (6.3) alongside the hard conflict-of-interest exclusion

**Todos:**
- [x] Decide whether authors can submit suggestions during the submission wizard (Phase 5) or only after — if during, this needs a small addition back to Phase 5's Step 3; document that decision here rather than silently changing Phase 5

---

## 6.9 Testing

- [x] Full path: submit → moderator proceeds → editor assigns self (non-conflicted) → editor invites 2 category-matched reviewers → both accept → both submit reviews → editor issues decision
- [x] Desk rejection path: moderator rejects, manuscript reaches terminal state, no editor/reviewer stages triggered
- [x] Conflict blocked: editor who is a co-author attempts to claim → rejected with clear error, logged
- [x] Conflict blocked: manuscript's own author appears in the eligible-reviewers list → must NOT appear at all
- [x] Reviewer cap: attempt to invite a 3rd active reviewer for the same round → DB trigger blocks it, API surfaces a clean error
- [x] Decline + suggestion: reviewer declines with a suggested name → editor sees it, invites the suggested reviewer, slot fills correctly
- [x] **Double-blind test (critical):** as a reviewer test account, inspect every API response for a manuscript under review — confirm zero author-identifying fields anywhere
- [x] Extension request approved → `due_at` updates correctly
- [x] Editorial decision correctly routes manuscript status for all 4 decision types

---

## 6.10 Exit Criteria for Phase 6

You're ready for **Phase 7 — Revision, Withdrawal, Notifications, Audit & Deployment** when:
- [x] Moderator screening (including anonymization check) is fully functional
- [x] Editor assignment enforces conflict-of-interest checks server-side
- [x] Reviewer matching correctly filters by category and excludes conflicted/opposed reviewers
- [x] The 2-reviewer DB trigger is confirmed working through the real invitation flow, not just the raw SQL test from Phase 2
- [x] Decline-with-suggestion flow works end-to-end
- [x] Double-blind access-layer filtering is verified with a real reviewer test account — this is the most important sign-off in this phase
- [x] Reviews are submitted and correctly separate public vs confidential comments
- [x] Editorial decisions correctly transition manuscript status, including handoff into the revision path
