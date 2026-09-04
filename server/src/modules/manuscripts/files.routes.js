import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import * as filesService from './files.service.js'

const router = Router()

router.post('/signature', authenticate, async (req, res) => {
  const { manuscript_id, version_id, file_type } = req.body
  const signature = filesService.generateSignature(manuscript_id, version_id, file_type)
  res.json(signature)
})

router.post('/manuscripts/:id/files', authenticate, async (req, res) => {
  const file = await filesService.confirmUpload(req.params.id, req.body.version_id, req.body, req.user.uid)
  res.status(201).json(file)
})

router.delete('/manuscripts/:manuscriptId/files/:fileId', authenticate, async (req, res) => {
  const result = await filesService.deleteManuscriptFile(
    req.params.manuscriptId,
    req.params.fileId,
    req.user.uid
  )
  res.json(result)
})

router.get('/:id/access', authenticate, async (req, res) => {
  const file = await filesService.getFileAccess(req.params.id, req.user)
  res.json(file)
})

export default router
