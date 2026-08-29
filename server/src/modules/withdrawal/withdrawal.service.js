import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'

export async function requestWithdrawal(manuscriptId, userId, reason) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const manuscriptResult = await client.query(
      `SELECT * FROM manuscripts WHERE id = $1 FOR UPDATE`,
      [manuscriptId]
    )

    if (manuscriptResult.rows.length === 0) {
      throw new AppError('Manuscript not found', 404)
    }

    const manuscript = manuscriptResult.rows[0]

    if (manuscript.submitted_by !== userId) {
      const isAuthor = await pool.query(
        'SELECT 1 FROM manuscript_authors WHERE manuscript_id = $1 AND user_id = $2',
        [manuscriptId, userId]
      )
      if (isAuthor.rowCount === 0) {
        throw new AppError('Unauthorized', 403)
      }
    }

    const terminalStatuses = ['accepted', 'rejected', 'withdrawn', 'published', 'desk_rejected']
    if (terminalStatuses.includes(manuscript.current_status)) {
      throw new AppError('Cannot withdraw a manuscript in this status', 400)
    }

    const existingRequest = await client.query(
      `SELECT id FROM manuscript_withdrawals
       WHERE manuscript_id = $1 AND status = 'requested'`,
      [manuscriptId]
    )

    if (existingRequest.rows.length > 0) {
      throw new AppError('Withdrawal request already pending', 409)
    }

    const canSelfWithdraw = ['draft', 'submitted'].includes(manuscript.current_status)

    const result = await client.query(
      `INSERT INTO manuscript_withdrawals (manuscript_id, requested_by, reason, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [manuscriptId, userId, reason, canSelfWithdraw ? 'approved' : 'requested']
    )

    if (canSelfWithdraw) {
      await client.query(
        `UPDATE manuscripts SET current_status = 'withdrawn', updated_at = now() WHERE id = $1`,
        [manuscriptId]
      )

      await client.query(
        `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by, reason)
         VALUES ($1, $2, 'withdrawn', $3, $4)`,
        [manuscriptId, manuscript.current_status, userId, reason]
      )
    }

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'withdrawal_requested', 'manuscripts', $2)`,
      [userId, manuscriptId]
    )

    await client.query('COMMIT')

    return result.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function handleWithdrawal(withdrawalId, editorId, approved, decisionNotes) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const withdrawalResult = await client.query(
      `SELECT mw.*, m.current_status
       FROM manuscript_withdrawals mw
       JOIN manuscripts m ON m.id = mw.manuscript_id
       WHERE mw.id = $1 FOR UPDATE`,
      [withdrawalId]
    )

    if (withdrawalResult.rows.length === 0) {
      throw new AppError('Withdrawal request not found', 404)
    }

    const withdrawal = withdrawalResult.rows[0]

    if (withdrawal.status !== 'requested') {
      throw new AppError('Withdrawal request has already been processed', 400)
    }

    const newStatus = approved ? 'approved' : 'rejected'

    await client.query(
      `UPDATE manuscript_withdrawals
       SET status = $1, decided_by = $2, decision_notes = $3, decided_at = now()
       WHERE id = $4`,
      [newStatus, editorId, decisionNotes || null, withdrawalId]
    )

    if (approved) {
      await client.query(
        `UPDATE manuscripts SET current_status = 'withdrawn', updated_at = now() WHERE id = $1`,
        [withdrawal.manuscript_id]
      )

      await client.query(
        `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by, reason)
         VALUES ($1, $2, 'withdrawn', $3, $4)`,
        [withdrawal.manuscript_id, withdrawal.current_status, editorId, decisionNotes || 'Withdrawal approved']
      )
    }

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'withdrawal_reviewed', 'manuscript_withdrawals', $2)`,
      [editorId, withdrawalId]
    )

    await client.query('COMMIT')

    return { success: true, withdrawal_id: withdrawalId, approved }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getWithdrawalRequests(editorId) {
  const result = await pool.query(
    `SELECT mw.*, m.title, m.submission_number, m.current_status,
            u.display_name as requested_by_name
     FROM manuscript_withdrawals mw
     JOIN manuscripts m ON m.id = mw.manuscript_id
     LEFT JOIN users u ON u.id = mw.requested_by
     WHERE mw.status = 'requested'
     ORDER BY mw.requested_at ASC`
  )

  return result.rows
}

export async function getMyWithdrawals(userId) {
  const result = await pool.query(
    `SELECT mw.*, m.title, m.submission_number
     FROM manuscript_withdrawals mw
     JOIN manuscripts m ON m.id = mw.manuscript_id
     WHERE mw.requested_by = $1
     ORDER BY mw.requested_at DESC`,
    [userId]
  )

  return result.rows
}
