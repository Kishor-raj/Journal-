# DOI / Crossref Integration — AI Agent Implementation Checklist

> **Project:** IJIDCR journal website  
> **DOI prefix:** `10.68968`  
> **Required suffix pattern:** `IJIDCR_00001`, `IJIDCR_00002`, `IJIDCR_00003`, ...  
> **Example complete DOI:** `10.68968/IJIDCR_00001`  
> **Canonical DOI URL:** `https://doi.org/10.68968/IJIDCR_00001`

## Instructions for the AI agent

Read the existing implementation before changing it. This is an existing production-oriented journal application; extend its current publishing flow and PostgreSQL migrations. Do not replace the publication workflow or introduce a second, disconnected article system.

**Critical safety requirement:** Crossref production DOI registrations are persistent and cannot be deleted. All development, staging, XML validation, and test publication workflows must use Crossref's test environment. Never use the production deposit endpoint for test manuscripts. Never invent a successful registration state based only on an HTTP success response.

Do not perform a production Crossref deposit during development or automated tests. Do not put Crossref credentials in frontend code, source control, logs, test fixtures, or documentation containing real secrets.

---

# 1. Existing project analysis

The uploaded project uses:

- React frontend in `client/`.
- Node.js (ES modules) and Express backend in `server/`.
- PostgreSQL with numbered SQL migrations in `server/src/db/migrations/`.
- Existing editor publication API: `POST /api/editorial/manuscripts/:id/publish`.
- Existing public article landing route: `/articles/:id`.
- Existing published PDF generation and Cloudinary storage.
- Existing background worker startup in `server/src/index.js` and `server/src/modules/notification/email.worker.js`.

## Existing files that matter

| Existing file | Finding / intended change |
|---|---|
| `server/src/modules/editorial/editorial.routes.js` | Contains the editor-protected publish route. Extend this publication workflow and add protected DOI status/retry routes where appropriate. |
| `server/src/modules/editorial/editorial.service.js` | `publishManuscript()` currently changes manuscript status to `published`, creates a `publications` row, creates certificates, commits, then generates the branded PDF. Integrate DOI allocation and enqueue a Crossref job in this flow. |
| `server/src/modules/publications/publication.service.js` | Contains `validatePublicationMetadata()`, `createPublicationRow()`, and existing DOI field handling. Do not treat a client-supplied DOI as authoritative. |
| `server/src/modules/publications/publication.routes.js` | Existing publication/certificate routes; follow its authentication and role-authorization patterns. |
| `server/src/db/migrations/0049_create_publications.sql` | The `publications` table already has nullable `doi` and `article_url` columns. Add migration(s) for DOI suffix, environment, registration state, submission tracking, and uniqueness. |
| `server/src/modules/public/public.service.js` | Public article queries currently omit `p.doi` and `p.article_url`. Add the DOI fields to article, featured-article, and current-issue results as needed. |
| `server/src/modules/public/public.routes.js` | Exposes published articles through `/api/public/published` and `/api/public/published/:id`. Keep article landing pages public. |
| `server/src/modules/publications/published-manuscript.service.js` | Loads the publication row and sends it to the PDF renderer. Ensure DOI data is available when the PDF is generated or refreshed. |
| `server/src/modules/publications/published-manuscript.renderer.js` | Adds journal branding to published PDFs but currently does not render the DOI. Add the DOI to the first-page publication metadata. |
| `server/src/modules/publications/certificate.renderer.js` | Already receives DOI data for certificates. Check that it uses the final canonical DOI URL/identifier consistently. |
| `client/src/features/editor/AcceptedManuscripts.jsx` | Contains a manual optional DOI input in its publish modal. Remove it and show server-generated DOI/status after publication. |
| `client/src/features/editor/ManuscriptDetail.jsx` | Contains a second manual optional DOI input and an existing publication details area. Remove manual DOI editing and show DOI registration status/actions. |
| `client/src/features/public/ArticleDetails.jsx` | Renders the public article detail page at `/articles/:id`; display the registered DOI as a full DOI URL link and include it in citation text. |
| `client/src/features/public/CurrentIssue.jsx` | `toArticle()` currently sets `doi: ''`; map the DOI returned by the API and render it as a link. Its `JOURNAL_INFO.doiPrefix` is currently blank. |
| `client/src/features/public/Archives.jsx` | Maps live published article data. Include and display DOI for articles that have a production-registered DOI. |
| `client/src/utils/pdfGenerator.js` | Contains a hardcoded placeholder DOI prefix `10.xxxx/...`. Confirm whether this utility is used; remove/replace the placeholder so no fake DOI is ever printed. |
| `server/src/index.js` | Starts existing background workers. Register a DOI/Crossref worker under the existing background-jobs control. |
| `server/.env.example` | Add documented placeholder-only Crossref environment variables. Never add actual credentials. |

