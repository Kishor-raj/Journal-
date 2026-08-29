import express from 'express'
import 'express-async-errors'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
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

const app = express()

const isProductionLike = env.NODE_ENV === 'production' || env.SERVER_ORIGIN.startsWith('https://') || process.env.RENDER === 'true'

if (isProductionLike) {
  app.set('trust proxy', 1)
}

app.use(helmet())
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
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

app.use(errorHandler)

export default app
