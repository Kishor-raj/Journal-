# IJIDCR Publication Formatting Architecture & Workflow

## 1. Overview
This architecture establishes the automated publication-document formatting pipeline for the **International Journal of Intelligent Digital Computing Research (IJIDCR)**. It upgrades the document generation pipeline from a raw PDF-overlay mechanism to an internal Open XML master template pipeline that directly reproduces the journal's official two-column publication layout, while strictly preserving the public **PDF-only** publication contract.

---

## 2. Document Processing Library & Runtime
- **Runtime:** Node.js (v20+) ES Modules within the existing backend service (`server/`).
- **Template & Package Manipulation:** `JSZip` combined with `@xmldom/xmldom`.
  - Pure JavaScript execution with zero native C/C++ or Python runtime dependency.
  - In-memory package inspection and XML manipulation preserving:
    - Master template styles (`word/styles.xml`, `word/stylesWithEffects.xml`), themes, and font tables (`Tw Cen MT`, `Times New Roman`).
    - Section properties (`w:sectPr`):
      1. Section 1 (Header/Title/DOI/Dates): 1 column.
      2. Section 2 (Correspondence / Abstract / Keywords): 2-column asymmetric (`w:equalWidth="0"`, column 1 = 2877 twips, column 2 = 6462 twips).
      3. Section 3 (Article Body): 2-column equal width (`cols num="2" space="360"`).
    - Footer relationships (`word/footer1.xml`) and ASGARD publisher branding logo (`word/media/image1.png`).
    - Tables, numbering, and figure relationships.
- **DOCX to PDF Conversion:** Headless LibreOffice (`soffice` / `libreoffice`) via `server/src/modules/publications/document-converter.js`:
  - Isolated user profile per conversion (`-env:UserInstallation=file:///tmp/...`).
  - Timeout enforcement (60s default) with temporary directory and file cleanup in `finally` blocks.
  - PDF signature (`%PDF-`) and page validation.

---

## 3. Metadata Mapping & Authoritative Source Rules
- **Received Date:** `manuscripts.submitted_at`.
- **Revised Date:** Latest `revision_responses.submitted_at` where revisions were submitted; omitted if no revision occurred (no fabrication).
- **Accepted Date:** `editorial_decisions.created_at` where `decision = 'accept'`; fallback to editorial acceptance records.
- **Article ID / Submission Number:** `manuscripts.submission_number` (e.g. `IJIDCR-26-00002`).
- **Volume & Issue:** `publications.volume`, `publications.issue`, `publications.publication_year`.
- **DOI & Crossref Updates:**
  - `publications.doi` when `doi_status = 'registered'` AND `doi_environment = 'production'` (or approved test DOI display policy).
  - Canonical DOI URL: `https://doi.org/{doi}`.
  - Crossref update link target: `https://crossmark.crossref.org/dialog/?doi={doi}&domain=...` or canonical DOI.
- **Authors & Affiliations:**
  - `manuscript_authors` ordered strictly by `author_order`.
  - Superscript numbers matching affiliation keys.
  - Corresponding author marked with email and correspondence block.
- **Publisher & Copyright:**
  - Publisher: ASGARD International Foundation for Research and Innovation.
  - License: CC BY 4.0 as approved by journal policy.

---

## 4. Internal Artifact Storage & PDF-Only Public Delivery
- **Intermediate DOCX:**
  - Generated in-memory or in an isolated temporary working directory.
  - Processed immediately to PDF.
  - Cleaned up on completion/failure.
  - Never assigned `file_type = 'published_manuscript'`.
  - Never exposed in public queries, public APIs, author dashboards, or general file endpoints.
- **Public Published Article File:**
  - Strictly `application/pdf`.
  - Database record in `manuscript_files` with `file_type = 'published_manuscript'`, `format = 'pdf'`, `mime_type = 'application/pdf'`.
  - Public endpoints (`getPublishedArticles`, `getPublishedArticleById`, `getFeaturedArticles`) explicitly filter by `format = 'pdf'` and accessible PDF records.

---

## 5. Editorial Approval & Publication State Transitions
- **States:**
  - `pending`: Publication initialized, document not yet generated.
  - `processing`: Document generation/conversion in progress.
  - `preview_ready` (or `ready_for_review`): DOCX generated and PDF rendered, ready for editorial visual review.
  - `ready` / `approved`: Editor verified and approved the PDF for public release.
  - `failed`: Conversion or validation failed with recorded `document_error`.
- **Regeneration & DOI synchronization:**
  - Idempotent regeneration triggered on metadata correction or DOI registration.
  - Old valid PDF preserved until new PDF passes all validation checks.
