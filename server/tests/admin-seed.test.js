import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedAdminUser, seed } from '../src/db/seed.js'

describe('Admin Seed Security and Idempotency', () => {
  let mockClient
  let queryLog

  beforeEach(() => {
    vi.clearAllMocks()
    queryLog = []
    mockClient = {
      query: vi.fn().mockImplementation((sql, params) => {
        queryLog.push({ sql, params })

        // Mock roles query
        if (typeof sql === 'string' && sql.includes('FROM roles WHERE name = \'admin\'')) {
          return Promise.resolve({ rows: [{ id: 'role-admin-123' }] })
        }

        // Mock users lookup
        if (typeof sql === 'string' && sql.includes('SELECT id FROM users WHERE email = $1')) {
          // If params match existing, return existing user
          if (params && params[0] === 'existing-admin@ijidcr-asgard.in') {
            return Promise.resolve({ rows: [{ id: 'user-admin-exist' }] })
          }
          return Promise.resolve({ rows: [] })
        }

        // Mock users insert
        if (typeof sql === 'string' && sql.includes('INSERT INTO users')) {
          return Promise.resolve({ rows: [{ id: 'user-admin-new' }] })
        }

        // Mock credential check
        if (typeof sql === 'string' && sql.includes('FROM user_password_credentials WHERE user_id = $1')) {
          if (params && params[0] === 'user-admin-exist') {
            return Promise.resolve({ rows: [{ user_id: 'user-admin-exist' }] })
          }
          return Promise.resolve({ rows: [] })
        }

        // Default empty query result
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }
  })

  it('fails safely if ADMIN_SEED_EMAIL is missing', async () => {
    await expect(
      seedAdminUser(mockClient, { adminEmail: '', adminPassword: 'SomePassword123!' })
    ).rejects.toThrow('ADMIN_SEED_EMAIL is required')
  })

  it('fails safely if ADMIN_SEED_PASSWORD is missing', async () => {
    await expect(
      seedAdminUser(mockClient, { adminEmail: 'ceo@ijidcr-asgard.in', adminPassword: '' })
    ).rejects.toThrow('ADMIN_SEED_PASSWORD is required')
  })

  it('creates new admin user with only admin role and sets initial password hash', async () => {
    await seedAdminUser(mockClient, {
      adminEmail: 'ceo@ijidcr-asgard.in',
      adminPassword: 'SuperSecretAdminPassword123!',
    })

    // Check user insertion
    const userInsert = queryLog.find(q => typeof q.sql === 'string' && q.sql.includes('INSERT INTO users'))
    expect(userInsert).toBeDefined()
    expect(userInsert.params[0]).toBe('role-admin-123')
    expect(userInsert.params[1]).toBe('ceo@ijidcr-asgard.in')

    // Check role assignment: only 'admin' role, not multi-role
    const roleInsert = queryLog.find(q => typeof q.sql === 'string' && q.sql.includes('INSERT INTO user_roles'))
    expect(roleInsert).toBeDefined()
    expect(roleInsert.params).toEqual(['user-admin-new', 'role-admin-123'])

    // Check credential insertion
    const credInsert = queryLog.find(q => typeof q.sql === 'string' && q.sql.includes('INSERT INTO user_password_credentials'))
    expect(credInsert).toBeDefined()
    expect(credInsert.params[0]).toBe('user-admin-new')
    expect(typeof credInsert.params[1]).toBe('string')
    expect(credInsert.params[1]).not.toBe('SuperSecretAdminPassword123!')
  })

  it('does NOT overwrite existing password credential on subsequent seed runs (idempotent)', async () => {
    await seedAdminUser(mockClient, {
      adminEmail: 'existing-admin@ijidcr-asgard.in',
      adminPassword: 'NewPasswordAttempt',
    })

    // Should NOT insert or update password credentials
    const credInsert = queryLog.find(q => typeof q.sql === 'string' && q.sql.includes('INSERT INTO user_password_credentials'))
    expect(credInsert).toBeUndefined()

    const credUpdate = queryLog.find(q => typeof q.sql === 'string' && q.sql.includes('UPDATE user_password_credentials'))
    expect(credUpdate).toBeUndefined()
  })

  it('seed() fails safely if required environment variables are absent', async () => {
    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      end: vi.fn().mockResolvedValue(),
    }

    await expect(
      seed(mockPool, { adminEmail: '', adminPassword: '' })
    ).rejects.toThrow('ADMIN_SEED_EMAIL is required')

    await expect(
      seed(mockPool, { adminEmail: 'ceo@ijidcr-asgard.in', adminPassword: '' })
    ).rejects.toThrow('ADMIN_SEED_PASSWORD is required')
  })
})
