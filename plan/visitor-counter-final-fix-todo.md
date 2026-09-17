# Visitor Counter — Final Fix TODO

## Goal

Fix both current visitor-counter issues:

- [x] Refreshing the page increases the visitor count again.
- [x] Selecting the non-accept option causes visitor tracking/count display to stop.

## Required Final Behavior

```text
First visit
   ↓
Cookie notice
   ↓
Accept OR Continue
   ↓
Anonymous visitor is tracked
   ↓
New browser = +1
Same browser refresh = +0
```

- [x] Visitor count remains visible regardless of whether the user clicks **Accept** or **Continue**.
- [x] Because the visitor is still tracked after the non-accept choice, do not label that action **Reject Analytics** or state that it disables tracking.
- [x] Make the wording accurately describe the behavior.

---

# Phase 1 — Inspect Current Implementation

- [x] Inspect the latest visitor-counter code.
- [x] Inspect `useVisitorCount.js`.
- [x] Inspect `analyticsConsent.js`.
- [x] Inspect `AnalyticsConsentBanner.jsx`.
- [x] Inspect `analyticsService.js`.
- [x] Inspect analytics backend routes/service.
- [x] Inspect `site_visitors` table.
- [x] Inspect `site_stats` table.
- [x] Inspect `apiClient.js`.
- [x] Inspect `client/vercel.json`.
- [x] Confirm the existing `"Indexed in 14 databases"` text is already removed.
- [x] Do not restore that text.
- [x] Do not modify unrelated journal functionality.

---

# Phase 2 — Fix API Base URL

The production frontend should use the existing same-origin API proxy.

### Required

```env
VITE_API_BASE_URL=/api
```

### TODO

- [x] Verify the Vercel production environment uses `VITE_API_BASE_URL=/api`.
- [x] Do not directly call the Render backend from the browser when the Vercel `/api` proxy is available.
- [x] Verify `/api/analytics/visit` is routed through Vercel to Render.
- [x] Verify the browser sees the analytics request as a same-origin `/api` request.

---

# Phase 3 — Fix Visitor Cookie Persistence

The refresh problem occurs when the browser does not send the same `visitor_id` cookie back to the backend.

### Frontend Request

Ensure the analytics request uses:

```js
credentials: 'include'
```

### Backend Cookie

Verify the cookie is configured as:

```js
{
  httpOnly: true,
  secure: true,       // production
  sameSite: 'lax',
  maxAge: 31536000000,
  path: '/'
}
```

### TODO

- [x] Verify `credentials: 'include'` is active for analytics requests.
- [x] Verify the backend sets `visitor_id`.
- [x] Verify the browser stores `visitor_id`.
- [x] Verify the cookie survives page refresh.
- [x] Verify the same UUID is sent after refresh.
- [x] Verify `HttpOnly`.
- [x] Verify `Secure` in production.
- [x] Verify `SameSite=Lax`.
- [x] Verify `path=/`.
- [x] Do not change to `SameSite=None` unless the actual architecture requires cross-site cookies.

---

# Phase 4 — Verify Backend Duplicate Protection

The backend must determine whether the browser is already known.

### Required Behavior

```text
visitor_id exists
      ↓
visitor already in database?
   ├── YES → update last_seen → +0
   └── NO  → insert visitor → +1
```

### TODO

- [x] Keep `UNIQUE(visitor_id)`.
- [x] Keep the existing visitor lookup/insert logic.
- [x] Keep `ON CONFLICT (visitor_id) DO NOTHING`.
- [x] Increment `total_visitors` only for a newly inserted visitor.
- [x] Update `last_seen` for existing visitors.
- [x] Keep the operation transaction-safe.
- [x] Do not increment on every `/visit` request.

---

# Phase 5 — Remove Consent as the Visitor-Tracking Gate

### Current Problem

```js
if (consent !== CONSENT_VALUES.ACCEPTED) return
```

This prevents tracking when the user selects the non-accept option.

### Required Change

Visitor registration must no longer depend on:

```js
consent === ACCEPTED
```

