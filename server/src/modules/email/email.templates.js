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

export async function sendEditorialApplicationReceivedEmail({ to, applicantName, applicationNumber, submittedAt, preferredRole, preferredSection, statusUrl }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['editorial_application_received']
  ).catch(() => ({ rows: [] }))

  const template = templateResult.rows[0] || {
    subject: 'IJIDCR Editorial Board Application Received — {{application_number}}',
    body_html: '<p>Dear {{applicant_name}},</p><p>Thank you for your application to join the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong>.</p><p><strong>Application Reference:</strong> {{application_number}}<br/><strong>Submitted On:</strong> {{submitted_at}}<br/><strong>Preferred Role:</strong> {{preferred_role}}<br/><strong>Section:</strong> {{preferred_section}}<br/><strong>Status:</strong> Submitted (Under Review)</p><p>Our editorial administration team will review your credentials and verify your academic profile.</p><p><a href="{{status_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Track Application Status</a></p>',
    body_text: 'Dear {{applicant_name}},\n\nThank you for your application to join the Editorial Board of IJIDCR.\nApplication Reference: {{application_number}}\nTrack status: {{status_url}}',
  }

  const vars = {
    applicant_name: applicantName || 'Applicant',
    application_number: applicationNumber,
    submitted_at: submittedAt || new Date().toLocaleDateString(),
    preferred_role: preferredRole || 'Editorial Board Member',
    preferred_section: preferredSection || 'General',
    status_url: statusUrl || buildAppUrl('/editorial-board/status', { ref: applicationNumber }),
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'editorial_application_received', application_number: applicationNumber, recipient_email: to },
  })
}

export async function sendEditorialApplicationAdminAlertEmail({ to, applicantName, applicantEmail, institution, designation, country, preferredRole, preferredSection, primaryResearchArea, applicationNumber, submittedAt, adminReviewUrl }) {
  const adminEmail = to || env.ADMIN_EMAIL || env.EMAIL_FROM_ADDRESS || 'admin@ijidcr-asgard.in'
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['editorial_application_admin_alert']
  ).catch(() => ({ rows: [] }))

  const template = templateResult.rows[0] || {
    subject: 'New Editorial Board Application — {{applicant_name}} ({{application_number}})',
    body_html: '<p>A new Editorial Board application has been received for IJIDCR.</p><p><strong>Applicant Name:</strong> {{applicant_name}}<br/><strong>Email:</strong> {{applicant_email}}<br/><strong>Institution:</strong> {{institution}}<br/><strong>Designation:</strong> {{designation}}<br/><strong>Country:</strong> {{country}}<br/><strong>Preferred Role:</strong> {{preferred_role}}<br/><strong>Preferred Section:</strong> {{preferred_section}}<br/><strong>Primary Research Area:</strong> {{primary_research_area}}<br/><strong>Application Number:</strong> {{application_number}}</p><p><a href="{{admin_review_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Review Application in Admin Dashboard</a></p>',
    body_text: 'New Editorial Board application: {{applicant_name}} ({{application_number}})\nEmail: {{applicant_email}}\nInstitution: {{institution}}\nReview: {{admin_review_url}}',
  }

  const vars = {
    applicant_name: applicantName || 'Applicant',
    applicant_email: applicantEmail,
    institution: institution || 'N/A',
    designation: designation || 'N/A',
    country: country || 'N/A',
    preferred_role: preferredRole || 'Editorial Board Member',
    preferred_section: preferredSection || 'General',
    primary_research_area: primaryResearchArea || 'N/A',
    application_number: applicationNumber,
    submitted_at: submittedAt || new Date().toLocaleDateString(),
    admin_review_url: adminReviewUrl || buildAppUrl('/admin/editorial-applications'),
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    metadata: { template_key: 'editorial_application_admin_alert', application_number: applicationNumber },
  })
}

export async function sendEditorialApplicationClarificationEmail({ to, applicantName, applicationNumber, clarificationRequest, responseUrl }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['editorial_application_clarification']
  ).catch(() => ({ rows: [] }))

  const template = templateResult.rows[0] || {
    subject: 'Clarification Requested for Your IJIDCR Editorial Board Application — {{application_number}}',
    body_html: '<p>Dear {{applicant_name}},</p><p>Thank you for your application to join the IJIDCR Editorial Board (Ref: <strong>{{application_number}}</strong>).</p><p>During the verification process, our editorial administration team requested the following clarification:</p><blockquote style="border-left:4px solid #C4A24C;padding-left:16px;color:#333;margin:16px 0;">{{clarification_request}}</blockquote><p><a href="{{response_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Respond to Clarification Request</a></p>',
    body_text: 'Dear {{applicant_name}},\n\nClarification requested for IJIDCR Editorial Board application {{application_number}}:\n{{clarification_request}}\n\nRespond here: {{response_url}}',
  }

  const vars = {
    applicant_name: applicantName || 'Applicant',
    application_number: applicationNumber,
    clarification_request: clarificationRequest,
    response_url: responseUrl || buildAppUrl('/editorial-board/status', { ref: applicationNumber }),
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'editorial_application_clarification', application_number: applicationNumber, recipient_email: to },
  })
}

