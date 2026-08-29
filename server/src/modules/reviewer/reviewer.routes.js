import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as reviewerService from './reviewer.service.js'

const router = Router()

router.get('/invitations', authenticate, requireRole('reviewer'), async (req, res) => {
  const invitations = await reviewerService.getInvitations(req.user.uid)
  res.json(invitations)
})

router.get('/dashboard', authenticate, requireRole('reviewer'), async (req, res) => {
  const dashboard = await reviewerService.getDashboard(req.user.uid)
  res.json(dashboard)
})

router.patch('/invitations/:id', authenticate, requireRole('reviewer'), async (req, res) => {
  const { response, suggestion } = req.body
  const result = await reviewerService.respondToInvitation(req.params.id, req.user.uid, response, suggestion)
  res.json(result)
})

router.get('/assignments', authenticate, requireRole('reviewer'), async (req, res) => {
  const assignments = await reviewerService.getAssignments(req.user.uid)
  res.json(assignments)
})

router.get('/assignments/:id', authenticate, requireRole('reviewer'), async (req, res) => {
  const assignment = await reviewerService.getAssignmentById(req.params.id, req.user.uid)
  res.json(assignment)
})

router.get('/manuscripts/:id', authenticate, requireRole('reviewer'), async (req, res) => {
  const manuscript = await reviewerService.getManuscriptForReview(req.params.id, req.user.uid)
  res.json(manuscript)
})

router.post('/reviews', authenticate, requireRole('reviewer'), async (req, res) => {
  const { assignment_id, recommendation, public_comments, confidential_comments, score, scores } = req.body
  const reviewScore = score ?? scores
  const review = await reviewerService.submitReview(assignment_id, req.user.uid, { recommendation, public_comments, confidential_comments, score: reviewScore })
  res.status(201).json(review)
})

router.get('/extensions', authenticate, requireRole('reviewer'), async (req, res) => {
  const extensions = await reviewerService.getExtensionRequests(req.user.uid)
  res.json(extensions)
})

router.post('/assignments/:id/extension', authenticate, requireRole('reviewer'), async (req, res) => {
  const { requested_until, reason } = req.body
  const result = await reviewerService.requestExtension(req.params.id, req.user.uid, requested_until, reason)
  res.status(201).json(result)
})

export default router
