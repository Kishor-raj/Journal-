import pool from '../../config/db.js'

export async function logAiEmailEvent({ workflowName, eventName, source, status, payload, emailId }) {
  await pool.query(
    `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      workflowName,
      emailId || null,
      eventName,
      source || 'ai_email',
      status,
      JSON.stringify(payload || {}),
    ]
  )
}

export async function getAiEmailMetrics() {
  const summary = await pool.query(
    `SELECT
       COUNT(DISTINCT e.id) AS total_emails,
       COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed') AS classified,
       COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'failed') AS classification_failures,
       COUNT(DISTINCT r.id) AS total_replies,
       COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'sent') AS sent_replies,
       COUNT(DISTINCT r.id) FILTER (WHERE r.approval_required = true) AS needs_approval,
       COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'approved') AS approved,
       AVG(p.confidence) FILTER (WHERE p.status = 'completed') AS avg_confidence,
       AVG(EXTRACT(EPOCH FROM (p.completed_at - p.started_at)))
         FILTER (WHERE p.status = 'completed') AS avg_processing_time_seconds
     FROM emails e
     LEFT JOIN ai_email_processing p ON p.email_id = e.id
     LEFT JOIN ai_email_replies r ON r.email_id = e.id`
  )

  const byCategory = await pool.query(
    `SELECT p.classification, COUNT(*) AS count,
            AVG(p.confidence) AS avg_confidence
     FROM ai_email_processing p
     WHERE p.status = 'completed' AND p.classification IS NOT NULL
     GROUP BY p.classification
     ORDER BY count DESC`
  )

  const recentEvents = await pool.query(
    `SELECT workflow_name, event_name, source, status, created_at
     FROM workflow_logs
     WHERE workflow_name = 'ai_email'
     ORDER BY created_at DESC
     LIMIT 20`
  )

  return {
    summary: summary.rows[0],
    byCategory: byCategory.rows,
    recentEvents: recentEvents.rows,
  }
}

export async function getProcessingTimeline(emailId) {
  const result = await pool.query(
    `SELECT event_name, status, payload, created_at
     FROM workflow_logs
     WHERE workflow_name = 'ai_email' AND manuscript_id = $1
     ORDER BY created_at ASC`,
    [emailId]
  )
  return result.rows
}

export async function logReplyAudit({ replyId, emailId, action, userId, details }) {
  await pool.query(
    `INSERT INTO workflow_logs (workflow_name, event_name, source, status, payload)
     VALUES ('ai_email', 'reply_audit', 'approval_workflow', $1, $2)`,
    [
      action,
      JSON.stringify({
        reply_id: replyId,
        email_id: emailId,
        user_id: userId || null,
        details,
      }),
    ]
  )
}
