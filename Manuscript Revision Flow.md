# Manuscript Revision Flow

## Expected Workflow

```text
Author Submit Manuscript
        ↓
Moderator Accept
        ↓
Editor
        ↓
Reviewer
        ↓
Reviewer Requests Minor/Major Revision
        ↓
Author Dashboard → Revisions
        ↓
Submit Revision – Round 1
        ↓
Editor Receives Round 1 Revision
        ↓
Reviewer Reviews Again
        ↓
Reviewer Requests Minor/Major Revision Again
        ↓
Author Dashboard → Revisions
        ↓
Submit Revision – Round 2
        ↓
Editor Receives Round 2 Revision
```

## Author Revision Page

The Author should see:

```text
#IJIDCR-26-0001 — Round 1

Request
Reviewer Comments
Upload & Submit
Your Response
Cover Letter
```

The Author can:

- Upload the revised manuscript.
- Enter Response Summary.
- Enter Reviewer Response.
- Add Cover Letter.
- Submit the revision.

## Main Requirement

When the Reviewer requests another revision, the Author must not create a new manuscript.

The same manuscript should continue through different revision rounds.

```text
#IJIDCR-26-0001
│
├── Original Manuscript
├── Round 1 Revision
└── Round 2 Revision
```

The Manuscript ID must remain the same.

Only the revision round should increase.

## Important Rule

Round 2 must follow the same revision process as Round 1.

```text
Reviewer → Revision Request
        ↓
Author → Submit Revision
        ↓
Editor → Receives Revision
        ↓
Reviewer → Reviews Again
```

The system must not redirect the Author to the New Submission page or ask the Author to submit a completely new manuscript.

## Final Expected Result

- Original manuscript remains connected to all revisions.
- Minor Revision works correctly.
- Major Revision works correctly.
- Round 1 revision works correctly.
- Round 2 revision works correctly.
- Editor can see the latest revision.
- Previous revision history is preserved.
- No duplicate manuscript is created.