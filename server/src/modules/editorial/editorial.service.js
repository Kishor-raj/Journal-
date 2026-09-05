import crypto from 'crypto'
import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'
import { isConflicted } from '../../shared/utils/conflictCheck.js'
import { enqueueNotification } from '../notification/notification.service.js'
import { buildAppUrl } from '../email/email.utils.js'
import {
  sendEditorialAccepted,
  sendEditorialRejected,
  sendMinorRevisionRequested,
  sendMajorRevisionRequested,
} from '../notification/manuscript-notification.service.js'

const INVITATION_PATH = '/reviewer/invitations'

function logWorkflow(client, { manuscriptId, eventName, status, payload, errorMessage }) {
  return client.query(
    `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload, error_message)
     VALUES ('reviewer_invitation', $1, $2, 'resend', $3, $4, $5)`,
    [manuscriptId, eventName, status, JSON.stringify(payload || {}), errorMessage || null]
  )
}

function logAudit(client, { actorId, action, entityId, newValues }) {
  return client.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values)
     VALUES ($1, $2, 'reviewer_invitations', $3, $4)`,
    [actorId, action, entityId, JSON.stringify(newValues || {})]
  )
}

async function recordEmailStatus({ invitationId, manuscriptId, status, sentAt, messageId, error, resendCount, lastResentAt }) {
  await pool.query(
    `UPDATE reviewer_invitations
     SET email_status = $1,
         email_sent_at = COALESCE($2, email_sent_at),
         email_message_id = COALESCE($3, email_message_id),
         email_error = $4,
         resend_count = COALESCE($5, resend_count),
         last_resent_at = COALESCE($6, last_resent_at)
     WHERE id = $7`,
    [status, sentAt, messageId, error || null, resendCount, lastResentAt, invitationId]
  )

  await logWorkflow(pool, {
    manuscriptId,
    eventName: status === 'sent' ? 'reviewer_invitation_email_sent' : status === 'failed' ? 'reviewer_invitation_email_failed' : 'reviewer_invitation_email_queued',
    status,
    payload: { invitation_id: invitationId, provider_message_id: messageId || null },
    errorMessage: error || null,
  })
}

async function buildInvitationEmailContext(manuscriptId, reviewerId, invitationId, token, dueAt, editorId) {
  const [reviewerResult, journalResult, editorResult] = await Promise.all([
    pool.query(
      `SELECT email, first_name, last_name, display_name
       FROM users WHERE id = $1`,
      [reviewerId]
    ),
    pool.query(
      `SELECT j.name
       FROM manuscripts m
       JOIN journals j ON j.id = m.journal_id
       WHERE m.id = $1`,
      [manuscriptId]
    ),
    pool.query(
      `SELECT display_name, first_name, last_name FROM users WHERE id = $1`,
      [editorId]
    ),
  ])

  const reviewer = reviewerResult.rows[0] || {}
  const journal = journalResult.rows[0] || {}
  const editor = editorResult.rows[0] || {}

  const manuscriptResult = await pool.query(
    'SELECT title, submission_number FROM manuscripts WHERE id = $1',
    [manuscriptId]
  )
  const manuscript = manuscriptResult.rows[0] || {}

  const reviewerName = reviewer.display_name || [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || reviewer.email?.split('@')[0] || 'Reviewer'
  const editorName = editor.display_name || [editor.first_name, editor.last_name].filter(Boolean).join(' ') || 'Editor'
  const journalName = journal.name || 'Asgard Publications'
  const due = new Date(dueAt)
  const reviewDeadline = isNaN(due.getTime())
    ? String(dueAt)
    : due.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const invitationUrl = buildAppUrl(`${INVITATION_PATH}/${invitationId}`, { token })

  return {
    reviewerName,
    editorName,
    journalName,
    reviewDeadline,
    invitationUrl,
    reviewerEmail: reviewer.email,
    manuscriptTitle: manuscript.title,
    submissionNumber: manuscript.submission_number,
  }
}

export async function getDashboardStats(editorId) {
  const assignedResult = await pool.query(
    `SELECT
       ea.manuscript_id  AS id,
       m.submission_number,
       m.title,
       m.current_status,
       m.submitted_at,
       ea.assigned_at
     FROM editorial_assignments ea
     JOIN manuscripts m ON m.id = ea.manuscript_id
     WHERE ea.editor_id = $1
       AND ea.completed_at IS NULL
     ORDER BY ea.assigned_at ASC`,
    [editorId]
  )

  const assigned = assignedResult.rows
  const ids = assigned.map((row) => row.id)

  const kpi = {
    assigned_to_me: assigned.length,
    awaiting_reviewers: 0,
    under_review: 0,
    decision_due: 0,
    accepted_manuscripts: 0,
  }

  const urgent = {
    overdue_reviews: [],
    decisions_pending: [],
    no_reviewers: [],
  }

  if (ids.length === 0) {
    return { kpi, urgent, queue: [], recent_activity: [] }
  }

  const reviewerResult = await pool.query(
    `SELECT
       ra.manuscript_id,
       COUNT(*) FILTER (WHERE ra.assignment_status IN ('invited', 'accepted'))::int AS active_reviews,
       COUNT(*) FILTER (WHERE ra.assignment_status = 'completed')::int              AS completed_reviews,
       MIN(ra.due_at) FILTER (WHERE ra.assignment_status IN ('invited', 'accepted')) AS next_due
     FROM reviewer_assignments ra
     JOIN manuscripts m ON m.id = ra.manuscript_id
     WHERE ra.manuscript_id = ANY($1::uuid[])
       AND ra.round_number = m.revision_round
     GROUP BY ra.manuscript_id`,
    [ids]
  )
  const reviewerMap = new Map(reviewerResult.rows.map((r) => [r.manuscript_id, r]))

  for (const row of assigned) {
    const reviews = reviewerMap.get(row.id) || {}
    const completed = reviews.completed_reviews || 0

    if (row.current_status === 'editor_assignment') {
      kpi.awaiting_reviewers += 1
    }
    if (row.current_status === 'under_review') {
      kpi.under_review += 1
    }
    if (row.current_status === 'under_review' && completed > 0) {
      kpi.decision_due += 1
    }
  }

  const acceptedCountResult = await pool.query(
    `SELECT COUNT(DISTINCT m.id)::int AS count
     FROM manuscripts m
     JOIN editorial_assignments ea ON ea.manuscript_id = m.id
     WHERE ea.editor_id = $1
       AND m.current_status = 'accepted'`,
    [editorId]
  )
  kpi.accepted_manuscripts = acceptedCountResult.rows[0]?.count ?? 0

  const overdueResult = await pool.query(
    `SELECT
       ra.manuscript_id,
       ra.due_at,
       u.display_name AS reviewer_name,
       m.submission_number,
       m.title
     FROM reviewer_assignments ra
     JOIN manuscripts m ON m.id = ra.manuscript_id
     JOIN users u ON u.id = ra.reviewer_id
     JOIN editorial_assignments ea ON ea.manuscript_id = ra.manuscript_id
     WHERE ea.editor_id = $1
       AND ea.completed_at IS NULL
       AND ra.assignment_status IN ('invited', 'accepted')
       AND ra.round_number = m.revision_round
       AND ra.due_at IS NOT NULL
       AND ra.due_at < now()
     ORDER BY ra.due_at ASC`,
    [editorId]
  )
  urgent.overdue_reviews = overdueResult.rows

  const pendingDecisionResult = await pool.query(
    `SELECT m.id, m.submission_number, m.title
     FROM manuscripts m
     JOIN editorial_assignments ea ON ea.manuscript_id = m.id
     WHERE ea.editor_id = $1
       AND ea.completed_at IS NULL
       AND m.current_status = 'under_review'
       AND NOT EXISTS (
         SELECT 1 FROM editorial_decisions ed WHERE ed.manuscript_id = m.id
       )
       AND EXISTS (
         SELECT 1 FROM reviews r
         WHERE r.manuscript_id = m.id AND r.is_complete = true
       )
     ORDER BY m.submitted_at ASC`,
    [editorId]
  )
  urgent.decisions_pending = pendingDecisionResult.rows

  const noReviewersResult = await pool.query(
    `SELECT m.id, m.submission_number, m.title, m.submitted_at
     FROM manuscripts m
     JOIN editorial_assignments ea ON ea.manuscript_id = m.id
     WHERE ea.editor_id = $1
       AND ea.completed_at IS NULL
       AND m.current_status = 'editor_assignment'
     ORDER BY m.submitted_at ASC`,
    [editorId]
  )
  urgent.no_reviewers = noReviewersResult.rows

  const queue = assigned.map((row) => {
    const reviews = reviewerMap.get(row.id) || {}
    return {
      ...row,
      active_reviews: reviews.active_reviews || 0,
      completed_reviews: reviews.completed_reviews || 0,
      next_due: reviews.next_due || null,
    }
  })

  const activityResult = await pool.query(
    `SELECT
       'review_submitted' AS kind,
       r.submitted_at      AS created_at,
       m.submission_number,
       m.title,
       u.display_name      AS reviewer_name,
       r.recommendation::text AS value
     FROM reviews r
     JOIN manuscripts m ON m.id = r.manuscript_id
     JOIN users u ON u.id = r.reviewer_id
     JOIN editorial_assignments ea ON ea.manuscript_id = m.id
     WHERE ea.editor_id = $1

     UNION ALL

     SELECT
       'decision_made' AS kind,
       ed.created_at,
       m.submission_number,
       m.title,
       NULL::text AS reviewer_name,
       ed.decision::text AS value
     FROM editorial_decisions ed
     JOIN manuscripts m ON m.id = ed.manuscript_id
     WHERE ed.editor_id = $1

     UNION ALL

     SELECT
       'reviewer_invited' AS kind,
       ra.assigned_at,
       m.submission_number,
       m.title,
       u.display_name AS reviewer_name,
       NULL::text AS value
     FROM reviewer_assignments ra
     JOIN manuscripts m ON m.id = ra.manuscript_id
     JOIN users u ON u.id = ra.reviewer_id
     WHERE ra.editor_id = $1

     ORDER BY created_at DESC
     LIMIT 10`,
    [editorId]
  )

  return { kpi, urgent, queue, recent_activity: activityResult.rows }
}

export async function getQueue() {
  const result = await pool.query(
    `SELECT m.*, j.name as journal_name, c.name as category_name,
            u.display_name as submitted_by_name
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     LEFT JOIN categories c ON c.id = m.category_id
     LEFT JOIN users u ON u.id = m.submitted_by
     WHERE m.current_status = 'editor_assignment'
     ORDER BY m.submitted_at ASC`
  )

  return result.rows
}

export async function getReviewerManagement(editorId) {
  const result = await pool.query(
    `SELECT
       ra.id AS assignment_id,
       ra.assignment_status,
       ra.assigned_at,
       ra.accepted_at,
       ra.due_at,
       ra.completed_at,
       ra.round_number,
       m.id AS manuscript_id,
       m.submission_number,
       m.title AS manuscript_title,
       m.current_status,
       u.display_name AS reviewer_name,
       u.email AS reviewer_email,
       ri.id AS invitation_id,
       ri.email_status,
       ri.resend_count,
       ri.expires_at AS invitation_expires_at
     FROM reviewer_assignments ra
     JOIN manuscripts m ON m.id = ra.manuscript_id
     JOIN users u ON u.id = ra.reviewer_id
     JOIN editorial_assignments ea ON ea.manuscript_id = ra.manuscript_id
     LEFT JOIN LATERAL (
       SELECT i.id, i.email_status, i.resend_count, i.expires_at
       FROM reviewer_invitations i
       WHERE i.assignment_id = ra.id
         AND i.response IS NULL
       ORDER BY i.sent_at DESC
       LIMIT 1
     ) ri ON true
     WHERE ea.editor_id = $1
       AND ea.completed_at IS NULL
     ORDER BY ra.due_at ASC NULLS LAST, ra.assigned_at DESC`,
    [editorId]
  )

  return result.rows
}

export async function getPendingDecisions(editorId) {
  const result = await pool.query(
    `SELECT
       m.id,
       m.submission_number,
       m.title,
       m.current_status,
       m.submitted_at,
       (SELECT COUNT(*)::int FROM reviews r
         WHERE r.manuscript_id = m.id
           AND r.round_number = m.revision_round
           AND r.is_complete = true) AS completed_reviews,
       (SELECT COUNT(*)::int FROM reviewer_assignments ra
         WHERE ra.manuscript_id = m.id
           AND ra.round_number = m.revision_round
           AND ra.assignment_status IN ('invited', 'accepted')) AS active_reviews,
       (SELECT MIN(ra.due_at) FROM reviewer_assignments ra
         WHERE ra.manuscript_id = m.id
           AND ra.round_number = m.revision_round
           AND ra.assignment_status IN ('invited', 'accepted')) AS next_due
     FROM manuscripts m
     JOIN editorial_assignments ea ON ea.manuscript_id = m.id
     WHERE ea.editor_id = $1
       AND ea.completed_at IS NULL
       AND m.current_status = 'under_review'
       AND NOT EXISTS (
         SELECT 1 FROM editorial_decisions ed WHERE ed.manuscript_id = m.id
       )
       AND EXISTS (
         SELECT 1 FROM reviews r
         WHERE r.manuscript_id = m.id
           AND r.round_number = m.revision_round
           AND r.is_complete = true
       )
     ORDER BY m.submitted_at ASC`,
    [editorId]
  )

  return result.rows
}

export async function getNotifications(editorId) {
  const result = await pool.query(
    `SELECT t.id, t.type, t.created_at, t.manuscript_id, t.submission_number, t.title, t.actor_name, t.value
     FROM (
       SELECT
         'assignment' AS type,
         msh.id,
         msh.created_at,
         m.id AS manuscript_id,
         m.submission_number,
         m.title,
         NULL::text AS actor_name,
         NULL::text AS value
       FROM manuscript_status_history msh
       JOIN manuscripts m ON m.id = msh.manuscript_id
       JOIN editorial_assignments ea ON ea.manuscript_id = m.id
       WHERE ea.editor_id = $1
         AND msh.to_status = 'editor_assignment'

       UNION ALL

       SELECT
         'review' AS type,
         r.id,
         r.submitted_at,
         m.id,
         m.submission_number,
         m.title,
         u.display_name,
         r.recommendation::text
       FROM reviews r
       JOIN manuscripts m ON m.id = r.manuscript_id
       JOIN users u ON u.id = r.reviewer_id
       JOIN editorial_assignments ea ON ea.manuscript_id = m.id
       WHERE ea.editor_id = $1
         AND r.is_complete = true

       UNION ALL

       SELECT
         'invitation' AS type,
         ri.id,
         COALESCE(ri.responded_at, ri.sent_at),
         m.id,
         m.submission_number,
         m.title,
         u.display_name,
         ri.response::text
       FROM reviewer_invitations ri
       JOIN manuscripts m ON m.id = ri.manuscript_id
       JOIN users u ON u.id = ri.reviewer_id
       JOIN editorial_assignments ea ON ea.manuscript_id = m.id
       WHERE ea.editor_id = $1
         AND ri.response IN ('accepted', 'declined')

       UNION ALL

       SELECT
         'deadline' AS type,
         ra.id,
         ra.due_at,
         m.id,
         m.submission_number,
         m.title,
         u.display_name,
         NULL::text
       FROM reviewer_assignments ra
       JOIN manuscripts m ON m.id = ra.manuscript_id
       JOIN users u ON u.id = ra.reviewer_id
       JOIN editorial_assignments ea ON ea.manuscript_id = ra.manuscript_id
       WHERE ea.editor_id = $1
         AND ra.assignment_status IN ('invited', 'accepted')
         AND ra.due_at IS NOT NULL
         AND ra.due_at < now()
     ) t
     ORDER BY created_at DESC
     LIMIT 30`,
    [editorId]
  )

  return result.rows
}

export async function getManuscript(manuscriptId) {
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

  const authorsResult = await pool.query(
    `SELECT * FROM manuscript_authors WHERE manuscript_id = $1 ORDER BY author_order`,
    [manuscriptId]
  )

  const filesResult = await pool.query(
    `SELECT * FROM manuscript_files WHERE manuscript_id = $1 ORDER BY uploaded_at`,
    [manuscriptId]
  )

  const reviewsResult = await pool.query(
    `SELECT r.*, u.display_name as reviewer_name
     FROM reviews r
     LEFT JOIN users u ON u.id = r.reviewer_id
     WHERE r.manuscript_id = $1
     ORDER BY r.submitted_at`,
    [manuscriptId]
  )

  return {
    ...manuscript,
    authors: authorsResult.rows,
    files: filesResult.rows,
    reviews: reviewsResult.rows,
  }
}

export async function claimManuscript(manuscriptId, editorId) {
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

    if (manuscriptResult.rows[0].current_status !== 'editor_assignment') {
      throw new AppError('Manuscript is not available for assignment', 400)
    }

    const conflicted = await isConflicted(editorId, manuscriptId)
    if (conflicted) {
      throw new AppError('Conflict of interest detected', 409)
    }

    const existingAssignment = await client.query(
      'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
      [manuscriptId, editorId]
    )

    if (existingAssignment.rowCount > 0) {
      throw new AppError('Already assigned to this manuscript', 409)
    }

    await client.query(
      `INSERT INTO editorial_assignments (manuscript_id, editor_id, assigned_at)
       VALUES ($1, $2, now())`,
      [manuscriptId, editorId]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address)
       VALUES ($1, 'manuscript_claimed', 'manuscripts', $2, $3, $4)`,
      [editorId, manuscriptId, JSON.stringify({ editor_id: editorId }), null]
    )

    await client.query('COMMIT')

    return { success: true, manuscript_id: manuscriptId, editor_id: editorId }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getEligibleReviewers(manuscriptId) {
  const manuscriptResult = await pool.query(
    'SELECT category_id FROM manuscripts WHERE id = $1',
    [manuscriptId]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  const categoryId = manuscriptResult.rows[0].category_id

  const result = await pool.query(
    `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.display_name,
            COALESCE(u.display_name, concat_ws(' ', u.first_name, u.last_name), u.email) AS name,
            u.institution, COALESCE(re.proficiency_level, 0) AS proficiency_level,
            re.category_id AS expertise_category_id
     FROM users u
     JOIN user_roles reviewer_role ON reviewer_role.user_id = u.id
     JOIN roles role ON role.id = reviewer_role.role_id AND role.name = 'reviewer'
     LEFT JOIN reviewer_expertise re
       ON re.reviewer_id = u.id AND $1::uuid IS NOT NULL AND re.category_id = $1
     WHERE u.account_status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM manuscript_authors ma
         WHERE ma.manuscript_id = $2 AND ma.user_id = u.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM reviewer_assignments ra
         WHERE ra.manuscript_id = $2 AND ra.reviewer_id = u.id
           AND ra.assignment_status IN ('invited', 'accepted', 'completed')
       )
     ORDER BY proficiency_level DESC, name ASC`,
    [categoryId, manuscriptId]
  )

  return result.rows
}

export async function inviteReviewer(manuscriptId, editorId, reviewerId, deadline) {
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
    const currentRound = manuscript.revision_round || 1

    const assignmentResult = await client.query(
      'SELECT editor_id FROM editorial_assignments WHERE manuscript_id = $1',
      [manuscriptId]
    )

    if (assignmentResult.rowCount === 0) {
      if (manuscript.current_status !== 'editor_assignment') {
        throw new AppError('This manuscript must be claimed before inviting reviewers', 403)
      }
      const editorConflicted = await isConflicted(editorId, manuscriptId)
      if (editorConflicted) {
        throw new AppError('Conflict of interest detected', 409)
      }
      await client.query(
        `INSERT INTO editorial_assignments (manuscript_id, editor_id, assigned_at)
         VALUES ($1, $2, now())`,
        [manuscriptId, editorId]
      )
    } else if (!assignmentResult.rows.some((assignment) => assignment.editor_id === editorId)) {
      throw new AppError('This manuscript is assigned to a different editor', 403)
    }

    const reviewerResult = await client.query(
      'SELECT id FROM users WHERE id = $1 AND account_status = $2',
      [reviewerId, 'active']
    )

    if (reviewerResult.rows.length === 0) {
      throw new AppError('Reviewer not found or inactive', 404)
    }

    const conflicted = await isConflicted(reviewerId, manuscriptId)
    if (conflicted) {
      throw new AppError('Reviewer has a conflict of interest', 409)
    }

    const existingInvitation = await client.query(
      `SELECT 1 FROM reviewer_invitations
       WHERE manuscript_id = $1 AND reviewer_id = $2 AND response IS NULL`,
      [manuscriptId, reviewerId]
    )

    if (existingInvitation.rowCount > 0) {
      throw new AppError('Invitation already pending for this reviewer', 409)
    }

    let dueAt
    if (deadline) {
      const parsed = new Date(deadline)
      if (isNaN(parsed.getTime())) {
        throw new AppError('Invalid deadline', 400)
      }
      dueAt = parsed.toISOString()
    } else {
      dueAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
    }

    const assignmentResult2 = await client.query(
      `INSERT INTO reviewer_assignments (manuscript_id, reviewer_id, editor_id, assignment_status, due_at, round_number)
       VALUES ($1, $2, $3, 'invited', $4, $5)
       RETURNING id`,
      [manuscriptId, reviewerId, editorId, dueAt, currentRound]
    )
    const assignmentId = assignmentResult2.rows[0].id

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const invitationResult = await client.query(
      `INSERT INTO reviewer_invitations (manuscript_id, reviewer_id, assignment_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [manuscriptId, reviewerId, assignmentId, tokenHash, dueAt]
    )
    const invitationId = invitationResult.rows[0].id

    try {
      await client.query(
        `UPDATE manuscripts SET current_status = 'under_review' WHERE id = $1 AND current_status != 'under_review'`,
        [manuscriptId]
      )
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError('Reviewer capacity limit reached', 409)
      }
      throw err
    }

    const activeReviewers = await client.query(
      `SELECT 1 FROM reviewer_assignments
       WHERE manuscript_id = $1 AND assignment_status IN ('invited', 'accepted')`,
      [manuscriptId]
    )

    if (activeReviewers.rowCount >= 2) {
      await client.query(
        `UPDATE manuscripts SET current_status = 'under_review' WHERE id = $1`,
        [manuscriptId]
      )
    }

    await logWorkflow(client, {
      manuscriptId,
      eventName: 'reviewer_invited',
      status: 'created',
      payload: { invitation_id: invitationId, assignment_id: assignmentId, reviewer_id: reviewerId },
    })

    await logAudit(client, {
      actorId: editorId,
      action: 'reviewer_invited',
      entityId: invitationId,
      newValues: { manuscript_id: manuscriptId, reviewer_id: reviewerId, assignment_id: assignmentId },
    })

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'reviewer_invited', 'reviewer_invitations', $2)`,
      [editorId, invitationId]
    )

    await client.query('COMMIT')

    let deliveryStatus = 'queued'
    try {
      const emailCtx = await buildInvitationEmailContext(manuscriptId, reviewerId, invitationId, token, dueAt, editorId)

      const delivery = await enqueueNotification('reviewer_invitation', reviewerId, {
        recipient_email: emailCtx.reviewerEmail,
        reviewer_name: emailCtx.reviewerName,
        editor_name: emailCtx.editorName,
        manuscript_title: emailCtx.manuscriptTitle,
        submission_number: emailCtx.submissionNumber,
        journal_name: emailCtx.journalName,
        review_deadline: emailCtx.reviewDeadline,
        invitation_url: emailCtx.invitationUrl,
        manuscript_id: manuscriptId,
      })

      if (delivery?.skipped) {
        deliveryStatus = 'skipped'
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'skipped',
          error: delivery.reason || 'email_disabled',
        })
      } else if (delivery?.success) {
        deliveryStatus = 'sent'
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'sent',
          sentAt: new Date(),
          messageId: delivery.provider_message_id,
        })
      } else {
        deliveryStatus = 'failed'
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'failed',
          error: delivery?.error || 'Email delivery failed',
        })
      }
    } catch (emailErr) {
      console.error('Reviewer invitation created but email delivery failed:', emailErr)
      deliveryStatus = 'failed'
      try {
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'failed',
          error: emailErr.message || 'Email delivery failed',
        })
      } catch (logErr) {
        console.error('Failed to record reviewer invitation email failure:', logErr)
      }
    }

    return {
      success: true,
      manuscript_id: manuscriptId,
      reviewer_id: reviewerId,
      invitation_id: invitationId,
      assignment_id: assignmentId,
      deadline: dueAt,
      email_status: deliveryStatus,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function resendInvitation(manuscriptId, editorId, assignmentId) {
  const client = await pool.connect()
  let invitationId = null
  let reviewerEmail = null
  try {
    await client.query('BEGIN')

    const assignmentResult = await client.query(
      `SELECT ra.*, m.revision_round
       FROM reviewer_assignments ra
       JOIN manuscripts m ON m.id = ra.manuscript_id
       WHERE ra.id = $1 AND ra.manuscript_id = $2 FOR UPDATE`,
      [assignmentId, manuscriptId]
    )

    if (assignmentResult.rows.length === 0) {
      throw new AppError('Assignment not found', 404)
    }

    const assignment = assignmentResult.rows[0]

    const editorAuth = await client.query(
      'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
      [manuscriptId, editorId]
    )
    if (editorAuth.rowCount === 0) {
      throw new AppError('Not authorized to resend this invitation', 403)
    }

    if (!['invited'].includes(assignment.assignment_status)) {
      throw new AppError('Invitation is not in a resendable state', 400)
    }

    const invResult = await client.query(
      `SELECT ri.id, ri.response, ri.expires_at, ri.expires_at - now() > interval '0 seconds' AS unexpired
       FROM reviewer_invitations ri
       WHERE ri.assignment_id = $1 AND ri.response IS NULL
       ORDER BY ri.sent_at DESC
       LIMIT 1
       FOR UPDATE`,
      [assignmentId]
    )

    if (invResult.rows.length === 0) {
      throw new AppError('No pending invitation exists for this assignment', 404)
    }

    const invitation = invResult.rows[0]
    invitationId = invitation.id

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    await client.query(
      `UPDATE reviewer_invitations
       SET token_hash = $1,
           email_status = 'pending',
           email_sent_at = NULL,
           email_message_id = NULL,
           email_error = NULL,
           resend_count = resend_count + 1,
           last_resent_at = now()
       WHERE id = $2`,
      [tokenHash, invitationId]
    )

    const reviewerResult = await client.query(
      'SELECT email FROM users WHERE id = $1',
      [assignment.reviewer_id]
    )
    reviewerEmail = reviewerResult.rows[0]?.email || null

    await logWorkflow(client, {
      manuscriptId,
      eventName: 'reviewer_invitation_resent',
      status: 'created',
      payload: { invitation_id: invitationId, assignment_id: assignmentId, reviewer_id: assignment.reviewer_id },
    })

    await logAudit(client, {
      actorId: editorId,
      action: 'reviewer_invitation_resent',
      entityId: invitationId,
      newValues: { manuscript_id: manuscriptId, assignment_id: assignmentId, reviewer_id: assignment.reviewer_id },
    })

    await client.query('COMMIT')

    let delivered = false
    let finalEmailStatus = 'failed'
    try {
      const emailCtx = await buildInvitationEmailContext(manuscriptId, assignment.reviewer_id, invitationId, token, assignment.due_at, editorId)
      reviewerEmail = emailCtx.reviewerEmail || reviewerEmail

      const delivery = await enqueueNotification('reviewer_invitation', assignment.reviewer_id, {
        recipient_email: reviewerEmail,
        reviewer_name: emailCtx.reviewerName,
        editor_name: emailCtx.editorName,
        manuscript_title: emailCtx.manuscriptTitle,
        submission_number: emailCtx.submissionNumber,
        journal_name: emailCtx.journalName,
        review_deadline: emailCtx.reviewDeadline,
        invitation_url: emailCtx.invitationUrl,
        manuscript_id: manuscriptId,
      })

      if (delivery?.skipped) {
        delivered = true
        finalEmailStatus = 'skipped'
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'skipped',
          error: delivery.reason || 'email_disabled',
        })
      } else if (delivery?.success) {
        delivered = true
        finalEmailStatus = 'sent'
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'sent',
          sentAt: new Date(),
          messageId: delivery.provider_message_id,
        })
      } else {
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'failed',
          error: delivery?.error || 'Email delivery failed',
        })
      }
    } catch (emailErr) {
      console.error('Reviewer invitation resent but email delivery failed:', emailErr)
      try {
        await recordEmailStatus({
          invitationId,
          manuscriptId,
          status: 'failed',
          error: emailErr.message || 'Email delivery failed',
        })
      } catch (logErr) {
        console.error('Failed to record resend email failure:', logErr)
      }
    }

    return { success: true, invitation_id: invitationId, assignment_id: assignmentId, email_sent: delivered, email_status: finalEmailStatus }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function setReviewerDeadline(manuscriptId, editorId, assignmentId, deadline) {
  const parsed = new Date(deadline)
  if (isNaN(parsed.getTime())) {
    throw new AppError('Invalid deadline', 400)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const assignment = await client.query(
      `SELECT id FROM reviewer_assignments
       WHERE id = $1 AND manuscript_id = $2 FOR UPDATE`,
      [assignmentId, manuscriptId]
    )

    if (assignment.rows.length === 0) {
      throw new AppError('Assignment not found', 404)
    }

    const auth = await client.query(
      'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
      [manuscriptId, editorId]
    )

    if (auth.rowCount === 0) {
      throw new AppError('Not authorized to edit this assignment', 403)
    }

    const dueAt = parsed.toISOString()

    await client.query(
      `UPDATE reviewer_assignments SET due_at = $1 WHERE id = $2`,
      [dueAt, assignmentId]
    )

    await client.query(
      `UPDATE reviewer_invitations SET expires_at = $1
       WHERE assignment_id = $2 AND response IS NULL`,
      [dueAt, assignmentId]
    )

    await client.query('COMMIT')

    return { success: true, assignment_id: assignmentId, deadline: dueAt }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getAssignments(manuscriptId, editorId) {
  const auth = await pool.query(
    'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
    [manuscriptId, editorId]
  )

  if (auth.rowCount === 0) {
    throw new AppError('Not assigned to this manuscript', 403)
  }

  const result = await pool.query(
    `SELECT ra.id AS assignment_id, ra.reviewer_id, ra.assignment_status, ra.assigned_at,
            ra.accepted_at, ra.due_at, ra.completed_at, ra.round_number,
            u.display_name AS reviewer_name, u.email AS reviewer_email
     FROM reviewer_assignments ra
     JOIN users u ON u.id = ra.reviewer_id
     WHERE ra.manuscript_id = $1
     ORDER BY ra.assigned_at ASC`,
    [manuscriptId]
  )

  return result.rows
}

export async function getExtensionRequests(manuscriptId, editorId) {
  const auth = await pool.query(
    'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
    [manuscriptId, editorId]
  )

  if (auth.rowCount === 0) {
    throw new AppError('Not assigned to this manuscript', 403)
  }

  const result = await pool.query(
    `SELECT re.id, re.assignment_id, re.reviewer_id, re.requested_until, re.reason,
            re.status, re.created_at, re.decided_at,
            u.display_name AS reviewer_name,
            ra.due_at AS current_due_at
     FROM review_extension_requests re
     JOIN users u ON u.id = re.reviewer_id
     JOIN reviewer_assignments ra ON ra.id = re.assignment_id
     WHERE ra.manuscript_id = $1
     ORDER BY re.created_at DESC`,
    [manuscriptId]
  )

  return result.rows
}

export async function submitDecision(manuscriptId, editorId, decisionData) {
  const { decision, comments_to_author, internal_notes, instructions } = decisionData

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

    const assignmentResult = await client.query(
      'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
      [manuscriptId, editorId]
    )

    if (assignmentResult.rowCount === 0) {
      throw new AppError('Not assigned to this manuscript', 403)
    }

    const manuscript = manuscriptResult.rows[0]
    const previousStatus = manuscript.current_status

    const validDecisions = ['accept', 'reject', 'minor_revision', 'major_revision']
    if (!validDecisions.includes(decision)) {
      throw new AppError('Invalid decision', 400)
    }

    let newStatus
    switch (decision) {
      case 'accept':
        newStatus = 'accepted'
        break
      case 'reject':
        newStatus = 'rejected'
        break
      case 'minor_revision':
      case 'major_revision':
        newStatus = 'revision_requested'
        break
    }

    // Block changes to finalized (accepted/rejected) decisions
    const terminalStatuses = ['accepted', 'rejected']
    if (terminalStatuses.includes(manuscript.current_status)) {
      throw new AppError('A final decision has already been made for this manuscript and cannot be changed', 409)
    }

    const decisionResult = await client.query(
      `INSERT INTO editorial_decisions (manuscript_id, editor_id, decision, comments_to_author, internal_notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [manuscriptId, editorId, decision, comments_to_author || null, internal_notes || null]
    )
    const editorialDecisionId = decisionResult.rows[0].id

    if (decision === 'minor_revision' || decision === 'major_revision') {
      const currentRound = manuscript.revision_round || 1

      await client.query(
        `INSERT INTO revision_requests (manuscript_id, editorial_decision_id, round_number, request_type, instructions, due_at, requested_by)
         VALUES ($1, $2, $3, $4, $5, now() + interval '30 days', $6)`,
        [manuscriptId, decisionResult.rows[0].id, currentRound, decision === 'minor_revision' ? 'minor' : 'major', instructions || comments_to_author || null, editorId]
      )

      await client.query(
        `UPDATE manuscripts SET revision_round = $1 WHERE id = $2`,
        [currentRound + 1, manuscriptId]
      )
    }

    await client.query(
      `UPDATE manuscripts SET current_status = $1, updated_at = now() WHERE id = $2`,
      [newStatus, manuscriptId]
    )

    await client.query(
      `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by)
       VALUES ($1, $2, $3, $4)`,
      [manuscriptId, previousStatus, newStatus, editorId]
    )

    await client.query('COMMIT')

    const notifyByDecision = {
      accept: () => sendEditorialAccepted(manuscriptId, editorialDecisionId),
      reject: () => sendEditorialRejected(manuscriptId, editorialDecisionId),
      minor_revision: () => sendMinorRevisionRequested(manuscriptId, editorialDecisionId),
      major_revision: () => sendMajorRevisionRequested(manuscriptId, editorialDecisionId),
    }

    const notifyFn = notifyByDecision[decision]
    if (notifyFn) {
      notifyFn().catch((err) => {
        console.error(`Post-commit ${decision} email failed for manuscript ${manuscriptId}:`, err.message)
      })
    }

    return { success: true, manuscript_id: manuscriptId, decision, new_status: newStatus }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function handleExtension(extensionId, editorId, approved) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const extensionResult = await client.query(
      `SELECT re.*, ra.manuscript_id, ra.reviewer_id, ra.due_at
       FROM review_extension_requests re
       JOIN reviewer_assignments ra ON ra.id = re.assignment_id
       WHERE re.id = $1 FOR UPDATE`,
      [extensionId]
    )

    if (extensionResult.rows.length === 0) {
      throw new AppError('Extension request not found', 404)
    }

    const extension = extensionResult.rows[0]

    if (extension.status !== 'pending') {
      throw new AppError('Extension request has already been processed', 400)
    }

    const assignmentResult = await client.query(
      'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
      [extension.manuscript_id, editorId]
    )

    if (assignmentResult.rowCount === 0) {
      throw new AppError('Not authorized to handle this extension', 403)
    }

    const newStatus = approved ? 'approved' : 'rejected'

    await client.query(
      `UPDATE review_extension_requests SET status = $1, decided_by = $2, decided_at = now() WHERE id = $3`,
      [newStatus, editorId, extensionId]
    )

    if (approved && extension.requested_until) {
      await client.query(
        `UPDATE reviewer_assignments SET due_at = $1 WHERE id = $2`,
        [extension.requested_until, extension.assignment_id]
      )

      await client.query(
        `UPDATE reviewer_invitations SET expires_at = $1
         WHERE assignment_id = $2 AND response IS NULL`,
        [extension.requested_until, extension.assignment_id]
      )
    }

    await client.query('COMMIT')

    return { success: true, extension_id: extensionId, approved }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getAcceptedManuscripts() {
  const result = await pool.query(
    `SELECT DISTINCT ON (m.id)
            m.id,
            m.title,
            m.submission_number,
            m.created_at AS submission_date,
            m.current_status,
            m.published_at,
            msh.created_at AS acceptance_date,
            u.display_name AS primary_author,
            u.email        AS author_email
     FROM manuscripts m
     LEFT JOIN manuscript_status_history msh ON msh.manuscript_id = m.id
       AND msh.to_status = 'accepted'
     JOIN users u ON u.id = m.submitted_by
     WHERE m.current_status IN ('accepted', 'published')
     ORDER BY m.id, msh.created_at DESC`
  )
  return result.rows
}

export async function publishManuscript(manuscriptId, editorId) {
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

    if (manuscript.current_status === 'published') {
      throw new AppError('Manuscript is already published', 409)
    }

    if (manuscript.current_status !== 'accepted') {
      throw new AppError('Only accepted manuscripts can be published', 400)
    }

    const assignmentResult = await client.query(
      'SELECT 1 FROM editorial_assignments WHERE manuscript_id = $1 AND editor_id = $2',
      [manuscriptId, editorId]
    )

    if (assignmentResult.rowCount === 0) {
      throw new AppError('Not assigned to this manuscript', 403)
    }

    await client.query(
      `UPDATE manuscripts SET current_status = 'published', published_at = now(), updated_at = now()
       WHERE id = $1`,
      [manuscriptId]
    )

    await client.query(
      `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'published', $3)`,
      [manuscriptId, manuscript.current_status, editorId]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'manuscript_published', 'manuscripts', $2, $3)`,
      [editorId, manuscriptId, JSON.stringify({ from_status: manuscript.current_status, to_status: 'published' })]
    )

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'manuscript_published', 'manuscripts', $2)`,
      [editorId, manuscriptId]
    )

    await client.query('COMMIT')

    const updatedResult = await client.query(
      'SELECT id, current_status, published_at FROM manuscripts WHERE id = $1',
      [manuscriptId]
    )

    return {
      success: true,
      message: 'Manuscript published successfully.',
      manuscript: updatedResult.rows[0],
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
