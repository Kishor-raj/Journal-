import pool from '../../config/db.js'
import { sendEmail } from '../email/email.service.js'
import { renderTemplate, buildAppUrl } from '../email/email.utils.js'
import {
  NotificationEvents,
  NotificationStatus,
  MAX_RETRY_ATTEMPTS,
  EventKeys,
  isPermanentEmailError,
} from './notification.events.js'

export const templateKeys = NotificationEvents

function buildEventKey(templateKey, variables) {
  const manuscriptId = variables?.manuscript_id || null
  if (templateKey === NotificationEvents.ACCOUNT_VERIFICATION && variables?.userId) {
    return EventKeys.verification(variables.userId, variables.attempt || 1)
  }
  if (templateKey === NotificationEvents.PASSWORD_RESET && variables?.userId) {
    return EventKeys.passwordReset(variables.userId, variables.attempt || 1)
  }
  if (templateKey === NotificationEvents.MANUSCRIPT_SUBMITTED && manuscriptId) {
    return EventKeys.submissionReceived(manuscriptId)
  }
  if (templateKey === NotificationEvents.MANUSCRIPT_DESK_REJECTED && manuscriptId) {
    return EventKeys.deskRejected(manuscriptId)
  }
  if (
    templateKey === NotificationEvents.MANUSCRIPT_REJECTED ||
    templateKey === NotificationEvents.MANUSCRIPT_ACCEPTED ||
    templateKey === NotificationEvents.MANUSCRIPT_MINOR_REVISION ||
    templateKey === NotificationEvents.MANUSCRIPT_MAJOR_REVISION
  ) {
    if (manuscriptId && variables?.decisionId) {
      return EventKeys.decision(manuscriptId, templateKey, variables.decisionId)
    }
    if (manuscriptId) {
      return EventKeys.editorialDecision(manuscriptId, templateKey)
    }
  }
  if (templateKey === NotificationEvents.DRAFT_MANUSCRIPT_REMINDER && manuscriptId) {
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return EventKeys.draftReminder(manuscriptId, dateStr)
  }
  return null
}

async function upsertEmailNotification({ eventKey, templateKey, recipientUserId, recipientEmail, manuscriptId, journalId, data, status, providerMessageId, error, attemptIncrement }) {
  const now = new Date()

  if (eventKey) {
    const existing = await pool.query(
      `SELECT id, status FROM email_notifications WHERE event_key = $1`,
      [eventKey]
    )
    if (existing.rows.length > 0) {
      const row = existing.rows[0]
      if (row.status === 'sent') {
        return { id: row.id, skipped: true }
      }
      const result = await pool.query(
        `UPDATE email_notifications
         SET attempt_count = attempt_count + $1,
             status = $2,
             provider_message_id = COALESCE($3, provider_message_id),
             last_error = $4,
             sent_at = CASE WHEN $2 = 'sent' THEN $5 ELSE sent_at END,
             failed_at = CASE WHEN $2 = 'failed' THEN $5 ELSE failed_at END,
             updated_at = $5
         WHERE id = $6
         RETURNING id`,
        [attemptIncrement || 1, status, providerMessageId || null, error || null, now, row.id]
      )
      return { id: result.rows[0]?.id, skipped: false }
    }
  }

  const result = await pool.query(
    `INSERT INTO email_notifications
       (journal_id, manuscript_id, recipient_user_id, recipient_email, template_key, event_key, data, provider, status, attempt_count, provider_message_id, last_error, sent_at, failed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'resend', $8, $9, $10, $11, $12, $13)
     ON CONFLICT (event_key) DO UPDATE
       SET attempt_count = email_notifications.attempt_count + $9,
           status = $8,
           provider_message_id = COALESCE($10, email_notifications.provider_message_id),
           last_error = $11,
           sent_at = CASE WHEN $8 = 'sent' THEN $12 ELSE email_notifications.sent_at END,
           failed_at = CASE WHEN $8 = 'failed' THEN $12 ELSE email_notifications.failed_at END,
           updated_at = $12
     RETURNING id`,
    [
      journalId || null,
      manuscriptId || null,
      recipientUserId || null,
      recipientEmail,
      templateKey,
      eventKey,
      data ? JSON.stringify(data) : null,
      status,
      attemptIncrement || 1,
      providerMessageId || null,
      error || null,
      status === 'sent' ? now : null,
      status === 'failed' ? now : null,
    ]
  )
  return { id: result.rows[0]?.id, skipped: false }
}

