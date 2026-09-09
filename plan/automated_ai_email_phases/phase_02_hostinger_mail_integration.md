# Phase 2 — Hostinger Mail Integration

## Objective

Connect the existing Hostinger domain mailbox to the backend.

Example:

```text
editor@yourdomain.com
support@yourdomain.com
```

## TODO

- [x] Confirm the exact Hostinger Mail API / Agentic Mail feature available on the current Hostinger plan.
- [x] Create a Hostinger API credential/token with the minimum required permissions.
- [x] Restrict the credential to only the mailbox(es) required by the application.
- [x] Store the credential only in backend environment variables.
- [x] Never expose the Hostinger credential to React/frontend code.
- [x] Add configuration such as:

```env
HOSTINGER_MAIL_API_KEY=
HOSTINGER_MAILBOX=
HOSTINGER_WEBHOOK_SECRET=
```

- [x] Confirm the exact Hostinger API base URL and authentication method from the current Hostinger documentation.
- [x] Confirm the exact API operations required:
  - [x] Read/fetch message
  - [x] Search message
  - [x] Read thread/history where supported
  - [x] Reply to message/thread
  - [x] Send message if needed
- [x] Implement a dedicated Hostinger mail service.
- [x] Do not scatter Hostinger API calls across controllers.

## Suggested Module

```text
src/services/email/hostinger/
├── client.js
├── mailbox.js
├── messages.js
├── threads.js
└── index.js
```

## Completion Criteria

- [x] Backend can authenticate to Hostinger.
- [x] Backend can retrieve a test message.
- [x] Backend can send/reply to a test mailbox.
- [x] Backend credentials are not exposed to the frontend.
- [x] Hostinger-specific logic is isolated in one service.

---
