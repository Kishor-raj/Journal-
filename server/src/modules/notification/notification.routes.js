import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { emailHealth } from '../email/email.service.js'
import * as notificationService from './notification.service.js'

const router = Router()

router.get('/health', authenticate, requireRole('admin'), (req, res) => {
  res.json(emailHealth())
})

router.get('/templates', authenticate, requireRole('admin'), async (req, res) => {
  const templates = await notificationService.getNotificationTemplates()
  res.json(templates)
})

router.patch('/templates/:key', authenticate, requireRole('admin'), async (req, res) => {
  const template = await notificationService.updateNotificationTemplate(req.params.key, req.body)
  res.json(template)
})

router.post('/test', authenticate, requireRole('admin'), async (req, res) => {
  const { to, subject, html, text } = req.body || {}
  if (!to) return res.status(400).json({ error: 'Missing recipient' })
  const result = await notificationService.sendTestEmail({ to, subject, html, text })
  if (!result.success && !result.skipped) {
    return res.status(500).json(result)
  }
  return res.json(result)
})

export default router
