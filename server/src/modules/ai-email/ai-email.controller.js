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
    console.warn('[AI_EMAIL_WEBHOOK] Payload validation failed:', payloadValidation.errors.join('; '))
    return res.status(400).json({ error: 'Invalid payload', details: payloadValidation.errors })
  }

  const body = req.body || {}
  const event_id = body.event_id || body.id
  const event_type = body.event_type || body.event
  const emailData = body.data || body.message

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
  const { processOneEvent } = await import('./ai-email-worker.js')
  const processed = []
  for (let i = 0; i < limit; i++) {
    const res = await processOneEvent()
    if (!res) break
    processed.push(res)
  }
  return { total: processed.length, processed }
}
