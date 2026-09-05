import express from 'express'
import 'express-async-errors'
import cors from 'cors'
import helmet from 'helmet'
import crypto from 'crypto'
import cookieParser from 'cookie-parser'
import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import healthRoutes from './modules/auth/health.routes.js'
import authRoutes from './modules/auth/auth.routes.js'
import adminRoutes from './modules/admin/admin.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import manuscriptsRoutes from './modules/manuscripts/manuscripts.routes.js'
import filesRoutes from './modules/manuscripts/files.routes.js'
import moderationRoutes from './modules/moderation/moderation.routes.js'
import editorialRoutes from './modules/editorial/editorial.routes.js'
import reviewerRoutes from './modules/reviewer/reviewer.routes.js'
import revisionRoutes from './modules/revision/revision.routes.js'
import withdrawalRoutes from './modules/withdrawal/withdrawal.routes.js'
import notificationRoutes from './modules/notification/notification.routes.js'
import auditRoutes from './modules/audit/audit.routes.js'
import publicRoutes from './modules/public/public.routes.js'
import publicationRoutes from './modules/publications/publication.routes.js'

const app = express()
const NODE_ENV = process.env.NODE_ENV || 'development'
const isProduction = NODE_ENV === 'production'

const serverOrigin = process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT || 3001}`
const isProductionLike = isProduction || serverOrigin.startsWith('https://') || process.env.RENDER === 'true'

if (isProductionLike) {
  app.set('trust proxy', 1)
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://'],
      connectSrc: ["'self'", process.env.SERVER_ORIGIN || 'http://localhost:3001'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(isProductionLike ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  hsts: isProductionLike ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))

const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  process.env.SERVER_ORIGIN || 'http://localhost:3001',
  process.env.PUBLIC_APP_ORIGIN || '',
].filter(Boolean))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, origin)
    return callback(null, false)
  },
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  req.id = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
})

app.use(requestLogger)

app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/manuscripts', manuscriptsRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/moderation', moderationRoutes)
app.use('/api/editorial', editorialRoutes)
app.use('/api/reviewer', reviewerRoutes)
app.use('/api/revisions', revisionRoutes)
app.use('/api/withdrawals', withdrawalRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/publications', publicationRoutes)

app.use(errorHandler)

export default app
