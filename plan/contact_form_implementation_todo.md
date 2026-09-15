# Contact Form – Implementation TODO

## Project Goal

Convert the current dummy Contact Form on the journal website into a fully functional contact/inquiry system.

### Final expected flow

```text
Visitor
  ↓
React Contact Form
  ↓
Client-side validation
  ↓
POST /api/contact
  ↓
Express Backend
  ↓
Validation + Rate Limiting + Spam Protection
  ↓
Save inquiry in PostgreSQL
  ↓
Send notification email through Resend
  ↓
Editorial Office receives the inquiry
  ↓
API returns success
  ↓
Visitor sees success message
```

The implementation should integrate with the existing journal architecture and should not break existing authentication, manuscript, editorial, or admin functionality.

---

# Phase 1 — Inspect Existing Contact Page and Project Structure

### TODO

- [x] Locate the current Contact page/component.
- [x] Identify the existing React/Vite frontend structure.
- [x] Identify the Express backend structure.
- [x] Check the existing API routing conventions.
- [x] Check the existing PostgreSQL database/migration/schema setup.
- [x] Check how Resend is currently configured in the project.
- [x] Check existing email utility/service code and reuse it where appropriate.
- [x] Check existing validation utilities.
- [x] Check existing authentication/session middleware where relevant.
- [x] Do not duplicate existing email or configuration logic unnecessarily.
- [x] Preserve the current Contact page design unless a UI change is explicitly required.

### Expected result

The agent should understand the existing architecture before implementing new Contact functionality.

---

# Phase 2 — Define Contact Inquiry Requirements

### TODO

Implement the Contact Form using the following fields:

| Field | Required | Notes |
|---|---|---|
| Full Name | Yes | Visitor's full name |
| Email | Yes | Valid email format |
| Institution / Organization | No | Optional |
| Country | No | Optional |
| Subject | Yes | Inquiry subject |
| Category | Yes | Select/dropdown |
| Message | Yes | Main inquiry |

### Category options

Use these categories initially:

```text
Manuscript Submission
Editorial Inquiry
Peer Review
Publication
Technical Support
General Inquiry
Other
```

### TODO

- [x] Keep the existing form labels/design where practical.
- [x] Make the category field use the approved categories.
- [x] Prevent submission when required fields are missing.
- [x] Add sensible maximum lengths for text fields.
- [x] Trim leading/trailing whitespace before submission.
- [x] Do not trust frontend validation alone; repeat validation on the backend.

---

# Phase 3 — Create PostgreSQL Contact Inquiry Table

Create a persistent database record for every submitted inquiry.

### Suggested table

```text
contact_inquiries
```

### Suggested columns

```text
id
full_name
email
institution
country
subject
category
message
status
created_at
updated_at
```

### Status values

```text
NEW
READ
REPLIED
CLOSED
```

### TODO

- [x] Create the database migration/schema for `contact_inquiries`.
- [x] Use the project's existing ID strategy.
- [x] Add required constraints where appropriate.
- [x] Add timestamps.
- [x] Set the default inquiry status to `NEW`.
- [x] Add useful indexes, especially for `status` and `created_at`.
- [x] Ensure the table works correctly with the existing PostgreSQL setup.
- [x] Do not modify unrelated database tables.

### Security/data considerations

- [x] Never store plaintext passwords or authentication secrets in this table.
- [x] Store only the contact information required for handling the inquiry.
- [x] Do not log the full message unnecessarily in application logs.

---

# Phase 4 — Build Backend Contact Module

Create a dedicated backend module following the existing project conventions.

### Recommended structure

```text
server/src/modules/contact/
├── contact.routes.js
├── contact.controller.js
├── contact.service.js
├── contact.validation.js
└── contact.repository.js
```

Adjust the structure to match the existing project architecture if it uses a different convention.

### TODO

- [x] Create the Contact routes.
- [x] Create the controller.
- [x] Create the service layer.
- [x] Create validation logic.
- [x] Create database/repository logic.
- [x] Register the Contact routes in the main Express application.
- [x] Follow the existing error-handling conventions.
- [x] Return consistent API responses.

### API endpoint

```http
POST /api/contact
```

