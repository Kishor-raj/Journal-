import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import pool from '../../config/db.js'
import { emailHealth } from '../email/email.service.js'
import * as notificationService from './notification.service.js'
import { processDraftReminders } from './manuscript-notification.service.js'
import { runEmailWorkerOnce, validateEmailTemplates } from './email.worker.js'

const router = Router()

const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many test emails sent, please try again later.', code: 'RATE_LIMITED' },
})

const resendNotificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many resend attempts, please try again later.', code: 'RATE_LIMITED' },
})

async function writeAdminAudit({ actorId, action, entityType, entityId, oldValues, newValues, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [actorId, action, entityType, entityId || null, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, ip || null]
    )
  } catch (err) {
    console.error('[NOTIFY_AUDIT] Failed to write audit log:', err.message)
  }
}

router.get('/health', authenticate, requireRole('admin'), (req, res) => {
  res.json(emailHealth())
})

router.get('/templates', authenticate, requireRole('admin'), async (req, res) => {
  const templates = await notificationService.getNotificationTemplates()
  res.json(templates)
})

router.get('/templates/:key/sample-variables', authenticate, requireRole('admin'), async (req, res) => {
  res.json(notificationService.getSampleTemplateVariables())
})

router.post('/templates/:key/preview', authenticate, requireRole('admin'), async (req, res) => {
  const template = await notificationService.getEmailTemplateByKey(req.params.key)
  if (!template) {
    return res.status(404).json({ error: 'Template not found' })
  }
  const preview = notificationService.previewEmailTemplate({
    template,
    variables: req.body?.variables || {},
  })
  await writeAdminAudit({
    actorId: req.user.uid,
    action: 'EMAIL_TEMPLATE_PREVIEWED',
    entityType: 'email_templates',
    entityId: template.id,
    newValues: { template_key: template.template_key },
    ip: req.ip,
  })
  res.json(preview)
})

router.get('/templates/validate', authenticate, requireRole('admin'), async (req, res) => {
  const result = await validateEmailTemplates()
  res.json(result)
})

router.patch('/templates/:key', authenticate, requireRole('admin'), async (req, res) => {
  const { subject, body_html, body_text, variables_schema, is_active } = req.body || {}
  if (subject !== undefined && typeof subject !== 'string') {
    return res.status(400).json({ error: 'subject must be a string' })
  }
  if (body_html !== undefined && typeof body_html !== 'string') {
    return res.status(400).json({ error: 'body_html must be a string' })
  }
  if (body_text !== undefined && typeof body_text !== 'string') {
    return res.status(400).json({ error: 'body_text must be a string' })
  }

  const existing = await notificationService.getEmailTemplateByKey(req.params.key)
  if (!existing) {
    return res.status(404).json({ error: 'Template not found' })
  }

  const changes = {}
  if (subject !== undefined && subject !== existing.subject) changes.subject = subject
  if (body_html !== undefined && body_html !== existing.body_html) changes.body_html = body_html
  if (body_text !== undefined && body_text !== existing.body_text) changes.body_text = body_text
  if (variables_schema !== undefined && JSON.stringify(variables_schema) !== JSON.stringify(existing.variables_schema)) changes.variables_schema = variables_schema
  if (is_active !== undefined && is_active !== existing.is_active) changes.enabled = is_active

  const template = await notificationService.updateNotificationTemplate(
    req.params.key,
    { ...req.body, updated_by: req.user.uid }
  )
  if (!template) {
    return res.status(404).json({ error: 'Template not found' })
  }

  await writeAdminAudit({
    actorId: req.user.uid,
    action: Object.keys(changes).length > 0 ? 'EMAIL_TEMPLATE_UPDATED' : 'EMAIL_TEMPLATE_TOUCHED',
    entityType: 'email_templates',
    entityId: existing.id,
    oldValues: { template_key: existing.template_key },
    newValues: { template_key: template.template_key, ...changes },
    ip: req.ip,
  })

  res.json(template)
})

