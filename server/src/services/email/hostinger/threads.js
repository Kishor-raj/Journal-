import { hostingerRequest } from './client.js'
import { env } from '../../../config/env.js'

export async function getThread(mailbox, threadId) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/threads/${encodeURIComponent(threadId)}`)
}

export async function listThreads(mailbox, { folder = 'INBOX', page = 1, limit = 25, query } = {}) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/threads`, {
    query: { folder, page, limit, q: query },
  })
}

export async function getThreadMessages(mailbox, threadId) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/threads/${encodeURIComponent(threadId)}/messages`)
}
