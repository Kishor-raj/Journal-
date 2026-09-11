import { replyToMessage, sendMessage } from '../../services/email/hostinger/index.js'
import { env } from '../../config/env.js'
import { logAiEmailEvent } from '../../services/ai/audit.js'

export async function sendReplyViaHostinger({ replyId, threadId, toEmail, subject, body, providerThreadId, providerMessageId, mailbox }) {
  const targetMailbox = mailbox || env.HOSTINGER_MAILBOX

  try {
    const toList = Array.isArray(toEmail) ? toEmail : [toEmail]
    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${escapeHtml(body).replace(/\n/g, '<br>')}</div>`

    const sendOptions = {
      to: toList,
      subject,
      text: body,
      html: htmlBody,
      displayName: env.EMAIL_FROM_NAME || 'IJIDCR Editorial Office',
    }

    if (providerMessageId && Number.isInteger(Number(providerMessageId))) {
      sendOptions.inReplyTo = { uid: Number(providerMessageId), folder: 'INBOX' }
    }

    const result = await sendMessage(targetMailbox, sendOptions)

    const providerMessageIdResult = result?.id || result?.message_id || result?.data?.id || `sent-${Date.now()}`

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
