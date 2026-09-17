import { useEffect, useRef, useState } from 'react'
import { analyticsService } from '../../services/analyticsService.js'
import {
  CONSENT_VALUES,
  CONSENT_CHANGE_EVENT,
  getAnalyticsConsent,
} from '../../services/analyticsConsent.js'

export function useVisitorCount() {
  const [visitorCount, setVisitorCount] = useState(null)
  const [loading, setLoading] = useState(false)
  const lastConsentRef = useRef(null)

  useEffect(() => {
    let active = true

    async function track() {
      const consent = getAnalyticsConsent()
      if (consent !== CONSENT_VALUES.ACCEPTED) return
      if (lastConsentRef.current === consent) return
      lastConsentRef.current = consent

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
    window.addEventListener(CONSENT_CHANGE_EVENT, track)

    return () => {
      active = false
      window.removeEventListener(CONSENT_CHANGE_EVENT, track)
    }
  }, [])

  return { visitorCount, loading }
}