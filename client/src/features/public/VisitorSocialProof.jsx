import { useRef } from 'react'
import { useInView } from '../../shared/hooks/useInView.js'
import { useCountUp } from '../../shared/hooks/useCountUp.js'

/* ─── Eye SVG icon ─────────────────────────────────────────────────────── */
function EyeIcon({ pulse }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#d4af37"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={pulse ? { animation: 'sp-eye-pulse 2.5s ease-in-out infinite' } : undefined}
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/* ─── Keyframe and responsive styles injection (once) ──────────────────── */
let keyframesInjected = false
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  keyframesInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes sp-eye-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.45; }
    }
    .sp-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-top: 26px;
      padding: 12px 22px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 9999px;
      background: rgba(255,255,255,0.04);
      min-height: 44px;
      box-sizing: border-box;
    }
    .sp-text {
      font-family: Jost, sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #aeb9cb;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-variant-numeric: tabular-nums;
      margin: 0;
    }
    @media (max-width: 640px) {
      .sp-pill {
        padding: 10px 16px;
      }
      .sp-text {
        font-size: 12px;
      }
    }
  `
  document.head.appendChild(style)
}

/**
 * Renders a subtle "social proof" pill beneath the hero CTA buttons,
 * showing the journal's total visit count and reader country count with
 * a count-up animation on first scroll into view.
 *
 * Props:
 *  - totalVisits    {number|null}  Total visit count (null → show "—", no animation)
 *  - totalCountries {number|null}  Country count     (null → show "—", no animation)
 */
export default function VisitorSocialProof({ totalVisits, totalCountries }) {
  ensureKeyframes()

  const containerRef = useRef(null)
  const inView = useInView(containerRef, 0.4)

  const dataReady = totalVisits !== null && totalCountries !== null
  const animEnabled = inView && dataReady

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const animatedVisits    = useCountUp(totalVisits,    2200, animEnabled)
  const animatedCountries = useCountUp(totalCountries, 1600, animEnabled)

  // Resolved display values
  const displayVisits    = dataReady
    ? (animEnabled || prefersReduced ? animatedVisits    : 0).toLocaleString('en-US')
    : '—'
  const displayCountries = dataReady
    ? (animEnabled || prefersReduced ? animatedCountries : 0).toLocaleString('en-US')
    : '—'

  // Accessible label using final real values
  const ariaLabel = dataReady
    ? `${totalVisits.toLocaleString('en-US')} total visits, readers from ${totalCountries} countries`
    : 'Visit statistics loading'

  const countVisitsStyle = {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '13px',
    fontVariantNumeric: 'tabular-nums',
  }

  const countCountriesStyle = {
    color: '#d4af37',
    fontWeight: 700,
    fontSize: '13px',
    fontVariantNumeric: 'tabular-nums',
  }

  const dividerStyle = {
    color: 'rgba(255,255,255,0.25)',
    margin: '0 2px',
    userSelect: 'none',
  }

  return (
    <div
      ref={containerRef}
      role="text"
      aria-label={ariaLabel}
      className="sp-pill"
    >
      <EyeIcon pulse={!prefersReduced && dataReady} />

      <p className="sp-text">
        {/* Visit count — aria-hidden so screen readers use the container aria-label */}
        <span aria-hidden="true" style={countVisitsStyle}>{displayVisits}</span>
        <span aria-hidden="true">TOTAL VISITS</span>

        <span aria-hidden="true" style={dividerStyle}>|</span>

        <span aria-hidden="true">READERS FROM</span>
        <span aria-hidden="true" style={countCountriesStyle}>{displayCountries}</span>
        <span aria-hidden="true">COUNTRIES</span>
      </p>
    </div>
  )
}
