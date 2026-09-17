import { useEffect, useRef, useState } from 'react'
import { analyticsService } from '../../services/analyticsService.js'

export function useVisitorCount() {
  const [visitorCount, setVisitorCount] = useState(null)
  const [loading, setLoading] = useState(false)
  const recordedRef = useRef(false)

  useEffect(() => {
    if (recordedRef.current) return
    recordedRef.current = true

    let active = true

    async function track() {
      setLoading(true)
      try {
        const data = await analyticsService.recordVisit()
        if (!active) return
        setVisitorCount(
          typeof data?.totalVisitors === 'number' ? data.totalVisitors : null
        )
      } catch {
        // Analytics failures must never affect the site.
      } finally {
        if (active) setLoading(false)
      }
    }

    track()

    return () => {
      active = false
    }
  }, [])

  return { visitorCount, loading }
}