### TODO

- [x] Remove the `ACCEPTED` check from `useVisitorCount()`.
- [x] Ensure both available consent-banner choices allow visitor counting.
- [x] Do not stop visitor registration when the user selects the second option.
- [x] Do not create separate counting logic for Accept vs Continue.
- [x] Keep the consent/banner state only for the user-facing notice if needed.

---

# Phase 6 — Update Consent Banner Wording

Do not use:

```text
Reject Analytics
```

if tracking continues after that action.

### Recommended Wording

```text
This site uses an anonymous visitor identifier to maintain
accurate aggregated visitor statistics.

[ Accept ] [ Continue ]
```

### TODO

- [x] Change the second button from **Reject Analytics** to an accurate label such as `Continue`.
- [x] Ensure the text does not claim tracking is disabled.
- [x] Keep the notice small and responsive.
- [x] Do not block access to journal content.

---

# Phase 7 — Fix `useVisitorCount()`

The hook should make one visitor-registration request and use the backend response.

### Recommended Behavior

```text
Page loads
   ↓
POST /api/analytics/visit
   ↓
Backend checks visitor_id
   ↓
New → +1
Existing → +0
   ↓
Return totalVisitors
   ↓
Display count
```

### TODO

- [x] Remove consent-based early return.
- [x] Remove consent-change listener if only used for tracking.
- [x] Remove `lastConsentRef` if no longer necessary.
- [x] Call `recordVisit()` once per hook lifecycle.
- [x] Store `totalVisitors`.
- [x] Show loading state while waiting.
- [x] Handle API errors without breaking React.
- [x] Prevent accidental duplicate requests.

---

# Phase 8 — Add/Verify Read-Only Stats API

### Recommended Endpoint

```http
GET /api/analytics/stats
```

### Response

```json
{
  "totalVisitors": 12548
}
```

### TODO

- [x] Add `/stats` if not already implemented.
- [x] Return only `totalVisitors`.
- [x] Do not expose visitor UUIDs.
- [x] Do not expose individual visitor records.
- [x] Do not increment the counter from `/stats`.

---

# Phase 9 — Make Visitor Count Always Visible

### Required States

While loading:

```text
◉ — Visitors
```

After successful request:

```text
◉ 12.5K Visitors
```

If analytics fails:

```text
◉ — Visitors
```

### TODO

- [x] Keep the visitor counter visible after Accept.
- [x] Keep the visitor counter visible after Continue.
- [x] Do not hide the counter because consent is not `ACCEPTED`.
- [x] Prevent `undefined Visitors`.
- [x] Prevent `null Visitors`.
- [x] Prevent `NaN Visitors`.
- [x] Preserve the current top-bar design.
- [x] Do not restore `"Indexed in 14 databases"`.

---

# Phase 10 — Number Formatting

Use:

```text
852        → 852 Visitors
12,458     → 12.5K Visitors
125,000    → 125K Visitors
1,200,000  → 1.2M Visitors
```

### TODO

- [x] Keep formatting in a reusable utility.
- [x] Handle zero correctly.
- [x] Handle invalid values safely.
- [x] Use the fallback `—` when the count is unavailable.

---

# Phase 11 — Error Handling

Analytics must never break the journal site.

### TODO

- [x] Handle API failure.
- [x] Handle network failure.
- [x] Handle database failure.
- [x] Handle invalid cookies.
- [x] Keep homepage rendering normally.
- [x] Keep article pages working.
- [x] Keep manuscript submission working.
- [x] Keep login/registration working.
- [x] Keep Contact Form working.
- [x] Do not display backend stack traces to users.

---

# Phase 12 — Security

### TODO

- [x] Generate visitor UUID on the backend.
- [x] Validate visitor UUID.
- [x] Keep `HttpOnly`.
- [x] Keep `Secure` in production.
- [x] Use parameterized SQL.
- [x] Add rate limiting.
- [x] Do not use IP address as the visitor ID.
- [x] Do not use browser fingerprinting.
- [x] Do not store personal information in `site_visitors`.
- [x] Never trust a visitor count provided by the frontend.

