import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CONSENT_VALUES,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '../../services/analyticsConsent.js'

export default function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState(() => getAnalyticsConsent())

  if (consent !== CONSENT_VALUES.NOT_DECIDED) {
    return null
  }

  const handleAccept = () => {
    setAnalyticsConsent(CONSENT_VALUES.ACCEPTED)
    setConsent(CONSENT_VALUES.ACCEPTED)
  }

  const handleContinue = () => {
    setAnalyticsConsent(CONSENT_VALUES.CONTINUED)
    setConsent(CONSENT_VALUES.CONTINUED)
  }

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      padding: '12px 16px',
      pointerEvents: 'none',
    }}>
      <div role="dialog" aria-label="Analytics consent" style={{
        pointerEvents: 'auto',
        maxWidth: '760px',
        width: '100%',
        background: '#0B1B3A',
        color: '#C9CEDC',
        border: '1px solid rgba(196,162,76,0.45)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        boxShadow: '0 12px 32px rgba(7,18,40,0.35)',
        padding: '16px clamp(16px, 3vw, 24px)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 18px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <p style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', lineHeight: 1.6, letterSpacing: '0.02em', margin: 0, maxWidth: '440px', color: '#C3CBDC' }}>
          This site uses an anonymous visitor identifier to maintain
          accurate aggregated visitor statistics.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '12.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: '#071228',
              background: 'linear-gradient(180deg, #D4AF37 0%, #C4A24C 60%, #B38E2F 100%)',
              padding: '10px 18px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleContinue}
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '12.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: '#C9CEDC',
              background: 'transparent',
              padding: '10px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(201,206,220,0.4)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Continue
          </button>
          <Link
            to="/privacy"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '12.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: '#E3CB86',
              padding: '10px 12px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Cookie Settings
          </Link>
        </div>
      </div>
    </div>
  )
}