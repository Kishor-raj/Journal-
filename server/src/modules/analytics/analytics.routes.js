import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  registerVisit,
  getTotalVisitors,
  isLikelyBot,
  isValidVisitorId,
} from './analytics.service.js'

const router = Router()

function isProductionLike() {
  const serverOrigin = process.env.SERVER_ORIGIN || 'http://localhost:3001'
  return (
    process.env.NODE_ENV === 'production' ||
    serverOrigin.startsWith('https://') ||
    process.env.RENDER === 'true'
  )
}

const VISITOR_COOKIE_NAME = 'visitor_id'
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000 // ~1 year

function getVisitorCookieOptions() {
  const secure = isProductionLike()
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: '/',
  }
}

const visitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

const visitorStatsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

router.get('/stats', visitorStatsLimiter, async (req, res) => {
  const totalVisitors = await getTotalVisitors()
  return res.json({ totalVisitors })
})

router.post('/visit', visitLimiter, async (req, res) => {
  res.set('Cache-Control', 'private, no-store, max-age=0')

  const userAgent = req.get('user-agent')
  if (isLikelyBot(userAgent)) {
    const total = await getTotalVisitors()
    return res.json({ totalVisitors: total })
  }

  const requestId = isValidVisitorId(req.body?.visitorId)
    ? req.body.visitorId
    : null
  const cookieId = isValidVisitorId(req.cookies?.visitor_id)
    ? req.cookies.visitor_id
    : null
  const resolvedId = requestId || cookieId

  const result = await registerVisit(resolvedId)

  res.cookie(VISITOR_COOKIE_NAME, result.visitorId, getVisitorCookieOptions())

  return res.json({ totalVisitors: result.totalVisitors })
})

export default router