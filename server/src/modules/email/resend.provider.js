import { Resend } from 'resend'
import { env } from '../../config/env.js'
import { isPermanentEmailError } from '../notification/notification.events.js'

let resendClient = null

function getClient() {
  if (!resendClient && env.RESEND_API_KEY) {
    resendClient = new Resend(env.RESEND_API_KEY)
  }
  return resendClient
}

function normalizeProviderError(err, providerResultError) {
  const errObj = err?.response?.data?.message || providerResultError?.message || err?.message || providerResultError?.name || ''

  let errorMessage = 'Email delivery failed'
  let isPermanent = false

  if (err?.code && ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH'].includes(err.code)) {
    errorMessage = 'Email provider temporarily unavailable'
    isPermanent = false
  } else if (err?.code && ['ERR_INVALID_ARG_TYPE', 'ERR_INVALID_URL'].includes(err.code)) {
    errorMessage = 'Email payload invalid'
    isPermanent = true
  } else if (providerResultError?.statusCode === 429 || err?.statusCode === 429) {
    errorMessage = 'Email provider rate limit exceeded'
    isPermanent = false
  } else if (providerResultError?.statusCode === 422 || err?.statusCode === 422) {
    errorMessage = 'Email recipient or sender rejected'
    isPermanent = true
  } else if (providerResultError?.statusCode === 401 || err?.statusCode === 401) {
    errorMessage = 'Email provider authentication failed'
    isPermanent = true
  } else if (String(errObj).length > 5) {
    const safeErr = String(errObj).slice(0, 500)
    errorMessage = safeErr
    isPermanent = isPermanentEmailError(safeErr)
  }

  return { errorMessage, isPermanent }
}

export async function sendViaResend({ to, subject, html, text, replyTo }) {
  const client = getClient()

  if (!client) {
    return {
      success: false,
      provider: 'resend',
      error: 'Resend client not configured',
      isPermanent: true,
    }
  }

  try {
    const result = await client.emails.send({
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || undefined,
      text: text || undefined,
      ...(replyTo ? { reply_to: replyTo } : {}),
    })

    if (result?.error) {
      const { errorMessage, isPermanent } = normalizeProviderError(result.error, result.error)
      console.error(`[EMAIL] Resend provider error${isPermanent ? ' (permanent)' : ' (transient)'}:`, errorMessage)
      return {
        success: false,
        provider: 'resend',
        error: errorMessage,
        isPermanent,
      }
    }

    return {
      success: true,
      provider: 'resend',
      providerMessageId: result?.data?.id || null,
    }
  } catch (err) {
    const { errorMessage, isPermanent } = normalizeProviderError(err)
    console.error(`[EMAIL] Resend exception${isPermanent ? ' (permanent)' : ' (transient)'}:`, errorMessage)
    return {
      success: false,
      provider: 'resend',
      error: errorMessage,
      isPermanent,
    }
  }
}

export function isConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS)
}
