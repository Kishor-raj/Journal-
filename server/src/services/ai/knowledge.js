import pool from '../../config/db.js'

const MAX_CHUNK_LENGTH = 2000
const MAX_CHUNKS = 5

export async function retrieveRelevantKnowledge({ classification, extractedData, journalId }) {
  const chunks = []

  const guidelines = await retrieveSubmissionGuidelines(journalId)
  if (guidelines.length > 0) chunks.push(...guidelines)

  const journalInfo = await retrieveJournalInformation(journalId)
  if (journalInfo.length > 0) chunks.push(...journalInfo)

  const faq = await retrieveFaqContent(journalId)
  if (faq.length > 0) chunks.push(...faq)

  const filtered = filterByRelevance(chunks, { classification, extractedData })

  return filtered.slice(0, MAX_CHUNKS).map((c) => ({
    source: c.source,
    title: c.title,
    content: c.content.slice(0, MAX_CHUNK_LENGTH),
  }))
}

export function formatKnowledgeForPrompt(chunks) {
  if (!chunks || chunks.length === 0) return null
  return chunks.map((c) => `[${c.source}] ${c.title}:\n${c.content}`).join('\n\n')
}

async function retrieveSubmissionGuidelines(journalId) {
  const result = await pool.query(
    `SELECT sg.title, sg.content, j.name AS journal_name
     FROM submission_guidelines sg
     JOIN journals j ON j.id = sg.journal_id
     WHERE ($1::uuid IS NULL OR sg.journal_id = $1)
       AND sg.is_active = true
     ORDER BY sg.created_at DESC
     LIMIT 5`,
    [journalId || null]
  )
  return result.rows.map((r) => ({
    source: 'submission_guidelines',
    title: r.title || 'Submission Guidelines',
    content: r.content || '',
  }))
}

async function retrieveJournalInformation(journalId) {
  const result = await pool.query(
    `SELECT name, issn, publisher, description, aims_and_scope
     FROM journals
     WHERE ($1::uuid IS NULL OR id = $1)
     LIMIT 3`,
    [journalId || null]
  )
  return result.rows.map((r) => ({
    source: 'journal_info',
    title: r.name || 'Journal Information',
    content: [
      r.description && `Description: ${r.description}`,
      r.aims_and_scope && `Aims & Scope: ${r.aims_and_scope}`,
      r.issn && `ISSN: ${r.issn}`,
      r.publisher && `Publisher: ${r.publisher}`,
    ].filter(Boolean).join('\n'),
  }))
}

async function retrieveFaqContent(journalId) {
  const result = await pool.query(
    `SELECT sg.title, sg.content
     FROM submission_guidelines sg
     WHERE ($1::uuid IS NULL OR sg.journal_id = $1)
       AND sg.is_active = true
       AND (sg.title ILIKE '%faq%' OR sg.title ILIKE '%frequently%' OR sg.title ILIKE '%question%')
     ORDER BY sg.created_at DESC
     LIMIT 3`,
    [journalId || null]
  )
  return result.rows.map((r) => ({
    source: 'faq',
    title: r.title || 'FAQ',
    content: r.content || '',
  }))
}

function filterByRelevance(chunks, { classification, extractedData }) {
  const submissionNumber = extractedData?.submission_number
  if (submissionNumber) {
    const relevant = chunks.filter((c) =>
      c.content.includes(submissionNumber) || c.source === 'journal_info'
    )
    if (relevant.length > 0) return relevant
  }

  const categoryKeywords = {
    SUBMISSION_GUIDELINES: ['submit', 'guideline', 'format', 'author'],
    JOURNAL_INFORMATION: ['journal', 'scope', 'aims', 'issn'],
    MANUSCRIPT_STATUS: ['status', 'manuscript', 'submission'],
    GENERAL_QUESTION: [],
  }

  const keywords = categoryKeywords[classification] || []
  if (keywords.length === 0) return chunks

  const scored = chunks.map((c) => {
    const lower = (c.content + ' ' + c.title).toLowerCase()
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
    return { ...c, score }
  })

  return scored.sort((a, b) => b.score - a.score)
}
