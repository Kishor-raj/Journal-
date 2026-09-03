import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'
import { isConflicted } from '../../shared/utils/conflictCheck.js'
import { sendDeskRejected } from '../notification/manuscript-notification.service.js'

export async function getDashboardStats(moderatorId) {
  // KPI counts from the live queue
  const queueResult = await pool.query(
    `SELECT current_status, COUNT(*) as count
     FROM manuscripts
     WHERE current_status IN ('submitted', 'under_moderation')
     GROUP BY current_status`
  )
  const queueMap = Object.fromEntries(queueResult.rows.map(r => [r.current_status, Number(r.count)]))

  // This-month decision counts for the current moderator
  const statsResult = await pool.query(
    `SELECT decision, COUNT(*) as count
     FROM moderator_decisions
     WHERE moderator_id = $1
       AND created_at >= date_trunc('month', now())
     GROUP BY decision`,
    [moderatorId]
  )
  const statsMap = Object.fromEntries(statsResult.rows.map(r => [r.decision, Number(r.count)]))

  // Recent decisions by this moderator (last 10)
  const activityResult = await pool.query(
    `SELECT md.decision, md.created_at, m.submission_number, m.title
     FROM moderator_decisions md
     JOIN manuscripts m ON m.id = md.manuscript_id
     WHERE md.moderator_id = $1
     ORDER BY md.created_at DESC
     LIMIT 10`,
    [moderatorId]
  )

  const approved = statsMap['proceed'] || 0
  const returned = statsMap['return'] || 0
  const rejected = statsMap['reject'] || 0
  const total = approved + returned + rejected

  return {
    kpi: {
      new_in_queue: queueMap['submitted'] || 0,
      in_progress: queueMap['under_moderation'] || 0,
      returned_this_month: returned,
      approved_this_month: approved,
    },
    stats: { approved, returned, rejected, total },
    recent_activity: activityResult.rows,
  }
}


