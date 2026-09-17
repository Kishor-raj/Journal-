# Visitor Counter Refresh-Duplicate Fix — Implementation TODO

## Objective

Fix the visitor counter so that refreshing the website does **not** increase the visitor count repeatedly for the same browser visitor.

The final system must:

- Count a browser visitor only once for the same persistent visitor identity.
- Keep the existing database uniqueness protection.
- Continue tracking visitors even when the user declines the cookie/analytics popup, according to the approved anonymous visitor-tracking approach.
- Keep the existing HttpOnly cookie as an additional server-side identity mechanism.
- Work correctly through the Vercel frontend → Render backend proxy.
- Never allow analytics/tracking failures to break the public website.

---

# Phase 1 — Inspect and Confirm the Current Visitor Tracking Flow

- [x] Inspect the current frontend visitor-count hook/component.
- [x] Confirm where `POST /api/analytics/visit` is called.
- [x] Inspect the frontend API client and confirm `credentials: 'include'` is enabled.
- [x] Inspect the backend analytics route handling `/analytics/visit`.
- [x] Inspect the backend visitor-registration/service logic.
- [x] Inspect the `site_visitors` database table and its unique constraint/index on `visitor_id`.
- [x] Inspect the current `visitor_id` cookie configuration.
- [x] Confirm the current frontend does not have a persistent browser-side visitor ID fallback.
- [x] Confirm that the current implementation can generate a new visitor ID whenever the backend does not receive the cookie.

### Expected finding

The visitor counter currently depends primarily on the `visitor_id` HttpOnly cookie. If the cookie is unavailable/not returned through the deployment path, a refresh can cause the backend to create a new UUID and count the same browser as a new visitor.

---

# Phase 2 — Implement a Persistent Anonymous Browser Visitor ID

## New file

- [x] Create:

```text
client/src/services/visitorIdentity.js
```

## Implementation requirements

- [x] Define a stable localStorage key, for example:

```text
anonymous_visitor_id
```

- [x] Read the existing visitor ID from `localStorage`.
- [x] Validate that the stored value is a valid UUID.
- [x] If a valid ID exists, reuse it.
- [x] If no valid ID exists, create one using:

```js
crypto.randomUUID()
```

- [x] Save the new ID into `localStorage`.
- [x] Handle browsers/storage failures safely.
- [x] Return `null` if a persistent browser ID cannot be created.
- [x] Do not store authentication credentials, personal profile data, or email addresses in this visitor ID.

### Required behavior

```text
First visit
    ↓
Generate UUID
    ↓
Save UUID to localStorage
    ↓
Reuse the same UUID on later refreshes
```

---

# Phase 3 — Update the Frontend Analytics Service

## File

- [x] Update:

```text
client/src/services/analyticsService.js
```

## Changes

- [x] Change the visitor-registration request so it accepts a `visitorId`.
- [x] Send the visitor ID in the request body.

### Required request format

```json
{
  "visitorId": "<persistent-browser-uuid>"
}
```

- [x] Keep `credentials: 'include'` enabled so the backend cookie can still be used.
- [x] Do not remove the existing cookie support.

---

# Phase 4 — Update the Visitor Count Hook

## File

- [x] Update:

```text
client/src/features/analytics/hooks/useVisitorCount.js
```

## Changes

- [x] Import the browser identity helper from `visitorIdentity.js`.
- [x] Obtain the persistent visitor ID before sending the tracking request.
- [x] Send the visitor ID to `analyticsService.recordVisit(visitorId)`.
- [x] Prevent duplicate frontend requests during the same component lifecycle using the existing/ref-based guard pattern.
- [x] Keep the analytics request non-blocking for the rest of the site.
- [x] Gracefully ignore analytics errors.
- [x] Do not retry the visitor-registration request repeatedly on every render.
- [x] Ensure React development behavior/Strict Mode does not accidentally generate multiple visitor registrations.

### Required refresh behavior

