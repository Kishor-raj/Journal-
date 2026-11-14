# IJIDCR Publication Formatting – AI Agent Implementation Checklist

> **Purpose:** Upgrade the existing IJIDCR publication-document pipeline to use the client's supplied Word publication design as an internal master template, while preserving the current manuscript, editorial, DOI/Crossref, PDF, and public-article workflows.
>
> **Critical delivery rule:** The final published article must be downloadable **only as a PDF**. A formatted DOCX may be generated internally as an intermediate for PDF conversion and quality checks, but it must never be exposed as a public, author-facing, or general article download.

---

## 0. Non-negotiable requirements

- [x] Use `docs/reference/IJIDCR_Publication_Sample.pdf` as the visual reference for the expected published-page appearance. This PDF is reference-only; do not use it as the source for document generation.
- [x] Use the supplied `IJIDCR -Paper Published design.docx` as the editable structural/source reference when creating the internal master DOCX publication template.
- [x] If the sample PDF is not present at `docs/reference/IJIDCR_Publication_Sample.pdf`, stop and report the missing reference asset instead of guessing another file.
- [x] Create a separate, version-controlled internal master template. Do not edit or overwrite the client's original uploaded reference file.
- [x] Keep author main-manuscript uploads restricted to `.docx`.
- [x] Validate the actual uploaded file as a valid DOCX package on the server; filename extension validation alone is insufficient.
- [x] Preserve each original author-submitted manuscript unchanged.
- [x] Generate a journal-formatted DOCX internally from the source manuscript and verified journal/publication metadata.
- [x] Convert that formatted DOCX to the final publication PDF using the existing LibreOffice conversion capability where appropriate.
- [x] Store and expose the final publication PDF as the published article document.
- [x] Do **not** provide a final DOCX download in the public website, public API, author dashboard, archive, article page, or general-purpose file access endpoint.
- [x] If the generated intermediate DOCX must be retained for editorial/audit reasons, keep it private and accessible only to specifically authorized editorial/admin workflows. Prefer temporary processing storage and deletion after successful PDF generation if retaining it is not required.
- [x] Do not assign, invent, or display a DOI that has not been assigned through the existing DOI workflow. Do not describe a DOI as Crossref-registered until the production registration state confirms it.
- [x] Do not invent received, revised, accepted, publication, author, affiliation, license, funding, or ethics information when it is absent. Require editor correction or leave the relevant optional field out according to the journal's publication policy.
- [x] Do not break existing DOI/Crossref registration, certificates, issue/volume assignment, audit logs, publication status, or retry behavior.

## 1. Repository findings to preserve

The following are confirmed in the supplied codebase. Re-open the current files before editing because line numbers and implementation may change.

### 1.1 Existing publication pipeline

- [x] Review `server/src/modules/publications/published-manuscript.service.js`.
  - Current entry point: `generatePublishedManuscriptPdf(...)`.
  - It resolves an author source file, fetches it from Cloudinary, converts DOCX/DOC directly to PDF, overlays branding, uploads a PDF, and writes a `published_manuscript` file record.
  - It currently accepts `docx`, `doc`, and `pdf` publication source formats. The new publication-generation path must become DOCX-only for the primary author manuscript.
  - It currently records `document_status` values such as `pending`, `processing`, `ready`, and `failed`.
- [x] Review `server/src/modules/publications/published-manuscript.renderer.js`.
  - It uses `pdf-lib` to draw journal branding onto an existing PDF.
  - Decide which branding responsibilities should move into the DOCX template and which, if any, remain as PDF-only post-processing. Avoid duplicating the same header/footer/branding in both layers.
- [x] Review `server/src/modules/publications/document-converter.js`.
  - It converts DOCX/DOC buffers to PDF using a headless LibreOffice process with a temporary working directory and timeout.
  - Reuse or extend this converter for the final formatted DOCX-to-PDF step; retain its temporary-file cleanup and add any required validation/timeout handling.
