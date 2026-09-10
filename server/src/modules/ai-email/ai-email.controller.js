import { verifyWebhookToken, storeWebhookEvent, markWebhookProcessed, markWebhookFailed, queueEmailForProcessing } from './ai-email.service.js'
import { validateWebhookPayload, validateEmailPayload, sanitizeSubject, sanitizePlainText } from '../../services/ai/security.js'
import { logAiEmailEvent } from '../../services/ai/audit.js'

export async function handleHostingerWebhook(req, res) {
  const rawBody = req.rawBody || JSON.stringify(req.body)

  if (!verifyWebhookToken(req.headers['authorization'])) {
    return res.status(401).json({ error: 'Invalid webhook token' })
  }

  const payloadValidation = validateWebhookPayload(req.body)
  if (!payloadValidation.valid) {
    console.log('[AI_EMAIL_WEBHOOK] Payload validation failed:', JSON.stringify(payloadValidation.errors, null, 2))
    console.log('[AI_EMAIL_WEBHOOK] Raw body received:', String(req.rawBody || JSON.stringify(req.body)).slice(0, 2000))
    return res.status(400).json({ error: 'Invalid payload', details: payloadValidation.errors })
  }

  const { event_id, event_type, data, message } = req.body || {}
  const emailData = data || message

  if (emailData) {
    const emailValidation = validateEmailPayload(emailData)
    if (!emailValidation.valid) {
      console.warn(`[AI_EMAIL_WEBHOOK] Invalid email data in event ${event_id}:`, emailValidation.errors)
    }
  }

  try {
    const stored = await storeWebhookEvent({
      eventId: event_id,
      eventType: event_type,
      payload: req.body,
    })

    await queueEmailForProcessing(stored.id, { event_type, event_id, email_data: emailData })

    await logAiEmailEvent({
      workflowName: 'ai_email',
      eventName: 'webhook_accepted',
      source: 'hostinger',
      status: 'success',
      payload: { event_id, event_type },
    })

    console.log(`[AI_EMAIL_WEBHOOK] Accepted event ${event_type} (${event_id})`)
    return res.status(200).json({ received: true, event_id })
  } catch (err) {
    console.error('[AI_EMAIL_WEBHOOK] Failed to store webhook event:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function processPendingWebhooks(limit = 10) {
  const { default: pool } = await import('../../config/db.js')

  const result = await pool.query(
    `SELECT id, event_id, event_type, payload
     FROM email_webhook_events
     WHERE status = 'pending'
     ORDER BY received_at ASC
     LIMIT $1`,
    [limit]
  )

  const processed = []
  for (const event of result.rows) {
    try {
      await queueEmailForProcessing(event.id, event.payload)
      await markWebhookProcessed(event.id)
      processed.push({ id: event.id, success: true })
    } catch (err) {
      await markWebhookFailed(event.id, err.message)
      processed.push({ id: event.id, success: false, error: err.message })
    }
  }

  return { total: result.rows.length, processed }
}
