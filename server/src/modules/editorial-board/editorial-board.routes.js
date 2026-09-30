import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as editorialBoardService from './editorial-board.service.js'

const router = Router()

const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many application submission attempts. Please try again later.', code: 'RATE_LIMITED' },
})

const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

// POST /api/editorial-board/applications - Public application submission
router.post('/applications', applicationLimiter, async (req, res) => {
  const result = await editorialBoardService.submitApplication(req.body, req.ip, req.headers['user-agent'])
  res.status(201).json(result)
})

// POST /api/editorial-board/signature - Get Cloudinary upload signature for applicant uploads
router.post('/signature', async (req, res) => {
  const result = editorialBoardService.generateUploadSignature(req.body)
  res.json(result)
})

// GET /api/editorial-board/status/:reference - Applicant tracks status
router.get('/status/:reference', statusLimiter, async (req, res) => {
  const { email } = req.query
  const result = await editorialBoardService.getApplicationStatus(req.params.reference, email)
  res.json(result)
})

// POST /api/editorial-board/applications/:reference/clarification - Applicant responds to clarification
router.post('/applications/:reference/clarification', applicationLimiter, async (req, res) => {
  const { email, response } = req.body
  const result = await editorialBoardService.submitClarificationResponse(
    req.params.reference,
    email,
    response,
    req.ip,
    req.headers['user-agent']
  )
  res.json(result)
})

// GET /api/editorial-board/members - Public board members list
router.get('/members', async (req, res) => {
  const members = await editorialBoardService.getPublicEditorialBoard()
  res.json(members)
})

export default router
