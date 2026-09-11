import pool from '../../config/db.js'
import { env } from '../../config/env.js'
import { classifyEmail, generateReply, isConfigured as isGeminiConfigured } from '../../services/gemini/index.js'
import { retrieveRelevantKnowledge, formatKnowledgeForPrompt } from '../../services/ai/knowledge.js'
import { evaluateSafety, logSafetyDecision } from '../../services/ai/safety.js'
import { evaluateAutoReply } from '../../services/ai/autoReplyRules.js'
import { executeToolCall, logToolCall, BACKEND_TOOLS } from '../../services/ai/tools.js'
import { logAiEmailEvent } from '../../services/ai/audit.js'
import { sendReplyViaHostinger } from './ai-email-sender.service.js'
import { markReplySent, markReplyFailed } from './ai-email-approval.service.js'

const MAX_RETRY_ATTEMPTS = 3
const RETRY_BACKOFF = [0, 30_000, 120_000]
const AUTO_SEND_CATEGORIES = ['SUBMISSION_GUIDELINES', 'JOURNAL_INFORMATION', 'GENERAL_QUESTION', 'MANUSCRIPT_STATUS', 'REVISION_STATUS', 'REVIEW_STATUS']

export async function fetchAndStoreEmail(event) {
  const payload = event.payload
  const data = payload?.data || payload
  if (!data || typeof data !== 'object') {
    throw new Error('No message data in webhook payload')
  }
  const messageId = data?.message_id || data?.messageId || data?.id
  const threadId = data?.thread_id
  const mailbox = data?.mailbox || data?.mailboxAddress || process.env.HOSTINGER_MAILBOX

  if (!messageId) throw new Error('No message_id in webhook payload')

  const existingEmail = await pool.query(`SELECT id FROM emails WHERE provider_message_id = $1`, [messageId])
  if (existingEmail.rows.length > 0) return { emailId: existingEmail.rows[0].id, duplicate: true }

  let threadRecord = null
  if (threadId) {
    const existingThread = await pool.query(
      `SELECT id FROM email_threads WHERE provider_thread_id = $1 AND provider = 'hostinger'`,
      [threadId]
    )
    if (existingThread.rows.length > 0) {
      threadRecord = existingThread.rows[0]
    } else {
      const newThread = await pool.query(
        `INSERT INTO email_threads (provider, provider_thread_id, mailbox, subject, from_email, last_message_at)
         VALUES ('hostinger', $1, $2, $3, $4, now()) RETURNING id`,
        [threadId, mailbox, data?.subject || null, data?.from || null]
      )
      threadRecord = newThread.rows[0]
    }
  } else {
    const newThread = await pool.query(
      `INSERT INTO email_threads (provider, mailbox, subject, from_email, last_message_at)
       VALUES ('hostinger', $1, $2, $3, now()) RETURNING id`,
      [mailbox, data?.subject || null, data?.from || null]
    )
    threadRecord = newThread.rows[0]
  }

  const toArray = Array.isArray(data?.to) ? data.to.join(', ') : (data?.to || mailbox)
  const ccArray = Array.isArray(data?.cc) ? (data.cc.length > 0 ? data.cc.join(', ') : null) : (data?.cc || null)
  const bodyText = data?.text || data?.body_text || data?.plainBody || null
  const bodyHtml = data?.html || data?.body_html || data?.htmlBody || null

  let emailResult
  try {
    emailResult = await pool.query(
      `INSERT INTO emails (thread_id, provider_message_id, message_id, in_reply_to, from_email, to_email, cc_email, subject, body_text, body_html, received_at, direction, raw_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'inbound', $12)
       ON CONFLICT (provider_message_id) WHERE provider_message_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        threadRecord.id, messageId, data?.message_id || data?.messageId || messageId, data?.in_reply_to || null,
        data?.from || 'unknown@unknown.com', toArray, ccArray,
        data?.subject || null, bodyText,
        bodyHtml, data?.date || data?.received_at || new Date().toISOString(),
        JSON.stringify(data),
      ]
    )
  } catch (insertErr) {
    if (insertErr.code === '23505') {
      const existing = await pool.query(`SELECT id FROM emails WHERE provider_message_id = $1`, [messageId])
      if (existing.rows.length > 0) {
        return { emailId: existing.rows[0].id, duplicate: true }
      }
    }
    throw insertErr
  }

  if (emailResult.rows.length === 0) {
    const existing = await pool.query(`SELECT id FROM emails WHERE provider_message_id = $1`, [messageId])
    return { emailId: existing.rows[0].id, duplicate: true }
  }

  await pool.query(
    `UPDATE email_threads SET last_message_at = GREATEST(last_message_at, $1), subject = COALESCE(subject, $2) WHERE id = $3`,
    [data?.date || new Date(), data?.subject || null, threadRecord.id]
  )

  return { emailId: emailResult.rows[0].id, threadId: threadRecord.id, duplicate: false }
}

export async function runClassification(emailId) {
  if (!isGeminiConfigured()) return { skipped: true, reason: 'gemini_not_configured' }

  const emailResult = await pool.query(`SELECT * FROM emails WHERE id = $1`, [emailId])
  if (emailResult.rows.length === 0) throw new Error(`Email ${emailId} not found`)
  const email = emailResult.rows[0]

  const existing = await pool.query(
    `SELECT id FROM ai_email_processing WHERE email_id = $1 AND status = 'completed'`,
    [emailId]
  )
  if (existing.rows.length > 0) return { skipped: true, reason: 'already_classified' }

  await pool.query(
    `INSERT INTO ai_email_processing (email_id, status, started_at) VALUES ($1, 'processing', now()) ON CONFLICT DO NOTHING`,
    [emailId]
  )

  try {
    let knowledgeContext = null
    try {
      const chunks = await retrieveRelevantKnowledge({ classification: null, extractedData: null })
      knowledgeContext = formatKnowledgeForPrompt(chunks)
    } catch { /* knowledge retrieval is optional */ }

    const result = await classifyEmail({
      fromEmail: email.from_email,
      subject: email.subject,
      bodyText: email.body_text,
      mailbox: email.to_email,
      knowledgeContext,
    })

    await pool.query(
      `UPDATE ai_email_processing
       SET classification = $1, intent = $2, confidence = $3, extracted_data = $4,
           status = 'completed', model_name = $5, prompt_version = $6, completed_at = now()
       WHERE email_id = $7 AND status = 'processing'`,
      [result.classification, result.intent, result.confidence,
       JSON.stringify(result.extracted_data || {}), result.model, result.promptVersion, emailId]
    )

    return {
      classification: result.classification,
      intent: result.intent,
      confidence: result.confidence,
      extractedData: result.extracted_data,
      sensitiveTopic: result.sensitive_topic,
      requiresHumanApproval: result.requires_human_approval,
    }
  } catch (err) {
    await pool.query(
      `UPDATE ai_email_processing SET status = 'failed', error_message = $1, completed_at = now() WHERE email_id = $2 AND status = 'processing'`,
      [err.message, emailId]
    )
    throw err
  }
}

export async function runToolCalls(emailId, classification, extractedData) {
  if (!extractedData?.submission_number) return []

  const toolsToCall = []
  if (['MANUSCRIPT_STATUS', 'REVISION_STATUS', 'REVIEW_STATUS', 'EDITORIAL_DECISION_QUERY'].includes(classification)) {
    toolsToCall.push({ name: 'get_manuscript_status', args: { submission_number: extractedData.submission_number } })
  }
  if (classification === 'REVISION_STATUS') {
    toolsToCall.push({ name: 'get_revision_status', args: { submission_number: extractedData.submission_number } })
  }
  if (classification === 'REVIEW_STATUS') {
    toolsToCall.push({ name: 'get_review_status', args: { submission_number: extractedData.submission_number } })
  }

  const results = []
  for (const tool of toolsToCall) {
    try {
      const result = await executeToolCall(tool.name, tool.args)
      await logToolCall({ emailId, toolName: tool.name, args: tool.args, result })
      results.push({ tool: tool.name, result })
    } catch (err) {
      await logToolCall({ emailId, toolName: tool.name, args: tool.args, error: err })
    }
  }
  return results
}

export async function runReplyGeneration(emailId, threadId, classification, intent, opts = {}) {
  if (!isGeminiConfigured()) {
    console.warn(`[AI_EMAIL_WORKER] Reply generation skipped for email ${emailId}: gemini not configured`)
    return { skipped: true, reason: 'gemini_not_configured' }
  }

  const skipClassifications = ['SPAM', 'OTHER']
  if (skipClassifications.includes(classification)) {
    console.warn(`[AI_EMAIL_WORKER] Reply generation skipped for email ${emailId}: ${classification}`)
    return { skipped: true, reason: `skipped_${classification}` }
  }

  const existing = await pool.query(
    `SELECT id FROM ai_email_replies WHERE email_id = $1 AND status NOT IN ('failed', 'rejected')`,
    [emailId]
  )
  if (existing.rows.length > 0) return { skipped: true, reason: 'reply_already_exists' }

  const emailResult = await pool.query(`SELECT * FROM emails WHERE id = $1`, [emailId])
  if (emailResult.rows.length === 0) throw new Error(`Email ${emailId} not found`)
  const email = emailResult.rows[0]

  const historyResult = await pool.query(
    `SELECT from_email, body_text, direction FROM emails WHERE thread_id = $1 AND id != $2 ORDER BY received_at ASC`,
    [threadId, emailId]
  )

  let knowledgeContext = null
  try {
    const chunks = await retrieveRelevantKnowledge({ classification, extractedData: opts.extractedData })
    knowledgeContext = formatKnowledgeForPrompt(chunks)
  } catch { /* optional */ }

  try {
    const result = await generateReply({
      fromEmail: email.from_email,
      subject: email.subject,
      bodyText: email.body_text,
      classification,
      intent,
      mailbox: email.to_email,
      threadHistory: historyResult.rows.map((r) => ({ from: r.from_email, body: r.body_text, direction: r.direction })),
      knowledgeContext,
      toolResults: opts.toolResults || [],
      sensitiveTopic: opts.sensitiveTopic,
      requiresHumanApproval: opts.requiresHumanApproval,
    })

    const autoReplyDecision = evaluateAutoReply({
      classification,
      confidence: result.confidence,
      sensitiveTopic: opts.sensitiveTopic,
      requiresHumanApproval: opts.requiresHumanApproval,
      extractedData: opts.extractedData,
    })

    const approvalRequired = !autoReplyDecision.autoReplyAllowed || result.approvalRequired

    const insertResult = await pool.query(
      `INSERT INTO ai_email_replies (email_id, thread_id, draft_body, decision, confidence, approval_required, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft') RETURNING id`,
      [emailId, threadId, result.body, classification, result.confidence, approvalRequired]
    )

    return {
      replyId: insertResult.rows[0].id,
      draftBody: result.body,
      subject: result.subject,
      approvalRequired,
      confidence: result.confidence,
      reasoning: result.reasoning,
      autoReplyDecision,
    }
  } catch (err) {
    console.error(`[AI_EMAIL_WORKER] Reply generation failed for email ${emailId}:`, err.message)
    return { skipped: true, reason: 'generation_failed', error: err.message }
  }
}

export async function processOneEvent() {
  const result = await pool.query(
    `SELECT id, event_id, event_type, payload FROM email_webhook_events
     WHERE status = 'pending' ORDER BY received_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
  )
  if (result.rows.length === 0) return null
  const event = result.rows[0]

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`UPDATE email_webhook_events SET status = 'processing' WHERE id = $1`, [event.id])

    await logAiEmailEvent({ workflowName: 'ai_email', eventName: 'webhook_received', status: 'success', payload: { event_id: event.event_id } })

    const { emailId, threadId, duplicate } = await fetchAndStoreEmail(event)
    if (duplicate) {
      await client.query(`UPDATE email_webhook_events SET status = 'processed', processed_at = now() WHERE id = $1`, [event.id])
      await client.query('COMMIT')
      return { eventId: event.id, status: 'duplicate', emailId }
    }

    await logAiEmailEvent({ workflowName: 'ai_email', eventName: 'email_stored', status: 'success', payload: { email_id: emailId } })

    const classification = await runClassification(emailId)
    if (classification.skipped) {
      console.warn(`[AI_EMAIL_WORKER] Classification skipped for email ${emailId}: ${classification.reason}`)
      await client.query(`UPDATE email_webhook_events SET status = 'processed', processed_at = now() WHERE id = $1`, [event.id])
      await client.query('COMMIT')
      return { eventId: event.id, status: 'processed', emailId, classification }
    }

    await logAiEmailEvent({ workflowName: 'ai_email', eventName: 'classification_complete', status: 'success',
      payload: { email_id: emailId, classification: classification.classification, confidence: classification.confidence } })
    console.log(`[AI_EMAIL_WORKER] Email ${emailId} classified as ${classification.classification} (confidence ${classification.confidence})`)

    const toolResults = await runToolCalls(emailId, classification.classification, classification.extractedData)

    const safetyResult = evaluateSafety({
      classification: classification.classification,
      confidence: classification.confidence,
      bodyText: (await pool.query(`SELECT body_text FROM emails WHERE id = $1`, [emailId])).rows[0]?.body_text,
      extractedData: classification.extractedData,
    })
    await logSafetyDecision({ emailId, classification: classification.classification, result: safetyResult })

    if (!safetyResult.isSafe) {
      await client.query(`UPDATE email_webhook_events SET status = 'processed', processed_at = now() WHERE id = $1`, [event.id])
      await client.query('COMMIT')
      return { eventId: event.id, status: 'escalated', emailId, classification, safety: safetyResult }
    }

    const replyResult = await runReplyGeneration(emailId, threadId, classification.classification, classification.intent, {
      extractedData: classification.extractedData,
      toolResults,
      sensitiveTopic: classification.sensitiveTopic,
      requiresHumanApproval: classification.requiresHumanApproval,
    })

    if (!replyResult.skipped && !replyResult.approvalRequired && AUTO_SEND_CATEGORIES.includes(classification.classification)) {
      if (!env.AI_AUTO_REPLY_ENABLED) {
        console.warn(`[AI_EMAIL_WORKER] Auto-reply skipped for email ${emailId}: AI_AUTO_REPLY_ENABLED is false`)
      } else {
        const emailRow = await pool.query(`SELECT from_email, to_email, subject, provider_message_id FROM emails WHERE id = $1`, [emailId])
        const threadRow = await pool.query(`SELECT provider_thread_id FROM email_threads WHERE id = $1`, [threadId])
        const emailData = emailRow.rows[0]
        const threadData = threadRow.rows[0]

        if (emailData) {
          const sendResult = await sendReplyViaHostinger({
            replyId: replyResult.replyId,
            threadId,
            toEmail: emailData.from_email,
            subject: replyResult.subject || `Re: ${emailData.subject}`,
            body: replyResult.draftBody,
            providerMessageId: emailData.provider_message_id,
            providerThreadId: threadData?.provider_thread_id,
            mailbox: emailData.to_email || undefined,
          })

          if (sendResult.success) {
            await markReplySent(replyResult.replyId, sendResult.providerMessageId)
            await logAiEmailEvent({ workflowName: 'ai_email', eventName: 'auto_reply_sent', status: 'success',
              payload: { reply_id: replyResult.replyId, email_id: emailId } })
            console.log(`[AI_EMAIL_WORKER] Auto-reply sent for email ${emailId} -> ${emailData.from_email}`)
          } else {
            await markReplyFailed(replyResult.replyId, sendResult.error)
            console.error(`[AI_EMAIL_WORKER] Auto-reply send failed for email ${emailId}: ${sendResult.error}`)
          }
        }
      }
    } else if (replyResult.skipped) {
      console.warn(`[AI_EMAIL_WORKER] No reply for email ${emailId}: ${replyResult.reason}`)
    } else {
      console.warn(`[AI_EMAIL_WORKER] Reply for email ${emailId} requires human approval (${replyResult.reason || 'approval_required'})`)
    }

    await client.query(`UPDATE email_webhook_events SET status = 'processed', processed_at = now() WHERE id = $1`, [event.id])
    await client.query('COMMIT')

    return {
      eventId: event.id, status: 'processed', emailId, threadId,
      classification: { classification: classification.classification, confidence: classification.confidence },
      reply: replyResult.skipped ? null : { replyId: replyResult.replyId, approvalRequired: replyResult.approvalRequired },
    }
  } catch (err) {
    console.error(`[AI_EMAIL_WORKER] Processing error for event ${event.event_id} (attempt):`, err.message)
    try {
      const p = event.payload
      const d = (typeof p?.data === 'object' && p.data !== null) ? p.data : p
      const shape = { payloadKeys: Object.keys(p || {}), dataKeys: typeof d === 'object' && d !== null ? Object.keys(d) : [] }
      console.log(`[AI_EMAIL_WORKER] Payload shape: ${JSON.stringify(shape)}`)
    } catch { /* ignore */ }
    await client.query('ROLLBACK')
    await logAiEmailEvent({ workflowName: 'ai_email', eventName: 'processing_error', status: 'failed', payload: { error: err.message } })

    const retryResult = await pool.query(
      `SELECT payload->>'retry_count' AS retry_count FROM email_webhook_events WHERE id = $1`, [event.id]
    )
    const retryCount = parseInt(retryResult.rows[0]?.retry_count || '0', 10) + 1

    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      await pool.query(`UPDATE email_webhook_events SET status = 'failed', error_message = $1, updated_at = now() WHERE id = $2`, [err.message, event.id])
    } else {
      await pool.query(
        `UPDATE email_webhook_events SET status = 'pending', error_message = $1, updated_at = now(),
         payload = jsonb_set(COALESCE(payload, '{}'), '{retry_count}', $2::jsonb) WHERE id = $3`,
        [`${err.message} (attempt ${retryCount})`, JSON.stringify(retryCount), event.id]
      )
    }
    return { eventId: event.id, status: 'error', error: err.message, retryCount }
  } finally {
    client.release()
  }
}

export async function runAiEmailWorkerOnce() {
  let processed = 0, errors = 0
  for (let i = 0; i < 5; i++) {
    const result = await processOneEvent()
    if (!result) break
    if (result.status === 'error') errors++
    else processed++
  }
  return { processed, errors }
}

export function startAiEmailWorker({ pollIntervalMs = 20_000, enabled = true } = {}) {
  if (!enabled) { console.log('[AI_EMAIL_WORKER] Disabled'); return null }
  let running = false, stopFlag = false, timer = null

  const recoverFailedEvents = async () => {
    try {
      const recovered = await pool.query(
        `UPDATE email_webhook_events
         SET status = 'pending', error_message = NULL,
             payload = jsonb_set(COALESCE(payload, '{}'), '{retry_count}', '0'::jsonb)
         WHERE status = 'failed' AND (
            error_message LIKE '%ON CONFLICT%' OR
            error_message LIKE '%unique%' OR
            error_message LIKE '%gemini-2.0-flash%' OR
            error_message LIKE '%404%' OR
            error_message LIKE '%no longer available%' OR
            error_message LIKE '%parse%' OR
            error_message LIKE '%sensitive_topic%' OR
            error_message LIKE '%503%' OR
            error_message LIKE '%UNAVAILABLE%' OR
            error_message LIKE '%high demand%'
          )
         RETURNING id, event_id`
      )
      if (recovered.rows.length > 0) {
        console.log(`[AI_EMAIL_WORKER] Recovered ${recovered.rows.length} failed event(s) for reprocessing:`, recovered.rows.map(r => r.event_id).join(', '))
      }

      // Also recover events that were falsely marked as 'processed' by legacy worker without storing an email
      const falselyProcessed = await pool.query(
        `UPDATE email_webhook_events
         SET status = 'pending', processed_at = NULL, error_message = NULL,
             payload = jsonb_set(COALESCE(payload, '{}'), '{retry_count}', '0'::jsonb)
         WHERE status = 'processed'
           AND NOT EXISTS (
             SELECT 1 FROM emails
             WHERE provider_message_id = COALESCE(
               payload->'data'->>'messageId',
               payload->'data'->>'message_id',
               payload->>'messageId',
               payload->>'message_id'
             )
           )
         RETURNING id, event_id`
      )
      if (falselyProcessed.rows.length > 0) {
        console.log(`[AI_EMAIL_WORKER] Recovered ${falselyProcessed.rows.length} event(s) falsely marked processed by legacy worker:`, falselyProcessed.rows.map(r => r.event_id).join(', '))
      }
    } catch (err) {
      console.error('[AI_EMAIL_WORKER] Failed to recover events:', err.message)
    }
  }

  const tick = async () => {
    if (running || stopFlag) return
    running = true
    try {
      const result = await runAiEmailWorkerOnce()
      if (result.processed + result.errors > 0) console.log(`[AI_EMAIL_WORKER] Processed: ${result.processed}, Errors: ${result.errors}`)
    } catch (err) { console.error('[AI_EMAIL_WORKER] Tick error:', err.message) }
    finally { running = false }
  }

  recoverFailedEvents().finally(() => {
    timer = setInterval(tick, pollIntervalMs)
    tick()
  })

  return { stop() { stopFlag = true; if (timer) clearInterval(timer); console.log('[AI_EMAIL_WORKER] Stopped') } }
}
