import { useEffect, useRef, useState } from 'react'

/**
 * Returns `true` once the element attached to `ref` has been at least
 * `threshold` (0–1) visible in the viewport. Fires at most once, then
 * disconnects the observer.
 *
 * Falls back to `true` immediately when IntersectionObserver is unavailable
 * (e.g., very old browsers, SSR environments).
 *
 * @param {React.RefObject<Element>} ref
 * @param {number} [threshold=0.4]
 * @returns {boolean}
 */
export function useInView(ref, threshold = 0.4) {
  const [inView, setInView] = useState(false)
  const observerRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return

    // Graceful fallback
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true)
          observerRef.current?.disconnect()
        }
      },
      { threshold }
    )

    observerRef.current.observe(ref.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [ref, threshold])

  return inView
}
