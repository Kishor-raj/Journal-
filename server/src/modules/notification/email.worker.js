import pool from '../../config/db.js'
import { enqueueNotification, getNotificationTemplates } from './notification.service.js'
import { processDraftReminders } from './manuscript-notification.service.js'
import { MAX_RETRY_ATTEMPTS, RETRY_BACKOFF } from './notification.events.js'

const DEFAULT_POLL_INTERVAL_MS = 30 * 1000

export async function processFailedEmails(limit = 25) {
  const result = await pool.query(
    `SELECT *
     FROM email_notifications
     WHERE status IN ('failed', 'retrying')
       AND attempt_count < $1
       AND NOT EXISTS (
         SELECT 1 FROM email_notifications en2
         WHERE en2.id <> email_notifications.id
           AND en2.event_key = email_notifications.event_key
           AND en2.status = 'sent'
       )
     ORDER BY failed_at ASC NULLS LAST, created_at ASC
     LIMIT $2`,
    [MAX_RETRY_ATTEMPTS, limit]
  )

  const processed = []
  for (const notification of result.rows) {
    try {
      const backoffMs = RETRY_BACKOFF[notification.attempt_count] || RETRY_BACKOFF[RETRY_BACKOFF.length - 1]
      const lastAttemptTime = notification.failed_at || notification.updated_at || notification.queued_at
      if (lastAttemptTime && Date.now() - new Date(lastAttemptTime).getTime() < backoffMs) {
        continue
      }

      const delivery = await enqueueNotification(notification.template_key, notification.recipient_user_id, {
        recipient_email: notification.recipient_email,
        manuscript_id: notification.manuscript_id,
        ...(notification.data || {}),
      })

      processed.push({ id: notification.id, ...delivery })
    } catch (err) {
      console.error(`[EMAIL_WORKER] Retry failed for ${notification.id}:`, err.message)
      processed.push({ id: notification.id, success: false, error: err.message })
    }
  }

  return { total: result.rows.length, processed }
}

export async function processQueuedEmails(limit = 25) {
  const result = await pool.query(
    `SELECT *
     FROM email_notifications
     WHERE status = 'queued'
       AND attempt_count < $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [MAX_RETRY_ATTEMPTS, limit]
  )

  const processed = []
  for (const notification of result.rows) {
    try {
      const delivery = await enqueueNotification(notification.template_key, notification.recipient_user_id, {
        recipient_email: notification.recipient_email,
        manuscript_id: notification.manuscript_id,
        ...(notification.data || {}),
      })
      processed.push({ id: notification.id, ...delivery })
    } catch (err) {
      console.error(`[EMAIL_WORKER] Queue processing failed for ${notification.id}:`, err.message)
      processed.push({ id: notification.id, success: false, error: err.message })
    }
  }

  return { total: result.rows.length, processed }
}

export async function runEmailWorkerOnce() {
  const queued = await processQueuedEmails(25)
  const failed = await processFailedEmails(25)
  return { queued, failed }
}

export function startEmailWorker({ pollIntervalMs = DEFAULT_POLL_INTERVAL_MS, enabled = true } = {}) {
  if (!enabled) {
    console.log('[EMAIL_WORKER] Disabled')
    return null
  }

  let running = false
  let stopFlag = false
  let timer = null

  const tick = async () => {
    if (running || stopFlag) return
    running = true
    try {
      const result = await runEmailWorkerOnce()
      if (result.queued.total + result.failed.total > 0) {
        console.log(`[EMAIL_WORKER] Processed ${result.queued.total} queued + ${result.failed.total} failed emails`)
      }
    } catch (err) {
      console.error('[EMAIL_WORKER] Tick error:', err.message)
    } finally {
      running = false
    }
  }

  timer = setInterval(tick, pollIntervalMs)
  tick()

  return {
    stop() {
      stopFlag = true
      if (timer) clearInterval(timer)
      console.log('[EMAIL_WORKER] Stopped')
    },
  }
}

export async function validateEmailTemplates() {
  const templates = await getNotificationTemplates()
  const issues = []

  for (const t of templates) {
    if (!t.subject) issues.push({ template_key: t.template_key, issue: 'Missing subject' })
    if (!t.body_html) issues.push({ template_key: t.template_key, issue: 'Missing HTML body' })
    if (!t.body_text) issues.push({ template_key: t.template_key, issue: 'Missing plain-text body' })
  }

  return { total_templates: templates.length, issues }
}

export async function startDraftReminderScheduler({ intervalMs = 6 * 60 * 60 * 1000, reminderAfterDays = 3, cooldownDays = 7, enabled = true } = {}) {
  if (!enabled) {
    console.log('[DRAFT_REMINDER] Disabled')
    return null
  }

  let timer = null
  let running = false

  const run = async () => {
    if (running) return
    running = true
    try {
      const result = await processDraftReminders({ reminderAfterDays, cooldownDays })
      if (result.total > 0) {
        console.log(`[DRAFT_REMINDER] Sent ${result.total} draft reminders`)
      }
    } catch (err) {
      console.error('[DRAFT_REMINDER] Run error:', err.message)
    } finally {
      running = false
    }
  }

  timer = setInterval(run, intervalMs)
  run()

  return {
    stop() {
      if (timer) clearInterval(timer)
      console.log('[DRAFT_REMINDER] Stopped')
    },
  }
}

export function startBackgroundJobs(options = {}) {
  const emailWorker = startEmailWorker(options.emailWorker)
  const draftScheduler = startDraftReminderScheduler(options.draftReminder)

  return {
    stop() {
      if (emailWorker) emailWorker.stop()
      if (draftScheduler) draftScheduler.stop()
      console.log('[BACKGROUND_JOBS] All background jobs stopped')
    },
  }
}