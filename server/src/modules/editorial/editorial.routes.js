import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as editorialService from './editorial.service.js'

const router = Router()

const resendInvitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many resend attempts, please try again later.', code: 'RATE_LIMITED' },
})

router.get('/dashboard', authenticate, requireRole('editor'), async (req, res) => {
  const stats = await editorialService.getDashboardStats(req.user.uid)
  res.json(stats)
})

router.get('/queue', authenticate, requireRole('editor'), async (req, res) => {
  const queue = await editorialService.getQueue()
  res.json(queue)
})

router.get('/reviewers', authenticate, requireRole('editor'), async (req, res) => {
  const reviewers = await editorialService.getReviewerManagement(req.user.uid)
  res.json(reviewers)
})

router.get('/decisions', authenticate, requireRole('editor'), async (req, res) => {
  const decisions = await editorialService.getPendingDecisions(req.user.uid)
  res.json(decisions)
})

router.get('/notifications', authenticate, requireRole('editor'), async (req, res) => {
  const notifications = await editorialService.getNotifications(req.user.uid)
  res.json(notifications)
})

router.get('/manuscripts/:id', authenticate, requireRole('editor'), async (req, res) => {
  const manuscript = await editorialService.getManuscript(req.params.id)
  res.json(manuscript)
})

router.post('/assignments', authenticate, requireRole('editor'), async (req, res) => {
  const { manuscript_id } = req.body
  const result = await editorialService.claimManuscript(manuscript_id, req.user.uid)
  res.status(201).json(result)
})

router.get('/manuscripts/:id/eligible-reviewers', authenticate, requireRole('editor'), async (req, res) => {
  const reviewers = await editorialService.getEligibleReviewers(req.params.id)
  res.json(reviewers)
})

router.post('/manuscripts/:id/invite-reviewer', authenticate, requireRole('editor'), async (req, res) => {
  const { reviewer_id, deadline } = req.body
  const result = await editorialService.inviteReviewer(req.params.id, req.user.uid, reviewer_id, deadline)
  res.status(201).json(result)
})

router.patch('/manuscripts/:id/assignments/:assignmentId/deadline', authenticate, requireRole('editor'), async (req, res) => {
  const { deadline } = req.body
  const result = await editorialService.setReviewerDeadline(req.params.id, req.user.uid, req.params.assignmentId, deadline)
  res.json(result)
})

router.post('/manuscripts/:id/assignments/:assignmentId/resend-invitation', authenticate, requireRole('editor'), resendInvitationLimiter, async (req, res) => {
  const result = await editorialService.resendInvitation(req.params.id, req.user.uid, req.params.assignmentId)
  res.json(result)
})

router.get('/manuscripts/:id/assignments', authenticate, requireRole('editor'), async (req, res) => {
  const assignments = await editorialService.getAssignments(req.params.id, req.user.uid)
  res.json(assignments)
})

router.get('/manuscripts/:id/extensions', authenticate, requireRole('editor'), async (req, res) => {
  const extensions = await editorialService.getExtensionRequests(req.params.id, req.user.uid)
  res.json(extensions)
})

router.post('/manuscripts/:id/decision', authenticate, requireRole('editor'), async (req, res) => {
  const result = await editorialService.submitDecision(req.params.id, req.user.uid, req.body)
  res.status(201).json(result)
})

router.patch('/extensions/:id', authenticate, requireRole('editor'), async (req, res) => {
  const { approved } = req.body
  const result = await editorialService.handleExtension(req.params.id, req.user.uid, approved)
  res.json(result)
})

router.post('/manuscripts/:id/publish', authenticate, requireRole('editor'), async (req, res) => {
  const result = await editorialService.publishManuscript(req.params.id, req.user.uid)
  res.json(result)
})

router.get('/accepted', authenticate, requireRole('editor'), async (req, res) => {
  const manuscripts = await editorialService.getAcceptedManuscripts(req.user.uid)
  res.json(manuscripts)
})

export default router

