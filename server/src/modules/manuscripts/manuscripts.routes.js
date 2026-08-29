import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import * as manuscriptsService from './manuscripts.service.js'

const router = Router()

router.post('/', authenticate, async (req, res) => {
  const { journal_id } = req.body
  const manuscript = await manuscriptsService.createDraft(req.user.uid, journal_id)
  res.status(201).json(manuscript)
})

router.get('/mine', authenticate, async (req, res) => {
  const manuscripts = await manuscriptsService.getManuscriptsByUser(req.user.uid)
  res.json(manuscripts)
})

router.get('/:id', authenticate, async (req, res) => {
  const manuscript = await manuscriptsService.getManuscriptById(req.params.id, req.user.uid)
  res.json(manuscript)
})

router.patch('/:id', authenticate, async (req, res) => {
  const manuscript = await manuscriptsService.updateManuscript(req.params.id, req.body, req.user.uid)
  res.json(manuscript)
})

router.post('/:id/authors', authenticate, async (req, res) => {
  const author = await manuscriptsService.addAuthor(req.params.id, req.body, req.user.uid)
  res.status(201).json(author)
})

router.patch('/:id/authors/:authorId', authenticate, async (req, res) => {
  const author = await manuscriptsService.updateAuthor(req.params.authorId, req.body, req.user.uid)
  res.json(author)
})

router.delete('/:id/authors/:authorId', authenticate, async (req, res) => {
  await manuscriptsService.removeAuthor(req.params.authorId, req.user.uid)
  res.status(204).end()
})

router.post('/:id/submit', authenticate, async (req, res) => {
  const manuscript = await manuscriptsService.submitManuscript(req.params.id, req.user.uid)
  res.json(manuscript)
})

router.get('/:id/status-history', authenticate, async (req, res) => {
  const history = await manuscriptsService.getStatusHistory(req.params.id, req.user.uid)
  res.json(history)
})

router.delete('/:id', authenticate, async (req, res) => {
  await manuscriptsService.deleteDraft(req.params.id, req.user.uid)
  res.status(204).end()
})

export default router
