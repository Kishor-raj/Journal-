import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidVisitorId,
  isLikelyBot,
  generateVisitorId,
  registerVisit,
  getTotalVisitors,
} from '../src/modules/analytics/analytics.service.js'

vi.mock('../src/config/db.js', () => ({
  default: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}))

import pool from '../src/config/db.js'

function makeClient() {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  }
  return client
}

/** Runs the common transaction happy-path used by every test. */
function fakeTransaction(client, steps) {
  client.query.mockImplementation(async (sqlOrObj, params) => {
    if (typeof sqlOrObj === 'string' && /BEGIN/i.test(sqlOrObj)) return { rows: [] }
    if (typeof sqlOrObj === 'string' && /COMMIT/i.test(sqlOrObj)) return { rows: [] }
    if (typeof sqlOrObj === 'string' && /ROLLBACK/i.test(sqlOrObj)) throw new Error('rollback')
    return steps(sqlOrObj, params)
  })
}

describe('anonymous visitor counter (Phase 2–8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Phase 2/3 — visitor ID handling', () => {
    it('generates a server-side UUID', () => {
      const id = generateVisitorId()
      expect(isValidVisitorId(id)).toBe(true)
    })

    it('accepts well-formed UUIDs only', () => {
      expect(isValidVisitorId('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(true)
      expect(isValidVisitorId('not-a-uuid')).toBe(false)
      expect(isValidVisitorId(12345)).toBe(false)
      expect(isValidVisitorId(null)).toBe(false)
      expect(isValidVisitorId(undefined)).toBe(false)
    })

    it('conservatively flags obvious bots on the user-agent (Phase 9)', () => {
      for (const bot of [
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'curl/7.88.1',
        'python-requests/2.31.0',
        'Mozilla/5.0 (compatible; python-requests/2.31.0)', // says 'requests'
        'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
      ]) {
        expect(isLikelyBot(bot)).toBe(true)
      }
    })

    it('does NOT flag normal browser user-agents (no aggressive filtering)', () => {
      for (const ua of [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
      ]) {
        expect(isLikelyBot(ua)).toBe(false)
      }
    })

    it('treats a missing user-agent conservatively rather than counting it', () => {
      expect(isLikelyBot(null)).toBe(true)
      expect(isLikelyBot(undefined)).toBe(true)
      expect(isLikelyBot('')).toBe(true)
    })
  })

  describe('Phase 8 — read-only stats', () => {
    it('returns only the total visitors without modifying the database', async () => {
      pool.query.mockResolvedValue({ rows: [{ total: '12548' }] })

      const total = await getTotalVisitors()

      expect(total).toBe(12548)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COALESCE(total_visitors, 0)'),
        [1]
      )
    })
  })

  describe('Phase 7/8 — registerVisit (atomic increment + no double count)', () => {
    it('increments exactly once for a brand-new visitor and returns the total', async () => {
      const client = makeClient()
      pool.connect.mockResolvedValue(client)
      fakeTransaction(client, (sql) => {
        if (/INSERT INTO site_visitors/i.test(sql)) {
          return { rows: [{ id: '1' }], rowCount: 1 } // new visitor inserted
        }
        if (/UPDATE site_stats/i.test(sql)) {
          return { rows: [{ total_visitors: '12501' }] }
        }
        if (/SELECT total_visitors/i.test(sql)) {
          return { rows: [{ total_visitors: '12500' }] }
        }
        return { rows: [] }
      })

      const result = await registerVisit(undefined, 'Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0')

      expect(result.visitorId).toBeDefined()
      expect(result.isNewVisitor).toBe(true)
      expect(result.totalVisitors).toBe(12501)
      expect(client.release).toHaveBeenCalled()
    })

    it('does NOT increment for a returning visitor (refresh/revisit) — Phase 8', async () => {
      const client = makeClient()
      pool.connect.mockResolvedValue(client)
      const existingId = generateVisitorId()
      let updateRan = false
      fakeTransaction(client, (sql) => {
        if (/INSERT INTO site_visitors/i.test(sql)) {
          updateRan = true
          return { rows: [], rowCount: 0 } // already exists → conflict
        }
        if (/UPDATE site_visitors/i.test(sql)) {
          return { rows: [] } // last_seen refresh, no stat change
        }
        if (/SELECT total_visitors/i.test(sql)) {
          return { rows: [{ total_visitors: '12500' }] }
        }
        return { rows: [] }
      })

      const result = await registerVisit(existingId, 'Mozilla/5.0 (Windows NT 10.0) Chrome/126.0')

      expect(updateRan).toBe(true)
      expect(result.isNewVisitor).toBe(false)
      expect(result.totalVisitors).toBe(12500) // unchanged
    })

    it('treats an invalid cookie value as a brand-new visitor instead of crashing (Phase 17)', async () => {
      const client = makeClient()
      pool.connect.mockResolvedValue(client)
      fakeTransaction(client, (sql) => {
        if (/INSERT INTO site_visitors/i.test(sql)) {
          return { rows: [{ id: '1' }], rowCount: 1 }
        }
        if (/UPDATE site_stats/i.test(sql)) {
          return { rows: [{ total_visitors: '2' }] }
        }
        return { rows: [] }
      })

      const result = await registerVisit('not-a-valid-id', 'Mozilla/5.0 Chrome/126.0')

      expect(result.isNewVisitor).toBe(true)
      expect(result.totalVisitors).toBe(2)
    })
  })
})
