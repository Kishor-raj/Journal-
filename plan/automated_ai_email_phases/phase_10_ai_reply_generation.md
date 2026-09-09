# Phase 10 — AI Reply Generation

## Objective

Generate professional journal email responses.

## TODO

- [x] Create a dedicated reply-generation prompt.
- [x] Include:
  - [x] journal identity
  - [x] approved tone
  - [x] email subject
  - [x] sender/recipient context
  - [x] conversation/thread context
  - [x] retrieved knowledge
  - [x] verified database information
  - [x] relevant policies
- [x] Preserve manuscript IDs exactly.
- [x] Do not invent dates, statuses, names, decisions, or policies.
- [x] Keep responses professional and concise.
- [x] Avoid exposing internal system information.
- [x] Avoid revealing internal reviewer identities.
- [x] Do not disclose confidential peer-review information unless policy explicitly permits it.
- [x] Return structured output.
- [x] Version reply-generation prompts.

## Suggested Output

```json
{
  "subject": "Re: Manuscript ARFI-26-CS-000001",
  "body": "Dear Author,...",
  "confidence": 0.95,
  "requiresHumanApproval": false,
  "reason": "Verified manuscript status was available."
}
```

## Completion Criteria

- [x] Replies are grammatically correct.
- [x] Responses use verified facts.
- [x] AI does not invent journal information.
- [x] Sensitive details are not unnecessarily exposed.

---