- [x] Review `server/src/modules/publications/published-manuscript.storage.js`.
  - It stores final PDF files in Cloudinary and builds PDF view/download URLs.
  - Keep the final published PDF storage behavior, or update it safely if the storage contract needs refinement.
- [x] Review `server/src/modules/publications/published-manuscript.test.js` and existing publication tests before changing behavior.

### 1.2 Existing author DOCX upload validation

- [x] Review `client/src/features/author/SubmissionWizard.jsx`.
  - It checks the main manuscript filename extension and uses a `.docx` accept filter.
- [x] Review `server/src/modules/manuscripts/files.service.js` (`confirmUpload`).
  - It currently rejects a main manuscript whose filename extension is not `.docx`.
- [x] Review `server/src/modules/manuscripts/manuscripts.service.js` around submission validation.
  - It also validates the primary manuscript extension.
- [x] Preserve the distinction between the **main manuscript** and supplementary files. The main manuscript is DOCX-only; supplementary-file rules should not be changed accidentally.
- [x] Strengthen server-side validation to inspect the bytes/package structure, not only `original_filename` or client-provided MIME metadata.

### 1.3 Existing editorial and DOI/Crossref workflow

- [x] Review `server/src/modules/editorial/editorial.service.js`.
  - The publication workflow currently invokes `generatePublishedManuscriptPdf(...)` after the publication database transaction.
  - It exposes document status, file ID, error, and download URL to the editor UI.
  - It provides document retry/status service functions.
- [x] Review `server/src/modules/editorial/editorial.routes.js`.
  - Existing editor routes include publish, reprocess-document, and published-document-status operations.
- [x] Review `server/src/modules/publications/crossref.worker.js`.
  - The current worker invokes PDF regeneration after successful DOI registration so the final PDF can reflect the registered DOI.
  - Route this behavior through the new single formatting pipeline; ensure a Crossref retry cannot produce conflicting or duplicate publication artifacts.
- [x] Review `server/src/modules/publications/doi.service.js` and `server/src/modules/publications/crossref.service.js`.
  - Preserve current DOI assignment, test/production environment separation, registration state, and retry semantics.
- [x] Review `client/src/features/editor/AcceptedManuscripts.jsx` and `client/src/features/editor/ManuscriptDetail.jsx` for existing publication document status, download, and retry controls.

### 1.4 Existing public PDF-only presentation

- [x] Review `server/src/modules/public/public.service.js`.
  - Public article queries select the file record where `file_type = 'published_manuscript'` and return download/view URLs for that file.
- [x] Review `client/src/features/public/ArticleDetails.jsx`.
  - The current article detail UI presents a `Download PDF` action.
- [x] Review `client/src/features/public/Archives.jsx` and other public article/featured-article components.
  - They map public file URLs into the article/archive UI.
- [x] Preserve the public published-document contract as PDF-only. Add explicit format/MIME checks so a DOCX record can never be returned as the public published article document.

### 1.5 Existing publication tracking

- [x] Review migration `server/src/db/migrations/0070_add_published_manuscript_tracking.sql`.
  - It adds `document_status`, `document_error`, `document_file_id`, and `document_generated_at` to `publications`.
- [x] Review `server/src/db/migrations/0049_create_publications.sql` and DOI-related migrations such as `0074_add_doi_and_crossref_tracking.sql` before changing publication data.
- [x] Reuse current columns where their meaning still fits. Add a migration only where a distinct approval/revision/version field is genuinely needed.

---

## 2. Phase 1 – Audit and establish the target workflow

