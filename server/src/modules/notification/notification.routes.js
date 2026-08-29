import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as notificationService from './notification.service.js'

const router = Router()

router.get('/templates', authenticate, requireRole('admin'), async (req, res) => {
  const templates = await notificationService.getNotificationTemplates()
  res.json(templates)
})

router.patch('/templates/:key', authenticate, requireRole('admin'), async (req, res) => {
  const template = await notificationService.updateNotificationTemplate(req.params.key, req.body)
  res.json(template)
})

export default router
