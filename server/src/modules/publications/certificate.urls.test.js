import { describe, it, expect } from 'vitest'
import { buildCertificateQrUrl } from './certificate.urls.js'

describe('buildCertificateQrUrl', () => {
  it('builds a certificate verification URL with the token path', () => {
    expect(buildCertificateQrUrl('certificate-token')).toContain('/verify/certificate-token')
  })
})
