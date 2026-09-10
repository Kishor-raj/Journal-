import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}
dotenv.config()

import { testConnection } from './config/db.js'
import app from './app.js'
import { startBackgroundJobs } from './modules/notification/email.worker.js'

const PORT = parseInt(process.env.PORT || '3001', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'

async function start() {
  const dbOk = await testConnection()
  if (!dbOk) {
    console.error('Failed to connect to database. Exiting.')
    process.exit(1)
  }

  const backgroundJobsEnabled = process.env.BACKGROUND_JOBS_ENABLED !== 'false'

  if (backgroundJobsEnabled) {
    const jobs = startBackgroundJobs({
      emailWorker: {
        enabled: true,
        pollIntervalMs: parseInt(process.env.EMAIL_WORKER_INTERVAL_MS, 10) || 30 * 1000,
      },
      draftReminder: {
        enabled: process.env.DRAFT_REMINDER_ENABLED !== 'false',
        intervalMs: parseInt(process.env.DRAFT_REMINDER_INTERVAL_MS, 10) || 6 * 60 * 60 * 1000,
        reminderAfterDays: parseInt(process.env.DRAFT_REMINDER_AFTER_DAYS, 10) || 3,
        cooldownDays: parseInt(process.env.DRAFT_REMINDER_COOLDOWN_DAYS, 10) || 7,
      },
    })
    if (jobs) process.on('SIGTERM', () => jobs.stop())
  } else {
    console.log('[BACKGROUND_JOBS] Disabled via BACKGROUND_JOBS_ENABLED=false')
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${NODE_ENV}]`)
  })
}

start()
