import pool from '../../config/db.js'
import crypto from 'crypto'
import { AppError } from '../../shared/errors/AppError.js'
import { getManuscriptForRole } from '../manuscripts/manuscripts.service.js'

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export async function getInvitations(reviewerId) {
  const result = await pool.query(
    `SELECT ri.id, ri.manuscript_id, ri.sent_at, ri.expires_at, ri.email_status,
            CASE WHEN ri.response IS NULL THEN 'pending' ELSE ri.response::text END AS status,
            CASE WHEN ri.response IS NULL AND ri.expires_at < now() THEN true ELSE false END AS expired,
            m.title AS manuscript_title, m.submission_number, m.submitted_at,
            ra.due_at AS deadline, ra.id AS assignment_id
     FROM reviewer_invitations ri
     JOIN manuscripts m ON m.id = ri.manuscript_id
     LEFT JOIN reviewer_assignments ra ON ra.id = ri.assignment_id
     WHERE ri.reviewer_id = $1 AND ri.response IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM reviews r
         WHERE r.manuscript_id = ri.manuscript_id
           AND r.reviewer_id = $1
           AND r.is_complete = true
       )
     ORDER BY ri.sent_at DESC`,
    [reviewerId]
  )
  return result.rows
}

export async function validateInvitation(invitationId, token, authenticatedUserId = null) {
  const tokenHash = sha256(token)

  const result = await pool.query(
    `SELECT ri.id, ri.reviewer_id, ri.response, ri.responded_at, ri.expires_at, ri.expires_at < now() AS expired,
            ri.assignment_id, ri.sent_at,
            m.title AS manuscript_title, m.submission_number,
            ra.assignment_status
     FROM reviewer_invitations ri
     JOIN manuscripts m ON m.id = ri.manuscript_id
     LEFT JOIN reviewer_assignments ra ON ra.id = ri.assignment_id
     WHERE ri.id = $1 AND ri.token_hash = $2`,
    [invitationId, tokenHash]
  )

  if (result.rows.length === 0) {
    return { valid: false, reason: 'invalid' }
  }

  const invitation = result.rows[0]

  if (invitation.response !== null) {
    return {
      valid: false,
      reason: invitation.response === 'accepted' ? 'accepted' : 'declined',
      invitation_id: invitation.id,
      response: invitation.response,
    }
  }

  if (invitation.expired) {
    return { valid: false, reason: 'expired', invitation_id: invitation.id }
  }

  const reviewerResult = await pool.query(
    'SELECT account_status, email FROM users WHERE id = $1',
    [invitation.reviewer_id]
  )
  const reviewer = reviewerResult.rows[0]
  if (!reviewer || reviewer.account_status !== 'active') {
    return { valid: false, reason: 'inactive', invitation_id: invitation.id }
  }

  return {
    valid: true,
    invitation_id: invitation.id,
    manuscript_title: invitation.manuscript_title,
    submission_number: invitation.submission_number,
    deadline: invitation.expires_at,
    reviewer_email: reviewer.email,
    owner_uid: invitation.reviewer_id,
    requires_login: !authenticatedUserId,
    owns_invitation: authenticatedUserId ? authenticatedUserId === invitation.reviewer_id : false,
  }
}

