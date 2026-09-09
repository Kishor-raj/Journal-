# Phase 1 — Inspect Existing Application

## Objective

Understand the existing backend, database, authentication, email implementation, and deployment before adding the AI email system.

## TODO

- [x] Inspect the current repository structure.
- [x] Identify the Express.js entry point.
- [x] Identify existing API route structure.
- [x] Identify PostgreSQL configuration and ORM/query layer.
- [x] Identify existing user/manuscript/reviewer/editor tables.
- [x] Identify any existing email provider integration.
- [x] Identify existing email templates.
- [x] Identify existing background worker/queue infrastructure.
- [x] Identify deployment environment and HTTPS setup.
- [x] Identify current environment variable management.
- [x] Do not duplicate existing email/session/database functionality.
- [x] Document the relevant existing modules before coding.

## Deliverable

Create a short internal implementation note containing:

```text
Existing backend:
Existing database layer:
Existing email implementation:
Existing queue/worker:
Existing journal tables:
Existing deployment:
Existing environment variable strategy:
Potential files to modify:
Potential files to add:
```

## Completion Criteria

- [x] Agent can identify exactly where the new implementation belongs.
- [x] No existing functionality is unnecessarily replaced.

---
