import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as auditService from './audit.service.js'

const router = Router()

router.get('/audit', authenticate, requireRole('admin'), async (req, res) => {
  const { page, limit, actor_user_id, entity_type, action, start_date, end_date } = req.query
  const logs = await auditService.getAuditLogs({
    page, limit, actor_user_id, entity_type, action, start_date, end_date,
  })
  res.json(logs)
})

router.get('/security', authenticate, requireRole('admin'), async (req, res) => {
  const { page, limit, severity, actor_user_id, start_date, end_date } = req.query
  const logs = await auditService.getSecurityLogs({
    page, limit, severity, actor_user_id, start_date, end_date,
  })
  res.json(logs)
})

router.get('/workflow', authenticate, requireRole('admin'), async (req, res) => {
  const { page, limit, manuscript_id, workflow_name, status, start_date, end_date } = req.query
  const logs = await auditService.getWorkflowLogs({
    page, limit, manuscript_id, workflow_name, status, start_date, end_date,
  })
  res.json(logs)
})

export default router