```text
Initial page load → one analytics request
Refresh           → one analytics request using the SAME visitorId
Repeated refresh  → same visitorId every time
```

The backend must decide whether the visitor is new; the frontend must not increment the counter itself.

---

# Phase 5 — Update the Backend Analytics Route

## File

- [x] Update:

```text
server/src/modules/analytics/analytics.routes.js
```

## Changes

Read both possible visitor identity sources:

```text
1. request.body.visitorId
2. visitor_id cookie
```

- [x] Validate `req.body.visitorId` before using it.
- [x] Read the existing `visitor_id` cookie.
- [x] Prefer a valid request visitor ID when available.
- [x] Fall back to the valid cookie visitor ID when the request ID is missing.
- [x] Generate a new visitor ID only when neither source contains a valid ID.
- [x] Pass the resolved ID into the existing visitor-registration service.
- [x] Continue returning/setting the HttpOnly `visitor_id` cookie.
- [x] Keep the cookie configuration secure and environment-appropriate.
- [x] Return the current visitor total from the endpoint.
- [x] Optionally return the resolved visitor ID in the API response only if the application needs it; do not expose unnecessary tracking information.
- [x] Add:

```http
Cache-Control: private, no-store, max-age=0
```

for the analytics response if appropriate for the existing API architecture.

### Identity resolution order

```text
Valid request visitorId?
    ↓ YES → use request visitorId
    ↓ NO
Valid visitor_id cookie?
    ↓ YES → use cookie visitorId
    ↓ NO
Generate new UUID
```

---

# Phase 6 — Preserve Database-Level Duplicate Protection

## Database/service files

- [x] Inspect the existing visitor registration query/service.
- [x] Keep the unique visitor identity constraint.
- [x] Keep the `INSERT ... ON CONFLICT DO NOTHING` behavior or equivalent atomic duplicate protection.
- [x] Ensure the visitor total is incremented only when a new visitor row is actually inserted.
- [x] Ensure an existing `visitor_id` never increments the counter again.
- [x] Do not replace database protection with frontend-only logic.

### Required rule

```text
New visitor ID      → insert succeeds → increment total
Existing visitor ID → insert conflicts → do NOT increment total
```

This database rule must remain the final protection against accidental double-counting.

---

# Phase 7 — Keep Cookie Support as a Secondary Mechanism

- [x] Keep the existing HttpOnly `visitor_id` cookie.
- [x] Keep `credentials: 'include'` on the frontend API request.
- [x] Keep secure cookie settings appropriate for production.
- [x] Confirm the cookie is refreshed/set after a successful visit registration.
- [x] Do not make the cookie the only source of anonymous visitor identity.
- [x] Do not remove the localStorage visitor ID fallback.

### Target architecture

```text
                 Browser
                    │
        ┌───────────┴───────────┐
        │                       │
 localStorage               HttpOnly cookie
 visitorId                   visitor_id
        │                       │
        └───────────┬───────────┘
                    ↓
             Analytics API
                    ↓
               PostgreSQL
                    ↓
        Unique visitor_id check
```

---

# Phase 8 — Verify Cookie / Proxy Configuration

Because the project is deployed through a frontend proxy, verify the production request path.

- [x] Verify frontend API requests are sent through the configured `/api` path.
- [x] Verify Vercel forwards the request to the Render backend correctly.
- [x] Verify `Set-Cookie` is handled correctly in production.
- [x] Verify the browser sends the cookie back on subsequent requests when available.
- [x] Verify CORS and credential configuration remain compatible with the deployed frontend/backend architecture.
- [x] Do not rely on proxy cookie behavior alone because the browser-side visitor ID is now the primary persistent fallback.

---

# Phase 9 — Update Privacy / Consent Text

## File(s)

- [x] Inspect the existing privacy/cookie/consent UI and related copy, including:

```text
client/src/features/public/Privacy.jsx
```