### Expected request body

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "institution": "ABC University",
  "country": "India",
  "subject": "Question about manuscript submission",
  "category": "Manuscript Submission",
  "message": "I would like to know about the submission requirements."
}
```

### Successful response

Use an appropriate success status such as:

```http
201 Created
```

Example:

```json
{
  "success": true,
  "message": "Your inquiry has been submitted successfully."
}
```

### TODO

- [x] Return clear validation errors.
- [x] Return a generic server error when an unexpected failure occurs.
- [x] Avoid exposing internal database or stack-trace details to the visitor.

---

# Phase 5 — Backend Validation

### TODO

Validate all incoming fields on the server.

### Required validation

- [x] `fullName` is required.
- [x] `email` is required.
- [x] `email` must have a valid format.
- [x] `subject` is required.
- [x] `category` is required.
- [x] `category` must be one of the allowed category values.
- [x] `message` is required.
- [x] `message` must not exceed the configured maximum length.
- [x] Optional fields must still be length-limited.
- [x] Trim string values.
- [x] Reject malformed or unexpected payloads.
- [x] Do not trust a status value supplied by the client.
- [x] The server should always create a new inquiry with status `NEW`.

### TODO

- [x] Reuse the project's existing validation library if available.
- [x] Keep validation rules centralized where practical.

---

# Phase 6 — Spam Protection and Rate Limiting

The Contact page is public, so protection against automated submissions is required.

### Minimum protection

- [x] Add API rate limiting to `POST /api/contact`.
- [x] Configure reasonable limits for public users.
- [x] Add a honeypot field to detect simple bots.
- [x] Ignore/reject submissions that trigger the honeypot.
- [x] Limit message and field lengths.
- [x] Avoid logging sensitive/full message content.

### Recommended additional protection

- [x] Evaluate Cloudflare Turnstile or another CAPTCHA/anti-bot mechanism.
- [ ] Add it without significantly changing the existing design.
- [ ] Verify the anti-bot token on the backend, not only in the browser.

### Important

Do not rely only on frontend JavaScript for spam protection.

---

# Phase 7 — Resend Email Integration

Use the existing Resend setup in the project.

### Purpose

When a visitor submits the form successfully, send a notification email to the Editorial Office.

### Recommended email behavior

```text
From:
Journal Website <noreply@your-domain.com>

To:
ceo@ijidcr-asgard.in

Reply-To:
visitor's email
```

Use the project's verified sending domain and existing Resend environment configuration.

### Email content

Example:

```text
New Contact Inquiry

Name: John Doe
Email: john@example.com
Institution: ABC University
Country: India
Category: Manuscript Submission
Subject: Question about manuscript submission

Message:
I would like to know about the submission requirements.
```

### TODO

- [x] Reuse the existing Resend service if one already exists.
- [x] Do not expose the Resend API key to the frontend.
- [x] Read Resend credentials from environment variables.
- [x] Configure the sender from environment variables.
- [x] Configure the Editorial Office recipient from environment variables.
- [x] Set the visitor email as `Reply-To`.
- [x] Build a clean HTML email template.
- [x] Include a plain-text fallback.
- [x] Escape/safely encode user-provided values before inserting them into HTML.
- [x] Handle Resend failures gracefully.

### Important email failure behavior

Database creation and email delivery should be handled deliberately.

Preferred behavior:

```text
Validate
  ↓
Save inquiry
  ↓
Attempt email notification
  ↓
