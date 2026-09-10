import crypto from 'crypto'
import pool from '../../config/db.js'
import { env } from '../../config/env.js'

export function verifyWebhookToken(authorizationHeader) {
  const secret = env.HOSTINGER_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[AI_EMAIL_WEBHOOK] No HOSTINGER_WEBHOOK_SECRET configured — skipping token verification')
    return true
  }

  const provided = typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length).trim()
    : ''

  if (!provided || !secret) return false

  try {
    const a = Buffer.from(provided)
    const b = Buffer.from(secret)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function storeWebhookEvent({ eventId, eventType, payload }) {
  const result = await pool.query(
    `INSERT INTO email_webhook_events (event_id, event_type, payload, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (event_id) DO UPDATE
       SET updated_at = now()
     RETURNING id, event_id, status`,
    [eventId, eventType, JSON.stringify(payload)]
  )
  return result.rows[0]
}

export async function markWebhookProcessed(id) {
  await pool.query(
    `UPDATE email_webhook_events SET status = 'processed', processed_at = now() WHERE id = $1`,
    [id]
  )
}

export async function markWebhookFailed(id, errorMessage) {
  await pool.query(
    `UPDATE email_webhook_events SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2`,
    [errorMessage, id]
  )
}

export async function queueEmailForProcessing(webhookEventId, payload) {
  await pool.query(
    `INSERT INTO workflow_logs (workflow_name, event_name, source, status, payload)
     VALUES ('ai_email', 'webhook_received', 'hostinger', 'pending', $1)`,
    [JSON.stringify({ webhook_event_id: webhookEventId, ...payload })]
  )
}
