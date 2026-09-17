# Website Visitor Counter — Implementation TODO

## Objective

Implement a dynamic **unique anonymous browser visitor counter** on the existing journal website.

The existing `"Indexed in 14 databases"` content has already been removed from the current site.

### Required UI

Use the existing top information-bar space for:

```text
◉ 12.5K Visitors
```

The visitor count must come from the backend and must never be hard-coded.

### Visitor definition

The metric represents:

> Unique anonymous browser visitors

It must not be described as a guaranteed count of unique human beings.

The anonymous visitor identifier must not be based on:

- Name
- Email
- Phone number
- User account ID
- IP address as the visitor identifier
- Browser fingerprint
- Other personally identifying information

Use a randomly generated UUID.

---

# Phase 1 — Inspect the Existing Journal Project

### TODO

- [x] Inspect the current frontend structure.
- [x] Inspect the current Express backend structure.
- [x] Inspect the current PostgreSQL migration/schema structure.
- [x] Inspect the existing public layout/top information bar.
- [x] Confirm the `"Indexed in 14 databases"` content is already removed.
- [x] Do not restore or modify that removed content.
- [x] Identify the exact component responsible for rendering the top information bar.
- [x] Identify the existing API base URL and routing conventions.
- [x] Identify the existing cookie-parser/configuration setup.
- [x] Reuse existing project conventions instead of creating duplicate infrastructure.
- [x] Do not modify unrelated journal functionality.

---

# Phase 2 — Create PostgreSQL Visitor Tables

Create the anonymous visitor storage tables.

## `site_visitors`

```sql
CREATE TABLE IF NOT EXISTS site_visitors (
    id BIGSERIAL PRIMARY KEY,
    visitor_id UUID UNIQUE NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## `site_stats`

```sql
CREATE TABLE IF NOT EXISTS site_stats (
    id INTEGER PRIMARY KEY,
    total_visitors BIGINT NOT NULL DEFAULT 0
);
```

Initialize:

```sql
INSERT INTO site_stats (id, total_visitors)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
```

### TODO

- [x] Create a new PostgreSQL migration using the project's existing migration naming convention.
- [x] Add `site_visitors`.
- [x] Add `site_stats`.
- [x] Add `UNIQUE(visitor_id)`.
- [x] Initialize `site_stats.id = 1`.
- [x] Create the corresponding rollback/down migration if the project uses down migrations.
- [x] Do not add personal information fields.
- [x] Do not use IP address as the visitor identifier.
- [ ] Verify the migration works on the existing development database.
- [ ] Verify existing tables/data remain unchanged.

---

# Phase 3 — Implement Server-Side Visitor ID

The visitor ID must be generated on the Express backend.

Use:

```js
import crypto from "crypto";

const visitorId = crypto.randomUUID();
```

### TODO

- [x] Generate the UUID only on the server.
- [x] Validate any existing visitor cookie before using it.
- [x] Never trust a visitor count sent by the frontend.
- [x] Never accept an arbitrary frontend visitor ID without validation.
- [x] Keep the visitor ID anonymous.

---

# Phase 4 — Implement First-Party Visitor Cookie

Cookie name:

```text
visitor_id
```

Recommended attributes:

```text
HttpOnly
Secure
SameSite=Lax
Max-Age=31536000
```

The cookie should persist for approximately one year.

### TODO

- [x] Create the `visitor_id` cookie only when analytics tracking is permitted.
- [x] Set `HttpOnly`.
- [x] Set `Secure` in production.
- [x] Set `SameSite=Lax`.
- [x] Set approximately one-year expiration.
- [x] Validate UUID format on incoming cookies.
- [x] Treat an invalid cookie as a new visitor when tracking is permitted.
- [x] Do not store personal information in the cookie.

---

# Phase 5 — Implement Analytics Consent

Initial state:

```text
analytics_consent = not_decided
```

Recommended UI:

```text
[ Accept Analytics ] [ Reject ] [ Cookie Settings ]
```

### Accept

```text
analytics consent = true
        ↓
create/use visitor_id
        ↓
register visitor
        ↓
update visitor count
```

### Reject

```text
analytics consent = false
        ↓
do not create visitor_id
        ↓
do not register visitor
        ↓