- [x] Trace every call site of `generatePublishedManuscriptPdf`, including the editor publish action, Crossref worker, retry action, and backfill script.
- [x] Trace the complete main-manuscript upload path from frontend file selection through upload confirmation and database persistence.
- [x] Trace every public and authenticated endpoint that can return a `published_manuscript` file URL or a manuscript file download URL.
- [x] Inspect file authorization in `server/src/modules/manuscripts/files.service.js`, especially `getFileAccess`, before storing any internal generated DOCX in `manuscript_files`.
- [x] Inspect current `publications` and `manuscript_files` schema constraints, foreign keys, indexes, and storage conventions.
- [x] Confirm how the app stores article title, abstract, keywords, author order, corresponding author, affiliations, submission date, acceptance date, publication date, DOI, volume, and issue.
- [x] Confirm where received/revised/accepted dates are reliably recorded. Do not assume that `updated_at` is the acceptance date.
- [x] Confirm the journal's approved publisher name, logo, copyright notice, license text, and Crossref update-link target. Do not hard-code sample content from the reference document as real publication data.
- [x] Write a short architecture note in the implementation branch before making structural changes. Include the chosen document-processing library/runtime, internal artifact storage decision, and publication approval state transitions.

### Target workflow

- [x] Author submits a valid DOCX main manuscript.
- [x] Original DOCX remains unchanged and retrievable under existing authorized manuscript access rules.
- [x] Editor accepts the manuscript and verifies publication metadata.
- [x] Backend generates a journal-formatted DOCX internally from the master template and manuscript content.
- [x] Backend converts that formatted DOCX into a PDF.
- [x] Editor reviews the PDF preview and approves it for publication, or requests correction/regeneration.
- [x] The approved PDF becomes the single public published-manuscript file.
- [x] Public article pages and archive pages expose PDF download/view only.
- [x] After a DOI registration event changes the DOI metadata, regenerate the PDF through the same pipeline and keep the public file synchronized with the authoritative DOI state. Ensure the approval policy for regenerated PDFs is explicit.

---

## 3. Phase 2 – Add reference assets and create the IJIDCR master DOCX template

- [x] Ensure the sample PDF is added to the repository at `docs/reference/IJIDCR_Publication_Sample.pdf`. Create the `docs/reference/` directory if it does not exist.
- [x] Treat `docs/reference/IJIDCR_Publication_Sample.pdf` as a visual comparison/reference document only; inspect its page size, margins, columns, typography, metadata placement, footer, tables, and page flow. Do not attempt to convert the sample PDF into the publication DOCX.
- [x] Keep the supplied editable `IJIDCR -Paper Published design.docx` available to the implementation agent as the source design while building the internal master template. Do not commit confidential/sample manuscript content unless approved; remove sample article content from the production master.
- [x] Keep the internal master DOCX at a server-side asset path such as `server/src/assets/templates/IJIDCR_Publication_Template.docx` (confirm the final path against deployment/build packaging rules).

- [x] Add a dedicated server-side template asset, for example `server/src/assets/templates/IJIDCR_Publication_Template.docx` (confirm the final path against the deployment/build packaging rules).
- [x] Do not place the internal publication master in `client/public/` or another publicly served static directory.
- [x] Keep the original client reference file unchanged for traceability.
- [x] Remove the sample research article text and sample author details from the production master while retaining the reference design and structural formatting.
- [x] Replace sample data with clearly identifiable template placeholders or named content regions that the renderer can safely locate.
- [x] Reproduce the reference design's visible elements:
  - [x] Article type label (for example, Research Article), where applicable.
  - [x] DOI area and Crossref update marker/link.
  - [x] IJIDCR journal name and journal identity treatment.
  - [x] Article ID, volume, issue, and publication year.
  - [x] Received, revised, and accepted dates when verified and available.
  - [x] Article title.
  - [x] Correspondence, author names, affiliations, and corresponding-author details.
  - [x] Abstract and keywords.
  - [x] Two-column main article body.
  - [x] Consistent section-heading, paragraph, list, caption, and reference styles.
  - [x] Tables and figures with captions and numbering.
  - [x] ASGARD footer mark/branding.
  - [x] Copyright and license statement, only using the journal-approved terms for the article.
