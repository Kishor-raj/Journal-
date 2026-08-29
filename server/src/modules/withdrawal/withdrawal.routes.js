import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import * as withdrawalService from './withdrawal.service.js'

const router = Router()

router.post('/', authenticate, requireRole('author'), async (req, res) => {
  const { manuscript_id, reason } = req.body
  const result = await withdrawalService.requestWithdrawal(manuscript_id, req.user.uid, reason)
  res.status(201).json(result)
})

router.get('/mine', authenticate, requireRole('author'), async (req, res) => {
  const withdrawals = await withdrawalService.getMyWithdrawals(req.user.uid)
  res.json(withdrawals)
})

router.get('/pending', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  const withdrawals = await withdrawalService.getWithdrawalRequests(req.user.uid)
  res.json(withdrawals)
})

router.patch('/:id', authenticate, requireRole('editor', 'admin'), async (req, res) => {
  const { approved, decision_notes } = req.body
  const result = await withdrawalService.handleWithdrawal(req.params.id, req.user.uid, approved, decision_notes)
  res.json(result)
})

export default router