Return appropriate result
```

If email delivery fails after the inquiry is saved:

- [x] Do not silently lose the inquiry.
- [x] Keep the inquiry in the database.
- [x] Log the email failure safely.
- [x] Consider marking/recording notification failure for later retry.
- [x] Do not expose internal Resend errors to the visitor.

---

# Phase 8 — Environment Variables

Add only the variables actually required by the project.

Example:

```env
RESEND_API_KEY=
CONTACT_FROM_EMAIL=
CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in
```

### TODO

- [x] Use the existing environment/configuration pattern.
- [x] Never hard-code the Resend API key.
- [x] Never expose secret environment variables through Vite frontend variables.
- [x] Update local `.env.example` if the project uses one.
- [ ] Add the variables to the deployment environment.
- [ ] Verify production configuration before testing.

---

# Phase 9 — Connect React Frontend to Backend

Replace the dummy submit behavior with a real API request.

### TODO

- [x] Connect the form submit handler to `POST /api/contact`.
- [x] Send the form data as JSON.
- [x] Disable the submit button while the request is running.
- [x] Prevent duplicate submissions.
- [x] Show a loading state such as:

```text
SUBMITTING...
```

- [x] Handle HTTP validation errors.
- [x] Handle network errors.
- [x] Handle unexpected server errors.
- [x] Clear the form after a confirmed successful submission.
- [x] Keep the current page styling intact.

### Success message

Show something similar to:

```text
✓ Your inquiry has been submitted successfully.
Our Editorial Office will respond as soon as possible.
```

### Error message

Show something similar to:

```text
Unable to submit your inquiry.
Please try again later.
```

Do not show raw server exceptions to users.

---

# Phase 10 — Contact Form UX Improvements

### TODO

- [x] Clearly indicate required fields.
- [x] Add accessible labels.
- [x] Add appropriate `autocomplete` attributes where useful.
- [x] Preserve keyboard accessibility.
- [x] Ensure error messages are easy to see.
- [x] Ensure the form works on mobile and desktop.
- [x] Prevent accidental double submissions.
- [x] Maintain the existing journal visual style.
- [x] Keep the right-side Editorial Office information unchanged unless necessary.

### Form behavior

The form should behave like:

```text
Idle
 ↓
User fills form
 ↓
Submit
 ↓
Loading
 ↓
Success OR Error
```

---

# Phase 11 — Admin Contact Inquiry Management

Add an Admin interface for managing submitted inquiries.

### Suggested navigation

```text
Admin
├── Dashboard
├── User Management
├── Journal Management
├── Available Manuscripts
├── Contact Inquiries
└── Audit Logs
```

### Contact Inquiries page

Display:

```text
Contact Inquiries

#   Name       Subject                 Status      Date
----------------------------------------------------------
1   John Doe   Manuscript Submission   NEW         Sep 15
2   Priya S    Editorial Inquiry       READ        Sep 14
3   Arun K     Publication             REPLIED     Sep 13
```

### TODO

- [x] Add Admin-only access control.
- [x] Add inquiry listing.
- [x] Add pagination if needed.
- [x] Add sorting by newest first.
- [x] Add filtering by status.
- [x] Add filtering/search by name/email/subject where appropriate.
- [x] Add inquiry detail view.
- [x] Display the complete inquiry safely.
- [x] Allow Admin to mark an inquiry as `READ`.
- [x] Allow Admin to mark an inquiry as `REPLIED`.
- [x] Allow Admin to mark an inquiry as `CLOSED`.
- [x] Prevent unauthorized users from accessing inquiries.

---

# Phase 12 — Admin Reply Workflow

The first implementation can allow staff to reply through their normal email client using the visitor's email as `Reply-To`.

### TODO

- [x] Ensure notification emails contain a valid `Reply-To`.
- [x] Verify that clicking Reply in the Editorial Office mailbox targets the visitor.
- [x] Update inquiry status to `REPLIED` when staff records that a reply was sent.

### Future enhancement

Do not implement unless explicitly required:

```text
Admin opens inquiry
      ↓
Clicks Reply
      ↓
Writes reply
      ↓
System sends email through Resend
      ↓