- [x] Inspect the DOCX Open XML package and preserve critical relationships, media, styles, numbering, and section properties.
- [x] The supplied reference template has no Word header XML part, one footer part with ASGARD branding, three section properties, section breaks, one table, and two drawing elements. Confirm the intended final design in Word and LibreOffice rather than blindly relying on those raw counts.
- [x] Verify the page layout in both Microsoft Word-compatible rendering and the server's LibreOffice PDF output. Do not accept a template that only looks correct in one renderer without documenting differences.
- [x] Record template version and update procedure so a future design revision can be introduced without overwriting already-published PDFs.

---

## 4. Phase 3 – Select and implement the DOCX processing strategy

- [x] The current `server/package.json` does not include a DOCX content/template-processing library. Evaluate and document a compatible approach before adding dependencies.
- [x] Compare viable options for the Node.js backend, such as an Open XML package manipulation library, a DOCX templating library plus controlled body-content insertion, or a separately deployed document-processing service.
- [x] Choose based on the ability to preserve/produce Word section breaks, two-column sections, footer relationships, hyperlinks, image relationships, tables, lists, equations, and references—not merely on the ability to replace plain text placeholders.
- [x] Prefer one well-tested processing path. Do not add multiple overlapping DOCX libraries without a clear need.
- [x] If a Python service is selected, document service deployment, runtime version, request size limits, authentication, timeouts, error handling, and local development instructions. Do not assume Python is already part of the production backend runtime.
- [x] If processing DOCX Open XML directly, preserve package relationships and content types when copying images, hyperlinks, numbering, styles, footnotes/endnotes, and embedded objects.
- [x] Create a dedicated service boundary, for example `server/src/modules/publications/publication-docx.renderer.js`, rather than adding all DOCX logic to the existing PDF renderer.
- [x] Keep the new renderer deterministic: the same source DOCX, template version, and metadata should produce a materially identical layout.
- [x] Fail safely with a clear editorial error when unsupported content cannot be preserved. Never silently drop an image, equation, table, reference, footnote, or author content.

---

## 5. Phase 4 – Validate DOCX submissions securely

- [x] Keep the client `.docx` file picker and extension checks in `client/src/features/author/SubmissionWizard.jsx`.
- [x] Keep matching server-side checks in `server/src/modules/manuscripts/files.service.js` and `server/src/modules/manuscripts/manuscripts.service.js`.
- [x] Add server-side byte-level DOCX validation before accepting a main manuscript as a valid DOCX.
- [x] Confirm the file is a ZIP-based Office Open XML package and contains required parts such as `[Content_Types].xml` and `word/document.xml`.
- [x] Reject renamed PDFs, legacy `.doc`, macro-enabled `.docm`, malformed ZIPs, missing required XML parts, and unexpected file content even when the filename ends in `.docx`.
- [x] Validate MIME type as an additional signal, not as the sole authority.
- [x] Enforce file-size and decompression limits; protect against ZIP bombs, path traversal, oversized embedded images, malformed XML, and resource exhaustion.
- [x] Do not trust `format`, `mime_type`, `public_id`, or file metadata supplied by the browser without server-side validation of the stored object.
- [x] Keep supplementary-file formats governed by the existing supplementary-file policy. Do not accidentally apply the main-manuscript DOCX restriction to all supplementary files.
- [x] Add tests for valid DOCX, renamed PDF, corrupt ZIP, missing `word/document.xml`, DOCM, DOC, PDF, and allowed supplementary files.

---

## 6. Phase 5 – Extract manuscript content and map publication metadata

