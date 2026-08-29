import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as moderationService from './moderation.service.js'

const router = Router()

router.get('/notifications', authenticate, requireRole('moderator'), async (req, res) => {
  const notifications = await moderationService.getNotifications()
  res.json(notifications)
})

router.get('/dashboard', authenticate, requireRole('moderator'), async (req, res) => {
  const stats = await moderationService.getDashboardStats(req.user.uid)
  res.json(stats)
})

router.get('/queue', authenticate, requireRole('moderator'), async (req, res) => {
  const queue = await moderationService.getQueue()
  res.json(queue)
})

router.get('/manuscripts/:id', authenticate, requireRole('moderator'), async (req, res) => {
  const manuscript = await moderationService.getManuscriptForScreening(req.params.id)
  res.json(manuscript)
})

router.post('/manuscripts/:id/check', authenticate, requireRole('moderator'), async (req, res) => {
  const result = await moderationService.submitCheck(req.params.id, req.user.uid, req.body)
  res.status(201).json(result)
})

export default router