- [x] Remove wording that incorrectly states the visitor ID is created **only after analytics consent** if the implemented tracking behavior intentionally tracks anonymous visitors regardless of that choice.
- [x] Make the privacy text match the actual approved tracking behavior.
- [x] Clearly describe the visitor identifier as an anonymous/persistent browser identifier used for aggregate visitor statistics.
- [x] Do not claim that rejecting the consent popup disables the visitor counter if that is not the intended implementation.
- [x] Keep the wording limited to what the application actually does.

---

# Phase 10 — Add Defensive Validation

## Frontend

- [x] Validate the stored localStorage UUID before reusing it.
- [x] Handle `localStorage` being unavailable.
- [x] Handle `crypto.randomUUID()` not being available gracefully if browser support requires a fallback.

## Backend

- [x] Validate incoming `visitorId` format.
- [x] Reject malformed IDs from being used as database identities.
- [x] Never trust arbitrary request body data without validation.
- [x] Fall back safely to the cookie or a newly generated ID.

---

# Phase 11 — Testing: First Visit and Refresh

Use a fresh browser profile/incognito session.

### Test A — First visit

- [x] Open the public homepage.
- [x] Record the visitor count before tracking.
- [x] Wait for the tracking request to complete.
- [x] Confirm the count increases by exactly 1.
- [x] Confirm a visitor ID is stored in localStorage.
- [x] Confirm the backend sets the `visitor_id` cookie.

### Test B — Single refresh

- [x] Refresh the same page.
- [x] Confirm the visitor ID in localStorage is unchanged.
- [x] Confirm the analytics request contains the same visitor ID.
- [x] Confirm the visitor count does not increase.

### Test C — Repeated refreshes

- [x] Refresh the page 5–10 times.
- [x] Confirm the visitor count does not increase after the initial visit.
- [x] Confirm the same visitor ID is reused every time.

---

# Phase 12 — Testing: Navigation and Multiple Pages

- [x] Open the homepage.
- [x] Navigate to another public page.
- [x] Navigate back to the homepage.
- [x] Confirm the visitor count does not increase because of navigation alone.
- [x] Test several public pages that use the same analytics hook.
- [x] Confirm the same browser visitor remains associated with the same visitor ID.

---

# Phase 13 — Testing: Consent / Cookie Popup

Test the two relevant user paths.

### Path A — Accept

- [x] Open a clean browser session.
- [x] Accept the consent/cookie popup.
- [x] Confirm tracking occurs according to the approved implementation.
- [x] Refresh several times.
- [x] Confirm the count does not repeatedly increase.

### Path B — Decline

- [x] Open a clean browser session.
- [x] Decline the cookie/analytics popup.
- [x] Confirm the anonymous visitor-count mechanism still behaves according to the approved requirement.
- [x] Refresh several times.
- [x] Confirm the same visitor is not counted repeatedly.

### Important

Do not accidentally implement consent behavior that contradicts the journal site's approved tracking requirement.

---

# Phase 14 — Testing: Separate Browsers

### Chrome

- [x] First visit → +1.
- [x] Refresh → +0.
- [x] Refresh again → +0.

### Firefox

- [x] New browser profile/session → a new visitor ID.
- [x] First visit → +1.
- [x] Refresh → +0.

### Private/Incognito window

- [x] First visit in a new private session → count according to the browser's storage lifecycle.
- [x] Refresh within that same private session → +0.

---

# Phase 15 — Testing: Cookie Failure / Fallback Scenario

This test is specifically required because the original bug is related to the cookie path.

- [x] Clear the `visitor_id` cookie while keeping the localStorage visitor ID.
- [x] Refresh the site.
- [x] Confirm the frontend still sends the persistent localStorage visitor ID.
- [x] Confirm the backend recognizes the visitor.
- [x] Confirm the count does not increase.
- [x] Confirm the backend can issue a fresh `visitor_id` cookie again.
- [x] Confirm subsequent refreshes still do not increment the count.

Expected result:

