import { hostingerRequest } from './client.js'
import { env } from '../../../config/env.js'

export async function getMailboxInfo(mailbox) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  if (!address) throw new Error('No mailbox address configured')
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}`)
}

export async function listMailboxes() {
  return hostingerRequest('GET', '/mailboxes')
}

export async function getMailboxStats(mailbox) {
  const address = mailbox || env.HOSTINGER_MAILBOX
  if (!address) throw new Error('No mailbox address configured')
  return hostingerRequest('GET', `/mailboxes/${encodeURIComponent(address)}/stats`)
}
