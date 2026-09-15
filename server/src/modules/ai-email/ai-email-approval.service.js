import pool from '../../config/db.js'
import { logReplyAudit } from '../../services/ai/audit.js'

export async function getPendingApprovals({ page = 1, limit = 20 } = {}) {
  const perPage = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * perPage

  const result = await pool.query(
    `SELECT r.id, r.draft_body, r.decision, r.confidence, r.status, r.created_at,
            e.from_email, e.subject, e.body_text, e.received_at,
            p.classification, p.intent, p.extracted_data,
            t.id AS thread_id, t.subject AS thread_subject
     FROM ai_email_replies r
     JOIN emails e ON e.id = r.email_id
     JOIN email_threads t ON t.id = r.thread_id
     LEFT JOIN ai_email_processing p ON p.email_id = e.id
     WHERE r.approval_required = true
       AND r.status = 'draft'
     ORDER BY r.created_at ASC
     LIMIT $1 OFFSET $2`,
    [perPage, offset]
  )

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM ai_email_replies r
     WHERE r.approval_required = true AND r.status = 'draft'`
  )

  return {
    drafts: result.rows,
    total: countResult.rows[0]?.total || 0,
    page: Math.max(parseInt(page) || 1, 1),
    limit: perPage,
  }
}

export async function getApprovalDetail(replyId) {
  const result = await pool.query(
    `SELECT r.*, e.from_email, e.subject, e.body_text, e.received_at, e.provider_message_id,
            p.classification, p.intent, p.confidence AS classification_confidence, p.extracted_data,
            t.id AS thread_id, t.provider_thread_id, t.subject AS thread_subject
     FROM ai_email_replies r
     JOIN emails e ON e.id = r.email_id
     JOIN email_threads t ON t.id = r.thread_id
     LEFT JOIN ai_email_processing p ON p.email_id = e.id
     WHERE r.id = $1`,
    [replyId]
  )
  return result.rows[0] || null
}

export async function approveAndQueueSend(replyId, userId, editedBody) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reply = await client.query(
      `SELECT * FROM ai_email_replies WHERE id = $1 AND status = 'draft' FOR UPDATE`,
      [replyId]
    )
    if (reply.rows.length === 0) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Reply not found or already processed' }
    }

    const finalBody = editedBody || reply.rows[0].draft_body

    await client.query(
      `UPDATE ai_email_replies
       SET final_body = $1, status = 'approved', approved_by = $2, approved_at = now()
       WHERE id = $3`,
      [finalBody, userId, replyId]
    )

    await logReplyAudit({
      replyId,
      emailId: reply.rows[0].email_id,
      action: 'approved',
      userId,
      details: { edited: Boolean(editedBody) },
    })

    await client.query('COMMIT')
    return { success: true, replyId, status: 'approved' }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function rejectReply(replyId, userId, reason) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reply = await client.query(
      `SELECT * FROM ai_email_replies WHERE id = $1 AND status = 'draft' FOR UPDATE`,
      [replyId]
    )
    if (reply.rows.length === 0) {
      await client.query('ROLLBACK')
      return { success: false, error: 'Reply not found or already processed' }
    }

    await client.query(
      `UPDATE ai_email_replies
       SET status = 'rejected', failure_reason = $1, approved_by = $2, approved_at = now()
       WHERE id = $3`,
      [reason || 'Rejected by reviewer', userId, replyId]
    )

    await logReplyAudit({
      replyId,
      emailId: reply.rows[0].email_id,
      action: 'rejected',
      userId,
      details: { reason },
    })

    await client.query('COMMIT')
    return { success: true, replyId, status: 'rejected' }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function markReplySent(replyId, providerMessageId) {
  await pool.query(
    `UPDATE ai_email_replies
     SET status = 'sent', sent_at = now(), provider_message_id = $1
     WHERE id = $2`,
    [providerMessageId, replyId]
  )

  const reply = await pool.query(`SELECT email_id FROM ai_email_replies WHERE id = $1`, [replyId])
  if (reply.rows[0]) {
    await logReplyAudit({
      replyId,
      emailId: reply.rows[0].email_id,
      action: 'sent',
      details: { provider_message_id: providerMessageId },
    })
  }
}

export async function markReplyFailed(replyId, failureReason) {
  await pool.query(
    `UPDATE ai_email_replies
     SET status = 'failed', failure_reason = $1
     WHERE id = $2`,
    [failureReason, replyId]
  )
}