website continues normally
```

### TODO

- [x] Implement analytics consent state.
- [x] Show a small privacy/cookie notice.
- [x] Add Accept Analytics action.
- [x] Add Reject action.
- [x] Add Cookie Settings action if appropriate.
- [x] Do not block journal content when analytics is rejected.
- [x] Do not create the visitor cookie when consent is rejected.
- [x] Ensure the rest of the website works normally without analytics.

### Privacy notice meaning

Explain that the site uses an anonymous first-party visitor identifier for aggregated visitor statistics.

Review the exact legal treatment for the site's applicable jurisdiction.

---

# Phase 6 — Create Analytics Backend Module

Create a dedicated analytics module following the existing backend conventions.

Recommended structure:

```text
server/src/modules/analytics/
├── analytics.routes.js
└── analytics.service.js
```

### API

```http
POST /api/analytics/visit
```

### Endpoint responsibilities

1. Verify tracking is allowed according to consent.
2. Read the `visitor_id` cookie.
3. Validate the cookie if it exists.
4. For a new visitor:
   - Generate a UUID.
   - Set the cookie.
   - Insert into `site_visitors`.
   - Increment `site_stats.total_visitors`.
5. For an existing visitor:
   - Do not increment.
   - Update `last_seen`.
6. Return the current aggregate count.

Example:

```json
{
  "totalVisitors": 12458
}
```

### TODO

- [x] Create analytics route.
- [x] Create analytics service.
- [x] Register `/api/analytics/visit`.
- [x] Read and validate the visitor cookie.
- [x] Generate a UUID for new visitors.
- [x] Insert new visitors.
- [x] Update `last_seen` for returning visitors.
- [x] Return only aggregate statistics.
- [x] Never return the visitor UUID.
- [x] Never return individual visitor rows.
- [x] Follow existing API conventions.

---

# Phase 7 — Implement Atomic Visitor Counting

Do not use an unsafe sequence such as:

```sql
SELECT total_visitors;
UPDATE site_stats SET total_visitors = total_visitors + 1;
```

Use an atomic operation:

```sql
UPDATE site_stats
SET total_visitors = total_visitors + 1
WHERE id = 1
RETURNING total_visitors;
```

### TODO

- [x] Use a database transaction for new visitor registration/counting.
- [x] Keep `UNIQUE(visitor_id)`.
- [x] Atomically increment `total_visitors`.
- [x] Handle concurrent first visits safely.
- [x] Prevent duplicate increments.
- [ ] Test concurrent requests.

---

# Phase 8 — Prevent Double Counting

Expected:

```text
First visit        → +1
Refresh            → +0
Open article       → +0
Return homepage    → +0
```

Different anonymous browsers/devices may represent separate visitors.

### TODO

- [x] Ensure refresh does not increment.
- [x] Ensure opening articles does not increment.
- [x] Ensure returning to the homepage does not increment.
- [x] Ensure a returning browser with the same cookie does not increment.
- [x] Ensure a different browser can be counted separately.
- [x] Handle invalid/deleted cookies safely.

---

# Phase 9 — Protect the Analytics Endpoint

The endpoint is public and needs protection.

### TODO

- [x] Add rate limiting to `POST /api/analytics/visit`.
- [x] Validate requests.
- [x] Validate visitor UUIDs.
- [x] Reject malformed identifiers.
- [x] Keep responses minimal.
- [x] Do not expose database details.

### Conservative bot handling

Attempt to exclude obvious:

- Known bots
- Search-engine crawlers
- Automated monitoring
- Health checks

Do not use aggressive filtering that could exclude legitimate visitors.

---

# Phase 10 — Only Visitor Registration Should Increment

The counter must only be modified by the visitor-registration logic.

Do not count:

```text
/api/*
/assets/*
/images/*
/favicon.ico
/static files
health-check requests
database requests
internal backend requests
```

### TODO

- [x] Ensure normal API requests do not increment.
- [x] Ensure static assets do not increment.
- [x] Ensure health checks do not increment.
- [x] Ensure internal requests do not increment.
- [x] Ensure only `/api/analytics/visit` changes the visitor count.

---

# Phase 11 — Create Frontend Analytics Service

Recommended:

```text
client/src/services/analyticsService.js
```

Use the project's existing API client.

Example responsibility:

```js
recordVisit: () => apiClient.post('/analytics/visit', {})
```

### TODO

- [x] Reuse the existing `apiClient`.
- [x] Use the existing `/api` routing convention.
- [x] Return the API response.
- [x] Handle errors consistently.
- [x] Do not duplicate existing fetch configuration.

---

# Phase 12 — Create `useVisitorCount()` Hook

Recommended:

```text
client/src/shared/hooks/useVisitorCount.js
```

Usage:

```jsx
const { visitorCount, loading } = useVisitorCount();
```

### Hook flow

```text
Check analytics consent
        ↓
Consent accepted?
   ├── No → do nothing
   └── Yes
        ↓
POST /api/analytics/visit
        ↓
Receive totalVisitors
        ↓
Format count
        ↓
Expose count
```

### TODO

- [x] Create `useVisitorCount()`.
- [x] Check consent before tracking.
- [x] Call the API only when permitted.
- [x] Store `totalVisitors` in state.
- [x] Expose a loading state.
- [x] Catch analytics errors.
- [x] Avoid duplicate requests during the same lifecycle.

---

# Phase 13 — Create Visitor Count Formatter

Recommended:

```text
client/src/shared/utils/formatVisitorCount.js
```

Rules:

```text
852       → 852 Visitors
12,458    → 12.5K Visitors
125,000   → 125K Visitors
1,200,000 → 1.2M Visitors
```

Safe fallback:

```text
null      → —
undefined → —
NaN       → —
```

### TODO

- [x] Implement compact formatting.
- [x] Handle zero safely.
- [x] Handle null/undefined safely.
- [x] Handle invalid values safely.
- [x] Never show `undefined Visitors`.
- [x] Never show `null Visitors`.
- [x] Never show `NaN Visitors`.

---

# Phase 14 — Add Visitor Counter to Existing Top Bar

The old `"Indexed in 14 databases"` content has already been removed.

### Important

Do not restore it.

Use the existing top-bar space for:

```text
◉ 12.5K Visitors
```

### TODO

- [x] Locate the existing top information-bar component.
- [x] Add the dynamic visitor count in the existing available space.
- [x] Preserve typography.
- [x] Preserve spacing.
- [x] Preserve colors.
- [x] Preserve icon style.
- [x] Preserve responsive/mobile behavior.
- [x] Do not create a large standalone analytics section.
- [x] Do not modify the hero section.

### Loading/error state

```text
◉ — Visitors
```

The rest of the homepage must continue working normally.

---

# Phase 15 — Make Analytics Non-Blocking

### TODO

- [x] Do not block initial homepage rendering on analytics.
- [x] Render the top bar immediately.
- [x] Fetch the visitor count asynchronously.
- [x] Show `◉ — Visitors` while loading.
- [x] Show formatted count when available.
- [x] Fall back silently when the analytics API fails.

---

# Phase 16 — Update Privacy Policy

Add a concise explanation of the visitor identifier and aggregated statistics.

Suggested meaning:

```text
Website Analytics

We use an anonymous first-party visitor identifier to estimate
unique website visitors and display aggregated visitor statistics.
The identifier is not intended to identify individual users and
is not used for advertising or profiling.
```

### TODO

- [x] Add the explanation to the site's privacy policy.
- [x] Ensure wording matches the actual implementation.
- [ ] Review applicable cookie/privacy requirements.

---

# Phase 17 — Error Handling

Analytics failure must never break the journal.

Expected fallback:

```text
Analytics API fails
       ↓
Homepage continues
       ↓
◉ — Visitors
```

### TODO

- [x] Handle network failures.
- [x] Handle API failures.
- [x] Handle malformed responses.
- [x] Handle database failures.
- [x] Handle invalid cookies.
- [x] Keep homepage working.
- [x] Keep manuscript submission working.
- [x] Keep login/registration working.
- [x] Keep article browsing working.
- [x] Do not expose stack traces.

---

# Phase 18 — Security Review

### TODO

- [x] Generate visitor UUIDs on the server.
- [x] Validate `visitor_id`.
- [x] Never trust frontend visitor counts.
- [x] Never expose database credentials.
- [x] Use parameterized SQL/safe database methods.
- [x] Add rate limiting.
- [x] Do not store personal information in `site_visitors`.
- [x] Do not expose individual visitor records.
- [x] Return only aggregated statistics.
- [x] Respect analytics consent.
- [x] Use correct cookie security attributes in production.

---

# Phase 19 — Testing

## New browser

```text
No visitor cookie
→ analytics accepted
→ count increments by 1
```

## Refresh

```text
Existing visitor cookie
→ refresh
→ count does not increase
```

## Multiple pages

```text
Homepage
→ Article
→ Current Issue
→ Homepage
→ still one visitor
```

## Analytics rejected

```text
Reject analytics
→ no visitor cookie
→ visitor count unchanged
→ website continues normally
```

## Multiple browsers

```text
Chrome → +1
Firefox → +1
```

## Invalid cookie

```text
Invalid UUID
→ reject invalid value
→ create a new valid visitor ID when tracking is permitted
```

## Analytics server failure

```text
API unavailable
→ homepage still works
→ visitor counter shows fallback
```

## Concurrent users

- [ ] Test multiple simultaneous first-time visitors.
- [ ] Verify the final count is correct.
- [ ] Verify no duplicate visitor rows are created.
- [ ] Verify the atomic increment works.

## Bot/health checks

- [ ] Verify obvious automated requests do not incorrectly increase the count.

---

# Phase 20 — Production Deployment

### TODO

- [ ] Apply the database migration to production PostgreSQL.
- [ ] Deploy backend changes.
- [ ] Deploy frontend changes.
- [ ] Verify the existing `/api` routing/proxy.
- [ ] Verify HTTPS cookie behavior.
- [ ] Verify `Secure` cookie behavior in production.
- [ ] Verify analytics consent behavior.
- [ ] Submit a production test visit.
- [ ] Confirm the database visitor row is created.
- [ ] Confirm the total increases once.
- [ ] Refresh and confirm it does not increase.
- [ ] Verify the top bar displays the formatted count.

---

# Phase 21 — Final Acceptance Checklist

The implementation is complete only when:

- [x] Visitor count is dynamic.
- [x] Count comes from the backend.
- [x] No hard-coded visitor count exists.
- [x] Metric represents anonymous browser visitors.
- [x] UUIDs are generated on the backend.
- [x] `visitor_id` is stored in a first-party cookie.
- [x] Cookie contains no personal information.
- [x] Consent is implemented.
- [x] Rejecting analytics does not block the website.
- [x] `site_visitors` exists.
- [x] `site_stats` exists.
- [x] Duplicate visits are prevented.
- [x] Counter increment is atomic.
- [x] API returns aggregate statistics only.
- [x] Rate limiting is enabled.
- [x] Obvious automated traffic is handled conservatively.
- [x] Analytics failures do not break the homepage.
- [x] Top bar displays `◉ <count> Visitors`.
- [x] `"Indexed in 14 databases"` remains removed.
- [x] Responsive layout remains correct.
- [x] Existing journal features remain unaffected.
- [ ] Production testing passes.

---

# Recommended Implementation Order

```text
Phase 1  → Inspect existing project
Phase 2  → PostgreSQL tables
Phase 3  → Server UUID generation
Phase 4  → Visitor cookie
Phase 5  → Analytics consent
Phase 6  → Analytics backend module
Phase 7  → Atomic counting
Phase 8  → Prevent double counting
Phase 9  → Endpoint protection
Phase 10 → Restrict counting to visitor endpoint
Phase 11 → Frontend analytics service
Phase 12 → useVisitorCount hook
Phase 13 → Number formatter
Phase 14 → Top-bar integration
Phase 15 → Non-blocking loading/error behavior
Phase 16 → Privacy policy
Phase 17 → Error handling
Phase 18 → Security review
Phase 19 → Testing
Phase 20 → Production deployment
Phase 21 → Final acceptance
```

# Important Agent Instructions

- [ ] Implement this as a **visitor counter**, not a full analytics dashboard.
- [ ] Inspect existing files before creating new files.
- [ ] Reuse existing database, API, cookie, and frontend utilities where appropriate.
- [ ] The `"Indexed in 14 databases"` content has already been removed; do not restore or modify it.
- [ ] Use the existing top-bar space for the visitor counter.
- [ ] Do not hard-code the displayed visitor count.
- [ ] Do not identify visitors using personal information.
- [ ] Do not use IP address or browser fingerprint as the visitor identifier.
- [ ] Generate UUIDs on the backend.
- [ ] Respect analytics consent before tracking.
- [x] Do not block journal content when analytics is rejected.
- [ ] Do not let analytics failures break the website.
- [ ] Use atomic database increment.
- [ ] Preserve existing authentication, manuscript, editorial, reviewer, contact, and AI-email functionality.
- [ ] Do not create unrelated database changes.
- [ ] At completion, report:
  - files added
  - existing files modified
  - database migration added
  - API endpoint added
  - cookie behavior
  - consent behavior
  - tests performed
  - production verification result
