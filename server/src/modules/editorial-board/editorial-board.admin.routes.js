import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as editorialBoardService from './editorial-board.service.js'

const router = Router()

// All admin routes require authentication and admin role
router.use(authenticate, requireRole('admin'))

// GET /api/admin/editorial-applications - List applications with metrics and pagination
router.get('/', async (req, res) => {
  const result = await editorialBoardService.getAdminApplications(req.query)
  res.json(result)
})

// GET /api/admin/editorial-applications/members - List all members for public board management
router.get('/members', async (req, res) => {
  const members = await editorialBoardService.listAllEditorialMembers()
  res.json(members)
})

// PATCH /api/admin/editorial-applications/members/:memberId - Update member display / info
router.patch('/members/:memberId', async (req, res) => {
  const updated = await editorialBoardService.updateEditorialMember(
    req.params.memberId,
    req.body,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(updated)
})

// DELETE /api/admin/editorial-applications/members/:memberId - Remove member from public board
router.delete('/members/:memberId', async (req, res) => {
  const result = await editorialBoardService.deleteEditorialMember(
    req.params.memberId,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// GET /api/admin/editorial-applications/:id - Application detail with audit history
router.get('/:id', async (req, res) => {
  const detail = await editorialBoardService.getAdminApplicationDetail(req.params.id)
  res.json(detail)
})

// PATCH /api/admin/editorial-applications/:id/verification - Update verification checkboxes and notes
router.patch('/:id/verification', async (req, res) => {
  const result = await editorialBoardService.updateApplicationVerification(
    req.params.id,
    req.body,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// POST /api/admin/editorial-applications/:id/clarification - Request clarification from applicant
router.post('/:id/clarification', async (req, res) => {
  const result = await editorialBoardService.requestClarification(
    req.params.id,
    req.body,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// POST /api/admin/editorial-applications/:id/status - Move status (UNDER_REVIEW, VERIFICATION, HOLD)
router.post('/:id/status', async (req, res) => {
  const { status, remarks } = req.body
  const result = await editorialBoardService.updateApplicationStatus(
    req.params.id,
    status,
    req.user.uid,
    remarks,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// POST /api/admin/editorial-applications/:id/approve - Approve application (promotes user or generates invitation grant)
router.post('/:id/approve', async (req, res) => {
  const result = await editorialBoardService.approveApplication(
    req.params.id,
    req.body,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// POST /api/admin/editorial-applications/:id/reject - Reject application
router.post('/:id/reject', async (req, res) => {
  const result = await editorialBoardService.rejectApplication(
    req.params.id,
    req.body,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// POST /api/admin/editorial-applications/:id/resend-invitation - Resend setup email to approved applicant
router.post('/:id/resend-invitation', async (req, res) => {
  const result = await editorialBoardService.resendRoleInvitation(
    req.params.id,
    req.user.uid,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// GET /api/admin/editorial-applications/:id/cv - Protected endpoint to access CV
router.get('/:id/cv', async (req, res) => {
  const detail = await editorialBoardService.getAdminApplicationDetail(req.params.id)
  if (!detail.cv_file_url) {
    return res.status(404).json({ error: 'CV document not found.' })
  }
  res.redirect(detail.cv_file_url)
})

export default router
