import { replyToMessage, sendMessage } from '../../services/email/hostinger/index.js'
import { env } from '../../config/env.js'
import { logAiEmailEvent } from '../../services/ai/audit.js'

export async function sendReplyViaHostinger({ replyId, threadId, toEmail, subject, body, providerThreadId, providerMessageId }) {
  const mailbox = env.HOSTINGER_MAILBOX

  try {
    let result

    if (providerThreadId || providerMessageId) {
      result = await replyToMessage(mailbox, providerMessageId || providerThreadId, {
        to: toEmail,
        subject,
        text: body,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px;">${escapeHtml(body).replace(/\n/g, '<br>')}</div>`,
      })
    } else {
      result = await sendMessage(mailbox, {
        to: toEmail,
        subject,
        text: body,
        html: `<div style="font-family: Arial, sans-serif; font-size: 14px;">${escapeHtml(body).replace(/\n/g, '<br>')}</div>`,
      })
    }

    const providerMessageIdResult = result?.id || result?.message_id || result?.data?.id || null

    await logAiEmailEvent({
      workflowName: 'ai_email',
      eventName: 'reply_sent',
      source: 'hostinger',
      status: 'success',
      payload: {
        reply_id: replyId,
        thread_id: threadId,
        provider_message_id: providerMessageIdResult,
        to: toEmail,
      },
    })

    return { success: true, providerMessageId: providerMessageIdResult }
  } catch (err) {
    await logAiEmailEvent({
      workflowName: 'ai_email',
      eventName: 'reply_send_failed',
      source: 'hostinger',
      status: 'failed',
      payload: {
        reply_id: replyId,
        thread_id: threadId,
        error: err.message,
        to: toEmail,
      },
    })

    const isRetryable = err?.statusCode === 429 || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT'
    return { success: false, error: err.message, isRetryable }
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
