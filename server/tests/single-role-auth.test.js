import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authService from '../src/modules/auth/auth.service.js'
import authRouter from '../src/modules/auth/auth.routes.js'

vi.mock('../src/config/db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

import pool from '../src/config/db.js'

describe('Single User Role Authentication Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ensures selectRoleForSession is completely removed from auth.service', () => {
    expect(authService.selectRoleForSession).toBeUndefined()
  })

  it('ensures POST /role route does NOT exist in authRouter', () => {
    const roleRoutes = authRouter.stack.filter((layer) => {
      if (layer.route) {
        return layer.route.path === '/role'
      }
      return false
    })
    expect(roleRoutes.length).toBe(0)
  })

  it('getAssignedRoles returns user canonical role without inserting or falling back to 5 roles', async () => {
    // When user_roles has 1 entry
    pool.query.mockResolvedValueOnce({
      rows: [{ name: 'author' }],
    })

    const roles = await authService.getAssignedRoles('user-123')
    expect(roles).toEqual(['author'])
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('getAssignedRoles returns empty array if no role is found rather than 5 standard roles', async () => {
    // When user_roles is empty
    pool.query.mockResolvedValueOnce({ rows: [] })
    // And users.role_id lookup is empty
    pool.query.mockResolvedValueOnce({ rows: [] })

    const roles = await authService.getAssignedRoles('user-no-role')
    expect(roles).toEqual([])
    expect(roles).not.toContain('admin')
    expect(roles).not.toContain('editor')
  })

  it('findSession does not fallback to 5 roles when assigned_roles is empty', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'sess-1',
          user_id: 'u-1',
          role_name: 'author',
          account_role_name: 'author',
          assigned_roles: [],
        },
      ],
    })

    const session = await authService.findSession('fake-token-hash')
    expect(session).toBeDefined()
    expect(session.role_name).toBe('author')
    expect(session.assigned_roles).toEqual([])
  })
})