export async function enqueueNotification(templateKey, recipientUserId, variables) {
  let logId = null
  const manuscriptId = variables?.manuscript_id || null

  const writeLog = (client, { eventName, status, payload, errorMessage }) =>
    client.query(
      `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload, error_message)
       VALUES ('notifications', $1, $2, 'resend', $3, $4, $5)
       RETURNING id`,
      [
        manuscriptId,
        eventName,
        status,
        JSON.stringify(payload || {}),
        errorMessage || null,
      ]
    )

const eventKey = buildEventKey(templateKey, variables)

  let notificationAttempt = 0
  if (eventKey) {
    const existing = await pool.query(
      `SELECT attempt_count FROM email_notifications WHERE event_key = $1`,
      [eventKey]
    )
    if (existing.rows[0]) {
      notificationAttempt = existing.rows[0].attempt_count + 1
    }
  }

  try {
    const templateResult = await pool.query(
      `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [templateKey]
    )

    if (templateResult.rows.length === 0) {
      console.error(`Email template not found or inactive: ${templateKey}`)
      await writeLog(pool, {
        eventName: 'email_template_missing',
        status: 'skipped',
        payload: { template_key: templateKey },
      })
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

    const upserted = await upsertEmailNotification({
      eventKey,
      templateKey,
      recipientUserId,
      recipientEmail,
      manuscriptId,
      data: { ...meta, subject: finalSubject },
      status: 'queued',
      attemptIncrement: 0,
    })

    if (upserted.skipped) {
      return { success: true, skipped: true, reason: 'already_sent', id: upserted.id }
    }

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

      await upsertEmailNotification({
        eventKey,
        templateKey,
        recipientUserId,
        recipientEmail,
        manuscriptId,
        status: NotificationStatus.SKIPPED,
        error: delivery.reason || 'email_disabled',
        attemptIncrement: 1,
      })

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

      await upsertEmailNotification({
        eventKey,
        templateKey,
        recipientUserId,
        recipientEmail,
        manuscriptId,
        status: NotificationStatus.SENT,
        providerMessageId: delivery.providerMessageId,
        attemptIncrement: 1,
      })

      console.log(`[EMAIL] sent: ${templateKey} for user ${recipientUserId}`)
      return { success: true, log_id: logId, provider_message_id: delivery.providerMessageId }
    }

    const deliveryError = delivery.error || 'Email delivery failed'
    const isPermanent = delivery.isPermanent === true || isPermanentEmailError(deliveryError)
    const nextStatus = isPermanent ? NotificationStatus.FAILED : NotificationStatus.RETRYING

    const logResult = await writeLog(pool, {
      eventName: 'email_failed',
      status: isPermanent ? 'failed' : 'retrying',
      payload: { ...meta, is_permanent: isPermanent, attempt: notificationAttempt },
      errorMessage: deliveryError,
    })
    logId = logResult.rows[0]?.id

    await upsertEmailNotification({
      eventKey,
      templateKey,
      recipientUserId,
      recipientEmail,
      manuscriptId,
      status: nextStatus,
      error: deliveryError,
      attemptIncrement: 1,
    })

    console.error(`[EMAIL] ${nextStatus}: ${templateKey} for user ${recipientUserId}${isPermanent ? ' (permanent)' : ''}`)
    return { success: false, error: deliveryError, status: nextStatus, is_permanent: isPermanent, log_id: logId }
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
    try {
      await upsertEmailNotification({
        eventKey,
        templateKey,
        recipientUserId,
        recipientEmail: variables?.recipient_email || null,
        manuscriptId,
        status: 'failed',
        error: error.message || 'Email delivery failed',
        attemptIncrement: 1,
      })
    } catch (logErr) {
      console.error('Failed to write email_notifications failure record:', logErr)
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

export async function getEmailTemplateByKey(templateKey) {
  const result = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 ORDER BY created_at DESC LIMIT 1`,
    [templateKey]
  )
  return result.rows[0] || null
}

export async function updateNotificationTemplate(templateKey, data) {
  const { subject, body_html, body_text, variables_schema, is_active, updated_by } = data

  const result = await pool.query(
    `UPDATE email_templates
     SET subject = COALESCE($1, subject),
         body_html = COALESCE($2, body_html),
         body_text = COALESCE($3, body_text),
         variables_schema = COALESCE($4, variables_schema),
         is_active = COALESCE($5, is_active),
         updated_by = COALESCE($6, updated_by),
         updated_at = now()
     WHERE template_key = $7
     RETURNING *`,
    [subject, body_html, body_text, variables_schema ? JSON.stringify(variables_schema) : null, is_active, updated_by || null, templateKey]
  )

  return result.rows[0]
}

const SAMPLE_VARIABLES = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'author@example.com',
  manuscriptTitle: 'An Example Manuscript',
  manuscriptId: 'MS-2026-00125',
  submissionNumber: 'MS-2026-00125',
  decision: 'Accept',
  decisionComments: 'This is an sample editorial decision comment.',
  reviewDeadline: '30 Sep 2026',
  verificationUrl: buildAppUrl('/verify-email', { token: 'sample-verification-token' }),
  resetPasswordUrl: buildAppUrl('/reset-password', { token: 'sample-reset-token' }),
  invitationUrl: buildAppUrl('/reviewer/invitations/sample', {}),
  journalName: 'Asgard Publications',
  journalUrl: buildAppUrl('/', {}),
  reminderAfterDays: 3,
}

