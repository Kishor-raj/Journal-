import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 to `target` over `duration` ms using an
 * ease-out quart curve: `1 - (1 - t)^4`.
 *
 * - Runs only when `enabled` is `true` (set to false until data is ready
 *   and the element is in view).
 * - Respects `prefers-reduced-motion`: returns the final value instantly
 *   without any animation.
 * - Uses `requestAnimationFrame` — no `setInterval`.
 *
 * @param {number|null} target    Final value; pass null to get 0 and no animation.
 * @param {number}      duration  Animation duration in milliseconds.
 * @param {boolean}     enabled   Set to true when the animation should start.
 * @returns {number} The current (animated) count value.
 */
export function useCountUp(target, duration, enabled) {
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!enabled || hasRun.current || target === null) return

    const finalValue = target ?? 0

    // Respect prefers-reduced-motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setCount(finalValue)
      hasRun.current = true
      return
    }

    hasRun.current = true
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.round(eased * finalValue))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCount(finalValue)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, target, duration])

  return count
}