- [x] Define a canonical content model for the formatter before writing the template renderer.
- [x] Prefer authoritative structured database metadata where it exists; use the manuscript DOCX as the content source for the body and for fields not already captured in the submission record.
- [x] Identify and document precedence rules when the manuscript DOCX and database metadata disagree. The editor must be able to review and correct the final metadata.
- [x] Map the following fields where available:
  - [x] Article type/category.
  - [x] DOI and canonical DOI URL, based on the existing DOI lifecycle and environment.
  - [x] Article ID/submission number (confirm the official displayed format; do not invent a new article ID).
  - [x] Journal name, short name, publisher, logo, ISSN, and website.
  - [x] Volume, issue, and publication year.
  - [x] Received, revised, accepted, and published dates from authoritative stored events.
  - [x] Article title.
  - [x] Authors in the existing `author_order` order.
  - [x] Corresponding-author flag, email, and affiliation.
  - [x] Department, institution, college, country, and other approved affiliation fields.
  - [x] Abstract and keywords.
  - [x] Main body headings and paragraphs.
  - [x] Tables, figures, captions, equations, footnotes/endnotes, and references.
  - [x] Copyright/license statement, ethics, funding, conflict of interest, acknowledgements, data availability, and author contribution statements when supplied/required.
- [x] Review the structured data already maintained by `server/src/modules/manuscripts/manuscripts.service.js`, including manuscript title, abstract, keywords, and `manuscript_authors` details.
- [x] Confirm whether received/revised/accepted event dates are stored. If they are not, propose a migration or editorial metadata fields; never substitute arbitrary timestamps.
- [x] Confirm whether license and copyright details are configurable and supported by signed author agreements. Do not automatically stamp CC BY 4.0 solely because the sample template shows it.
- [x] Treat missing mandatory fields as validation errors before final approval. Treat optional missing fields according to a documented display rule (omit rather than fabricate).
- [x] Preserve author order and corresponding-author details exactly as approved by the editorial metadata.

---

## 7. Phase 6 – Generate the formatted DOCX from the master template

- [x] Add the master-template loader and renderer as a separate publication service.
- [x] Use the template's styles and page structure as the foundation; do not simply paste plain text into a blank document.
- [x] Place verified publication metadata into the designated first-page areas.
- [x] Insert the author/correspondence block and abstract/keywords in the positions shown by the reference design.
- [x] Insert the article body using defined heading and paragraph styles.
- [x] Apply the intended two-column layout and any required section/column breaks.
- [x] Keep first-page metadata/abstract treatment distinct from the two-column continuation body where the template design requires it.
- [x] Retain tables and figures, including media relationships, captions, numbering, and placement as far as supported.
- [x] Handle wide tables and large figures with a documented policy (for example, a temporary one-column section or landscape page only when needed and approved); do not let them overflow or become unreadable.
- [x] Preserve equations and special characters. Add a regression fixture containing representative equations and non-ASCII characters.
- [x] Normalize paragraph spacing, fonts, headings, caption styles, and reference formatting to the approved IJIDCR standard.
- [x] Make references readable and consistent without fabricating bibliographic details or changing citation meaning.
- [x] Ensure the footer logo appears correctly and is not duplicated by the old PDF overlay renderer.
- [x] Add clickable DOI/Crossref links only when the target is valid and known.
- [x] Avoid using sample content from the client's example paper in any generated article.
- [x] Save the generated DOCX to an isolated temporary location for conversion. Delete temporary input/output files on success and failure.
- [x] If the DOCX must be kept for audit/editorial review, store it separately from the public PDF and enforce editor/admin-only access. Do not place it under `file_type = 'published_manuscript'`.

---

## 8. Phase 7 – Produce and validate the final PDF

- [x] Pass the internally generated publication DOCX into `server/src/modules/publications/document-converter.js` for PDF conversion.
- [x] Confirm LibreOffice is installed and available in each target environment; retain the existing `SOFFICE_PATH` support and isolated profile behavior.
- [x] Add/retain timeouts, isolated temporary directories, cleanup, and clear conversion errors.
- [x] Validate that the PDF output exists, is non-empty, starts with a valid PDF signature, and can be opened/parsed before storage.
- [x] Check page count and detect blank pages or obvious rendering failures.
- [x] Confirm the final PDF uses the supplied template's page size, margins, column structure, footer logo, title/metadata layout, abstract/keywords treatment, body headings, tables, figures, and references.
- [x] Verify that tables do not split or clip in unacceptable ways and that images/equations are visible and legible.
- [x] Verify every page, not only the first page. Include a multi-page manuscript test fixture.
- [x] Ensure final PDF metadata and filename are correct and do not contain unintended local file paths or temporary names.
- [x] Decide whether the old `renderBrandedManuscriptPdf()` overlay remains necessary. If the new DOCX template already contains the full design, remove redundant stamping from the new path or limit it to content not already in the template.
- [x] Keep a PDF preview/review output for the editor. The editor approval applies to the PDF that will be published.

