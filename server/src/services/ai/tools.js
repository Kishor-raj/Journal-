import pool from '../../config/db.js'

export async function getManuscriptStatus(submissionNumber) {
  if (!submissionNumber || typeof submissionNumber !== 'string') {
    throw new Error('Invalid submission number')
  }
  const clean = submissionNumber.trim()
  const result = await pool.query(
    `SELECT id, submission_number, title, status, created_at, updated_at
     FROM manuscripts
     WHERE submission_number ILIKE $1 OR id::text = $1
     LIMIT 1`,
    [clean]
  )
  if (result.rows.length === 0) return null
  const m = result.rows[0]
  return {
    submissionNumber: m.submission_number,
    title: m.title,
    status: m.status,
    submittedAt: m.created_at,
    lastUpdated: m.updated_at,
  }
}

export async function getRevisionStatus(submissionNumber) {
  if (!submissionNumber) throw new Error('Invalid submission number')
  const manuscript = await getManuscriptStatus(submissionNumber)
  if (!manuscript) return null

  const result = await pool.query(
    `SELECT rr.id, rr.revision_type, rr.status, rr.due_date, rr.created_at
     FROM revision_requests rr
     JOIN manuscripts m ON m.id = rr.manuscript_id
     WHERE m.submission_number ILIKE $1
     ORDER BY rr.created_at DESC
     LIMIT 5`,
    [submissionNumber.trim()]
  )
  return {
    ...manuscript,
    revisions: result.rows.map((r) => ({
      type: r.revision_type,
      status: r.status,
      dueDate: r.due_date,
      requestedAt: r.created_at,
    })),
  }
}

export async function getReviewStatus(submissionNumber) {
  if (!submissionNumber) throw new Error('Invalid submission number')
  const manuscript = await getManuscriptStatus(submissionNumber)
  if (!manuscript) return null

  const result = await pool.query(
    `SELECT ra.id, ra.status AS assignment_status, ra.invited_at, ra.responded_at,
            r.recommendation, r.submitted_at
     FROM reviewer_assignments ra
     LEFT JOIN reviews r ON r.assignment_id = ra.id
     JOIN manuscripts m ON m.id = ra.manuscript_id
     WHERE m.submission_number ILIKE $1
     ORDER BY ra.invited_at DESC
     LIMIT 5`,
    [submissionNumber.trim()]
  )
  return {
    ...manuscript,
    reviews: result.rows.map((r) => ({
      assignmentStatus: r.assignment_status,
      recommendation: r.recommendation,
      invitedAt: r.invited_at,
      respondedAt: r.responded_at,
      submittedAt: r.submitted_at,
    })),
  }
}

export async function getSubmissionGuidelines() {
  const result = await pool.query(
    `SELECT sg.title, sg.content, j.name AS journal_name
     FROM submission_guidelines sg
     JOIN journals j ON j.id = sg.journal_id
     WHERE sg.is_active = true
     ORDER BY sg.created_at DESC
     LIMIT 5`
  )
  return result.rows.map((r) => ({
    journal: r.journal_name,
    title: r.title,
    content: r.content?.slice(0, 1500),
  }))
}

export async function getJournalInformation() {
  const result = await pool.query(
    `SELECT name, issn, publisher, description, aims_and_scope
     FROM journals
     LIMIT 3`
  )
  return result.rows.map((r) => ({
    name: r.name,
    issn: r.issn,
    publisher: r.publisher,
    description: r.description?.slice(0, 1000),
    aimsAndScope: r.aims_and_scope?.slice(0, 1000),
  }))
}

export async function getAuthorSubmissionContext(submissionNumber) {
  if (!submissionNumber) throw new Error('Invalid submission number')
  const manuscript = await getManuscriptStatus(submissionNumber)
  if (!manuscript) return null

  const authors = await pool.query(
    `SELECT ma.first_name, ma.last_name, ma.email, ma.is_corresponding
     FROM manuscript_authors ma
     JOIN manuscripts m ON m.id = ma.manuscript_id
     WHERE m.submission_number ILIKE $1
     ORDER BY ma.position ASC`,
    [submissionNumber.trim()]
  )

  return {
    ...manuscript,
    authors: authors.rows.map((a) => ({
      name: `${a.first_name} ${a.last_name}`.trim(),
      email: a.email,
      isCorresponding: a.is_corresponding,
    })),
  }
}

export const BACKEND_TOOLS = [
  {
    name: 'get_manuscript_status',
    description: 'Get the current status of a manuscript by its submission number',
    inputSchema: {
      type: 'object',
      properties: {
        submission_number: { type: 'string', description: 'The manuscript submission number (e.g. IJIDCR-26-0001)' },
      },
      required: ['submission_number'],
    },
  },
  {
    name: 'get_revision_status',
    description: 'Get revision request status for a manuscript',
    inputSchema: {
      type: 'object',
      properties: {
        submission_number: { type: 'string' },
      },
      required: ['submission_number'],
    },
  },
  {
    name: 'get_review_status',
    description: 'Get peer review status for a manuscript',
    inputSchema: {
      type: 'object',
      properties: {
        submission_number: { type: 'string' },
      },
      required: ['submission_number'],
    },
  },
  {
    name: 'get_submission_guidelines',
    description: 'Get submission guidelines for the journal',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_journal_information',
    description: 'Get general journal information (name, ISSN, publisher, aims)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_author_submission_context',
    description: 'Get full submission context including authors for a manuscript',
    inputSchema: {
      type: 'object',
      properties: {
        submission_number: { type: 'string' },
      },
      required: ['submission_number'],
    },
  },
]

const TOOL_MAP = {
  get_manuscript_status: getManuscriptStatus,
  get_revision_status: getRevisionStatus,
  get_review_status: getReviewStatus,
  get_submission_guidelines: getSubmissionGuidelines,
  get_journal_information: getJournalInformation,
  get_author_submission_context: getAuthorSubmissionContext,
}

export async function executeToolCall(toolName, args) {
  const handler = TOOL_MAP[toolName]
  if (!handler) throw new Error(`Unknown tool: ${toolName}`)

  if (toolName.includes('manuscript') || toolName.includes('revision') || toolName.includes('review') || toolName.includes('submission_context')) {
    if (!args?.submission_number) throw new Error('submission_number is required')
  }

  const result = await handler(args?.submission_number)
  return result
}

export async function logToolCall({ emailId, toolName, args, result, error }) {
  await pool.query(
    `INSERT INTO workflow_logs (workflow_name, event_name, source, status, payload)
     VALUES ('ai_email', 'tool_call', 'gemini', $1, $2)`,
    [
      error ? 'failed' : 'success',
      JSON.stringify({
        email_id: emailId,
        tool: toolName,
        args,
        result: error ? undefined : result,
        error: error?.message,
      }),
    ]
  )
}
