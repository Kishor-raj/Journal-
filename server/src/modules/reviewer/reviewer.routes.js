import { Router } from 'express'
import crypto from 'crypto'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as reviewerService from './reviewer.service.js'
import { findSession } from '../auth/auth.service.js'

const router = Router()

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

async function resolveOptionalUser(req) {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null
  const rawToken = bearerToken || req.cookies?.session_token
  if (!rawToken) return null
  const session = await findSession(sha256(rawToken))
  return session || null
}

router.get('/invitations/:id/validate', async (req, res) => {
  const { token } = req.query
  const authenticated = await resolveOptionalUser(req)
  const invitation = await reviewerService.validateInvitation(req.params.id, token, authenticated?.uid || null)
  if (invitation.valid && invitation.owner_uid && (!authenticated || authenticated.uid !== invitation.owner_uid)) {
    invitation.requires_login = true
    invitation.owns_invitation = false
  }
  res.json(invitation)
})

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