export function getSampleTemplateVariables() {
  return { ...SAMPLE_VARIABLES }
}

export function previewEmailTemplate({ template, variables = {} }) {
  const mergeVars = { ...getSampleTemplateVariables(), ...(variables || {}) }

  const subject = renderTemplate(template.subject, mergeVars, { escape: false })
  const html = renderTemplate(template.body_html, mergeVars)
  const text = template.body_text ? renderTemplate(template.body_text, mergeVars, { escape: false }) : undefined

  const detected = []
  const used = new Set(Object.keys(mergeVars))
  const subjectVars = [...new Set(template.subject.match(/\{\{\s*([\w.-]+)\s*\}\}/g) || [])].map((m) => m.replace(/[{}]/g, '').trim())
  const htmlVars = [...new Set(template.body_html.match(/\{\{\s*([\w.-]+)\s*\}\}/g) || [])].map((m) => m.replace(/[{}]/g, '').trim())

  for (const v of [...subjectVars, ...htmlVars]) {
    if (!used.has(v)) detected.push(v)
  }

  return {
    subject,
    html,
    text,
    rendered_at: new Date().toISOString(),
    missing_variables: [...new Set(detected)],
    template_key: template.template_key,
  }
}

export async function sendTestEmailForTemplate({ templateKey, to }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 ORDER BY created_at DESC LIMIT 1`,
    [templateKey]
  )
  if (templateResult.rows.length === 0) {
    return { success: false, error: 'Template not found' }
  }
  const template = templateResult.rows[0]
  const preview = previewEmailTemplate({ template })
  return sendTestEmail({
    to,
    subject: `[TEST] ${preview.subject}`,
    html: preview.html,
    text: preview.text,
  })
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

export async function getFailedNotifications(limit = 50) {
  const result = await pool.query(
    `SELECT * FROM email_notifications
     WHERE status IN ('failed', 'retrying') AND attempt_count < ${MAX_RETRY_ATTEMPTS}
     ORDER BY failed_at ASC
     LIMIT $1`,
    [limit]
  )
  return result.rows
}

export async function getEmailDeliveries({ status, templateKey, recipientEmail, eventKey, manuscriptId, page = 1, limit = 50 }) {
  const conditions = []
  const params = []
  let idx = 1

  if (status) {
    conditions.push(`status = $${idx++}`)
    params.push(status)
  }
  if (templateKey) {
    conditions.push(`template_key = $${idx++}`)
    params.push(templateKey)
  }
  if (recipientEmail) {
    conditions.push(`recipient_email ILIKE $${idx++}`)
    params.push(`%${recipientEmail}%`)
  }
  if (eventKey) {
    conditions.push(`event_key ILIKE $${idx++}`)
    params.push(`%${eventKey}%`)
  }
  if (manuscriptId) {
    conditions.push(`manuscript_id = $${idx++}`)
    params.push(manuscriptId)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const perPage = Math.min(Math.max(parseInt(limit) || 50, 1), 200)
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * perPage

  const result = await pool.query(
    `SELECT id, journal_id, manuscript_id, recipient_user_id, recipient_email,
            template_key, event_key, status, attempt_count, provider_message_id,
            last_error, queued_at, sent_at, failed_at, created_at, updated_at
     FROM email_notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, perPage, offset]
  )

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM email_notifications ${whereClause}`,
    params
  )

  return {
    notifications: result.rows,
    total: countResult.rows[0]?.total || 0,
    page: Math.max(parseInt(page) || 1, 1),
    limit: perPage,
  }
}

export async function getEmailDeliveryById(id) {
  const result = await pool.query(
    `SELECT en.*,
            m.submission_number,
            u.display_name AS recipient_name,
            u.email AS recipient_current_email
     FROM email_notifications en
     LEFT JOIN manuscripts m ON m.id = en.manuscript_id
     LEFT JOIN users u ON u.id = en.recipient_user_id
     WHERE en.id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function getEmailStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'sent') AS sent,
       COUNT(*) FILTER (WHERE status = 'queued') AS queued,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) FILTER (WHERE status = 'skipped') AS skipped,
       COUNT(*) FILTER (WHERE status IN ('sent', 'queued'))::float / NULLIF(COUNT(*), 0) * 100 AS success_rate,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24h,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7d,
       MIN(created_at) AS first_email_at,
       MAX(created_at) AS last_email_at
     FROM email_notifications`,
  )
  const byTemplate = await pool.query(
    `SELECT template_key, COUNT(*) AS count,
            COUNT(*) FILTER (WHERE status = 'sent') AS sent,
            COUNT(*) FILTER (WHERE status = 'failed') AS failed
     FROM email_notifications
     GROUP BY template_key
     ORDER BY count DESC`
  )
  return { summary: result.rows[0], by_template: byTemplate.rows }
}

export async function retryAllFailed(limit = 25) {
  const result = await pool.query(
    `SELECT id FROM email_notifications
     WHERE status IN ('failed', 'retrying') AND attempt_count < ${MAX_RETRY_ATTEMPTS}
     ORDER BY failed_at ASC NULLS LAST
     LIMIT $1`,
    [limit]
  )

  const results = []
  for (const row of result.rows) {
    const retry = await retryNotification(row.id)
    results.push({ id: row.id, ...retry })
  }
  return { total: result.rows.length, results }
}

export async function retryNotification(notificationId) {
  const result = await pool.query(
    `SELECT * FROM email_notifications WHERE id = $1`,
    [notificationId]
  )
  if (result.rows.length === 0) {
    return { success: false, error: 'Notification not found' }
  }
  const notification = result.rows[0]
  if (notification.status === 'sent') {
    return { success: true, skipped: true, reason: 'already_sent' }
  }
  if (notification.attempt_count >= MAX_RETRY_ATTEMPTS) {
    return { success: false, error: 'Max retry attempts reached' }
  }

  return enqueueNotification(notification.template_key, notification.recipient_user_id, {
    recipient_email: notification.recipient_email,
    manuscript_id: notification.manuscript_id,
    ...(notification.data || {}),
  })
}
