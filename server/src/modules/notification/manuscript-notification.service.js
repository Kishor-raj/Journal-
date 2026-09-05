import pool from '../../config/db.js'
import { enqueueNotification } from './notification.service.js'
import { buildAppUrl } from '../email/email.utils.js'

const MANUSCRIPT_PATH = '/author/manuscripts'

async function loadManuscriptContext(manuscriptId) {
  const result = await pool.query(
    `SELECT m.id, m.title, m.submission_number, m.journal_id, m.submitted_by,
            m.submitted_at, m.updated_at, m.current_status,
            j.name AS journal_name
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     WHERE m.id = $1`,
    [manuscriptId]
  )
  if (result.rows.length === 0) return null
  const manuscript = result.rows[0]

  const userResult = await pool.query(
    `SELECT id, email, first_name, last_name, display_name
     FROM users WHERE id = $1`,
    [manuscript.submitted_by]
  )
  const user = userResult.rows[0] || null

  const authorName = user
    ? (user.display_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Author')
    : 'Author'

  const journalName = manuscript.journal_name || 'Asgard Publications'

  return {
    ...manuscript,
    authorName,
    recipientUserId: manuscript.submitted_by,
    recipientEmail: user?.email || null,
    journalName,
  }
}

async function loadDecisionContext(decisionId) {
  const result = await pool.query(
    `SELECT ed.id, ed.manuscript_id, ed.editor_id, ed.decision,
            ed.comments_to_author, ed.internal_notes, ed.created_at AS decision_date
     FROM editorial_decisions ed
     WHERE ed.id = $1`,
    [decisionId]
  )
  if (result.rows.length === 0) return null
  return result.rows[0]
}

async function loadModeratorDecisionContext(decisionId) {
  const result = await pool.query(
    `SELECT md.id, md.manuscript_id, md.moderator_id, md.decision,
            md.reason, md.notes_to_author, md.created_at AS decision_date
     FROM moderator_decisions md
     WHERE md.id = $1`,
    [decisionId]
  )
  if (result.rows.length === 0) return null
  return result.rows[0]
}

function buildManuscriptUrl(manuscriptId) {
  return buildAppUrl(`${MANUSCRIPT_PATH}/${manuscriptId}`)
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return String(date)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function sendSubmissionReceived(manuscriptId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send submission_received: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const result = await enqueueNotification('submission_received', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      submission_number: ctx.submission_number,
      manuscript_title: ctx.title,
      journal_name: ctx.journalName,
      submitted_at: formatDate(ctx.submitted_at),
      manuscript_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send submission_received for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendDeskRejected(manuscriptId, decisionId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send desk_rejected: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const decision = await loadModeratorDecisionContext(decisionId)
    if (!decision) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send desk_rejected: decision not found ${decisionId}`)
      return { success: false, skipped: true, reason: 'decision_not_found' }
    }

    const result = await enqueueNotification('desk_rejected', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      submission_number: ctx.submission_number,
      manuscript_title: ctx.title,
      journal_name: ctx.journalName,
      decision_reason: decision.reason || '',
      moderation_notes_to_author: decision.notes_to_author || '',
      manuscript_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send desk_rejected for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendEditorialAccepted(manuscriptId, decisionId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send editorial_accepted: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const decision = await loadDecisionContext(decisionId)
    if (!decision) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send editorial_accepted: decision not found ${decisionId}`)
      return { success: false, skipped: true, reason: 'decision_not_found' }
    }

    const result = await enqueueNotification('editorial_accepted', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      submission_number: ctx.submission_number,
      manuscript_title: ctx.title,
      journal_name: ctx.journalName,
      decision_date: formatDate(decision.decision_date),
      manuscript_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send editorial_accepted for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendEditorialRejected(manuscriptId, decisionId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send editorial_rejected: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const decision = await loadDecisionContext(decisionId)
    if (!decision) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send editorial_rejected: decision not found ${decisionId}`)
      return { success: false, skipped: true, reason: 'decision_not_found' }
    }

    const result = await enqueueNotification('editorial_rejected', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      submission_number: ctx.submission_number,
      manuscript_title: ctx.title,
      journal_name: ctx.journalName,
      comments_to_author: decision.comments_to_author || '',
      decision_date: formatDate(decision.decision_date),
      manuscript_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send editorial_rejected for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendMinorRevisionRequested(manuscriptId, decisionId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send minor_revision_requested: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const decision = await loadDecisionContext(decisionId)
    if (!decision) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send minor_revision_requested: decision not found ${decisionId}`)
      return { success: false, skipped: true, reason: 'decision_not_found' }
    }

    const revisionRequest = await pool.query(
      `SELECT instructions, due_at FROM revision_requests WHERE editorial_decision_id = $1 LIMIT 1`,
      [decisionId]
    )
    const revReq = revisionRequest.rows[0] || {}

    const result = await enqueueNotification('minor_revision_requested', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      submission_number: ctx.submission_number,
      manuscript_title: ctx.title,
      journal_name: ctx.journalName,
      revision_instructions: revReq.instructions || decision.comments_to_author || '',
      revision_due_at: formatDate(revReq.due_at),
      revision_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send minor_revision_requested for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendMajorRevisionRequested(manuscriptId, decisionId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send major_revision_requested: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const decision = await loadDecisionContext(decisionId)
    if (!decision) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send major_revision_requested: decision not found ${decisionId}`)
      return { success: false, skipped: true, reason: 'decision_not_found' }
    }

    const revisionRequest = await pool.query(
      `SELECT instructions, due_at FROM revision_requests WHERE editorial_decision_id = $1 LIMIT 1`,
      [decisionId]
    )
    const revReq = revisionRequest.rows[0] || {}

    const result = await enqueueNotification('major_revision_requested', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      submission_number: ctx.submission_number,
      manuscript_title: ctx.title,
      journal_name: ctx.journalName,
      revision_instructions: revReq.instructions || decision.comments_to_author || '',
      revision_due_at: formatDate(revReq.due_at),
      revision_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send major_revision_requested for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendDraftReminder(manuscriptId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx || !ctx.recipientEmail) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send draft_reminder: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const result = await enqueueNotification('draft_reminder', ctx.recipientUserId, {
      recipient_email: ctx.recipientEmail,
      author_name: ctx.authorName,
      manuscript_title: ctx.title || 'Untitled Manuscript',
      submission_number: ctx.submission_number,
      last_updated_at: formatDate(ctx.updated_at),
      draft_url: buildManuscriptUrl(manuscriptId),
      journal_name: ctx.journalName,
      manuscript_id: manuscriptId,
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send draft_reminder for ${manuscriptId}:`, err.message)
    return { success: false, error: err.message }
  }
}

export async function sendPublicationCertificate(manuscriptId, authorId) {
  try {
    const ctx = await loadManuscriptContext(manuscriptId)
    if (!ctx) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send publication_certificate: missing context for ${manuscriptId}`)
      return { success: false, skipped: true, reason: 'missing_context' }
    }

    const certificate = await pool.query(
      `SELECT pc.id, pc.certificate_number, pc.pdf_file_url, pc.verification_token,
              pc.status, pc.generated_at,
              ma.id AS author_id, ma.user_id, ma.first_name, ma.last_name, ma.email,
              p.volume, p.issue, p.publication_year, p.publication_date, p.doi
       FROM publication_certificates pc
       JOIN manuscript_authors ma ON ma.id = pc.author_id
       JOIN publications p ON p.manuscript_id = pc.manuscript_id
       WHERE pc.manuscript_id = $1 AND pc.author_id = $2`,
      [manuscriptId, authorId]
    )

    if (certificate.rows.length === 0) {
      console.error(`[MANUSCRIPT_NOTIFY] Cannot send publication_certificate: certificate not found for ${manuscriptId}/${authorId}`)
      return { success: false, skipped: true, reason: 'certificate_not_found' }
    }

    const cert = certificate.rows[0]

    if (cert.status !== 'active') {
      return { success: false, skipped: true, reason: 'certificate_not_active' }
    }

    const recipientUserId = cert.user_id || ctx.recipientUserId
    const recipientEmail = cert.email || ctx.recipientEmail
    if (!recipientUserId || !recipientEmail) {
      return { success: false, skipped: true, reason: 'missing_recipient' }
    }

    const authorName =
      [cert.first_name, cert.last_name].filter(Boolean).join(' ').trim() ||
      recipientEmail.split('@')[0] ||
      ctx.authorName

    const verificationUrl = buildAppUrl(`/verify/${cert.verification_token}`)

    const result = await enqueueNotification('publication_certificate', recipientUserId, {
      recipient_email: recipientEmail,
      author_name: authorName,
      manuscript_title: ctx.title,
      submission_number: ctx.submission_number,
      journal_name: ctx.journalName,
      certificate_number: cert.certificate_number,
      volume: cert.volume,
      issue: cert.issue,
      publication_year: cert.publication_year,
      publication_date: formatDate(cert.publication_date),
      certificate_download_url: cert.pdf_file_url || '',
      verification_url: verificationUrl,
      manuscript_url: buildManuscriptUrl(manuscriptId),
      manuscript_id: manuscriptId,
      author_id: contentId(cert.author_id),
    })

    return result
  } catch (err) {
    console.error(`[MANUSCRIPT_NOTIFY] Failed to send publication_certificate for ${manuscriptId}/${authorId}:`, err.message)
    return { success: false, error: err.message }
  }
}

function contentId(value) {
  return typeof value === 'bigint' ? Number(value) : value
}

export async function findDraftsEligibleForReminder(options = {}) {
  const reminderAfterDays = options.reminderAfterDays || 3
  const cooldownDays = options.cooldownDays || 7

  const result = await pool.query(
    `SELECT m.id, m.title, m.submission_number, m.updated_at, m.submitted_by
     FROM manuscripts m
     JOIN users u ON u.id = m.submitted_by
     WHERE m.current_status = 'draft'
       AND m.submitted_by IS NOT NULL
       AND u.account_status = 'active'
       AND m.updated_at <= now() - ($1 || ' days')::interval
       AND NOT EXISTS (
         SELECT 1 FROM email_notifications en
         WHERE en.manuscript_id = m.id
           AND en.template_key = 'draft_reminder'
           AND en.status IN ('sent', 'queued')
           AND en.created_at >= now() - ($2 || ' days')::interval
       )
     ORDER BY m.updated_at ASC`,
    [String(reminderAfterDays), String(cooldownDays)]
  )

  return result.rows
}

export async function processDraftReminders(options = {}) {
  const drafts = await findDraftsEligibleForReminder(options)
  const results = []

  for (const draft of drafts) {
    try {
      const result = await sendDraftReminder(draft.id)
      results.push({ manuscript_id: draft.id, ...result })
    } catch (err) {
      console.error(`[MANUSCRIPT_NOTIFY] Draft reminder failed for ${draft.id}:`, err.message)
      results.push({ manuscript_id: draft.id, success: false, error: err.message })
    }
  }

  return { total: drafts.length, results }
}
