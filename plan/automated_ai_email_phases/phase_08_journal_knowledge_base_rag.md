# Phase 8 — Journal Knowledge Base / RAG

## Objective

Allow Gemini to answer general journal questions using approved journal information.

## Knowledge Sources

```text
Submission Guidelines
Author Guidelines
Reviewer Guidelines
Publication Ethics
FAQ
Journal Information
Contact Information
Editorial Policies
```

## TODO

- [x] Identify the official documents/content already stored by the application.
- [x] Normalize content into searchable chunks.
- [x] Add metadata such as:
  - [x] document type
  - [x] journal ID
  - [x] section
  - [x] version
  - [x] effective date
- [x] Implement retrieval for relevant chunks.
- [x] Only retrieve documents for the correct journal.
- [x] Prefer current/active policy versions.
- [x] Return the retrieved content to Gemini as context.
- [x] Instruct Gemini not to invent policy information.
- [x] Record which knowledge sources were used for each AI reply.

## Important Rule

Gemini must not create policy facts from memory.

If the knowledge base does not contain enough information:

```text
Do not guess.
→ Escalate or ask for human review.
```

## Completion Criteria

- [x] AI answers common policy/FAQ questions from approved content.
- [x] Outdated/incorrect policy versions are not preferred.
- [x] Missing information triggers escalation instead of hallucination.

---
