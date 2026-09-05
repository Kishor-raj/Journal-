import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as publicationService from './publication.service.js'

const router = Router()

// Author's own certificate for one of their published manuscripts
router.get('/manuscripts/:manuscriptId/certificate', authenticate, async (req, res) => {
  const certificate = await publicationService.getMyCertificate(req.params.manuscriptId, req.user.uid)
  res.json(certificate)
})

// Editor/Admin certificate management
router.get('/manuscripts/:manuscriptId/certificates', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  const certificates = await publicationService.getCertificatesForManuscript(req.params.manuscriptId)
  res.json(certificates)
})

// Retry certificate generation for failed/pending certificates
router.post('/manuscripts/:manuscriptId/generate-certificates', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  const result = await publicationService.generateCertificatesForManuscript(req.params.manuscriptId)
  res.json(result)
})

// Revoke a certificate
router.post('/certificates/:certificateId/revoke', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  const certificate = await publicationService.revokeCertificate(req.params.certificateId, req.user.uid, req.body?.reason)
  res.json(certificate)
})

export default router