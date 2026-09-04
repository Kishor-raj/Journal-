import pool from '../../config/db.js'
import { sendEmail } from './email.service.js'
import { renderTemplate, buildAppUrl } from './email.utils.js'
import { env } from '../../config/env.js'

export async function sendEmailVerificationEmail({ to, firstName, token, expiresAt }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['account_verification']
  )

  const template = templateResult.rows[0]
  if (!template) {
    return { success: false, error: 'Verification email template not found' }
  }

  const verificationUrl = buildAppUrl('/verify-email', { token })
  const vars = {
    first_name: firstName || to.split('@')[0],
    verification_url: verificationUrl,
    expires_in: `${Math.round((expiresAt.getTime() - Date.now()) / 60000)} minutes`,
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  const result = await sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'account_verification', recipient_email: to },
  })

  if (!result.success && env.NODE_ENV !== 'production') {
    console.log(
      `\n[DEV] Verification email could not be sent to ${to} (${result.error || 'unknown error'}).
[DEV] Open this link in your browser to verify the account:\n${verificationUrl}\n`
    )
  }

  return result
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl, expiresAt }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['password_reset']
  )

  const template = templateResult.rows[0]
  if (!template) {
    return { success: false, error: 'Password reset email template not found' }
  }

  const vars = {
    first_name: firstName || to.split('@')[0],
    reset_url: resetUrl,
    expires_in: `${Math.round((expiresAt.getTime() - Date.now()) / 60000)} minutes`,
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  const result = await sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'password_reset', recipient_email: to },
  })

  if (!result.success && env.NODE_ENV !== 'production') {
    console.log(
      `\n[DEV] Password reset email could not be sent to ${to} (${result.error || 'unknown error'}).
[DEV] Open this link in your browser to reset the password:\n${resetUrl}\n`
    )
  }

  return result
}

export async function sendPasswordChangedEmail({ to, firstName }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['password_changed']
  )

  const template = templateResult.rows[0]
  if (!template) {
    return { success: false, error: 'Password changed email template not found' }
  }

  const vars = {
    first_name: firstName || to.split('@')[0],
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'password_changed', recipient_email: to },
  })
}
