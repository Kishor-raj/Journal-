import { env } from '../../config/env.js'
import { sendViaResend } from './resend.provider.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class EmailValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'EmailValidationError'
    this.isOperational = true
    this.statusCode = 400
  }
}

export async function sendEmail({ to, subject, html, text, replyTo, metadata }) {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new EmailValidationError('Missing recipient')
  }

  const recipients = Array.isArray(to) ? to : [to]
  for (const recipient of recipients) {
    if (!recipient || !EMAIL_REGEX.test(recipient)) {
      throw new EmailValidationError('Invalid email format')
    }
  }

  if (!subject || !String(subject).trim()) {
    throw new EmailValidationError('Missing subject')
  }

  if (!html && !text) {
    throw new EmailValidationError('Email must have a body')
  }

  if (!env.EMAIL_ENABLED) {
    return {
      success: true,
      skipped: true,
      reason: 'email_disabled',
      provider: null,
    }
  }

  const result = await sendViaResend({
    to: recipients,
    subject: String(subject).trim(),
    html,
    text,
    replyTo: replyTo || env.EMAIL_REPLY_TO || undefined,
  })

  return {
    ...result,
    metadata,
  }
}

export function emailHealth() {
  return {
    provider: env.EMAIL_PROVIDER,
    enabled: env.EMAIL_ENABLED,
    configured: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS),
  }
}
