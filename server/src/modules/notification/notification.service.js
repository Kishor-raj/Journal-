import pool from '../../config/db.js'

export async function enqueueNotification(templateKey, recipientUserId, variables) {
  try {
    const templateResult = await pool.query(
      `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true`,
      [templateKey]
    )

    if (templateResult.rows.length === 0) {
      console.error(`Email template not found: ${templateKey}`)
      return null
    }

    const template = templateResult.rows[0]

    let bodyHtml = template.body_html || ''
    let bodyText = template.body_text || ''

    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`
        bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value || '')
        bodyText = bodyText.replace(new RegExp(placeholder, 'g'), value || '')
      }
    }

    await pool.query(
      `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_type, payload, status)
       VALUES ('notifications', $1, 'email_queued', $2, 'pending')`,
      [variables?.manuscript_id || null, JSON.stringify({
        template_key: templateKey,
        recipient_id: recipientUserId,
        subject: template.subject,
      })]
    )

    console.log(`Notification queued: ${templateKey} for user ${recipientUserId}`)

    return { success: true, template_key: templateKey }
  } catch (error) {
    console.error('Failed to enqueue notification:', error)
    return null
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