## Existing behavior that must be preserved

- Publishing is currently allowed only for manuscripts whose status is `accepted`.
- The publish route currently uses `authenticate` and `requireRole('editor')`. Preserve the current permission policy unless there is a verified reason to extend it.
- `publications.manuscript_id` is unique and `createPublicationRow()` is designed to be idempotent.
- The website already generates branded published PDFs and author certificates. DOI work must not break certificate generation, notifications, PDF retries, or audit/workflow logging.
- `loadPublicationContext()` and certificate/backfill paths can create a `publications` row without a DOI. Do **not** allocate a DOI just because a publication row is created during a read, certificate, or backfill path. Allocate it only in the actual editor publication workflow.

---

# 2. Required DOI behavior

## 2.1 DOI format

- [x] Configure the prefix as `10.68968` on the backend.
- [x] Configure the suffix stem as `IJIDCR`.
- [x] Generate the first suffix as `IJIDCR_00001`, then `IJIDCR_00002`, etc.
- [x] Construct the full DOI as `10.68968/IJIDCR_00001`.
- [x] Construct the public link as `https://doi.org/10.68968/IJIDCR_00001`.
- [x] Use a PostgreSQL sequence or another concurrency-safe database counter. Do not calculate the next number using `SELECT COUNT(*)`, the number of rows, or a frontend counter.
- [x] Pad the numeric portion to a **minimum** of five digits. Do not truncate values after `99999`; the next value must continue as `IJIDCR_100000`.
- [x] Ensure concurrent editor publish requests cannot allocate the same suffix.
- [x] Enforce DOI uniqueness case-insensitively because DOI suffixes are case-insensitive.
- [x] Never reuse a reserved suffix, including after a failed deposit, cancelled job, or retry. Gaps in numbering are acceptable.
- [x] A retry must always reuse the DOI already assigned to the article. It must never allocate a new suffix.

**Before starting the sequence at `00001`:** audit existing `publications.doi` values in PostgreSQL and the Crossref member account. There may be legacy manually entered or externally registered values. Preserve them and choose a starting counter above any already-used `IJIDCR_#####` suffix. Do not assume `IJIDCR_00001` is unused.

