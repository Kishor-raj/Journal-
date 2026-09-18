import { useEffect, useRef, useState } from 'react'
import { analyticsService } from '../../services/analyticsService.js'
import { getOrCreateVisitorId } from '../../services/visitorIdentity.js'

export function useVisitorCount() {
  const [visitorCount, setVisitorCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const recordedRef = useRef(false)

  useEffect(() => {
    if (recordedRef.current) return
    recordedRef.current = true

    let active = true
    const visitorId = getOrCreateVisitorId()

    async function track() {
      setLoading(true)
      try {
        const data = await analyticsService.recordVisit(visitorId)
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