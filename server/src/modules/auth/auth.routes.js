import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { googleAuth, googleCallback, logout, getMe, selectRole, register, login, verifyEmail, resendVerification, forgotPassword, validateResetPasswordToken, resetPassword } from './auth.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { logSecurityEvent } from '../security/security.service.js'

const router = Router()

const ipLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: async (req, res, next, options) => {
    await logSecurityEvent({
      eventType: 'brute_force_ip_sweeping',
      severity: 'warning',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: { method: 'rate_limit_exceeded', type: 'ip' }
    });
    res.status(options.statusCode).json({ error: 'Too many login attempts from this IP, please try again in 60 minutes.', code: 'RATE_LIMITED' });
  }
})

const emailLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.body?.email || 'unknown',
  handler: async (req, res, next, options) => {
    await logSecurityEvent({
      eventType: 'brute_force_account_targeted',
      severity: 'warning',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: { email: req.body?.email || 'unknown', method: 'rate_limit_exceeded', type: 'email' }
    });
    res.status(options.statusCode).json({ error: 'Too many login attempts for this email, please try again in 15 minutes.', code: 'RATE_LIMITED' });
  }
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again in 60 minutes.', code: 'RATE_LIMITED' },
})

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many verification resend attempts, please try again in 15 minutes.', code: 'RATE_LIMITED' },
})

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many verification attempts, please try again in 15 minutes.', code: 'RATE_LIMITED' },
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many password reset requests, please try again in 60 minutes.', code: 'RATE_LIMITED' },
})

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts, please try again in 60 minutes.', code: 'RATE_LIMITED' },
})

router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)
router.post('/register', registerLimiter, register)
router.post('/login', ipLoginLimiter, emailLoginLimiter, login)
router.post('/verify-email', verifyLimiter, verifyEmail)
router.post('/resend-verification', resendLimiter, resendVerification)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword)
router.get('/reset-password/validate', resetPasswordLimiter, validateResetPasswordToken)
router.post('/reset-password', resetPasswordLimiter, resetPassword)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)
// Selecting the effective role changes the permissions for this session, so it
// must be subject to the same session validation as every protected endpoint.
router.post('/role', authenticate, selectRole)

export default router
