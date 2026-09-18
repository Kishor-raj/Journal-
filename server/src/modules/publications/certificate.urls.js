import { env } from '../../config/env.js'

export function buildCertificateQrUrl(token) {
  const base = (env.CERTIFICATE_QR_ORIGIN || env.PUBLIC_APP_ORIGIN || 'https://www.ijidcr-asgard.in').replace(/\/+$/, '')
  const cleanToken = encodeURIComponent(String(token ?? ''))
  return new URL(`/verify/${cleanToken}`, `${base}/`).toString()
}