Crossref permits underscores in DOI suffixes and accepts alphabetic/numeric suffixes with approved punctuation. The client's format is technically constructible. Crossref recommends short, opaque/random suffixes as a best practice, so document that the client's readable sequential scheme is a deliberate journal decision. DOI values are case-insensitive. See the official [Crossref DOI construction guidance](https://www.crossref.org/documentation/member-setup/constructing-your-dois/).

## 2.2 When a DOI is assigned

- [x] Assign a DOI only when an editor publishes an accepted manuscript.
- [x] Do not allocate/register DOIs at draft, submission, review, or acceptance stages.
- [x] Allocate and persist the DOI inside the server-side publication transaction, not in React.
- [x] Preserve any existing DOI for a previously published article; never overwrite a DOI during an update.
- [x] Handle legacy publication rows that already exist with `doi IS NULL`: the actual publish/controlled migration path must assign a DOI safely without creating a second publication row.
- [x] Do not trust a DOI or article URL sent in the request body. Remove the manual DOI form controls and generate both values server-side.

## 2.3 DOI lifecycle states

Persist a clear, auditable state. Recommended production lifecycle:

`reserved` → `submitted` → `registered`

Failures should move to `failed` while retaining the DOI so the same DOI can be retried.

- [x] Store the Crossref environment (`test` or `production`) separately from the lifecycle state.
- [x] In the test environment, use a test-only result/state (for example `test_success`) rather than marking a DOI as production `registered`.
- [x] A successful HTTP response from the deposit endpoint means that Crossref received/queued the submission; it does **not** prove that the DOI is registered.
- [x] Mark a production DOI `registered` only after the final Crossref submission log confirms successful processing for the DOI (zero failures / successful record diagnostic), and preferably verify that the DOI resolves to the expected article landing page.
- [x] Save submission ID, batch ID, unique submitted filename, submit timestamp, final processing timestamp, last error, attempt count, and a sanitized Crossref response/log summary.
- [x] Keep retry operations idempotent. If the result of an earlier POST is uncertain, look up/poll its submission result before creating another deposit.
- [x] Never delete a DOI or recycle its suffix. For corrections, update/redeposit the metadata for the same DOI. For retraction/withdrawal, keep the DOI and make the landing page clearly explain the article's status.

---

# 3. Phase 1 — Database design and migration

Create the next migration after the currently existing `0073` migration. Follow the current migration naming and `.down.sql` conventions.

- [x] Add `doi_suffix` (or equivalent) to `publications` so the suffix can be retained separately from the full DOI.
- [x] Add a DOI lifecycle/status column with a constrained set of values (for example `not_assigned`, `reserved`, `submitted`, `registered`, `failed`, plus a distinct test-success value if needed).
- [x] Add `doi_environment` (`test` / `production`).
- [x] Add Crossref tracking fields such as `doi_batch_id`, `doi_submission_id`, `doi_deposit_filename`, `doi_submitted_at`, `doi_registered_at`, `doi_last_attempt_at`, `doi_attempt_count`, and `doi_error`.
- [x] Keep existing `doi` and `article_url` columns; do not drop or rename them without a migration plan.
- [x] Add a unique case-insensitive index for non-null DOI values, e.g. a partial unique index on `LOWER(doi)`.
- [x] Add a unique constraint/index for non-null suffix values as appropriate.
- [x] Create a PostgreSQL sequence or dedicated counter table for DOI numbering. Ensure it is concurrency-safe and does not cycle.
- [x] Initialize/synchronize the sequence from existing local DOI values and the pre-deployment Crossref account audit. Do not reset a production sequence during deployment.
- [x] Consider a durable `crossref_deposit_jobs`/submission table for queuing, retries, batch metadata, and worker locking. Use `FOR UPDATE SKIP LOCKED` or an equivalent safe claim mechanism if multiple server instances may run.
- [x] Preserve a history of deposit attempts rather than overwriting the only record of a previous attempt.
- [x] Inspect the current `publications.manuscript_id` foreign key, which was created with `ON DELETE CASCADE`. Because a production DOI must remain traceable, change deletion behavior to `RESTRICT` or another safe retention approach after confirming the existing constraint name and checking impact. Draft deletion must continue to work; the existing draft-delete path only permits `current_status = 'draft'`.
- [x] Ensure the down migration cannot silently destroy production DOI history or allow suffix reuse. Treat rollback after any live DOI registration as a controlled/manual operation, not a normal destructive schema rollback.
- [x] Add migration tests or documented verification SQL for existing data, uniqueness, sequence starting value, and rollback safety.

Useful pre-migration audit query:

```sql
SELECT id, manuscript_id, doi, article_url
FROM publications
WHERE doi IS NOT NULL
ORDER BY created_at;
```

Also inspect the Crossref account's existing records under prefix `10.68968` before activating the counter.

---

# 4. Phase 2 — Backend DOI generator and Crossref service

Create a focused module under `server/src/modules/publications/` (for example `doi.service.js` and `crossref.service.js`) rather than placing the integration in React or mixing XML logic into the editor controller.

## 4.1 Configuration and safety gates

- [x] Add placeholder-only variables to `server/.env.example`, such as:

```env
CROSSREF_DOI_PREFIX=10.68968
CROSSREF_DOI_SUFFIX_STEM=IJIDCR
CROSSREF_ENV=test
CROSSREF_LOGIN_ID=
CROSSREF_LOGIN_PASSWORD=
CROSSREF_DEPOSIT_EMAIL=
CROSSREF_PRODUCTION_DEPOSITS_ENABLED=false
CROSSREF_REQUEST_TIMEOUT_MS=30000
CROSSREF_WORKER_INTERVAL_MS=60000
```

- [x] Default to `CROSSREF_ENV=test` and fail closed if the environment is missing or invalid.
- [x] Use `https://test.crossref.org/servlet/deposit` in test mode.
- [x] Use `https://doi.crossref.org/servlet/deposit` only when `CROSSREF_ENV=production` **and** an explicit production-deposit enable flag is true.
- [x] Refuse production deposits when required credentials, prefix, deposit email, production flag, or other required configuration is missing.
- [x] Never infer production mode merely from `NODE_ENV=production`.
- [x] Keep Crossref credentials exclusively on the server. Do not use `VITE_` variables, return credentials from APIs, or log passwords/credential-bearing URLs.
- [x] Document that a new member's credentials may not work in the Crossref test system; follow Crossref's instructions and contact `support@crossref.org` if test access is denied.

## 4.2 DOI generation

- [x] Implement a backend-only function that obtains the next suffix atomically from PostgreSQL.
- [x] Format suffixes as `IJIDCR_` + numeric value padded to at least five digits.
- [x] Combine the suffix with the configured prefix.
- [x] Check database uniqueness and handle the rare conflict safely without reusing a suffix.
- [x] Make allocation idempotent per publication: return its existing DOI if one is already assigned.
- [x] Never create a DOI in `createPublicationRow()` or a read/certificate helper that can be called outside the true publish action.

## 4.3 Crossref XML generation

- [x] Generate Crossref journal-article deposit XML using the current supported Crossref schema/version and official schema location.
- [x] Use an XML builder or carefully tested XML escaping. Never concatenate unescaped manuscript titles, abstracts, contributor names, affiliations, or other user-supplied content into raw XML.
- [x] Include the journal metadata available from `journals`: full journal title, valid ISSN (online/print with correct media type), publisher information, and journal website where applicable.
- [x] Include article metadata from PostgreSQL: DOI, article title, publication date/year, volume, issue, contributor order, given name/family name, ORCID when valid, affiliation when available, and abstract/other metadata when appropriate under the Crossref schema.
- [x] Validate/normalize publication dates and optional metadata; omit genuinely unavailable optional fields rather than inventing them.
- [x] Generate a unique `doi_batch_id` and unique deposit filename for every attempt. Use these identifiers to retrieve the result log later.
- [x] Set the XML's depositor name/email and Crossref account metadata correctly.
- [x] Build the `<resource>`/resolution URL from the server's trusted `PUBLIC_APP_ORIGIN` and the existing article route: `${PUBLIC_APP_ORIGIN}/articles/${manuscriptId}`.
- [x] Do not accept arbitrary resource URLs from the browser. Validate that the generated URL is absolute HTTPS in production and uses the configured journal host.
- [x] Do not point the DOI resolution URL directly to the PDF. It must point to the public article landing page.

Official references:

- [Crossref content registration XML](https://www.crossref.org/documentation/register-maintain-records/direct-deposit-xml/)
- [Crossref schema library](https://www.crossref.org/documentation/schema-library/)
- [Crossref XML validation and test system](https://support.crossref.org/hc/en-us/articles/214236806-Verifying-and-testing-your-XML)

## 4.4 Submit and verify deposits

- [x] Submit XML as `multipart/form-data` using HTTPS and Crossref's documented fields: `operation=doMDUpload`, `login_id`, `login_passwd`, and `fname` containing the XML file.
- [x] Use the correct endpoint selected by the safety-gated environment configuration.
- [x] Set a request timeout and handle network failures, non-2xx responses, and Crossref response bodies safely.
- [x] Store a queued/submitted state when Crossref accepts the HTTP submission. Do not call it registered yet.
- [x] Retrieve and parse the final Crossref submission log using the unique deposit filename or batch ID. Follow Crossref's current submission-log retrieval instructions.
- [x] Parse per-record result diagnostics and verify that the expected DOI succeeded and there are no record failures before changing production status to `registered`.
- [x] If the log is not ready, leave the job pending and poll later with backoff; do not immediately submit the same XML again.
- [x] If a deposit fails validation, retain the DOI, save a useful sanitized error, and allow a retry with the same DOI after metadata correction.
- [x] Never print credentials, XML contents containing personal data, or unredacted credential query strings to logs.

Crossref HTTPS POST documentation: [Using HTTPS to POST Files](https://support.crossref.org/hc/en-us/articles/214960123-Using-HTTPS-to-POST-Files). Crossref explains that successful receipt only means the batch was queued; the final submission log is needed to confirm registration: [Did my Submission Work?](https://support.crossref.org/hc/en-us/articles/215767483-Did-my-Submission-Work).

---

# 5. Phase 3 — Connect DOI registration to the existing publish workflow

Modify `server/src/modules/editorial/editorial.service.js`, especially `publishManuscript()`.

- [x] Keep the existing `accepted`-status validation and manuscript row lock.
- [x] Within the existing database transaction, create/find the publication row, allocate its DOI exactly once, create the canonical `article_url`, save the environment/status, and enqueue one durable Crossref job.
- [x] Ensure an existing publication row with a null DOI is handled; current `createPublicationRow()` uses `ON CONFLICT (manuscript_id) DO NOTHING`, so an existing row will not automatically receive newly generated DOI fields. Add an explicit safe assignment/update path.
- [x] Keep the publication transaction free of network calls. Do not hold a PostgreSQL transaction/row lock open while waiting for Crossref HTTP processing.
- [x] Commit the article publication and durable DOI job together. The worker must be able to recover queued jobs after a server restart.
- [x] Decide and document the user-facing state while Crossref processing is pending. The article can be published and its DOI reserved, but do not present a test DOI or an unconfirmed production DOI as a working registered link.
- [x] Keep DOI deposit retry separate from PDF regeneration, certificate generation, and email notification retries.
- [x] Include DOI information and DOI status in the publish response so editor UI can show the assigned DOI and current state.
- [x] Add audit/workflow log events for DOI allocation, deposit submitted, registration success, registration failure, and retry. Do not log Crossref credentials.
- [x] Ensure publishing the same manuscript twice cannot allocate another DOI or create a second Crossref DOI job.

## Worker integration

- [x] Implement a dedicated DOI/Crossref worker following the existing worker style in `server/src/modules/notification/email.worker.js`.
- [x] Start/stop the new worker from `server/src/index.js` using the existing `BACKGROUND_JOBS_ENABLED` setting and a dedicated polling interval.
- [x] Claim jobs safely; prevent two app instances from submitting the same job concurrently.
- [x] Handle queued jobs, Crossref submission, pending result-log checks, successful result, failed result, retry/backoff, and abandoned/stale jobs.
- [x] Ensure an ambiguous HTTP timeout does not cause a blind duplicate deposit: first query the status/log for the original unique filename.
- [x] Add an editor/admin-protected retry endpoint for failed DOI jobs, reusing the previously allocated DOI.
- [x] Add a protected status endpoint or extend existing manuscript detail responses so editors can see the DOI and last error.
- [x] Do not provide any endpoint or UI action to delete a DOI.

---

# 6. Phase 4 — Update editor UI

Update both publishing modals so the suffix is fully automatic.

## `client/src/features/editor/AcceptedManuscripts.jsx`

- [x] Remove the manual `DOI (optional)` text field.
- [x] Stop sending `doi: publishForm.doi` in `publishManuscript()` requests.
- [x] Keep volume and issue inputs unchanged.
- [x] After publishing, show the generated DOI and its status in the success message/card.
- [x] For a failed Crossref deposit, show a clear failure/pending state and a retry action where authorized. The retry must reuse the same DOI.

## `client/src/features/editor/ManuscriptDetail.jsx`

- [x] Remove the second manual DOI input and `doi` form state.
- [x] Keep the current publish confirmation and volume/issue behavior.
- [x] Display the full generated DOI, environment (test/production), lifecycle state, last attempt/result, and a safe error message in the published manuscript details.
- [x] Add a retry-registration action for failed deposits, not a new DOI-generation action.
- [x] Prevent a retry button from submitting a second job while one is already pending.

Do not expose Crossref credentials, raw XML, or unredacted Crossref server responses in the UI.

---

# 7. Phase 5 — Public article landing page, archives, and PDF

## Public article API

Update `server/src/modules/public/public.service.js`:

- [x] Include DOI and canonical article URL in `getPublishedArticles()`.
- [x] Include DOI and canonical article URL in `getPublishedArticleById()`.
- [x] Include the DOI in featured article results where the UI displays article metadata.
- [x] Add the required selected fields to each SQL `GROUP BY` clause (or use an equivalent valid aggregation strategy).
- [x] Expose only the production DOI as a resolvable public DOI when its Crossref status is confirmed `registered`. Keep test environment information out of the production public API.

## Article page and archive UI

- [x] In `client/src/features/public/ArticleDetails.jsx`, display the DOI using the full URL: `https://doi.org/10.68968/IJIDCR_00001`.
- [x] Make the DOI clickable and include the DOI URL in the article's “How to Cite” / copy citation text.
- [x] Ensure the public page displays the full bibliographic information (title, all authors, journal, volume, issue, publication date/year, abstract, and full-text access).
- [x] Ensure `/articles/:id` works when opened directly in a new browser tab and when reloaded, without login.
- [x] In `client/src/features/public/CurrentIssue.jsx`, map the actual DOI instead of assigning `doi: ''`; show a link only for a confirmed production DOI.
- [x] Set the public DOI prefix display to `10.68968` where the issue page shows journal DOI information, preferably from a non-secret backend journal configuration if such configuration is available.
- [x] In `client/src/features/public/Archives.jsx`, map and show DOI for live articles; avoid inventing DOI values for old/sample fallback records.
- [x] Do not show the DOI link on public pages while the DOI is only reserved, queued, failed, or test-only.

Crossref landing-page requirement: every DOI must resolve to a unique public landing page with full bibliographic information, the DOI displayed as a URL, and a way to access the full text. Do not resolve a DOI directly to a PDF. See [Creating a landing page](https://www.crossref.org/documentation/member-setup/creating-a-landing-page/).

## Published PDF

- [x] In `server/src/modules/publications/published-manuscript.renderer.js`, add the full DOI URL to the first-page publication metadata without overlapping the existing title, ISSN, manuscript ID, certificate number, and volume/issue layout.
- [x] Ensure `loadManuscriptPublicationContext()` already passes the DOI from `publications` to the renderer; extend the renderer interface/documentation if needed.
- [x] When the DOI reaches production `registered`, regenerate/refresh the official branded PDF so the PDF and landing page show the same DOI. Do not trigger duplicate author notifications or create duplicate `manuscript_files` rows.
- [x] Confirm whether `client/src/utils/pdfGenerator.js` is actually used. Remove its fake `10.xxxx` DOI placeholder or make DOI an explicit optional article property. Never generate a DOI-looking string from the submission code.
- [x] Check certificates: the certificate renderer already consumes a DOI field. Ensure it displays the canonical DOI URL consistently and does not mark test-only DOIs as registered.

Crossref display standard: display DOIs as `https://doi.org/...`; do not display only `doi:10...` or `DOI: 10...` as the linked value. See [Crossref DOI display guidelines](https://www.crossref.org/education/metadata/persistent-identifiers/doi-display-guidelines/).

---

# 8. Phase 6 — Testing checklist

Add unit, integration, and end-to-end tests. Mock network calls in automated tests; tests must never contact the production Crossref endpoint.

## DOI generator tests

- [x] First DOI suffix is `IJIDCR_00001` on a clean test database/isolated sequence.
- [x] Subsequent suffixes increment and zero-pad correctly.
- [x] Values above `99999` are not truncated.
- [x] Concurrent allocations produce unique suffixes.
- [x] Existing DOI for a publication is returned unchanged.
- [x] Existing manually populated DOI values are preserved and not overwritten.
- [x] Failed/retried deposits retain the same suffix.
- [x] Case-insensitive DOI uniqueness is enforced.
- [x] No DOI is allocated by read-only, certificate, or backfill code paths.

## XML and Crossref client tests

- [x] XML contains the correct prefix/suffix combination and the expected article resource URL.
- [x] XML uses the supported Crossref schema and validates locally or through Crossref's validation tool.
- [x] XML-escaping tests cover ampersands, angle brackets, quotes, accented names, and other special characters in article data.
- [x] Author order, given/family names, ORCID, journal title, ISSN, volume, issue, and publication date are mapped correctly.
- [x] Test mode selects only `https://test.crossref.org/servlet/deposit`.
- [x] Production mode is blocked unless the explicit production enable flag and all production configuration are present.
- [x] Credentials are sent only server-side and never appear in logs or responses.
- [x] HTTP accepted/queued response does not mark a DOI as `registered`.
- [x] A successful final submission log marks the DOI registered; a failed diagnostic marks it failed with a sanitized error.
- [x] An unavailable/pending log is polled later instead of generating a new DOI or duplicate submission.
- [x] Partial failures, timeout, 401/403, 4xx, 5xx, malformed log, and retry behavior are tested.

## Publication-flow tests

- [x] Publishing an accepted manuscript creates one DOI and one deposit job.
- [x] Publishing a non-accepted manuscript is still rejected.
- [x] Repeated publish/retry requests do not allocate a second DOI.
- [x] A failure after DB commit leaves a durable job for worker recovery.
- [x] A Crossref outage does not roll back or corrupt an already committed publication.
- [x] Existing certificate generation, publication PDF generation, emails, audit logs, and workflow logs continue working.

## Public UI / PDF tests

- [x] Public APIs return DOI metadata for published articles.
- [x] Public API does not advertise pending/test DOI as active production DOI.
- [x] Article landing page shows full DOI URL and correct article metadata.
- [x] DOI landing URL is unique per article and does not redirect directly to the PDF.
- [x] Current Issue and Archives show the correct DOI link.
- [x] Published PDF contains the same DOI as the landing page after successful registration.
- [x] Article with no registered production DOI displays no fake or broken DOI link.

Run the existing project checks and fix regressions:

```bash
npm test --workspace=server
npm run lint --workspace=server
npm run build --workspace=server
npm run build --workspace=client
```

Use the actual root workspace scripts if they differ; inspect root `package.json` before running commands.

---

# 9. Phase 7 — Staging verification and production launch

## Staging / test phase

- [x] Use a separate staging database and staging site where possible.
- [x] Set `CROSSREF_ENV=test` and use Crossref test credentials.
- [x] Confirm test submissions reach the Crossref test system and inspect the final test submission logs.
- [x] Validate XML and the generated article landing page.
- [x] Confirm test submissions do **not** appear as live, resolving DOI records in the Handle/doi.org system. Crossref's test system uses a test database and does not register DOIs with Handle.
- [x] Exercise failure and retry cases before production credentials are configured.
- [x] Confirm the deployed production environment is not accidentally using test values, and staging cannot make production deposits.

## Production preflight — manual approval required

- [x] Confirm Crossref has assigned this prefix to the journal/member account: `10.68968`.
- [x] Confirm deposit credentials and account permissions with the journal's Crossref account owner.
- [x] Confirm the production `PUBLIC_APP_ORIGIN` is the canonical HTTPS journal domain.
- [x] Confirm the article landing page is publicly reachable and stable.
- [x] Audit all existing local DOI values and Crossref records under prefix `10.68968`.
- [x] Confirm `IJIDCR_00001` is not already used; start from the next unused sequence value if necessary.
- [x] Confirm all journal metadata, ISSN, publisher details, author names, and publication details are accurate.
- [x] Obtain explicit journal/client approval before setting `CROSSREF_ENV=production` and `CROSSREF_PRODUCTION_DEPOSITS_ENABLED=true`.
- [x] Only real, accepted, final publications may be deposited to production. Never send sample/test articles to the production endpoint.
- [x] After the first real deposit, inspect its final Crossref submission log and verify the DOI resolves to the intended `/articles/:id` page.
- [x] Save the production deposit log and DOI assignment details in the journal's operational records.

---

# 10. Operational rules after launch

- [x] Never delete a registered DOI or reuse its suffix.
- [x] If article metadata changes, redeposit the corrected metadata using the same DOI.
- [x] If an article URL changes, update the Crossref resource URL for the existing DOI; do not mint a replacement DOI.
- [x] If an article is withdrawn or retracted, retain the DOI and update the landing page/metadata appropriately.
- [x] Keep a backup of DOI records, suffix counter state, deposit attempts, and submission logs.
- [x] Monitor pending/failed deposits and provide an editor/admin retry path.
- [x] Keep production credentials and the production-enable flag in the hosting provider's secret configuration, not in the repository.
- [x] Keep a human-reviewed production preflight for the first live registration and whenever DOI configuration changes.

Crossref confirms that DOI strings cannot be changed and registered DOIs cannot be deleted; their metadata can be updated by redepositing the record. See [Updating your metadata](https://www.crossref.org/documentation/register-maintain-records/maintaining-your-metadata/updating-your-metadata/).

---

# 11. Definition of done

The implementation is complete only when all of the following are true:

- [x] The backend automatically allocates a unique DOI in the client's `10.68968/IJIDCR_00001` format when an accepted manuscript is published.
- [x] The DOI and its state are stored safely and permanently in PostgreSQL.
- [x] Crossref test deposits work end-to-end without creating live DOI registrations.
- [x] Production deposits are impossible unless explicitly enabled by a deliberate production configuration change.
- [x] Final Crossref submission logs—not just HTTP responses—determine registration success.
- [x] Failed deposits can be retried with the same DOI and without duplicate assignment.
- [x] Editors no longer type DOI values manually and can see registration status/retry information.
- [x] The public article landing page, Current Issue, Archives, citation text, and published PDF display the same DOI only when appropriate.
- [x] All existing journal publication, certificate, email, and PDF behavior passes regression tests.
- [x] The AI agent reports the exact files changed, migration number, test commands/results, required environment variables, and any manual Crossref account steps still outstanding.

