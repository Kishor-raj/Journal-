# Phase 6 — Gemini API Integration

## Objective

Integrate Gemini securely into the Express.js backend.

## TODO

- [x] Create a Gemini API key/credential.
- [x] Restrict and secure the key according to Google's current Gemini API guidance.
- [x] Store it only in the backend environment:

```env
GEMINI_API_KEY=
```

- [x] Never expose the key to React/frontend code.
- [x] Install/use the current official Gemini JavaScript SDK appropriate for the project.
- [x] Create a single Gemini service.
- [x] Centralize model configuration.
- [x] Centralize safety/prompt configuration.
- [x] Record the model name/version used for each AI decision where practical.
- [x] Add request timeout handling.
- [x] Add API error handling.
- [x] Add retry handling only for retryable failures.
- [x] Add rate-limit handling.
- [x] Prevent logging of the full API key.

## Suggested Module

```text
src/services/gemini/
├── client.js
├── classifier.js
├── replyGenerator.js
├── tools.js
├── prompts.js
├── schemas.js
└── index.js
```

## Completion Criteria

- [x] Backend can successfully send a controlled test prompt to Gemini.
- [x] Errors are handled gracefully.
- [x] Gemini credentials never reach the frontend.

---
