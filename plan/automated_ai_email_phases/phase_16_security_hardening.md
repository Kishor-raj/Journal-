# Phase 16 — Security Hardening

## TODO

- [x] Keep Gemini credentials server-side.
- [x] Keep Hostinger credentials server-side.
- [x] Validate all webhook authentication.
- [x] Rate-limit webhook endpoints if appropriate.
- [x] Validate all external payloads.
- [x] Sanitize HTML email content before display.
- [x] Protect against stored XSS in email bodies.
- [x] Restrict tool access.
- [x] Enforce application authorization.
- [x] Protect admin approval APIs.
- [x] Protect internal AI endpoints.
- [x] Apply minimum-privilege access to database operations.
- [x] Encrypt secrets using deployment secret management where available.
- [x] Define data-retention rules.
- [x] Do not allow incoming email text to modify system instructions.

## Completion Criteria

- [x] Security review completed.
- [x] No secrets are present in frontend bundles or logs.
- [x] Untrusted email content cannot perform backend actions directly.

---
