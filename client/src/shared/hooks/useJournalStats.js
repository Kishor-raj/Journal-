import { useEffect, useState } from 'react'
import { analyticsService } from '../../services/analyticsService.js'

/**
 * Fetches aggregate journal stats from `GET /api/analytics/stats`.
 *
 * @returns {{ totalVisits: number|null, totalCountries: number|null, loading: boolean }}
 *   - `null` values while loading or on error (caller should hide the line on error).
 *   - `loading` is true only during the initial fetch.
 *
 * To change the API endpoint, update `analyticsService.getStats()` in
 * `src/services/analyticsService.js` (which calls `GET /api/analytics/stats`).
 */
export function useJournalStats() {
  const [totalVisits, setTotalVisits] = useState(null)
  const [totalCountries, setTotalCountries] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    analyticsService
      .getStats()
      .then((data) => {
        if (!active) return
        const visits = typeof data?.totalVisitors === 'number' ? data.totalVisitors : null
        const countries = typeof data?.totalCountries === 'number' ? data.totalCountries : null
        setTotalVisits(visits)
        setTotalCountries(countries)
      })
      .catch(() => {
        // Silently swallow — caller will hide the line when values stay null.
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { totalVisits, totalCountries, loading }
}
