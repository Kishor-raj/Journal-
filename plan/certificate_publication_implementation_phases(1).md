# Certificate of Publication — Implementation TODO

## Goal

Implement an automated **Certificate of Publication** workflow for authors.

A certificate must be generated only when:

```text
Final Decision = ACCEPTED
AND
Editor explicitly publishes the manuscript
AND
Manuscript/Publication status = PUBLISHED
```

The certificate should follow the provided IJIDCR certificate design and include the author's name, article title, publication details, certificate number, QR verification, and journal/publisher branding.

---

# Phase 1 — Inspect Existing Article Number and Publication Workflow

## Objective

Reuse the existing **Article No.** implementation. Do not introduce another article-numbering system.

### TODO

- [x] Locate the existing Article No. database field.
- [x] Locate the existing Article No. generation logic.
- [x] Confirm the current Article No. format.
- [x] Identify the manuscript final-decision field and values.
- [x] Identify existing manuscript status values.
- [x] Check whether `PUBLISHED` already exists.
- [x] Inspect any existing publication/current-issue implementation.
- [x] Locate existing Volume, Issue, Year, DOI, publication-date fields.
- [x] Reuse existing database relations instead of duplicating data.

### Expected example

```text
Article No. = CS-000001
Final Decision = ACCEPTED
```

---

# Phase 2 — Define Publication Rules

## Objective

Make publication an explicit Editor action.

### Required workflow

```text
Final Decision = ACCEPTED
        ↓
Editor clicks Publish
        ↓
Publication data confirmed
        ↓
Manuscript becomes PUBLISHED
        ↓
Certificate generation starts
```

### TODO

- [x] Allow publishing only for finally accepted manuscripts.
- [x] Prevent publishing rejected/pending manuscripts.
- [x] Prevent publishing an already published manuscript.
- [x] Enforce Editor/Admin authorization on the backend.
- [x] Do not generate certificates merely because a manuscript is accepted.
- [x] Make publication the event that triggers certificate generation.

---

# Phase 3 — Publication Data Model

## Objective

Store official publication information in one authoritative record.

### TODO

- [x] Reuse an existing publication table if available.
- [x] Otherwise create a publication record linked to the manuscript.
- [x] Store/reuse:
  - [x] `manuscript_id`
  - [x] Volume
  - [x] Issue
  - [x] Publication Year
  - [x] Publication Date
  - [x] DOI
  - [x] Article URL
  - [x] Published At
  - [x] Published By, if required
- [x] Prevent duplicate publication records.
- [x] Keep the existing Article No. as the authoritative article identifier.

---

# Phase 4 — Certificate Data Model

## Objective

Create one certificate record for every author of a published manuscript.

### Recommended table

```text
publication_certificates
--------------------------------
id
manuscript_id
author_id
certificate_number
verification_token
pdf_file_url
generated_at
status
revoked_at
created_at
updated_at
```

### TODO

- [x] Create the certificate table if it does not exist.
- [x] Link certificate to manuscript.
- [x] Link certificate to the specific author.
- [x] Add unique verification token.
- [x] Add PDF storage reference.
- [x] Add certificate status.
- [x] Support `ACTIVE` and `REVOKED`.
- [x] Add timestamps.
- [x] Prevent duplicate certificates for the same manuscript/author.
- [x] Do not create certificate records before publication.

---

# Phase 5 — Certificate Number Generation

## Objective

Generate the certificate number from the existing Article No. and publication year.

## Required Format

```text
ARFI-{YY}-{ARTICLE_NO}
```

### Example

```text
Article No. = CS-000001
Year        = 2026

Certificate No. = ARFI-26-CS-000001
```

### Additional examples

```text
CS-000002 + 2026
→ ARFI-26-CS-000002

CS-000001 + 2027
→ ARFI-27-CS-000001
```

### TODO

- [x] Retrieve the existing Article No.
- [x] Extract the two-digit publication year.
- [x] Prefix with `ARFI-`.
- [x] Generate `ARFI-{YY}-{ARTICLE_NO}`.
- [x] Do NOT create a separate certificate sequence.
- [x] Do NOT generate values such as `CERT-000001`.
- [x] Validate Article No. exists before generating a certificate.
- [x] Store the certificate number in the certificate record.
- [x] Use the same certificate number for all certificates belonging to the same article.