export async function sendEditorialApplicationApprovedEmail({ to, applicantName, applicationNumber, position, section, appointmentDate, termStartDate, loginUrl }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['editorial_application_approved']
  ).catch(() => ({ rows: [] }))

  const template = templateResult.rows[0] || {
    subject: 'Congratulations! Your IJIDCR Editorial Board Application Has Been Approved — {{application_number}}',
    body_html: '<p>Dear {{applicant_name}},</p><p>We are delighted to inform you that your application to join the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong> has been <strong>APPROVED</strong>.</p><p><strong>Appointment Position:</strong> {{position}}<br/><strong>Editorial Section:</strong> {{section}}<br/><strong>Appointment Date:</strong> {{appointment_date}}<br/><strong>Term Start:</strong> {{term_start_date}}</p><p>Your account has been granted Editor access.</p><p><a href="{{login_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Go to Editor Workspace</a></p>',
    body_text: 'Dear {{applicant_name}},\n\nYour IJIDCR Editorial Board application has been approved as {{position}} ({{section}}).\nLogin: {{login_url}}',
  }

  const vars = {
    applicant_name: applicantName || 'Editor',
    application_number: applicationNumber,
    position: position || 'Editorial Board Member',
    section: section || 'General',
    appointment_date: appointmentDate || new Date().toLocaleDateString(),
    term_start_date: termStartDate || new Date().toLocaleDateString(),
    login_url: loginUrl || buildAppUrl('/login'),
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'editorial_application_approved', application_number: applicationNumber, recipient_email: to },
  })
}

export async function sendEditorialRoleInvitationEmail({ to, applicantName, applicationNumber, position, section, invitationUrl, expiresAt, approvedEmail }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['editorial_role_invitation']
  ).catch(() => ({ rows: [] }))

  const template = templateResult.rows[0] || {
    subject: 'IJIDCR Editorial Board Application Approved — Create Your Account',
    body_html: '<p>Dear {{applicant_name}},</p><p>Congratulations! Your application to join the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong> has been <strong>APPROVED</strong> as <strong>{{position}}</strong> (Section: {{section}}).</p><p>To complete your appointment and activate your Editor privileges, please create your account using your approved email address (<strong>{{approved_email}}</strong>):</p><p><a href="{{invitation_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Set Up Your Editor Account</a></p><p><em>Note: This invitation link is personal and will expire in {{expires_in}}.</em></p>',
    body_text: 'Dear {{applicant_name}},\n\nYour application has been approved as {{position}} ({{section}}).\nSet up your account using {{approved_email}}: {{invitation_url}}\nExpires in: {{expires_in}}',
  }

  const expiresInDays = expiresAt ? Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 14
  const vars = {
    applicant_name: applicantName || 'Editor',
    application_number: applicationNumber,
    position: position || 'Editorial Board Member',
    section: section || 'General',
    approved_email: approvedEmail || to,
    invitation_url: invitationUrl,
    expires_in: `${expiresInDays} days`,
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'editorial_role_invitation', application_number: applicationNumber, recipient_email: to },
  })
}

export async function sendEditorialApplicationRejectedEmail({ to, applicantName, applicationNumber, decisionReason }) {
  const templateResult = await pool.query(
    `SELECT * FROM email_templates WHERE template_key = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    ['editorial_application_rejected']
  ).catch(() => ({ rows: [] }))

  const template = templateResult.rows[0] || {
    subject: 'Update on Your IJIDCR Editorial Board Application — {{application_number}}',
    body_html: '<p>Dear {{applicant_name}},</p><p>Thank you for your interest in serving on the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong>.</p><p>After thorough evaluation of our current editorial requirements, we regret to inform you that we are unable to offer you an editorial appointment at this time.</p>{{#if decision_reason}}<p><strong>Notes:</strong> {{decision_reason}}</p>{{/if}}<p>We deeply appreciate your academic contributions and welcome your continued engagement with IJIDCR.</p>',
    body_text: 'Dear {{applicant_name}},\n\nThank you for your interest in serving on the Editorial Board of IJIDCR.\nWe are unable to offer you an editorial appointment at this time.\n{{#if decision_reason}}Notes: {{decision_reason}}\n{{/if}}',
  }

  const vars = {
    applicant_name: applicantName || 'Applicant',
    application_number: applicationNumber,
    decision_reason: decisionReason || '',
  }

  const subject = renderTemplate(template.subject, vars, { escape: false })
  const html = renderTemplate(template.body_html, vars)
  const text = template.body_text ? renderTemplate(template.body_text, vars, { escape: false }) : undefined

  return sendEmail({
    to,
    subject,
    html,
    text,
    metadata: { template_key: 'editorial_application_rejected', application_number: applicationNumber, recipient_email: to },
  })
}

