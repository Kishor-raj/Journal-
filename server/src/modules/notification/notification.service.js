import pool from '../../config/db.js'
import { sendEmail } from '../email/email.service.js'
import { renderTemplate } from '../email/email.utils.js'

export const templateKeys = {
  accountVerification: 'account_verification',
  passwordReset: 'password_reset',
  reviewerInvitation: 'reviewer_invitation',
  manuscriptSubmitted: 'manuscript_submitted',
  manuscriptRejected: 'manuscript_rejected',
  manuscriptDeskRejected: 'manuscript_desk_rejected',
  manuscriptAccepted: 'manuscript_accepted',
  manuscriptMinorRevision: 'manuscript_minor_revision',
  manuscriptMajorRevision: 'manuscript_major_revision',
  manuscriptDraftReminder: 'manuscript_draft_reminder',
  reviewerInvitationExpired: 'reviewer_invitation_expired',
  reviewerAssignmentReminder: 'reviewer_assignment_reminder',
  reviewSubmittedConfirmation: 'review_submitted_confirmation',
  manuscriptWithdrawalConfirmation: 'manuscript_withdrawal_confirmation',
  revisionSubmitted: 'revision_submitted',
}

export async function enqueueNotification(templateKey, recipientUserId, variables) {
  let logId = null

  const writeLog = (client, { eventName, status, payload, manuscriptId, errorMessage }) =>
    client.query(
      `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload, error_message)
       VALUES ('notifications', $1, $2, 'resend', $3, $4, $5)
       RETURNING id`,
      [
        manuscriptId || variables?.manuscript_id || null,
        eventName,
        status,
        JSON.stringify(payload || {}),
        errorMessage || null,
      ]
    )

  try {
    const templateResult = await pool.query(
      `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [templateKey]
    )

    if (templateResult.rows.length === 0) {
      console.error(`Email template not found: ${templateKey}`)
      return { success: false, skipped: true, reason: 'template_not_found' }
    }

    const template = templateResult.rows[0]

    const recipientResult = await pool.query(
      `SELECT email, first_name FROM users WHERE id = $1`,
      [recipientUserId]
    )

    let recipientEmail = variables?.recipient_email
    if (!recipientEmail) {
      if (recipientResult.rows.length === 0) {
        return { success: false, skipped: true, reason: 'recipient_not_found' }
      }
      recipientEmail = recipientResult.rows[0].email
    }

    const renderVars = { ...(recipientResult.rows[0] || {}), ...(variables || {}) }

    const finalSubject = renderTemplate(template.subject, renderVars, { escape: false })
    const finalBodyHtml = renderTemplate(template.body_html, renderVars)
    const finalBodyText = template.body_text ? renderTemplate(template.body_text, renderVars, { escape: false }) : undefined

    const meta = {
      template_key: templateKey,
      recipient_user_id: recipientUserId || null,
      recipient_email: recipientEmail,
      provider: 'resend',
    }

    await writeLog(pool, {
      eventName: 'email_send_attempted',
      status: 'pending',
      payload: { ...meta, subject: finalSubject },
    })

    const delivery = await sendEmail({
      to: recipientEmail,
      subject: finalSubject,
      html: finalBodyHtml || undefined,
      text: finalBodyText,
      metadata: meta,
    })

    if (delivery.skipped) {
      const logResult = await writeLog(pool, {
        eventName: 'email_skipped',
        status: 'skipped',
        payload: { ...meta, reason: delivery.reason },
      })
      logId = logResult.rows[0]?.id
      console.log(`[EMAIL] skipped: ${templateKey} for user ${recipientUserId}`)
      return { success: true, skipped: true, reason: delivery.reason, log_id: logId }
    }

    if (delivery.success) {
      const logResult = await writeLog(pool, {
        eventName: 'email_sent',
        status: 'sent',
        payload: { ...meta, provider_message_id: delivery.providerMessageId },
      })
      logId = logResult.rows[0]?.id
      console.log(`[EMAIL] sent: ${templateKey} for user ${recipientUserId}`)
      return { success: true, log_id: logId, provider_message_id: delivery.providerMessageId }
    }

    const logResult = await writeLog(pool, {
      eventName: 'email_failed',
      status: 'failed',
      payload: meta,
      errorMessage: delivery.error || 'Email delivery failed',
    })
    logId = logResult.rows[0]?.id
    console.error(`[EMAIL] failed: ${templateKey} for user ${recipientUserId}`)
    return { success: false, error: delivery.error || 'Email delivery failed', log_id: logId }
  } catch (error) {
    console.error('Failed to enqueue notification:', error)
    if (logId) {
      try {
        await writeLog(pool, {
          eventName: 'email_failed',
          status: 'failed',
          payload: { template_key: templateKey, recipient_user_id: recipientUserId || null },
          errorMessage: 'Email delivery failed',
        })
      } catch (logErr) {
        console.error('Failed to write failure log:', logErr)
      }
    }
    return { success: false, error: 'Email delivery failed' }
  }
}

export async function getNotificationTemplates() {
  const result = await pool.query(
    `SELECT * FROM email_templates ORDER BY template_key`
  )
  return result.rows
}

export async function updateNotificationTemplate(templateKey, data) {
  const { subject, body_html, body_text, variables_schema, is_active } = data

  const result = await pool.query(
    `UPDATE email_templates
     SET subject = COALESCE($1, subject),
         body_html = COALESCE($2, body_html),
         body_text = COALESCE($3, body_text),
         variables_schema = COALESCE($4, variables_schema),
         is_active = COALESCE($5, is_active)
     WHERE template_key = $6
     RETURNING *`,
    [subject, body_html, body_text, variables_schema ? JSON.stringify(variables_schema) : null, is_active, templateKey]
  )

  return result.rows[0]
}

export async function sendTestEmail({ to, subject = 'Test Email', html = '<p>Test email from the journal system.</p>', text = 'Test email from the journal system.' }) {
  const delivery = await sendEmail({ to, subject, html, text })
  if (delivery.skipped) {
    return { success: true, skipped: true, reason: delivery.reason }
  }
  if (delivery.success) {
    return { success: true, provider_message_id: delivery.providerMessageId }
  }
  return { success: false, error: delivery.error || 'Email delivery failed' }
}
