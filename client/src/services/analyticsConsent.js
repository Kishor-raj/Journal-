const CONSENT_KEY = 'analytics_consent'

export const CONSENT_VALUES = {
  NOT_DECIDED: 'not_decided',
  ACCEPTED: 'accepted',
  CONTINUED: 'continued',
}

export const CONSENT_CHANGE_EVENT = 'analytics-consent-change'

export function getAnalyticsConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) || CONSENT_VALUES.NOT_DECIDED
  } catch {
    return CONSENT_VALUES.NOT_DECIDED
  }
}

export function setAnalyticsConsent(value) {
  if (value !== CONSENT_VALUES.ACCEPTED && value !== CONSENT_VALUES.CONTINUED) {
    return
  }
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // Storage unavailable — fail silently
  }
  window.dispatchEvent(
    new CustomEvent(CONSENT_CHANGE_EVENT, { detail: { choice: value } })
  )
}