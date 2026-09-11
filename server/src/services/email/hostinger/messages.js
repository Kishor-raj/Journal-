import { hostingerRequest, resolveMailboxResourceId } from './client.js'
import { env } from '../../../config/env.js'

export async function sendMessage(mailbox, { to, cc, bcc, subject, text, html, inReplyTo, displayName, attachments }) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  const resourceId = await resolveMailboxResourceId(address)

  const toList = Array.isArray(to) ? to : (to ? [to] : [])
  const ccList = Array.isArray(cc) ? cc : (cc ? [cc] : undefined)
  const bccList = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : undefined)

  const body = {
    to: toList,
    subject: subject || '(No Subject)',
    text: text || '',
    html: html || undefined,
  }

  if (displayName || env.EMAIL_FROM_NAME) {
    body.displayName = displayName || env.EMAIL_FROM_NAME
  }
  if (ccList && ccList.length > 0) body.cc = ccList
  if (bccList && bccList.length > 0) body.bcc = bccList
  if (attachments && Array.isArray(attachments) && attachments.length > 0) body.attachments = attachments

  if (inReplyTo && typeof inReplyTo === 'object' && Number.isInteger(Number(inReplyTo.uid))) {
    body.inReplyTo = {
      uid: Number(inReplyTo.uid),
      folder: inReplyTo.folder || 'INBOX',
    }
  }

  return hostingerRequest('POST', `/api/v1/mailboxes/${encodeURIComponent(resourceId)}/send`, {
    body,
  })
}

export async function replyToMessage(mailbox, messageId, options = {}) {
  const opts = { ...options }
  if (messageId && Number.isInteger(Number(messageId))) {
    opts.inReplyTo = { uid: Number(messageId), folder: options.folder || 'INBOX' }
  } else if (typeof messageId === 'object' && messageId?.uid) {
    opts.inReplyTo = { uid: Number(messageId.uid), folder: messageId.folder || options.folder || 'INBOX' }
  }
  return sendMessage(mailbox, opts)
}

export async function getMessage(mailbox, messageId) {
  const resourceId = await resolveMailboxResourceId(mailbox || env.HOSTINGER_MAILBOX)
  return hostingerRequest('GET', `/api/v1/mailboxes/${encodeURIComponent(resourceId)}/folders/INBOX/messages/${encodeURIComponent(messageId)}`)
}

export async function listMessages(mailbox, { folder = 'INBOX', page = 1, limit = 25 } = {}) {
  const resourceId = await resolveMailboxResourceId(mailbox || env.HOSTINGER_MAILBOX)
  return hostingerRequest('GET', `/api/v1/mailboxes/${encodeURIComponent(resourceId)}/folders/${encodeURIComponent(folder)}/messages`, {
    query: { page, perPage: limit },
  })
}

export async function searchMessages(mailbox, searchTerm, { folder = 'INBOX', limit = 25 } = {}) {
  const resourceId = await resolveMailboxResourceId(mailbox || env.HOSTINGER_MAILBOX)
  return hostingerRequest('POST', `/api/v1/mailboxes/${encodeURIComponent(resourceId)}/folders/${encodeURIComponent(folder)}/messages/search`, {
    body: { text: searchTerm },
    query: { perPage: limit },
  })
}

export async function deleteMessage(mailbox, messageId) {
  const resourceId = await resolveMailboxResourceId(mailbox || env.HOSTINGER_MAILBOX)
  return hostingerRequest('POST', `/api/v1/mailboxes/${encodeURIComponent(resourceId)}/folders/INBOX/messages/delete`, {
    body: { uids: [Number(messageId)] },
  })
}

export async function markAsRead(mailbox, messageId) {
  const resourceId = await resolveMailboxResourceId(mailbox || env.HOSTINGER_MAILBOX)
  return hostingerRequest('POST', `/api/v1/mailboxes/${encodeURIComponent(resourceId)}/folders/INBOX/messages/flags`, {
    body: { uids: [Number(messageId)], addFlags: ['\\Seen'] },
  })
}