export async function respondToInvitation(invitationId, reviewerId, response, suggestionData) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const invResult = await client.query(
      `SELECT ri.id, ri.assignment_id, ri.reviewer_id, ri.response, ri.manuscript_id, ri.expires_at
       FROM reviewer_invitations ri
       WHERE ri.id = $1 AND ri.reviewer_id = $2 FOR UPDATE`,
      [invitationId, reviewerId]
    )

    if (invResult.rows.length === 0) {
      throw new AppError('Invitation not found', 404)
    }

    const invitation = invResult.rows[0]

    if (invitation.response !== null) {
      throw new AppError('Invitation already responded to', 400)
    }

    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
      throw new AppError('This invitation has expired', 410)
    }

    const accountResult = await client.query(
      'SELECT account_status FROM users WHERE id = $1',
      [reviewerId]
    )
    if (accountResult.rows.length === 0 || accountResult.rows[0].account_status !== 'active') {
      throw new AppError('Your account is not active', 403)
    }

    const validResponse = response === 'accepted' || response === 'declined'
    if (!validResponse) {
      throw new AppError('Response must be accepted or declined', 400)
    }

    if (response === 'accepted') {
      const priorReview = await client.query(
        `SELECT 1 FROM reviews
         WHERE manuscript_id = $1 AND reviewer_id = $2 AND is_complete = true
         LIMIT 1`,
        [invitation.manuscript_id, reviewerId]
      )
      if (priorReview.rowCount > 0) {
        throw new AppError('You have already reviewed this manuscript', 400)
      }
    }

    await client.query(
      `UPDATE reviewer_invitations
       SET response = $1, responded_at = now(),
           suggested_reviewer_name = $2, suggested_reviewer_email = $3,
           suggested_reviewer_institution = $4, suggestion_reason = $5
       WHERE id = $6`,
      [
        response,
        suggestionData?.name || null,
        suggestionData?.email || null,
        suggestionData?.institution || null,
        suggestionData?.reason || null,
        invitationId,
      ]
    )

    const assignmentStatus = response === 'accepted' ? 'accepted' : 'declined'

    if (invitation.assignment_id) {
      await client.query(
        `UPDATE reviewer_assignments
         SET assignment_status = $1
         WHERE id = $2`,
        [assignmentStatus, invitation.assignment_id]
      )

      if (response === 'accepted') {
        await client.query(
          `UPDATE reviewer_assignments SET accepted_at = now() WHERE id = $1`,
          [invitation.assignment_id]
        )
      }
    }

    if (response === 'declined' && suggestionData) {
      await client.query(
        `INSERT INTO reviewer_suggestions (manuscript_id, suggested_by, reviewer_name, reviewer_email, institution, suggestion_type, reason)
         SELECT ri.manuscript_id, $1, $2, $3, $4, 'suggest', $5
         FROM reviewer_invitations ri WHERE ri.id = $6`,
        [reviewerId, suggestionData.name, suggestionData.email, suggestionData.institution, suggestionData.reason, invitationId]
      )
    }

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'invitation_responded', 'reviewer_invitations', $2)`,
      [reviewerId, invitationId]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, 'reviewer_invitations', $3, $4)`,
      [
        reviewerId,
        response === 'accepted' ? 'reviewer_invitation_accepted' : 'reviewer_invitation_declined',
        invitationId,
        JSON.stringify({ manuscript_id: invitation.manuscript_id, assignment_id: invitation.assignment_id }),
      ]
    )

    await client.query('COMMIT')

    return { message: `Invitation ${response}`, invitation_id: invitationId }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getAssignmentById(assignmentId, reviewerId) {
  const result = await pool.query(
    `SELECT ra.id, ra.manuscript_id, ra.assignment_status, ra.assigned_at,
            ra.due_at, ra.completed_at, ra.round_number,
            m.title AS manuscript_title, m.submission_number, m.current_status,
            r.id AS review_id, r.recommendation, r.public_comments, r.confidential_comments,
            r.score, r.submitted_at AS review_submitted_at
     FROM reviewer_assignments ra
     JOIN manuscripts m ON m.id = ra.manuscript_id
     LEFT JOIN reviews r ON r.assignment_id = ra.id AND r.is_complete = true
     WHERE ra.id = $1 AND ra.reviewer_id = $2`,
    [assignmentId, reviewerId]
  )
  if (result.rows.length === 0) {
    throw new AppError('Assignment not found', 404)
  }
  return result.rows[0]
}

export async function getAssignments(reviewerId) {
  const result = await pool.query(
    `SELECT ra.id, ra.manuscript_id, ra.assignment_status, ra.assigned_at,
            ra.due_at, ra.completed_at, ra.round_number,
            m.title AS manuscript_title, m.submission_number
     FROM reviewer_assignments ra
     JOIN manuscripts m ON m.id = ra.manuscript_id
     WHERE ra.reviewer_id = $1 AND ra.assignment_status IN ('accepted', 'invited', 'completed')
     ORDER BY ra.assigned_at DESC`,
    [reviewerId]
  )
  return result.rows
}

export async function getDashboard(reviewerId) {
  const [invitations, assignments, completed] = await Promise.all([
    getInvitations(reviewerId),
    getAssignments(reviewerId),
    pool.query(
      `SELECT count(*)::int AS total FROM reviewer_assignments
       WHERE reviewer_id = $1 AND assignment_status = 'completed'`,
      [reviewerId]
    ),
  ])

  const activeAssignments = assignments.filter((assignment) => assignment.assignment_status === 'accepted')
  const dueSoon = activeAssignments.filter((assignment) => {
    if (!assignment.due_at) return false
    const due = new Date(assignment.due_at)
    const now = new Date()
    return due >= now && due <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  })

  return {
    invitations,
    assignments: activeAssignments,
    summary: {
      pending_invitations: invitations.length,
      active_assignments: activeAssignments.length,
      due_soon: dueSoon.length,
      completed: completed.rows[0].total,
    },
  }
}

