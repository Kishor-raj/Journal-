import { Router } from 'express'
import asyncHandler from 'express-async-errors'
import rateLimit from 'express-rate-limit'
import { handleHostingerWebhook } from './ai-email.controller.js'
import { getPendingApprovals, getApprovalDetail, approveAndQueueSend, rejectReply } from './ai-email-approval.service.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import { getAiEmailMetrics, getProcessingTimeline } from '../../services/ai/audit.js'
import { getReplyConfig } from '../../services/ai/autoReplyRules.js'
import { getGeminiConfig } from '../../services/gemini/index.js'
import { isConfigured as isHostingerConfigured } from '../../services/email/hostinger/index.js'
import { createWebhookPayloadGuard } from '../../services/ai/security.js'
import { getAiEmailConfig, updateAiEmailConfig, getAiEmailConfigPublic } from './ai-email-config.service.js'

const router = Router()

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests, please try again later' },
})

const approvalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

router.post('/hostinger/webhook', webhookLimiter, createWebhookPayloadGuard(), asyncHandler(handleHostingerWebhook))

router.get('/config', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const config = await getAiEmailConfig()
  res.json(config)
}))

router.put('/config', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const updated = await updateAiEmailConfig(req.body, req.user.id)
  res.json(updated)
}))

router.get('/config/public', asyncHandler(async (req, res) => {
  res.json(getAiEmailConfigPublic())
}))

router.get('/dashboard', authenticate, requireRole('admin', 'editor'), asyncHandler(async (req, res) => {
  const metrics = await getAiEmailMetrics()
  const config = {
    gemini: getGeminiConfig(),
    hostinger: { configured: isHostingerConfigured() },
    autoReplyRules: getReplyConfig(),
  }
  res.json({ metrics, config })
}))

router.get('/approvals', authenticate, requireRole('admin', 'editor'), asyncHandler(async (req, res) => {
  const { page, limit } = req.query
  const result = await getPendingApprovals({ page, limit })
  res.json(result)
}))

router.get('/approvals/:replyId', authenticate, requireRole('admin', 'editor'), asyncHandler(async (req, res) => {
  const detail = await getApprovalDetail(req.params.replyId)
  if (!detail) return res.status(404).json({ error: 'Reply not found' })
  res.json(detail)
}))

router.post('/approvals/:replyId/approve', authenticate, requireRole('admin', 'editor'), approvalLimiter, asyncHandler(async (req, res) => {
  const { edited_body } = req.body || {}
  const result = await approveAndQueueSend(req.params.replyId, req.user.id, edited_body)
  if (!result.success) return res.status(400).json({ error: result.error })
  res.json(result)
}))

router.post('/approvals/:replyId/reject', authenticate, requireRole('admin', 'editor'), approvalLimiter, asyncHandler(async (req, res) => {
  const { reason } = req.body || {}
  const result = await rejectReply(req.params.replyId, req.user.id, reason)
  if (!result.success) return res.status(400).json({ error: result.error })
  res.json(result)
}))

router.get('/timeline/:emailId', authenticate, requireRole('admin', 'editor'), asyncHandler(async (req, res) => {
  const timeline = await getProcessingTimeline(req.params.emailId)
  res.json({ timeline })
}))

export default router