---

## 9. Phase 8 – Editorial preview, approval, and publication state

- [x] Extend the existing editor workflow instead of building a parallel publication dashboard.
- [x] Review `client/src/features/editor/AcceptedManuscripts.jsx` and `client/src/features/editor/ManuscriptDetail.jsx` and add controls appropriate to the current UI.
- [x] Provide an editor action to generate or refresh a formatted PDF preview.
- [x] Provide a preview/open action for the generated PDF.
- [x] Provide an explicit approval action before a PDF becomes the public published article file.
- [x] Provide a regenerate action for corrected metadata or manuscript content.
- [x] Display clear processing, ready-for-review, approved, failed, and stale/out-of-date states (final state names must match the migration/API design).
- [x] Do not overload the existing `document_status = 'ready'` to mean both "generated" and "editor-approved" unless the semantics are explicitly changed and all consumers are updated.
- [x] If a new approval state is required, add a reversible migration and update status APIs, tests, and UI consistently.
- [x] Record who generated, reviewed, approved, and regenerated the PDF, with timestamps and workflow logs.
- [x] Prevent public publication of a failed, missing, unapproved, or stale PDF.
- [x] Prevent the PDF from becoming public before its approved final version is stored and linked successfully.
- [x] Handle DOI registration updates consistently. The existing `crossref.worker.js` regenerates the PDF after registration; decide whether this makes the document stale and requires a second editorial approval or whether the DOI-only change follows a defined automatic reapproval policy.
- [x] Make repeated publish/retry requests idempotent. Prevent duplicate files, race conditions, and one job overwriting a newer approved PDF.
- [x] Preserve existing certificate generation and DOI registration outcomes if PDF generation fails; document and test how the editorial UI represents partial success.

---

## 10. Phase 9 – Storage, access control, and PDF-only public delivery

- [x] Keep final public PDF records under the existing `file_type = 'published_manuscript'` contract, or introduce a compatible explicit PDF-only publication document type and update every consumer consistently.
- [x] Set final public file metadata accurately: `.pdf` filename, `format = 'pdf'`, `mime_type = 'application/pdf'`, valid checksum, and correct storage metadata.
- [x] Keep the generated intermediate DOCX out of all public article queries.
- [x] Do not reuse `file_type = 'published_manuscript'` for the internal DOCX.
- [x] If internal DOCX is persisted in `manuscript_files`, update `getFileAccess()` and every relevant endpoint so authors, reviewers, and public users cannot download it. Do not assume the current generic author file-access rule is safe for an internal generated artifact.
- [x] Prefer private backend storage or a protected signed-download endpoint for retained internal DOCX. Do not expose a predictable public Cloudinary raw URL.
- [x] Ensure public services only return records where the stored file is an accessible PDF and metadata matches PDF format/MIME type.
- [x] Check all public methods in `server/src/modules/public/public.service.js`, including article list, article detail, and featured-article queries.
- [x] Check all public frontend components and any generic file endpoints for accidental DOCX links.
- [x] Ensure the article page and archive continue to show **Download PDF** only.
- [x] Ensure a missing/failed PDF produces the existing unavailable/processing state rather than falling back to the original author DOCX.
- [x] Do not expose internal DOCX URL, storage public ID, file ID, or temporary path in public API JSON.
- [x] Keep download-rate limiting and existing public PDF download behavior intact.
- [x] When replacing a previously published PDF, preserve the existing safe replacement/rollback behavior until the new PDF has passed validation and been approved. Do not delete the last good published PDF before the replacement is ready.

