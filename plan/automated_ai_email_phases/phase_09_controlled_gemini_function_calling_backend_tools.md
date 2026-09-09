# Phase 9 — Controlled Gemini Function Calling / Backend Tools

## Objective

Allow Gemini to request only approved application operations.

## Allowed Tools

Initial tool set:

```text
get_manuscript_status(manuscriptId)
get_revision_status(manuscriptId)
get_review_status(manuscriptId)
get_submission_guidelines()
get_journal_information()
get_author_submission_context()
```

## TODO

- [x] Define strict input schemas.
- [x] Validate every tool argument on the backend.
- [x] Authorize every lookup.
- [x] Verify that the requester is allowed to receive the information.
- [x] Query PostgreSQL only through controlled service functions.
- [x] Never provide raw SQL access to Gemini.
- [x] Never expose database credentials to Gemini.
- [x] Never allow Gemini to directly execute arbitrary code.
- [x] Return only the minimum necessary data.
- [x] Log tool calls for auditing.

## Example

```text
Gemini:
  "I need the manuscript status."

Backend:
  get_manuscript_status("ARFI-26-CS-000001")

Database:
  UNDER_REVIEW

Gemini:
  Generates response using the verified status.
```

## Completion Criteria

- [x] Gemini can request approved tools.
- [x] Tools can query real application data.
- [x] Gemini cannot perform arbitrary database operations.
- [x] Tool calls are authenticated/authorized and logged.

---
