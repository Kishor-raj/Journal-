import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getApplicationStatus, submitClarification } from './services/editorialApplicationService'

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'VERIFICATION', label: 'Verification' },
  { key: 'DECISION', label: 'Decision' },
]

export default function EditorialStatus() {
  const [searchParams] = useSearchParams()
  const [reference, setReference] = useState(searchParams.get('ref') || '')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [loading, setLoading] = useState(false)
  const [application, setApplication] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [clarificationText, setClarificationText] = useState('')
  const [responding, setResponding] = useState(false)
  const [respondSuccess, setRespondSuccess] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    const refParam = searchParams.get('ref')
    const emailParam = searchParams.get('email')
    if (refParam) {
      setReference(refParam)
      if (emailParam) setEmail(emailParam)
      handleLookup(refParam, emailParam)
    }
  }, [searchParams])

  const handleLookup = async (lookupRef = reference, lookupEmail = email) => {
    if (!lookupRef.trim()) {
      setErrorMsg('Please enter your Application Reference Number.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setRespondSuccess('')
    try {
      const res = await getApplicationStatus(lookupRef.trim(), lookupEmail.trim())
      setApplication(res)
    } catch (err) {
      setApplication(null)
      setErrorMsg(err.message || 'Unable to find application with the provided details.')
    } finally {
      setLoading(false)
    }
  }

  const handleClarificationSubmit = async (e) => {
    e.preventDefault()
    if (!clarificationText.trim()) {
      setErrorMsg('Please enter your clarification response.')
      return
    }

    setResponding(true)
    setErrorMsg('')
    try {
      await submitClarification(application.application_number, email, clarificationText.trim())
      setRespondSuccess('Your clarification response has been submitted to the editorial team.')
      setClarificationText('')
      // Refresh status
      const updated = await getApplicationStatus(application.application_number, email)
      setApplication(updated)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit clarification response.')
    } finally {
      setResponding(false)
    }
  }

  const getStepStatus = (stepKey) => {
    if (!application) return 'pending'
    const status = application.status

    if (stepKey === 'SUBMITTED') return 'completed'
    
    if (stepKey === 'UNDER_REVIEW') {
      if (status === 'SUBMITTED') return 'pending'
      if (['UNDER_REVIEW', 'CLARIFICATION_REQUIRED'].includes(status)) return 'current'
      return 'completed'
    }

    if (stepKey === 'VERIFICATION') {
      if (['SUBMITTED', 'UNDER_REVIEW'].includes(status)) return 'pending'
      if (status === 'VERIFICATION') return 'current'
      return 'completed'
    }

    if (stepKey === 'DECISION') {
      if (['APPROVED', 'REJECTED', 'ACTIVE_MEMBER', 'APPOINTMENT_ISSUED'].includes(status)) {
        return status === 'REJECTED' ? 'rejected' : 'completed'
      }
      return 'pending'
    }

    return 'pending'
  }

  return (
    <>
      {/* Hero Header */}
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(28px, 4vw, 40px) var(--layout-pad)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '8px' }}>
            Application Portal
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(28px, 4vw, 42px)', margin: '0 0 8px' }}>
            Track Editorial Board Application
          </h1>
          <p style={{ fontSize: '15.5px', color: '#C3CBDC', margin: 0 }}>
            Enter your application reference number to check the verification and review progress.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '36px 20px 80px' }}>
        
        {/* Lookup Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E6E1D6',
          borderRadius: '4px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(11,27,58,0.04)',
          marginBottom: '32px',
        }}>
          <form onSubmit={(e) => { e.preventDefault(); handleLookup(); }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3A4157', marginBottom: '6px' }}>
                  Application Reference Number *
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. EB-2026-0001"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '3px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#3A4157', marginBottom: '6px' }}>
                  Applicant Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@university.edu"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '3px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: '#0B1B3A',
                    color: '#FFFFFF',
                    padding: '12px 20px',
                    borderRadius: '2px',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Searching...' : 'Check Status →'}
                </button>
              </div>
            </div>
          </form>

          {errorMsg && (
            <div style={{ marginTop: '16px', color: '#E74C3C', fontSize: '14px', background: '#FDEDEC', padding: '10px 14px', borderRadius: '3px' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Application Details & Timeline */}
        {application && (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E6E1D6',
            borderRadius: '4px',
            padding: 'clamp(24px, 4vw, 36px)',
            boxShadow: '0 4px 14px rgba(11,27,58,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #F0ECE3' }}>
              <div>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '14px', fontWeight: 700, color: '#9A7B23' }}>
                  {application.application_number}
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 600, color: '#0B1B3A', margin: '4px 0' }}>
                  {application.full_name}
                </h2>
                <div style={{ fontSize: '14px', color: '#6A728A' }}>
                  Applied for: <strong>{application.preferred_role}</strong> — Section: <em>{application.preferred_editorial_section}</em>
                </div>
              </div>

              <span style={{
                padding: '6px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background:
                  ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? '#EAF7EE' :
                  application.status === 'REJECTED' ? '#FDEDEC' :
                  application.status === 'CLARIFICATION_REQUIRED' ? '#FEF9E7' : '#EFF6FF',
                color:
                  ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? '#2E7D32' :
                  application.status === 'REJECTED' ? '#C0392B' :
                  application.status === 'CLARIFICATION_REQUIRED' ? '#B7950B' : '#1D4ED8',
              }}>
                {application.status.replace('_', ' ')}
              </span>
            </div>

            {/* Timeline Progress */}
            <div style={{ marginBottom: '36px', padding: '16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', position: 'relative' }}>
                {STATUS_STEPS.map((step, idx) => {
                  const state = getStepStatus(step.key)
                  return (
                    <div key={step.key} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        margin: '0 auto 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        background:
                          state === 'completed' ? '#2E7D32' :
                          state === 'current' ? '#C4A24C' :
                          state === 'rejected' ? '#C0392B' : '#E6E9F0',
                        color: state === 'pending' ? '#6A728A' : '#FFFFFF',
                      }}>
                        {state === 'completed' ? '✓' : state === 'rejected' ? '✕' : idx + 1}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: state === 'current' ? 700 : 500, color: state === 'current' ? '#0B1B3A' : '#6A728A' }}>
                        {step.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Clarification Required Box */}
            {application.status === 'CLARIFICATION_REQUIRED' && (
              <div style={{
                background: '#FEF9E7',
                border: '1px solid #F1C40F',
                borderRadius: '4px',
                padding: '20px',
                marginBottom: '28px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#7D6608', margin: '0 0 10px' }}>
                  Clarification Requested by Editorial Administration
                </h3>
                <p style={{ fontSize: '15px', color: '#5B4D06', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {application.clarification_request}
                </p>

                {respondSuccess ? (
                  <div style={{ color: '#2E7D32', fontWeight: 600, fontSize: '14px' }}>
                    ✓ {respondSuccess}
                  </div>
                ) : (
                  <form onSubmit={handleClarificationSubmit}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
                      Your Clarification Response *
                    </label>
                    <textarea
                      rows={4}
                      value={clarificationText}
                      onChange={(e) => setClarificationText(e.target.value)}
                      placeholder="Type your response or additional information here..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '3px',
                        fontSize: '14.5px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        marginBottom: '12px',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={responding}
                      style={{
                        background: '#0B1B3A',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '2px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: responding ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {responding ? 'Submitting...' : 'Submit Clarification Response →'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Approved Message */}
            {['APPROVED', 'ACTIVE_MEMBER', 'APPOINTMENT_ISSUED'].includes(application.status) && (
              <div style={{
                background: '#EAF7EE',
                border: '1px solid #2E7D32',
                borderRadius: '4px',
                padding: '20px',
                color: '#1E4620',
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                  Application Approved
                </h3>
                <p style={{ fontSize: '15px', lineHeight: 1.6, margin: '0 0 14px' }}>
                  Congratulations! Your application has been approved. If you already have an account, your role has been updated to Editor. If you received an invitation link via email, please complete your registration to activate Editor privileges.
                </p>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-block',
                    background: '#0B1B3A',
                    color: '#FFFFFF',
                    padding: '8px 18px',
                    borderRadius: '2px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Log In to Workspace →
                </Link>
              </div>
            )}

            {/* Rejected Message */}
            {application.status === 'REJECTED' && (
              <div style={{
                background: '#FDEDEC',
                border: '1px solid #E74C3C',
                borderRadius: '4px',
                padding: '20px',
                color: '#78281F',
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                  Application Status: Not Accepted
                </h3>
                <p style={{ fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                  {application.decision_reason || 'Thank you for your interest. We are unable to offer an editorial appointment at this time due to section capacities.'}
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </>
  )
}