---

## 11. Phase 10 – DOI/Crossref integration

- [x] Keep DOI allocation and Crossref deposit logic in their existing services; the DOCX formatter must not allocate DOI values itself.
- [x] Populate the template DOI field only from the publication record under the agreed DOI state policy.
- [x] Preserve the existing distinction between test and production Crossref environments.
- [x] Do not expose test-environment DOI values as production article identifiers.
- [x] Ensure a production DOI registration success triggers regeneration through the same formatter/PDF pipeline so the published PDF displays the correct DOI.
- [x] Make DOI-triggered regeneration idempotent and version-aware.
- [x] Ensure DOI registration failure does not cause a fake DOI value to appear in the PDF.
- [x] Preserve DOI retry controls and existing DOI status/error reporting in the editor UI.
- [x] Test formatting with no DOI, a DOI pending registration, a successful production DOI, and a failed/test DOI state according to the approved display policy.

---

## 12. Phase 11 – Tests and regression coverage

### Unit tests

- [x] DOCX byte/package validation accepts a genuine DOCX and rejects renamed/non-DOCX/malformed files.
- [x] Metadata mapper handles missing optional fields without inventing data.
- [x] Author ordering and corresponding-author formatting are correct.
- [x] DOI display follows the approved DOI state/environment policy.
- [x] Template renderer inserts all supported content types and preserves expected package parts/relationships.
- [x] Temporary files are cleaned up after success and failure.
- [x] PDF storage only accepts valid non-empty PDF buffers.
- [x] Public API mapping returns PDF URLs only.
- [x] Editor-only internal DOCX access is enforced if DOCX retention is implemented.

### Integration tests

- [x] Submit an author DOCX through the full upload path.
- [x] Confirm the original uploaded file checksum remains unchanged after publication generation.
- [x] Publish/prepare a manuscript and generate a formatted PDF through the existing editor workflow.
- [x] Confirm the editor can preview and approve the PDF.
- [x] Confirm only the approved PDF is associated with the public published article record.
- [x] Confirm the public article endpoint and archive endpoint return a PDF download/view URL and no DOCX URL or ID.
- [x] Confirm the public page shows only `Download PDF`.
- [x] Confirm a user cannot obtain the internal DOCX via public routes or general author file access.
- [x] Confirm DOI registration success updates the PDF through the same pipeline.
- [x] Confirm document failure does not corrupt DOI status, certificates, or the last approved public PDF.
- [x] Confirm retries and concurrent generation attempts do not create duplicate/stale records.

### Visual regression fixtures

- [x] Use the supplied client template as the reference design.
- [x] Include a short article and a multi-page article.
- [x] Include multiple authors and affiliations, long title, long abstract, keywords, headings, lists, citations, references, table, wide table, figures, equations, and special characters.
- [x] Render PDFs with the same LibreOffice environment used in deployment.
- [x] Inspect first page, interior pages, and final page. Check margins, columns, text overflow, page breaks, table clipping, image resolution, footer positioning, and page count.
- [x] Record known LibreOffice-vs-Word rendering differences and obtain editorial sign-off on the final template.

### Existing suite

- [x] Run the relevant Vitest tests for publication, manuscripts, file access, editorial workflows, and Crossref.
- [x] Run the full backend test suite (`npm test`) and lint (`npm run lint`) from the server directory.
- [x] Run the client build/test checks available in the repository.
- [x] Run the server build check (`npm run build`).
- [x] Do not report tests as passing unless they were actually executed and the results were inspected.

---

## 13. Phase 12 – Rollout, migration, and backfill