export async function getNotifications() {
  // 1. New submissions arriving in the queue (status changed to 'submitted')
  const newSubmissionsResult = await pool.query(
    `SELECT
       msh.id,
       msh.created_at,
       msh.from_status,
       msh.to_status,
       m.id          AS manuscript_id,
       m.submission_number,
       m.title,
       COALESCE(
         (SELECT string_agg(TRIM(CONCAT_WS(' ', ma.first_name, ma.last_name)), ', ' ORDER BY ma.author_order)
          FROM manuscript_authors ma
          WHERE ma.manuscript_id = m.id AND ma.author_order = 1),
         'Unknown author'
       ) AS first_author
     FROM manuscript_status_history msh
     JOIN manuscripts m ON m.id = msh.manuscript_id
     WHERE msh.to_status IN ('submitted', 'under_moderation')
     ORDER BY msh.created_at DESC
     LIMIT 30`
  )

  // 2. Decisions the moderator team recorded — routing confirmations
  const decisionsResult = await pool.query(
    `SELECT
       md.id,
       md.created_at,
       md.decision,
       m.id          AS manuscript_id,
       m.submission_number,
       m.title,
       m.current_status
     FROM moderator_decisions md
     JOIN manuscripts m ON m.id = md.manuscript_id
     ORDER BY md.created_at DESC
     LIMIT 20`
  )

  // Merge and sort newest-first
  const notifications = [
    ...newSubmissionsResult.rows.map(r => ({
      id: `sub-${r.id}`,
      type: r.from_status === 'draft' || r.from_status === null ? 'New' : 'Resubmission',
      manuscript_id: r.manuscript_id,
      submission_number: r.submission_number,
      title: r.title,
      first_author: r.first_author,
      created_at: r.created_at,
    })),
    ...decisionsResult.rows.map(r => ({
      id: `dec-${r.id}`,
      type: r.decision === 'proceed' ? 'Routed'
          : r.decision === 'return'  ? 'Returned'
          : 'Rejected',
      manuscript_id: r.manuscript_id,
      submission_number: r.submission_number,
      title: r.title,
      first_author: null,
      created_at: r.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return notifications
}


export async function getQueue() {
  const result = await pool.query(
    `SELECT
       m.id,
       m.title,
       m.submission_number,
       m.submitted_at,
       c.name as category_name,
       m.current_status,
       COALESCE(
         (SELECT TRIM(CONCAT_WS(' ', ma.first_name, ma.last_name))
          FROM manuscript_authors ma
          WHERE ma.manuscript_id = m.id
          ORDER BY ma.author_order
          LIMIT 1),
         'Author unknown'
       ) AS submitter_name
     FROM manuscripts m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.current_status IN ('submitted', 'under_moderation')
     ORDER BY m.submitted_at ASC`
  )
  return result.rows
}

export async function getManuscriptForScreening(manuscriptId) {
  const manuscriptResult = await pool.query(
    `SELECT m.*, j.name as journal_name, c.name as category_name
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.id = $1`,
    [manuscriptId]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  const manuscript = manuscriptResult.rows[0]

  if (!['submitted', 'under_moderation'].includes(manuscript.current_status)) {
    throw new AppError('Manuscript is not in the moderation queue', 400)
  }

  const authorsResult = await pool.query(
    `SELECT * FROM manuscript_authors WHERE manuscript_id = $1 ORDER BY author_order`,
    [manuscriptId]
  )

  const filesResult = await pool.query(
    `SELECT * FROM manuscript_files WHERE manuscript_id = $1 ORDER BY uploaded_at`,
    [manuscriptId]
  )

  return {
    ...manuscript,
    authors: authorsResult.rows,
    files: filesResult.rows,
  }
}

export async function submitCheck(manuscriptId, moderatorId, checkData) {
  const { checklist, plagiarism_score, ethics_check_status, files_valid, decision, notes, notes_to_author } = checkData

  if (!decision || !['proceed', 'return', 'reject'].includes(decision)) {
    throw new AppError('Invalid decision', 400)
  }

  // Approve (proceed) is only valid when Scope Assessment = PASS
  if (decision === 'proceed' && checklist?.scope !== 'pass') {
    throw new AppError(
      'Cannot approve: Scope Assessment must be PASS to approve a manuscript',
      422
    )
  }

  const conflicted = await isConflicted(moderatorId, manuscriptId)
  if (conflicted) {
    throw new AppError('Conflict of interest detected', 409)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const manuscriptResult = await client.query(
      'SELECT * FROM manuscripts WHERE id = $1 FOR UPDATE',
      [manuscriptId]
    )

    if (manuscriptResult.rows.length === 0) {
      throw new AppError('Manuscript not found', 404)
    }

    const manuscript = manuscriptResult.rows[0]

    if (!['submitted', 'under_moderation'].includes(manuscript.current_status)) {
      throw new AppError('Manuscript is not available for screening', 400)
    }

    await client.query(
      `INSERT INTO moderator_checks (manuscript_id, moderator_id, checklist, plagiarism_score, ethics_check_status, files_valid, decision, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [manuscriptId, moderatorId, JSON.stringify(checklist), plagiarism_score || null, ethics_check_status || null, files_valid || false, decision, notes || null]
    )

    const decisionResult = await client.query(
      `INSERT INTO moderator_decisions (manuscript_id, moderator_id, decision, reason, notes_to_author)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [manuscriptId, moderatorId, decision, notes || null, notes_to_author || null]
    )
    const moderatorDecisionId = decisionResult.rows[0].id

    const statusMap = {
      proceed: 'editor_assignment',
      reject: 'desk_rejected',
      return: 'draft',
    }

    const newStatus = statusMap[decision]
    const oldStatus = manuscript.current_status

    await client.query(
      `UPDATE manuscripts SET current_status = $1, updated_at = now() WHERE id = $2`,
      [newStatus, manuscriptId]
    )

    await client.query(
      `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [manuscriptId, oldStatus, newStatus, moderatorId, notes || null]
    )

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'moderation_check_submitted', 'manuscripts', $2)`,
      [moderatorId, manuscriptId]
    )

    await client.query('COMMIT')

    if (decision === 'reject') {
      sendDeskRejected(manuscriptId, moderatorDecisionId).catch((err) => {
        console.error('Post-commit desk rejection email failed:', err.message)
      })
    }

    return {
      manuscript_id: manuscriptId,
      decision: newStatus,
      message: `Manuscript moved to ${newStatus}`,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