export async function getManuscriptForReview(manuscriptId, reviewerId) {
  const assignmentResult = await pool.query(
    `SELECT id FROM reviewer_assignments
     WHERE manuscript_id = $1 AND reviewer_id = $2 AND assignment_status IN ('accepted', 'invited', 'completed')`,
    [manuscriptId, reviewerId]
  )

  if (assignmentResult.rows.length === 0) {
    throw new AppError('No active assignment found for this manuscript', 404)
  }

  return getManuscriptForRole(manuscriptId, reviewerId, 'reviewer')
}

export async function submitReview(assignmentId, reviewerId, reviewData) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const assignmentResult = await client.query(
      `SELECT id, manuscript_id, reviewer_id, round_number, assignment_status
       FROM reviewer_assignments
       WHERE id = $1 AND reviewer_id = $2 FOR UPDATE`,
      [assignmentId, reviewerId]
    )

    if (assignmentResult.rows.length === 0) {
      throw new AppError('Assignment not found', 404)
    }

    const assignment = assignmentResult.rows[0]

    if (assignment.assignment_status !== 'accepted') {
      throw new AppError('Cannot submit review for this assignment', 400)
    }

    const priorReview = await client.query(
      `SELECT 1 FROM reviews
       WHERE manuscript_id = $1 AND reviewer_id = $2 AND is_complete = true
       LIMIT 1`,
      [assignment.manuscript_id, reviewerId]
    )
    if (priorReview.rowCount > 0) {
      throw new AppError('You have already reviewed this manuscript', 400)
    }

    const reviewResult = await client.query(
      `INSERT INTO reviews (assignment_id, reviewer_id, manuscript_id, round_number, recommendation, public_comments, confidential_comments, score, submitted_at, is_complete)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), true)
       RETURNING *`,
      [
        assignmentId,
        reviewerId,
        assignment.manuscript_id,
        assignment.round_number,
        reviewData.recommendation,
        reviewData.public_comments,
        reviewData.confidential_comments,
        reviewData.score ? JSON.stringify(reviewData.score) : null,
      ]
    )

    await client.query(
      `UPDATE reviewer_assignments
       SET completed_at = now(), assignment_status = 'completed'
       WHERE id = $1`,
      [assignmentId]
    )

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'review_submitted', 'reviews', $2)`,
      [reviewerId, reviewResult.rows[0].id]
    )

    await client.query('COMMIT')

    return reviewResult.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getExtensionRequests(reviewerId) {
  const result = await pool.query(
    `SELECT
       re.id,
       re.assignment_id,
       re.requested_until,
       re.reason,
       re.status,
       re.created_at AS submitted_at,
       re.decided_at,
       ra.due_at AS current_due_at,
       ra.assignment_status,
       m.id AS manuscript_id,
       m.submission_number,
       m.title AS manuscript_title
     FROM review_extension_requests re
     JOIN reviewer_assignments ra ON ra.id = re.assignment_id
     JOIN manuscripts m ON m.id = ra.manuscript_id
     WHERE re.reviewer_id = $1
     ORDER BY re.created_at DESC`,
    [reviewerId]
  )

  return result.rows
}

export async function requestExtension(assignmentId, reviewerId, requestedUntil, reason) {
  const assignmentResult = await pool.query(
    `SELECT id, reviewer_id, assignment_status
     FROM reviewer_assignments
     WHERE id = $1 AND reviewer_id = $2`,
    [assignmentId, reviewerId]
  )

  if (assignmentResult.rows.length === 0) {
    throw new AppError('Assignment not found', 404)
  }

  const assignment = assignmentResult.rows[0]

  if (assignment.assignment_status !== 'accepted') {
    throw new AppError('Cannot request extension for this assignment', 400)
  }

  const result = await pool.query(
    `INSERT INTO review_extension_requests (assignment_id, reviewer_id, requested_until, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [assignmentId, reviewerId, requestedUntil, reason]
  )

  return result.rows[0]
}
