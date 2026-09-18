# TODO — Remove Gemini Implementation and Keep Groq as the Only AI Provider

## Objective

Remove the Gemini implementation from the Journal AI Email Reply system completely.

### Target architecture

- Groq is the **only** AI provider.
- The AI email classification and reply-generation flow must use Groq only.
- Gemini API keys, model settings, provider-selection logic, Gemini services, prompts/references, and dependencies should be removed.
- Existing Groq functionality must continue working without behavior changes.

---

# Phase 1 — Audit All Gemini References

- [x] Search the entire project for all Gemini-related references.
- [x] Search for:
  - `gemini`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `@google/genai`
  - `generateGeminiContent`
  - `gemini-3.6-flash`
  - `AI_PROVIDER`
- [x] Check both backend source code and configuration files.
- [x] Check `package.json`, lock files, `.env`, `.env.example`, deployment configuration, documentation, and test files.
- [x] Confirm that no Gemini reference is hidden in frontend code or API responses.

---

# Phase 2 — Remove Gemini Dependency

### Backend dependency

- [x] Open `server/package.json`.
- [x] Remove the `@google/genai` dependency.
- [x] Regenerate/update the corresponding lock file (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`, depending on the project).
- [x] Verify that no transitive dependency is being explicitly required only for Gemini.

### Validation

- [x] Run the backend dependency installation from a clean state.
- [x] Confirm the project starts successfully without `@google/genai`.

---

# Phase 3 — Remove Gemini Service Implementation

### Directory

- [x] Review `server/src/services/gemini/`.
- [x] Remove the Gemini-specific service implementation after confirming nothing else depends on it.

Expected files identified in the current project:

- [x] `server/src/services/gemini/client.js`
- [x] `server/src/services/gemini/classifier.js`
- [x] `server/src/services/gemini/replyGenerator.js`
- [x] `server/src/services/gemini/prompts.js`
- [x] `server/src/services/gemini/index.js`

### Important refactor

The current `client.js` contains both Groq and Gemini logic.

- [x] Move/retain the Groq logic in an appropriately named Groq service/module.
- [x] Remove `generateGeminiContent()`.
- [x] Remove all imports from `@google/genai`.
- [x] Remove Gemini-specific client initialization.
- [x] Remove Gemini-specific provider branches.
- [x] Remove code that dynamically chooses between Groq and Gemini.
- [x] Ensure classification continues to use Groq.
- [x] Ensure reply generation continues to use Groq.

### Recommended structure

Use a Groq-specific service such as:

```text
server/src/services/groq/
```

Move only the required shared AI functionality into the new location.

- [x] Update all imports to point to the Groq service.
- [x] Delete the old Gemini service directory once all imports are migrated.

---

# Phase 4 — Simplify AI Provider Selection

The current project contains provider-selection logic that can choose either Groq or Gemini.

- [x] Remove the provider-selection logic that checks for Gemini.
- [x] Remove logic such as:
  - `explicit === 'gemini'`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
- [x] Remove automatic fallback from Groq to Gemini.
- [x] Do not allow the application to select Gemini through an environment variable.
- [x] Make Groq the single provider in the application logic.

### Desired behavior

The AI flow should effectively behave like:

```text
Incoming email
      ↓
AI Email Worker
      ↓
Groq AI service
      ↓
Classification / Reply generation
      ↓
Send reply
```

There should be no Gemini branch.

---

# Phase 5 — Clean Environment Configuration

### `server/src/config/env.js`

- [x] Remove `GEMINI_API_KEY`.
- [x] Remove `GEMINI_MODEL`.
- [x] Remove any validation for Gemini variables.
- [x] Remove any AI-provider logic that refers to Gemini.
- [x] Keep the required Groq configuration.

Expected Groq configuration should remain similar to:

```env
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=...
```

### `.env.example`

- [x] Remove:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
```

- [x] Keep the Groq variables.
- [x] Set the example provider to Groq only.

### Deployment configuration

- [x] Check Render/Vercel/Hostinger or other deployment environment settings.
- [x] Remove any Gemini environment variables from the deployment configuration.
- [x] Make sure `AI_PROVIDER` is set to Groq where required.
- [x] Do **not** expose or commit real API keys.

---

# Phase 6 — Update AI Email Worker and Related Services

### `server/src/modules/ai-email/ai-email-worker.js`

- [x] Confirm the worker calls the Groq-only service.
- [x] Remove any provider-specific branching for Gemini.
- [x] Keep the existing email processing workflow unchanged.

### Related AI Email files

Review:

- [x] `server/src/modules/ai-email/ai-email.routes.js`
- [x] `server/src/modules/ai-email/ai-email-config.service.js`
- [x] Any classifier/reply-generator imports.
- [x] Any configuration API returning provider/model information.

### Configuration service

The current project contains a Gemini model value such as:

```text
ai_gemini_model: 'gemini-3.6-flash'
```

- [x] Remove Gemini model configuration.
- [x] Remove any database/config field whose only purpose is storing Gemini configuration.
- [x] Replace it with Groq configuration where applicable.
- [x] Check whether old Gemini configuration is already stored in the database and remove/migrate it safely.

---

# Phase 7 — Review Frontend / API Responses

- [x] Search the frontend for `gemini` references.
- [x] Search frontend configuration, admin settings, dashboards, and AI status pages.
- [x] Remove any Gemini provider/model option from UI controls.
- [x] Remove Gemini from provider dropdowns or settings pages.
- [x] Remove Gemini-specific labels, badges, help text, and status indicators.
- [x] Update API response handling if it currently expects Gemini as a provider.
- [x] Ensure the UI shows Groq as the active/available provider where appropriate.

---

# Phase 8 — Remove Gemini Database / Stored Configuration

- [x] Inspect database schema/migrations for Gemini-specific settings.
- [x] Search for:
  - `gemini`
  - `ai_gemini_model`
  - `gemini_model`
  - `gemini_api_key`
- [x] Determine whether these are actual database columns, configuration records, or seed values.
- [x] Remove obsolete Gemini fields/configuration where safe.
- [x] Add a migration if the existing database schema contains Gemini-only fields.
- [x] Update seed/default configuration so new environments contain Groq only.
- [x] Verify existing production data is not broken by the cleanup.

---

# Phase 9 — Remove Gemini Tests and Documentation

- [x] Search test files for Gemini-specific tests.
- [x] Remove or rewrite tests that specifically validate Gemini.
- [x] Keep tests for Groq classification and reply generation.
- [x] Update README/documentation if Gemini is mentioned.
- [x] Update setup instructions to use Groq only.
- [x] Remove outdated Gemini troubleshooting instructions.

---

# Phase 10 — Verify Groq Functionality

Before deleting everything, verify the current Groq flow.

- [x] Confirm `GROQ_API_KEY` is loaded correctly.
- [x] Confirm the configured Groq model is loaded correctly.
- [x] Test AI email classification.
- [x] Test AI reply generation.
- [x] Test the complete Hostinger webhook → AI worker → Groq → email reply flow.
- [x] Confirm successful replies are still sent.
- [x] Confirm failed AI requests are logged correctly.
- [x] Confirm no request attempts to contact Google's Gemini API.

---

# Phase 11 — Final Gemini Reference Scan

Run a complete project-wide search.

- [x] Search for `gemini`.
- [x] Search for `GEMINI`.
- [x] Search for `@google/genai`.
- [x] Search for `generateGeminiContent`.
- [x] Search for `gemini-3.6-flash`.
- [x] Search for `ai_gemini_model`.
- [x] Search lock files for `@google/genai`.

### Expected result

There should be **zero active Gemini implementation references** remaining.

Any remaining occurrence should be reviewed and removed unless it is intentionally preserved only in historical documentation/changelog.

---

# Phase 12 — Build and Deployment Verification

- [x] Delete old `node_modules` and reinstall dependencies in a clean environment.
- [x] Run backend build/start commands.
- [x] Confirm there are no import errors caused by removing Gemini files.
- [x] Confirm there are no missing-module errors.
- [x] Deploy to the staging/production environment.
- [x] Test the AI email reply feature after deployment.
- [x] Check application logs for:
  - Groq request success
  - AI classification success
  - AI reply generation success
  - Email reply delivery success
- [x] Confirm there are no Gemini-related runtime errors.

---

# Final Acceptance Checklist

- [x] Groq is the only AI provider.
- [x] `@google/genai` is removed.
- [x] Gemini service files are removed or fully replaced with Groq equivalents.
- [x] Gemini provider-selection logic is removed.
- [x] `GEMINI_API_KEY` is removed.
- [x] `GEMINI_MODEL` is removed.
- [x] `gemini-3.6-flash` is removed.
- [x] `ai_gemini_model` is removed.
- [x] Gemini options are removed from frontend/admin settings.
- [x] Gemini database configuration is removed/migrated where applicable.
- [x] Documentation and tests are updated.
- [x] AI email classification still works through Groq.
- [x] AI-generated email replies still work through Groq.
- [x] Hostinger webhook → AI worker → Groq → email reply flow works end-to-end.
- [x] A final project-wide search returns no active Gemini implementation references.

---

# Important Constraint

Do **not** redesign or change the existing AI email reply behavior unnecessarily.

The goal is:

```text
Current:
AI Email System
├── Groq
└── Gemini

Target:
AI Email System
└── Groq
```

Keep the existing Groq implementation and email workflow intact; remove only Gemini-specific code, configuration, dependencies, database settings, UI references, and dead provider-selection logic.
