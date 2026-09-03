import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/modules/auth/password.js'

describe('Password hashing', () => {
  it('hashes a password', async () => {
    const hash = await hashPassword('super-secret-pass')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('super-secret-pass')
  })

  it('verifies correct password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('correct-password', hash)).toBe(true)
  })

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('correct-password')
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('rejects null/invalid hash', async () => {
    expect(await verifyPassword('password', null)).toBe(false)
    expect(await verifyPassword('password', undefined)).toBe(false)
    expect(await verifyPassword('password', '')).toBe(false)
  })

  it('produces different hashes for the same password', async () => {
    const h1 = await hashPassword('same-password')
    const h2 = await hashPassword('same-password')
    expect(h1).not.toBe(h2)
  })
})