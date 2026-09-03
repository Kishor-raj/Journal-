import { Resend } from 'resend'
import { env } from '../../config/env.js'

let resendClient = null

function getClient() {
  if (!resendClient && env.RESEND_API_KEY) {
    resendClient = new Resend(env.RESEND_API_KEY)
  }
  return resendClient
}

export async function sendViaResend({ to, subject, html, text, replyTo }) {
  const client = getClient()

  if (!client) {
    return {
      success: false,
      provider: 'resend',
      error: 'Resend client not configured',
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
      console.error('[EMAIL] Resend provider error:', result.error)
      return {
        success: false,
        provider: 'resend',
        error: 'Email delivery failed',
      }
    }

    return {
      success: true,
      provider: 'resend',
      providerMessageId: result?.data?.id || null,
    }
  } catch (err) {
    console.error('[EMAIL] Resend exception:', err)
    return {
      success: false,
      provider: 'resend',
      error: 'Email delivery failed',
    }
  }
}

export function isConfigured() {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS)
}