router.post('/templates/:key/test', authenticate, requireRole('admin'), testEmailLimiter, async (req, res) => {
  const { to } = req.body || {}
  if (!to) return res.status(400).json({ error: 'Missing recipient' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }
  const template = await notificationService.getEmailTemplateByKey(req.params.key)
  const result = await notificationService.sendTestEmailForTemplate({ templateKey: req.params.key, to })
  await writeAdminAudit({
    actorId: req.user.uid,
    action: 'TEST_EMAIL_SENT',
    entityType: 'email_templates',
    entityId: template?.id || null,
    newValues: { template_key: req.params.key, to, success: !!result.success, skipped: !!result.skipped },
    ip: req.ip,
  })
  if (!result.success && !result.skipped) {
    return res.status(500).json(result)
  }
  return res.json(result)
})

router.post('/test', authenticate, requireRole('admin'), testEmailLimiter, async (req, res) => {
  const { to, subject, html, text } = req.body || {}
  if (!to) return res.status(400).json({ error: 'Missing recipient' })
  const result = await notificationService.sendTestEmail({ to, subject, html, text })
  await writeAdminAudit({
    actorId: req.user.uid,
    action: 'TEST_EMAIL_SENT',
    entityType: 'email_test',
    newValues: { to, success: !!result.success, skipped: !!result.skipped },
    ip: req.ip,
  })
  if (!result.success && !result.skipped) {
    return res.status(500).json(result)
  }
  return res.json(result)
})

router.get('/deliveries', authenticate, requireRole('admin'), async (req, res) => {
  const { status, template_key, recipient_email, event_key, manuscript_id, page = 1, limit = 50 } = req.query
  const data = await notificationService.getEmailDeliveries({
    status,
    templateKey: template_key,
    recipientEmail: recipient_email,
    eventKey: event_key,
    manuscriptId: manuscript_id,
    page,
    limit,
  })
  res.json(data)
})

router.get('/deliveries/:id', authenticate, requireRole('admin'), async (req, res) => {
  const notification = await notificationService.getEmailDeliveryById(req.params.id)
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' })
  }
  res.json(notification)
})

router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  const stats = await notificationService.getEmailStats()
  res.json(stats)
})

router.get('/failed', authenticate, requireRole('admin'), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200)
  const notifications = await notificationService.getFailedNotifications(limit)
  res.json(notifications)
})

router.post('/retry/:id', authenticate, requireRole('admin'), resendNotificationLimiter, async (req, res) => {
  const notification = await notificationService.getEmailDeliveryById(req.params.id)
  const result = await notificationService.retryNotification(req.params.id)
  await writeAdminAudit({
    actorId: req.user.uid,
    action: 'NOTIFICATION_RESEND_REQUESTED',
    entityType: 'email_notifications',
    entityId: req.params.id,
    newValues: {
      template_key: notification?.template_key || null,
      success: !!result.success,
      skipped: !!result.skipped,
    },
    ip: req.ip,
  })
  if (!result.success && !result.skipped) {
    return res.status(500).json(result)
  }
  return res.json(result)
})

router.post('/retry-all', authenticate, requireRole('admin'), resendNotificationLimiter, async (req, res) => {
  const limit = Math.min(parseInt(req.body?.limit) || 25, 100)
  const result = await notificationService.retryAllFailed(limit)
  res.json(result)
})

router.post('/draft-reminders', authenticate, requireRole('admin'), async (req, res) => {
  const { reminder_after_days, cooldown_days } = req.body || {}
  const result = await processDraftReminders({
    reminderAfterDays: reminder_after_days || 3,
    cooldownDays: cooldown_days || 7,
  })
  res.json(result)
})

router.post('/worker/run', authenticate, requireRole('admin'), async (req, res) => {
  const result = await runEmailWorkerOnce()
  res.json(result)
})

export default router
