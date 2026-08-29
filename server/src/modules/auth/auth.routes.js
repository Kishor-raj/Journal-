import { Router } from 'express'
import { googleAuth, googleCallback, logout, getMe, selectRole } from './auth.controller.js'
import { authenticate } from '../../middleware/authenticate.js'

const router = Router()

router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)
// Selecting the effective role changes the permissions for this session, so it
// must be subject to the same session validation as every protected endpoint.
router.post('/role', authenticate, selectRole)

export default router