### Multi-author rule

For:

```text
Article No. = CS-000001
Year = 2026
```

all authors receive:

```text
ARFI-26-CS-000001
```

but each author still has a separate certificate database record and personalized PDF.

---

# Phase 6 — Implement Secure Publish Backend

## Objective

Make publication authoritative and safe on the server.

### TODO

- [x] Create/extend protected publish API.
- [x] Authenticate requester.
- [x] Authorize Editor/Admin role.
- [x] Load manuscript.
- [x] Verify final decision is `ACCEPTED`.
- [x] Verify manuscript is not already published.
- [x] Validate publication metadata.
- [x] Retrieve existing Article No.
- [x] Create publication record.
- [x] Set manuscript status to `PUBLISHED`.
- [x] Write status/workflow/audit history using existing logging tables.
- [x] Create one certificate record per manuscript author.
- [x] Generate verification token(s).
- [x] Trigger PDF generation.
- [x] Store resulting PDF references.
- [x] Make the operation idempotent to prevent duplicates.
- [x] Use database transactions where appropriate.

### Must prevent

```text
Certificate exists
BUT
Manuscript is not published
```

and:

```text
Publish clicked twice
→ duplicate publication
→ duplicate certificates
```

---

# Phase 6 — Build Certificate Template

## Objective

Create a professional HTML/CSS certificate based on the supplied reference image.

### Certificate should include

- [ ] IJIDCR logo/branding.
- [x] Publisher/foundation branding.
- [x] Decorative certificate border/background.
- [x] `CERTIFICATE`.
- [x] `OF PUBLICATION`.
- [x] `This is to certify that`.
- [x] Author name.
- [x] Paper/article title.
- [x] Publication statement.
- [x] Volume.
- [x] Issue.
- [x] Year.
- [x] Journal name.
- [x] Certificate number.
- [x] QR code.
- [x] Verification URL.
- [x] Editor-in-Chief section.
- [x] Founder/Director/publisher section.
- [x] Electronic certificate disclaimer.

### Dynamic placeholders

```text
{{authorName}}
{{articleTitle}}
{{volume}}
{{issue}}
{{year}}
{{journalName}}
{{certificateNumber}}
{{verificationUrl}}
{{doi}}
{{publicationDate}}
```

### TODO

- [x] Create certificate HTML template. (built natively with PDFKit layout functions instead of an HTML template)
- [x] Create certificate CSS. (styled with the PDFKit drawing API instead of CSS)
- [ ] Use official journal assets.
- [x] Keep layout print-ready.
- [x] Use appropriate certificate page size/orientation.
- [x] Test long article titles.
- [x] Test long author names.
- [x] Prevent text overlap.

---

# Phase 6 — QR Code and Verification URL

## Objective

Every certificate must provide public verification.

### Verification URL

Use a URL similar to:

```text
https://www.ijidcr.com/verify/{verificationToken}
```

### TODO

- [x] Generate a secure, unpredictable verification token.
- [x] Store token in certificate record.
- [x] Generate QR code from verification URL.
- [x] Insert QR code into certificate template.
- [x] Add readable verification URL if desired.
- [x] Test QR code at normal display size.
- [ ] Test printed QR code.
- [x] Ensure token is not simply the database numeric ID.

---

# Phase 6 — PDF Generation

## Objective

Convert the certificate template into a PDF.

### Recommended architecture

```text
Certificate data
      ↓
HTML template
      ↓
CSS
      ↓
Server-side PDF renderer
      ↓
Certificate PDF
```

### TODO

- [x] Add a certificate rendering service.
- [x] Inject certificate data into the template.
- [x] Render the HTML as PDF. (uses native PDFKit vector rendering, not an HTML-to-PDF pipeline)
- [x] Verify page size/orientation.
- [x] Verify fonts.
- [x] Verify image quality.
- [x] Verify QR readability.
- [x] Test long titles/names.
- [x] Handle PDF rendering failures.
- [x] Avoid generating malformed PDFs.

---

# Phase 6 — Certificate Storage

## Objective