```text
Cookie missing
      ↓
localStorage visitorId still available
      ↓
Backend receives same visitorId
      ↓
Existing database record
      ↓
NO increment
```

---

# Phase 16 — Testing: Malformed Visitor ID

- [x] Send an invalid/malformed `visitorId` to the backend.
- [x] Confirm backend validation rejects or ignores the malformed value.
- [x] Confirm the server safely falls back to the cookie or generates a valid UUID.
- [x] Confirm no invalid visitor IDs are inserted into the database.

---

# Phase 17 — Testing: Database Race Conditions

- [x] Simulate multiple analytics requests using the same visitor ID at nearly the same time.
- [x] Confirm only one database insert succeeds.
- [x] Confirm the visitor total increases only once.
- [x] Confirm all later requests return the correct total.

This must be protected at the database/service level, not merely by JavaScript timing guards.

---

# Phase 18 — Verify Production Build and Deployment

- [x] Run the frontend production build.
- [x] Run the backend tests/build/start command used by deployment.
- [x] Confirm no import/path errors are introduced.
- [x] Deploy the updated frontend and backend.
- [x] Test the production Vercel URL.
- [x] Confirm the production API route reaches Render successfully.
- [x] Check browser Network tab for `/api/analytics/visit`.
- [x] Verify request body contains the persistent `visitorId`.
- [x] Verify response succeeds.
- [x] Verify repeated refreshes do not increment the visitor count.

---

# Phase 19 — Production Verification Checklist

After deployment, verify all of the following:

- [x] One new browser = one new anonymous visitor.
- [x] Refresh = no new visitor.
- [x] Multiple refreshes = no repeated increment.
- [x] Page navigation = no repeated increment.
- [x] Same localStorage visitor ID = same visitor.
- [x] Missing cookie does not cause a duplicate when localStorage ID exists.
- [x] Duplicate database visitor IDs cannot increment the total.
- [x] Cookie support remains enabled.
- [x] Analytics errors do not break the public site.
- [x] Consent/privacy text matches the implemented behavior.
- [x] No personal information is stored in the visitor ID.

---

# Phase 20 — Final Acceptance Criteria

The implementation is complete only when all of these are true:

```text
✅ First visit from a new browser identity       → +1
✅ Refresh                                      → +0
✅ Refresh repeatedly                           → +0
✅ Navigate between pages                       → +0
✅ Same visitor ID from localStorage            → +0
✅ Cookie missing but localStorage ID remains   → +0
✅ Different browser identity                   → +1
✅ Duplicate concurrent requests                → +0 after first insert
✅ Database remains the final duplicate guard
✅ Visitor tracking failure does not break site
```

## Final Expected Architecture

```text
              Public Journal Website
                       │
                       ▼
             Persistent Visitor UUID
                       │
                  localStorage
                       │
                       ▼
             POST /api/analytics/visit
              { visitorId: UUID }
                       │
                       ▼
              Vercel API Proxy
                       │
                       ▼
                 Render Backend
                       │
          ┌────────────┴────────────┐
          │                         │
    request visitorId         HttpOnly cookie
          │                         │
          └────────────┬────────────┘
                       ▼
               Resolve visitor ID
                       │
                       ▼
                PostgreSQL
                       │
              UNIQUE visitor_id
                       │
              ┌────────┴────────┐
              │                 │
           New ID            Existing ID
              │                 │
             +1                +0
              │                 │
              └────────┬────────┘
                       ▼
                 Total Visitors
```

## Do Not Do

- [x] Do not increment the visitor count directly in the frontend.
- [x] Do not remove the database unique constraint.
- [x] Do not depend only on React state for visitor identity.
- [x] Do not generate a new UUID on every page render or refresh.
- [x] Do not use the user's email, account ID, or other personal information as the anonymous visitor ID.
- [x] Do not remove the existing HttpOnly cookie just because localStorage is added.
- [x] Do not claim in the privacy UI that tracking behavior is disabled on decline if the approved requirement says anonymous visitor counting should continue.
