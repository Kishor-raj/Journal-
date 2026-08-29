# Phase 4 — Public Website & Shared UI Component Library

**Goal of this phase:** Establish a distinctive visual identity for the journal (not a templated academic-site default), build the `shared/components/` library from Phase 1's folder structure so every later dashboard reuses it, and ship all public-facing pages.

By the end of this phase: the public site communicates credibility and identity before any login wall, the dashboard shell is visually distinct from the public site while sharing the same design tokens, and every reusable component (table, badge, modal, upload widget, etc.) exists once and is ready for Author/Moderator/Editor/Reviewer/Admin screens to consume in later phases.

---

## 4.1 Why design direction comes first

A journal site's credibility *is* its design — readers and authors judge legitimacy partly on presentation. It's also easy to default to clichés here: cream background + serif headline + terracotta accent, or a stark dark theme with one neon accent, or a hairline-rule broadsheet layout applied without thought. Any of these *can* be right, but only if chosen deliberately for this subject — a peer-reviewed scholarly journal, whose real-world artifacts are typeset pages, citation marks, manuscript revisions, and editorial marginalia.

### Visual identity — proposed direction

**Palette** (6 named values):
| Name | Hex | Use |
|---|---|---|
| Ink Navy | `#1B2A4A` | Headlines, primary text, header background |
| Vellum | `#EDEEE6` | Page background — a cool sage-tinted paper tone, not warm cream |
| Archive Green | `#2F4A3E` | Primary accent — links, active states, primary buttons |
| Citation Gold | `#B08D3D` | Secondary accent — used sparingly for highlights, badges, hover states |
| Rule Grey | `#C9C2B4` | Hairline dividers, borders, disabled states |
| Ink Black | `#17181C` | Body text on light backgrounds |

**Typography** (2+ roles):
- **Display face** (headings, journal name, hero text): a serif with real editorial presence — e.g. **Fraunces** or **Source Serif 4**, used at restrained weights, not maximal high-contrast display sizing
- **Body face**: a clean, highly legible sans — e.g. **Inter** or **IBM Plex Sans** — for dashboard UI and long-form reading
- **Utility/mono face**: a monospace — e.g. **IBM Plex Mono** — for submission numbers, ISSN, DOI-style identifiers, and status codes; this ties directly into the subject (manuscripts have real identifiers) rather than being decorative