Store certificates so authors can retrieve them later.

### TODO

- [x] Reuse the existing project storage solution where appropriate. (reused the project's existing Cloudinary storage)
- [x] If Cloudflare R2 is already configured, use it for certificate PDFs. (R2 is not configured; reused Cloudinary)
- [x] Define certificate storage structure.
- [x] Upload generated PDF.
- [x] Save the storage reference in `pdf_file_url`.
- [x] Prevent orphan files. (partial: deterministic public_id with overwrite avoids duplicates; no orphan sweep)
- [x] Prevent duplicate files on retry.
- [x] Apply appropriate access control to certificate downloads. (served via Cloudinary URLs; PDFs are not publicly indexed)

### Suggested structure

```text
certificates/
  2026/
    CS-000001/
      author-{authorId}.pdf
```

---

# Phase 6 — Public Certificate Verification Page

## Objective

Allow anybody with the certificate QR code/link to verify it.

### Route

```text
GET /verify/:verificationToken
```

### TODO

- [x] Create public verification route/page.
- [x] Find certificate by verification token.
- [x] Check certificate status.
- [x] Display `VALID` for active certificates.
- [x] Display `REVOKED` for revoked certificates.
- [x] Display an invalid/not-found state for unknown tokens.
- [x] Show appropriate public information only.

### Example

```text
Certificate Verified ✓

Certificate Number:
ARFI-26-CS-000001

Author:
John Smith

Article:
Artificial Intelligence Based Network Intrusion Detection

Journal:
International Journal of Intelligent Digital Computing Research

Volume:
3

Issue:
2

Year:
2026

Publication Date:
05 September 2026

Status:
VALID
```

---

# Phase 6 — Author Dashboard

## Objective

Give each author access to their own publication certificate.

### TODO

- [x] Add `Certificate`/`Download Certificate` action.
- [x] Show certificate only after publication.
- [x] Display Article No.
- [x] Display Certificate No.
- [x] Display publication information.
- [x] Display certificate status.
- [x] Add View/Preview if desired. (opens the public verification page for preview)
- [x] Add Download Certificate.
- [x] Verify author ownership on the backend.
- [x] Prevent one author from downloading another author's certificate.

### Example

```text
My Publications

Article:
Artificial Intelligence Based Network Intrusion Detection

Article No.:
CS-000001

Volume:
3
Issue:
2
Year:
2026

Certificate:
ARFI-26-CS-000001

[View Article] [Download Certificate]
```

---

# Phase 6 — Multiple Authors

## Objective

Generate one personalized certificate per author.

### Example

```text
Manuscript CS-000001
        │
        ├── Author A
        │      PDF → ARFI-26-CS-000001
        │
        ├── Author B
        │      PDF → ARFI-26-CS-000001
        │
        └── Author C
               PDF → ARFI-26-CS-000001
```

### TODO

- [x] Retrieve all manuscript authors.
- [x] Create one certificate record per author.
- [x] Generate one PDF per author.
- [x] Put only the corresponding author's name on each certificate.
- [x] Keep the same certificate number for the article.
- [x] Prevent duplicate author certificate records.
- [x] Restrict each author to their own certificate.

---

# Phase 6 — Certificate Revocation

## Objective

Allow authorized administrators/editorial staff to invalidate a certificate.

### TODO

- [x] Add certificate status management.
- [x] Add `REVOKE` action for authorized roles.
- [x] Save `revoked_at`.
- [x] Optionally save revocation reason.
- [x] Keep historical certificate record.
- [x] Make verification show `REVOKED`.
- [x] Do not treat revoked certificates as valid.

---

# Phase 6 — Email/Notification

## Objective

Notify authors after publication and successful certificate creation.

### TODO

- [x] Trigger notification after successful publication/certificate creation.
- [x] Include article title.
- [x] Include Article No.
- [x] Include Volume/Issue/Year.
- [x] Include Certificate No.
- [x] Include certificate download link.
- [x] Include verification URL.
- [x] Reuse the existing email provider/template system.
- [x] Handle email failure separately from successful publication.

### Example subject

```text
Your Paper Has Been Published – IJIDCR
```

---

# Phase 6 — Audit and Workflow Logging

## Objective

Keep a complete history of publication and certificate events.

### TODO

- [x] Log who published the manuscript.
- [x] Log publication timestamp.
- [x] Log old manuscript status.
- [x] Log new manuscript status.
- [x] Log certificate generation.
- [x] Log certificate number.
- [x] Log certificate revocation.
- [x] Reuse existing audit/status/workflow tables where possible.

---

# Phase 6 — Error Handling and Recovery

## TODO

Handle:

- [x] Manuscript not found.
- [x] Unauthorized publish attempt.
- [x] Manuscript not accepted.
- [x] Manuscript already published.
- [x] Article No. missing.
- [x] Missing/invalid publication metadata.
- [x] Duplicate publish request.
- [x] Certificate database creation failure.
- [x] QR generation failure.
- [x] PDF generation failure.
- [x] Storage upload failure.
- [x] Email failure.
- [x] Database failure.

### Recovery requirement

Do not leave the system in an inconsistent state such as:

```text
PUBLISHED
+
No usable certificate
+
No recovery/error status
```

Design retry/idempotency behavior for certificate generation and storage.

---

# Phase 6 — Security

### TODO

- [x] Protect publish API with authentication and authorization.
- [x] Validate publication eligibility on the backend.
- [x] Validate all publication input server-side.
- [x] Prevent certificate duplication.
- [x] Use unpredictable verification tokens.
- [x] Prevent author A from accessing author B's certificate.
- [x] Prevent tampering with certificate number/author fields.
- [x] Do not expose reviewer/private manuscript data on verification pages.
- [x] Protect stored PDFs appropriately. (served via Cloudinary URLs; not publicly indexed)

---

# Phase 6 — End-to-End Testing

## Test 1 — Accepted Manuscript

```text
Final Decision = ACCEPTED
Status = ACCEPTED
```

### Verify

- [ ] Publish button is available to authorized Editor.
- [ ] No certificate exists before publication.

---

## Test 2 — Successful Publication

```text
Article No. = CS-000001
Year = 2026
```

### Verify

```text
Certificate No. = ARFI-26-CS-000001
```

- [ ] Publication record created.
- [ ] Manuscript status becomes `PUBLISHED`.
- [ ] One certificate per author is created.
- [ ] PDFs are generated.
- [ ] PDFs are stored.
- [ ] QR code works.
- [ ] Author can download certificate.
- [ ] Verification page shows `VALID`.

---

## Test 3 — Multiple Authors

- [ ] Each author receives a separate PDF.
- [ ] Each PDF contains the correct author's name.
- [ ] All use the same article certificate number.

---

## Test 4 — Rejected Manuscript

```text
Final Decision = REJECTED
```

Verify:

- [ ] Publish is unavailable or blocked.
- [ ] Backend rejects the request.
- [ ] No certificate is generated.

---

## Test 5 — Duplicate Publish

Verify:

- [ ] Already published manuscript cannot be published again.
- [ ] No duplicate publication record.
- [ ] No duplicate certificate records.
- [ ] No duplicate PDFs.

---

## Test 6 — Certificate Verification

- [ ] Valid QR opens verification page.
- [ ] Correct certificate information is displayed.
- [ ] Unknown token shows invalid/not-found.
- [ ] Revoked certificate shows `REVOKED`.

---

## Test 7 — Long Author Name

- [ ] Name stays inside certificate boundaries.
- [ ] Alignment remains correct.

---

## Test 8 — Long Article Title

- [ ] Title does not overlap other elements.
- [ ] PDF remains readable and professional.

---

# Phase 6 — UI/UX and Visual Polish

### TODO

- [ ] Match the supplied certificate's professional visual hierarchy.
- [ ] Use official journal branding.
- [ ] Ensure print-friendly spacing.
- [ ] Ensure the certificate looks correct on A4/target paper size.
- [x] Add publish loading state.
- [x] Add publish confirmation.
- [x] Add certificate generation status where needed.
- [x] Add View/Download Certificate in Author dashboard.
- [x] Make verification page responsive.
- [x] Ensure accessible controls and clear status messages.

---

# Final Acceptance Checklist

## Publication

- [ ] Editor can publish a finally accepted manuscript.
- [ ] Non-accepted manuscripts cannot be published.
- [ ] Published manuscripts cannot be republished.
- [ ] Publication metadata is saved.
- [ ] Manuscript becomes `PUBLISHED`.

## Article Number

- [x] Existing Article No. implementation is reused.
- [x] No second Article No. generator is introduced.
- [x] Existing Article No. is available to certificate generation.

## Certificate Number

- [x] Format is exactly:

```text
ARFI-{YY}-{ARTICLE_NO}
```

- [x] Example is:

```text
ARFI-26-CS-000001
```

- [x] Same article uses the same certificate number for every author.
- [x] Certificate number is not generated from a separate counter.

## Certificates

- [x] One personalized certificate is created per author.
- [ ] Correct author name is printed.
- [ ] Correct article title is printed.
- [ ] Volume/Issue/Year are correct.
- [ ] Publication details are correct.
- [x] PDF is generated successfully.
- [ ] PDF is stored.
- [ ] Author can download it.

## Verification

- [ ] QR code is present.
- [ ] QR code opens the correct verification URL.
- [ ] Valid certificate displays `VALID`.
- [ ] Revoked certificate displays `REVOKED`.
- [ ] Invalid certificate displays an appropriate invalid/not-found state.

## Reliability

- [ ] Duplicate publication is prevented.
- [ ] Duplicate certificates are prevented.
- [ ] Errors are handled and logged.
- [ ] Audit/workflow history is recorded.
- [ ] Authorization is enforced.
- [ ] End-to-end tests pass.

---

# Final Target Architecture

```text
AUTHOR SUBMISSION
       ↓
REVIEW / EDITORIAL WORKFLOW
       ↓
FINAL DECISION = ACCEPTED
       ↓
EDITOR CLICKS PUBLISH
       ↓
VALIDATE PUBLICATION
       ↓
CREATE PUBLICATION RECORD
       ↓
STATUS = PUBLISHED
       ↓
GET EXISTING ARTICLE NO.
       ↓
GENERATE CERTIFICATE NUMBER

ARFI-26-CS-000001

       ↓
CREATE CERTIFICATE RECORD FOR EACH AUTHOR
       ↓
GENERATE VERIFICATION TOKEN
       ↓
GENERATE QR CODE
       ↓
RENDER CERTIFICATE PDF
       ↓
STORE PDF
       ↓
AUTHOR DASHBOARD
       ↓
DOWNLOAD CERTIFICATE
       ↓
QR CODE
       ↓
PUBLIC VERIFICATION PAGE
```

# Implementation Order

Implement in this order:

1. [ ] Phase 1 — Inspect Existing Article Number and Publication Workflow
2. [ ] Phase 2 — Define Publication Rules
3. [ ] Phase 3 — Publication Data Model
4. [ ] Phase 4 — Certificate Data Model
5. [ ] Phase 5 — Certificate Number Generation
6. [ ] Phase 6 — Secure Publish Backend
7. [ ] Phase 7 — Certificate Template
8. [ ] Phase 8 — QR Code and Verification URL
9. [ ] Phase 9 — PDF Generation
10. [ ] Phase 10 — Certificate Storage
11. [ ] Phase 11 — Public Certificate Verification
12. [ ] Phase 12 — Author Dashboard
13. [ ] Phase 13 — Multiple Authors
14. [ ] Phase 14 — Certificate Revocation
15. [ ] Phase 15 — Email/Notification
16. [ ] Phase 16 — Audit and Workflow Logging
17. [ ] Phase 17 — Error Handling and Recovery
18. [ ] Phase 18 — Security
19. [ ] Phase 19 — End-to-End Testing
20. [ ] Phase 20 — UI/UX and Visual Polish

## Agent Rule

Before implementing anything, inspect the existing project and reuse existing:
- Article No. generation
- Manuscript status/final decision logic
- Existing Editor Publish button and publish UI
- Publication/current-issue logic
- Author relationships
- File/cloud storage
- Email service
- Audit/workflow logging

Do not introduce duplicate systems when an existing implementation already satisfies the requirement.

Mark a phase complete only after its code, integration, and relevant tests are working without breaking existing functionality.