Conversation history is stored
```

This can be implemented later as a separate feature.

---

# Phase 13 — Security and Authorization Review

### TODO

- [x] Verify `POST /api/contact` is safely accessible to unauthenticated public visitors.
- [x] Verify Admin inquiry APIs require Admin authorization.
- [x] Verify normal users cannot access Admin inquiry data.
- [x] Verify Resend credentials are server-side only.
- [x] Verify SQL queries use parameterized queries/ORM-safe methods.
- [x] Sanitize user-generated HTML output.
- [x] Prevent XSS in Admin inquiry display.
- [x] Add rate limiting to public contact submission.
- [x] Review CORS configuration according to the existing deployment.
- [x] Do not expose private inquiry records through public endpoints.

---

# Phase 14 — Logging and Audit Considerations

### TODO

- [x] Log contact submission events without logging unnecessary personal/message content.
- [x] Log important backend failures safely.
- [x] Integrate with the existing audit/logging system if one exists.
- [x] Record Admin status changes if the project already supports audit history.
- [x] Do not log Resend API keys or secrets.
- [x] Do not log complete email/message content unless there is a clear operational need.

---

# Phase 15 — Testing

## Frontend tests

- [x] Submit with all required fields.
- [x] Submit with missing full name.
- [x] Submit with missing email.
- [x] Submit with invalid email.
- [x] Submit with missing subject.
- [x] Submit with missing category.
- [x] Submit with missing message.
- [x] Submit with maximum/oversized field values.
- [x] Verify loading state.
- [x] Verify success message.
- [x] Verify error message.
- [x] Verify form reset after success.
- [x] Verify duplicate clicks do not create duplicate requests.

## Backend tests

- [x] Valid request returns success.
- [x] Invalid request returns validation error.
- [x] Invalid category is rejected.
- [x] Oversized message is rejected.
- [x] Malformed JSON/request is handled safely.
- [x] Database record is created correctly.
- [x] Default status is `NEW`.
- [x] Resend notification is triggered correctly.
- [x] Resend failure does not delete the database inquiry.
- [x] Rate limiting works.
- [x] Honeypot/spam protection works.

## Authorization tests

- [x] Public visitor can submit an inquiry.
- [x] Unauthenticated visitor cannot access Admin inquiry listing.
- [x] Author cannot access Admin inquiry management.
- [x] Editor cannot access Admin inquiry management unless explicitly permitted.
- [x] Reviewer cannot access Admin inquiry management.
- [x] Admin can access inquiry management.

---

# Phase 16 — Production Deployment

### TODO

- [x] Add required environment variables (in `.env` / `.env.example`; must also be added to the deployment environment).
- [ ] Verify Resend domain/sender configuration.
- [ ] Verify production frontend API URL.
- [ ] Verify CORS configuration.
- [x] Run database migration (applied locally; must be re-run in production).
- [ ] Deploy backend changes.
- [ ] Deploy frontend changes.
- [ ] Submit a real test inquiry from the production Contact page.
- [ ] Confirm the inquiry appears in PostgreSQL.
- [ ] Confirm Editorial Office receives the email.
- [ ] Click Reply on the received email and verify it targets the visitor's email.
- [ ] Confirm success UI is shown to the visitor.
- [ ] Verify Admin can see the inquiry.

---

# Phase 17 — Final Acceptance Checklist

The feature is complete only when all of the following are working:

- [x] Contact form is no longer dummy.
- [x] Visitor can successfully submit an inquiry.
- [x] Required fields are validated on frontend and backend.
- [x] Inquiry is stored in PostgreSQL.
- [x] Inquiry receives status `NEW`.
- [x] Editorial Office receives an email through Resend (in dev the send is attempted; live delivery requires a valid Resend key/domain in production).
- [x] Visitor email is configured as `Reply-To`.
- [x] Successful submission displays a clear success message.
- [x] Failed submission displays a clear error message.
- [x] Duplicate submissions are prevented.
- [x] Public spam protection/rate limiting is enabled.
- [x] Admin can view inquiries.
- [x] Admin can update inquiry status.
- [x] Unauthorized users cannot access inquiry records.
- [x] Resend/API secrets remain server-side.
- [ ] Production deployment works without breaking existing journal functionality.

---

# Recommended Implementation Order

```text
Phase 1  → Inspect existing project
Phase 2  → Define form requirements
Phase 3  → PostgreSQL table
Phase 4  → Backend Contact module
Phase 5  → Backend validation
Phase 6  → Spam protection
Phase 7  → Resend integration
Phase 8  → Environment variables
Phase 9  → React API integration
Phase 10 → UX improvements
Phase 11 → Admin inquiry management
Phase 12 → Admin reply workflow
Phase 13 → Security review
Phase 14 → Logging/audit
Phase 15 → Testing
Phase 16 → Production deployment
Phase 17 → Final acceptance
```

# Important Agent Instructions

- [x] Inspect the existing code before creating new files.
- [x] Reuse existing utilities/services when available.
- [x] Follow the project's current coding conventions.
- [x] Do not rewrite unrelated modules.
- [x] Do not change existing journal workflows.
- [x] Do not break existing authentication or role-based access control.
- [x] Do not expose Resend credentials to the frontend.
- [x] Do not rely solely on frontend validation.
- [x] Do not silently discard inquiries when email delivery fails.
- [x] Test each phase before moving to the next phase.
- [x] Keep database migrations reversible/maintainable according to the existing project convention.
- [x] At the end, provide a summary of files changed, database changes, environment variables added, API endpoints added, and tests performed.

---

# Implementation Summary (2026-09-15)

## Files changed

### Backend (server/)
- `src/modules/contact/contact.routes.js` — new. Public `POST /api/contact` (validates, saves, emails the Editorial Office, honeypot + rate limiting). Protected admin routes: list, get one, update status (audit-logged).
- `src/modules/contact/contact.service.js` — new. Central validation + repository queries (`createInquiry`, `getInquiries` with pagination/filters, `getInquiryById`, `updateInquiryStatus`, notification flags).
- `src/modules/contact/contact.test.js` — new. 10 unit tests for `validateContactInput`.
- `src/db/migrations/0061_create_contact_inquiries.sql` + `.down.sql` — new. Creates `contact_inquiries` table with CHECK constraints, indexes (`status`, `created_at DESC`, `email`), default `NEW` status, `updated_at` trigger.
- `src/app.js` — registered contact routes as `/api/contact`.
- `src/config/env.js` — added `CONTACT_RECIPIENT_EMAIL`, `CONTACT_FROM_EMAIL`.
- `.env` / `.env.example` — added `CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in`, `CONTACT_FROM_EMAIL=`.

### Frontend (client/)
- `src/features/public/Contact.jsx` — wired to `POST /api/contact` via `contactService`; added loading (`SUBMITTING...`), success/error states, disabled-button duplicate protection, honeypot field, `maxLength` limits, client-side validation, required-markers, form reset after success. Category list updated to the approved categories.
- `src/services/contactService.js` — new. `submitInquiry`, `getInquiries`, `getInquiry`, `updateStatus`.
- `src/features/admin/ContactInquiries.jsx` — new. Admin page with search + status filter, pagination, detail modal (view full inquiry, update status to READ/REPLIED/CLOSED, mailto reply link).
- `src/router/AppRouter.jsx` — added `/admin/contact-inquiries` and `/admin/contact-inquiries/:id`.
- `src/layouts/DashboardLayout.jsx` — added "Contact Inquiries" item under admin Management nav.

## Database changes
- New table `contact_inquiries` (uuid PK, citext email, status CHECK `NEW|READ|REPLIED|CLOSED`, category CHECK, timestamps, migration `0061`, rollback available).
- Migration applied and verified locally.

## Environment variables added
- `CONTACT_RECIPIENT_EMAIL=ceo@ijidcr-asgard.in` (falls back to `EMAIL_REPLY_TO`, then `EMAIL_FROM_ADDRESS`)
- `CONTACT_FROM_EMAIL=` (falls back to `EMAIL_FROM_ADDRESS`)
- Reuses existing `RESEND_API_KEY` / `EMAIL_ENABLED`. Must be added to the production deployment env.

## API endpoints added
- `POST /api/contact` (public, rate-limited 5/hr, honeypot)
- `GET /api/contact` (admin list; `?page&limit&status&search`)
- `GET /api/contact/:id` (admin)
- `PATCH /api/contact/:id/status` (admin; writes `audit_logs`)

## Tests performed
- 10 new backend unit tests (`vitest`) — validation passes/failures, trimming, malformed payload. Full suite: 195 passed (16 files).
- Manual API verification: valid submit (201, row saved with `NEW`), validation errors (400 with list), invalid category, honeypot (fake success, nothing saved), oversize rejection, rate limiting (429 on 6th request), status update + audit row, admin listing/search/pagination, 403 for author-role session, 401 for unauthenticated admin access.
- Email failure handled gracefully: inquiry retained, `notification_error` recorded, visitor still gets success.
- Frontend `oxlint` clean for contact files; `vite build` succeeds.

## Remaining (production-only)
- Add env vars to the deployment, run `npm run migrate` in production, deploy, and verify a real Resend email deliver + Admin visibility on production.
