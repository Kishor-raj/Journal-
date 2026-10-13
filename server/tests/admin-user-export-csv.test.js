import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sanitizeCsvCell,
  formatCsvDate,
  getExportFilename,
  generateUsersCsv,
  CSV_HEADERS,
} from '../src/modules/admin/admin.csv.js'
import adminRouter from '../src/modules/admin/admin.routes.js'

vi.mock('../src/config/db.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

import pool from '../src/config/db.js'

describe('Admin User CSV Export & Roles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeCsvCell', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      expect(sanitizeCsvCell(null)).toBe('')
      expect(sanitizeCsvCell(undefined)).toBe('')
      expect(sanitizeCsvCell('')).toBe('')
      expect(sanitizeCsvCell('   ')).toBe('')
    })

    it('returns regular strings unchanged if no special characters are present', () => {
      expect(sanitizeCsvCell('John Doe')).toBe('John Doe')
      expect(sanitizeCsvCell('john@example.com')).toBe('john@example.com')
      expect(sanitizeCsvCell('12345')).toBe('12345')
    })

    it('quotes strings with commas, quotes, or newlines according to RFC 4180', () => {
      expect(sanitizeCsvCell('Smith, John')).toBe('"Smith, John"')
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""')
      expect(sanitizeCsvCell("Line 1\nLine 2")).toBe("\"Line 1\nLine 2\"")
      expect(sanitizeCsvCell("Line 1\r\nLine 2")).toBe("\"Line 1\r\nLine 2\"")
    })

    it('prevents spreadsheet formula injection by prefixing dangerous characters with single quote', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe("'+cmd|/c calc")
      expect(sanitizeCsvCell('-cmd|/c calc')).toBe("'-cmd|/c calc")
      expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
      expect(sanitizeCsvCell('@SUM(1,2)')).toBe(`"'@SUM(1,2)"`)
      expect(sanitizeCsvCell('\tmalicious')).toBe("'\tmalicious")
    })

    it('properly quotes and sanitizes formula injection when containing commas or quotes', () => {
      expect(sanitizeCsvCell('=HYPERLINK("http://attacker.com", "Click")')).toBe(
        `"'=HYPERLINK(""http://attacker.com"", ""Click"")"`
      )
    })
  })

  describe('formatCsvDate', () => {
    it('returns formatted UTC string or empty string', () => {
      expect(formatCsvDate(null)).toBe('')
      expect(formatCsvDate(undefined)).toBe('')
      expect(formatCsvDate('invalid-date')).toBe('')
      const formatted = formatCsvDate('2026-10-10T15:30:00.000Z')
      expect(formatted).toBe('2026-10-10 15:30:00 UTC')
    })
  })

  describe('getExportFilename', () => {
    const today = new Date().toISOString().split('T')[0]

    it('generates all roles filename when role is omitted, empty, or "all"', () => {
      expect(getExportFilename()).toBe(`users_all_roles_${today}.csv`)
      expect(getExportFilename('')).toBe(`users_all_roles_${today}.csv`)
      expect(getExportFilename('all')).toBe(`users_all_roles_${today}.csv`)
      expect(getExportFilename('ALL')).toBe(`users_all_roles_${today}.csv`)
    })

    it('generates pluralized role filename for specific roles', () => {
      expect(getExportFilename('editor')).toBe(`users_editors_${today}.csv`)
      expect(getExportFilename('author')).toBe(`users_authors_${today}.csv`)
      expect(getExportFilename('reviewer')).toBe(`users_reviewers_${today}.csv`)
      expect(getExportFilename('admin')).toBe(`users_admins_${today}.csv`)
      expect(getExportFilename('moderator')).toBe(`users_moderators_${today}.csv`)
    })
  })

  describe('generateUsersCsv', () => {
    it('prepends UTF-8 BOM and outputs correct headers', () => {
      const csv = generateUsersCsv([])
      expect(csv.charCodeAt(0)).toBe(0xfeff)
      const lines = csv.substring(1).split('\r\n')
      expect(lines[0]).toBe(CSV_HEADERS.join(','))
    })

    it('generates accurate, escaped rows for user records', () => {
      const sampleUsers = [
        {
          id: 'u-1',
          display_name: 'Dr. Jane, Doe',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@example.com',
          role_name: 'editor',
          reviewer_id: 'AIRP0001',
          account_status: 'active',
          is_email_verified: true,
          phone: '+1-555-0199',
          institution: 'Asgard Institute, Tech',
          college: 'Engineering',
          department: 'Computer Science',
          state: 'California',
          country: 'United States',
          course: 'Ph.D.',
          orcid_id: '0000-0002-1825-0097',
          bio: 'Editor in Chief for AI.',
          created_at: '2026-01-15T10:00:00.000Z',
          updated_at: '2026-05-20T12:00:00.000Z',
          last_login: '2026-10-09T08:00:00.000Z',
        },
      ]

      const csv = generateUsersCsv(sampleUsers)
      const lines = csv.substring(1).split('\r\n')
      expect(lines.length).toBe(2)
      expect(lines[1]).toContain('"Dr. Jane, Doe"')
      expect(lines[1]).toContain('jane.doe@example.com')
      expect(lines[1]).toContain('Editor')
      expect(lines[1]).toContain('AIRP0001')
      expect(lines[1]).toContain('Active')
      expect(lines[1]).toContain('Yes')
      expect(lines[1]).toContain("'+1-555-0199") // Sanitized formula trigger
      expect(lines[1]).toContain('"Asgard Institute, Tech"')
    })
  })

  describe('Admin Router Integration', () => {
    it('registers GET /roles route', () => {
      const route = adminRouter.stack.find(
        (l) => l.route && l.route.path === '/roles' && l.route.methods.get
      )
      expect(route).toBeDefined()
    })

    it('registers GET /users/export route BEFORE GET /users/:id', () => {
      const exportIndex = adminRouter.stack.findIndex(
        (l) => l.route && l.route.path === '/users/export' && l.route.methods.get
      )
      const idIndex = adminRouter.stack.findIndex(
        (l) => l.route && l.route.path === '/users/:id' && l.route.methods.get
      )

      expect(exportIndex).toBeGreaterThan(-1)
      expect(idIndex).toBeGreaterThan(-1)
      expect(exportIndex).toBeLessThan(idIndex)
    })
  })
})