- [x] Add reversible database migrations only for confirmed missing fields or approval/version tracking.
- [x] Keep current published PDF assets available during rollout.
- [x] Do not mass-regenerate historical articles automatically without an explicit rollout decision and backup/rollback plan.
- [x] Identify existing published articles whose PDFs were generated by the old PDF-overlay pipeline.
- [x] Test the new pipeline on a small set of non-public/staging manuscripts first.
- [x] Compare old and new PDFs with editorial review before enabling the new pipeline in production.
- [x] Decide whether historical articles should be regenerated individually, in batches, or left unchanged.
- [x] If a backfill is approved, update `server/src/scripts/backfill-published-manuscripts.js` carefully to use the new DOCX-only source selection and avoid overwriting a good PDF until a new PDF is validated and approved.
- [x] Add template-version and generation-version metadata where needed so future layout changes can be traced.
- [x] Document rollback to the previous generator and previous public PDF record if the new renderer causes a production issue.
- [x] Monitor document-generation failures, LibreOffice errors, generation time, output size, and storage failures after release.

---

## 14. Definition of done / acceptance criteria

- [x] Authors can submit the main manuscript only as a valid `.docx` file.
- [x] Invalid files renamed with a `.docx` extension are rejected by the server.
- [x] The original uploaded manuscript is preserved unchanged.
- [x] The generated document follows the client's IJIDCR publication design, including the first-page metadata/correspondence/abstract treatment, two-column article body, tables/figures/references, and ASGARD footer branding.
- [x] The generated PDF is visually checked across all pages and approved by an editor before public release.
- [x] The final published file is a valid PDF with `application/pdf` metadata.
- [x] The public article detail page, archive, featured article surfaces, and public API expose **PDF download/view only**.
- [x] No public or author-facing interface exposes the generated DOCX.
- [x] No public API response leaks an internal DOCX URL, storage ID, or file ID.
- [x] DOI/Crossref assignment and registration behavior remains correct; DOI changes regenerate the final PDF through the same pipeline.
- [x] Existing certificate, editorial, audit-log, and retry workflows continue to work.
- [x] All relevant tests pass, and the final PDF has been reviewed by the editorial team.

---

## 15. Reference asset locations and important implementation notes for the AI agent

### Required reference files

| Asset | Repository location | How the agent must use it |
|---|---|---|
| Sample published PDF | `docs/reference/IJIDCR_Publication_Sample.pdf` | Visual reference only; compare rendered output against it. Never treat it as a generation template. |
| Supplied editable sample DOCX | Keep the provided `IJIDCR -Paper Published design.docx` available as the source design during implementation; the agent should create the internal master template from it. | Editable structural/style reference; remove the sample article content from the production master. |
| Internal publication master DOCX | `server/src/assets/templates/IJIDCR_Publication_Template.docx` (or another verified server-only asset path) | Actual template loaded by the backend renderer. |

Before implementation, verify that the sample PDF exists at the exact path above. If the client has not supplied or the developer has not copied the PDF into the repository, report that prerequisite clearly.

1. **Inspect before changing:** Verify the current code and tests in the working checkout. This checklist describes findings from the supplied codebase snapshot; do not assume paths or behavior have not changed.
2. **Avoid a second publication system:** Extend `published-manuscript.service.js` and its existing call sites through a clean renderer boundary rather than adding a parallel, disconnected workflow.
3. **Do not confuse the author submission template with the publication master:** The repository already contains author-facing DOCX templates under `client/public/templates/`. The new client-provided publication master is an internal server asset and must not replace those author resources unless the journal explicitly requests that separate change.
4. **Do not keep both branding systems active:** Once the new master DOCX renders the complete publication design, ensure the old PDF branding overlay does not duplicate the title, DOI, logo, or footer.
5. **Do not expose intermediate DOCX files:** The user requirement is PDF-only publication download. Treat the formatted DOCX as an internal processing artifact, not a deliverable.
6. **Do not fabricate missing data:** Missing dates, copyright/license details, affiliations, and DOI states must be resolved from authoritative records or editorial input.
7. **Protect the last good PDF:** Generate, validate, and approve the replacement before changing the public file pointer or deleting an older valid PDF.
8. **Deliver an implementation report:** At completion, summarize changed files, new dependencies, migrations, tests actually run, visual review outcome, and any unsupported manuscript content that still requires editorial handling.

