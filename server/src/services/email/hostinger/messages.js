import { hostingerRequest } from './client.js'
import { env } from '../../../config/env.js'

export async function getMessage(mailbox, messageId) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/messages/${encodeURIComponent(messageId)}`)
}

export async function listMessages(mailbox, { folder = 'INBOX', page = 1, limit = 25, query, unread } = {}) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/messages`, {
    query: { folder, page, limit, q: query, unread },
  })
}

export async function searchMessages(mailbox, searchTerm, { folder = 'INBOX', limit = 25 } = {}) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/messages`, {
    query: { folder, q: searchTerm, limit },
  })
}

export async function sendMessage(mailbox, { to, cc, bcc, subject, text, html, inReplyTo, references, attachments }) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('POST', `/mailboxes/${encodeURIComponent(address)}/messages`, {
    body: { to, cc, bcc, subject, text, html, in_reply_to: inReplyTo, references, attachments },
  })
}

export async function replyToMessage(mailbox, messageId, { to, cc, bcc, subject, text, html, attachments }) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('POST', `/mailboxes/${encodeURIComponent(address)}/messages/${encodeURIComponent(messageId)}/reply`, {
    body: { to, cc, bcc, subject, text, html, attachments },
  })
}

export async function deleteMessage(mailbox, messageId) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('DELETE', `/mailboxes/${encodeURIComponent(address)}/messages/${encodeURIComponent(messageId)}`)
}

export async function markAsRead(mailbox, messageId) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('PATCH', `/mailboxes/${encodeURIComponent(address)}/messages/${encodeURIComponent(messageId)}`, {
    body: { is_read: true },
  })
}
