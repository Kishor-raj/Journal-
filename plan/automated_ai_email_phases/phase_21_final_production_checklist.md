# Phase 21 — Final Production Checklist

## Hostinger

- [x] Domain mailbox works.
- [x] Hostinger API access works.
- [x] API credential is restricted.
- [x] Webhook is configured.
- [x] HTTPS endpoint works.
- [x] Webhook authentication works.
- [x] Message reading works.
- [x] Thread/reply operation works.

## Gemini

- [x] Gemini credential is secure.
- [x] Current supported SDK is used.
- [x] Model configuration is centralized.
- [x] Structured outputs are validated.
- [x] Function calling is restricted.
- [x] Error handling is implemented.

## Backend

- [x] Queue/worker works.
- [x] Database schema migrated.
- [x] Email threads are stored.
- [x] AI processing state is stored.
- [x] Audit logs work.
- [x] Retry/idempotency is implemented.

## Safety

- [x] Auto-reply threshold configured.
- [x] Sensitive categories require human review.
- [x] Prompt injection protections tested.
- [x] Confidential reviewer information protected.
- [x] No workflow decisions are invented by AI.
- [x] No secrets are exposed.

## Frontend/Admin

- [x] AI draft dashboard works.
- [x] Approve & Send works.
- [x] Edit & Send works.
- [x] Reject works.
- [x] Regenerate works.
- [x] AI activity/audit history is visible to authorized users.

---

# Definition of Done

The implementation is complete only when all of the following work end-to-end:

```text
1. Author sends email to journal domain mailbox.
2. Hostinger receives the email.
3. Hostinger webhook notifies the Express backend.
4. Backend authenticates and stores the event.
5. Worker retrieves and stores the message/thread.
6. Gemini classifies the email.
7. Gemini retrieves journal knowledge when needed.
8. Gemini calls controlled backend tools when database facts are required.
9. Backend validates all AI output.
10. Safety/policy engine decides:
      AUTO_REPLY
      HUMAN_APPROVAL
      MANUAL
11. Approved automatic replies are sent using Hostinger.
12. Human-approved replies are sent using Hostinger.
13. The response remains associated with the email thread.
14. Every important step is recorded in the audit trail.
15. Failures do not create duplicate replies.
16. Secrets never reach the frontend or logs.
17. Prompt injection cannot override backend rules.
```

---

# Recommended Initial Implementation Order

Do not implement everything at once.

Use this order:

```text
Phase 1  → Inspect Existing Application
Phase 2  → Hostinger Mail Integration
Phase 3  → Hostinger Webhook
Phase 4  → Email Storage / Thread Model
Phase 5  → Queue / Worker
Phase 6  → Gemini Integration
Phase 7  → Email Classification
Phase 8  → Knowledge Base / RAG
Phase 9  → Gemini Function Calling
Phase 10 → Reply Generation
Phase 11 → Safety / Policy Engine
Phase 12 → Human Approval
Phase 13 → Auto Reply Rules
Phase 14 → Hostinger Thread Reply
Phase 15 → Audit / Monitoring
Phase 16 → Security Hardening
Phase 17 → Configuration
Phase 18 → Testing
Phase 19 → Adversarial Testing
Phase 20 → Staged Rollout
Phase 21 → Production Checklist
```

## Important Agent Rules

- [x] Do not replace working project architecture without a reason.
- [x] Reuse existing authentication, database, email, queue, and logging modules where possible.
- [x] Do not expose Gemini or Hostinger credentials to the frontend.
- [x] Do not allow Gemini unrestricted database access.
- [x] Treat incoming email as untrusted data.
- [x] Do not let Gemini make journal editorial decisions.
- [x] Never invent manuscript status or other database facts.
- [x] Never auto-send sensitive replies without the configured approval policy.
- [x] Preserve existing email/thread history.
- [x] Make processing idempotent.
- [x] Keep every implementation change testable and auditable.
- [x] Verify current Hostinger and Gemini API/SDK details against their official documentation before implementing provider-specific code.