**Layout concept:** A **manuscript-margin** motif — public pages use a slightly asymmetric grid with a narrow left margin reserved for issue numbers, dates, or category labels (echoing the marginal annotations reviewers actually make on real manuscripts), while the main column carries content. Not full broadsheet hairline styling everywhere — reserve rules and margins for places where they encode real information (an article's issue/volume/date), not as pure decoration.

**Signature element:** A **revision-mark accent** — a thin underline/strike treatment (inspired by tracked-changes/redline editing marks, since revision is core to this product) used once, deliberately, for the site's single memorable interaction: e.g. on the Home page hero link or the "Submit Manuscript" CTA. Do not repeat this motif everywhere or it becomes decoration instead of signature.

**Todos:**
- [x] Confirm this direction (or adjust palette/type choices) before building anything — changing tokens after 20 components exist is expensive
- [x] Rule out anything that reads as a template default for *this specific brief* — re-check the palette isn't accidentally close to the cream+terracotta or dark+neon clichés once real content is in place

---

## 4.2 Design Tokens — Implementation

Fill in `client/src/styles/tokens.css` (scaffolded empty in Phase 1):

```css
:root {
  /* Color */
  --color-ink-navy: #1B2A4A;
  --color-vellum: #EDEEE6;
  --color-archive-green: #2F4A3E;
  --color-citation-gold: #B08D3D;
  --color-rule-grey: #C9C2B4;
  --color-ink-black: #17181C;
  --color-surface: #FFFFFF;
  --color-danger: #9B2C2C;
  --color-warning: #8A6D1D;
  --color-success: #2F4A3E;

  /* Typography */
  --font-display: 'Fraunces', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  /* Type scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 40px;
  --space-6: 64px;

  /* Radius & elevation */
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-card: 0 1px 3px rgba(23, 24, 28, 0.08);
}
```

**Todos:**
- [x] Add font imports (self-hosted or Google Fonts) for Fraunces, Inter, IBM Plex Mono/Sans
- [x] Confirm tokens render correctly with a throwaway styled page before building real components
- [x] Set up a `prefers-reduced-motion` media query override early — any motion added later must respect it

---

## 4.3 Shared Component Library (`client/src/shared/components/`)

Build each of these once, generically, with props — not styled per-role. Every dashboard in later phases consumes these directly.

### `Button/`
- [x] Variants: primary (Archive Green fill), secondary (outline), danger (for reject/withdraw actions), ghost (for tertiary actions)
- [x] States: default, hover, focus-visible (must be visibly distinct — accessibility baseline), disabled, loading (spinner)
- [x] Sizes: sm, md, lg

### `Table/`
- [x] Generic column-config API (`columns`, `data`, `onRowClick`)
- [x] Sortable column support (client-side or server-side toggle)
- [x] Empty state slot (renders `EmptyState` component when `data` is empty)
- [x] Loading skeleton state
- [x] This is what every manuscript list, user list, and reviewer list in later phases will use — invest real time here

### `StatusBadge/`
- [x] Must render every value from `manuscript_status_enum`, `editorial_decision_enum`, `review_recommendation_enum`, `assignment_status_enum` with distinct color mapping (not just one generic "pill" color for everything)
- [x] Color mapping should use semantic meaning: rejected/desk_rejected → danger tone, accepted/published → success tone, under_review/pending → warning/neutral tone, draft → grey
- [x] Build a single `statusColorMap.js` constants file in `shared/utils/` — this is the frontend mirror of the backend enum lists from Phase 2

### `Modal/`
- [x] Base modal with backdrop, focus trap, Escape-to-close, and return-focus-on-close (accessibility baseline)
- [x] Confirmation variant (used for destructive actions: desk reject, withdraw, disable account)

### `FileUpload/`
- [x] Drag-and-drop + click-to-browse
- [x] Client-side validation hooks (extension, MIME, size) — actual enforcement rules come in Phase 5, but the component should accept a `validate` prop now
- [x] Progress indicator (uploads will go to Cloudinary in Phase 5)
- [x] Multi-file support with a file list + remove-before-submit

### `FormField/`
- [x] Wraps label + input/select/textarea + error message + helper text in one consistent unit
- [x] Built-in validation state styling (error border/color from tokens)

### `Pagination/`
- [x] Page number + prev/next, works with any `Table` via shared `usePagination` hook (from Phase 1 scaffold)

### `EmptyState/`
- [x] Generic "nothing here yet" component with icon slot, message, and optional CTA button — used across every dashboard's empty queues

### `Toast/`
- [x] Success/error/info variants, auto-dismiss, stacking behavior for multiple simultaneous toasts

**Todos:**
- [x] Build a lightweight internal style-guide page (e.g. `/dev/components` route, not shipped to production) showing every component + variant — this becomes your visual QA reference for every phase after this one
- [x] Confirm every interactive component has a visible keyboard focus state before moving on

---

## 4.4 Layouts

### `PublicLayout.jsx`
- [x] Header: journal name/logo, primary nav (Home, About, Board, Guidelines, Current Issue, Archives, Ethics, Contact), Login button, Search icon
- [x] Footer: journal contact info, ISSN, publisher info, links to Ethics/Guidelines
- [x] Must look and feel like a journal's public presence — not a dashboard with a different logo

### `DashboardLayout.jsx`
- [x] Sidebar navigation — **content is entirely role-driven** (reads `useRole()` from Phase 3, renders only that role's menu items)
- [x] Top bar: current user name/avatar, notifications icon (wired up in Phase 7), logout
- [x] Uses the same design tokens as the public site but a visibly distinct layout structure (sidebar vs top-nav) so users always know which "mode" they're in

**Todos:**
- [x] Build both layouts against the tokens from 4.2 before touching individual pages
- [x] Confirm `DashboardLayout` renders correctly for a mocked user of each of the 5 roles (use temporary hardcoded role props if Phase 3's real auth context isn't wired into this branch yet)

---

## 4.5 Public Pages

Build each against `PublicLayout`. Content marked "static" can ship as hardcoded copy now and move to CMS-style `journals`/`submission_guidelines` data later if desired — don't block this phase on content-management tooling.

| Page | Data source | Primary actions | Notes |
|---|---|---|---|
| **Home** | `journals` (static for v1) | Read scope, open Current Issue, Submit Manuscript, Search | This is the hero — apply the signature element here |
| **About Journal** | `journals.description` | Read | |
| **Editorial Board** | `users` filtered by role = editor (public-safe subset of fields only) | View board members | Never expose email/internal fields publicly |
| **Submission Guidelines** | `submission_guidelines` (published version) | Read; proceed to submission | Renders `content` field, must support rich text/markdown |
| **Submit Manuscript** | — | Start submission (auth-gated) | If not logged in, redirect through Google OAuth first, then land back here |
| **Current Issue** | placeholder for now — real publication module is a later expansion per the original spec | Browse articles | Build the page shell now; full population depends on a publication module not yet in scope |
| **Archives** | same as above | Search/browse back issues | Shell now, populate later |
| **Publication Ethics** | static content | Read | |
| **Contact** | `journals.contact_email` + a contact form | Submit enquiry | Contact form just needs to send an email (Phase 7 wires real email sending — stub it for now) |
| **Login** | — | Continue with Google | Wires into Phase 3's OAuth flow |
| **Search** | manuscripts/articles marked publicly visible only | Search and open permitted content | Scope this to published content only — never expose in-review manuscripts publicly |

**Todos:**
- [x] Build all 11 pages against `PublicLayout`
- [x] Confirm none of them accidentally leak non-public data (e.g. Editorial Board page must not query the full `users` table with all columns)
- [x] Confirm "Submit Manuscript" correctly gates through login before reaching the actual submission flow (real submission logic is Phase 5 — this page just needs the correct entry-point behavior)
- [x] Mobile responsiveness pass on every public page — this is the first thing readers/authors see

---

## 4.6 Public vs Dashboard Separation

- [x] Confirm `PublicLayout` and `DashboardLayout` share zero navigation components — they should feel like two different products that happen to share a design system
- [x] Confirm dashboard routes (`/author/*`, `/editor/*`, etc.) never render `PublicLayout`, and public routes never render `DashboardLayout`
- [x] Confirm the router (`AppRouter.jsx` from Phase 1) cleanly splits these two route trees

---

## 4.7 Accessibility & Responsive Baseline

- [x] All interactive elements reachable via keyboard, with visible focus rings using token colors (not browser default blue, but still clearly visible — don't sacrifice accessibility for aesthetics)
- [x] Color contrast checked for all text/background combinations in the palette (Ink Navy on Vellum, Ink Black on Surface, etc.) against WCAG AA
- [x] `prefers-reduced-motion` respected on any transitions/animations
- [x] Responsive breakpoints tested: mobile (~375px), tablet (~768px), desktop (~1280px+)
- [x] Semantic HTML throughout (proper heading hierarchy, `<nav>`, `<main>`, `<footer>` landmarks)

---

## 4.8 Testing

- [x] Visual QA pass against the internal style-guide page for every shared component
- [x] Every public page renders correctly at all three breakpoints
- [x] Lighthouse or axe accessibility audit on Home and one dashboard page — fix any critical/serious issues before moving on
- [x] Confirm `StatusBadge` correctly renders every enum value from Phase 2 with no fallback/unstyled cases
- [x] Confirm dashboard sidebar renders correctly (and only) the right menu set for each of the 5 roles

---

## 4.9 Exit Criteria for Phase 4

You're ready for **Phase 5 — Author & Manuscript Submission Module** when:
- [x] Design tokens are finalized and in use — no more placeholder styling
- [x] Full shared component library exists and is documented on the internal style-guide page
- [x] Both layouts (`PublicLayout`, `DashboardLayout`) are built and role-aware
- [x] All 11 public pages are live and responsive
- [x] Accessibility baseline (contrast, focus states, semantic HTML) is met
- [x] No public page leaks non-public data