---

# Phase 13 — Refresh Test

### Test

```text
1. Open site in a new browser
2. Accept/Continue
3. Count increases by 1
4. Refresh
5. Count must remain unchanged
```

### TODO

- [x] Inspect `visitor_id` in browser storage.
- [x] Record the UUID.
- [x] Refresh.
- [x] Verify the UUID is unchanged.
- [x] Inspect the `/api/analytics/visit` request.
- [x] Verify the cookie is sent.
- [x] Verify backend receives the same UUID.
- [x] Verify only one database record exists.
- [x] Verify `total_visitors` increases only once.

---

# Phase 14 — Continue/Non-Accept Test

### Test

```text
1. Open site in a new browser
2. Select Continue
3. Visitor is tracked
4. Count increases by 1
5. Refresh
6. Count remains unchanged
```

### TODO

- [x] Verify the visitor cookie is created.
- [x] Verify the visitor is inserted.
- [x] Verify count increases once.
- [x] Refresh.
- [x] Verify count does not increase.
- [x] Verify counter remains visible.

---

# Phase 15 — Multiple Browser Test

### Test

```text
Chrome  → Visitor A
Firefox → Visitor B
```

### Expected

```text
Chrome  → +1
Firefox → +1
```

Then:

```text
Chrome refresh  → +0
Firefox refresh → +0
```

### TODO

- [x] Verify Chrome creates a unique visitor.
- [x] Verify Firefox creates a unique visitor.
- [x] Verify each browser increments only once.
- [x] Verify refreshing either browser does not increment.

---

# Phase 16 — Production Verification

### TODO

- [x] Verify production has:

```env
VITE_API_BASE_URL=/api
```

- [x] Verify Vercel `/api` rewrite works.
- [x] Verify Render backend receives the request.
- [x] Verify production cookie is stored.
- [x] Verify production cookie survives refresh.
- [x] Verify PostgreSQL receives visitor records.
- [x] Verify the counter is displayed correctly.
- [x] Verify Accept works.
- [x] Verify Continue works.
- [x] Verify refresh does not increment.

---

# Final Expected Behavior

```text
                  COOKIE NOTICE
                       │
              ┌─────────┴─────────┐
              │                   │
           Accept              Continue
              │                   │
              └─────────┬─────────┘
                        ↓
               Anonymous visitor
                    tracking
                        ↓
                visitor_id cookie
                        ↓
            POST /api/analytics/visit
                        ↓
                Existing visitor?
                  /                            YES            NO
                 │              │
                +0             +1
                 │              │
                 └──────┬───────┘
                        ↓
                  totalVisitors
                        ↓
                ◉ 12.5K Visitors
```

# Final Acceptance Checklist

- [x] Cookie/notice popup remains.
- [x] Accept works.
- [x] Continue works.
- [x] Both choices allow anonymous visitor counting.
- [x] Visitor count is always visible.
- [x] First visit increments once.
- [x] Refresh does not increment.
- [x] Same browser does not create duplicate visitors.
- [x] Different browsers can be counted separately.
- [x] Visitor ID is server-generated.
- [x] Visitor cookie persists.
- [x] `/api/analytics/visit` receives the cookie.
- [x] Backend duplicate protection works.
- [x] Analytics failure does not break the website.
- [x] `"Indexed in 14 databases"` remains removed.
- [x] Existing journal features remain unaffected.
- [x] Production test passes.

## Most Important Fixes

1. [ ] Make sure `VITE_API_BASE_URL=/api`
2. [ ] Make sure analytics requests use `credentials: 'include'`
3. [ ] Make sure `visitor_id` cookie persists and is sent on refresh
4. [ ] Remove the `ACCEPTED`-only tracking condition
5. [ ] Change **Reject Analytics** to an accurate **Continue** choice
6. [ ] Keep the counter visible for both choices
7. [ ] Verify the backend only increments for a new `visitor_id`

> This is the implementation path that directly addresses the two current issues without rebuilding the existing visitor-counter system.
