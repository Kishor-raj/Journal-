import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as revisionService from './revision.service.js'

const router = Router()

router.get('/mine', authenticate, requireRole('author'), async (req, res) => {
  const revisions = await revisionService.getRevisionsByUser(req.user.uid)
  res.json(revisions)
})

router.get('/manuscript/:manuscriptId', authenticate, requireRole('author', 'editor'), async (req, res) => {
  const revisions = await revisionService.getRevisionsByManuscript(req.params.manuscriptId)
  res.json(revisions)
})

router.get('/:id', authenticate, requireRole('author'), async (req, res) => {
  const revision = await revisionService.getRevisionRequest(req.params.id, req.user.uid)
  res.json(revision)
})

router.post('/:id/respond', authenticate, requireRole('author'), async (req, res) => {
  const result = await revisionService.submitRevisionResponse(req.params.id, req.user.uid, req.body)
  res.status(201).json(result)
})

export default router
