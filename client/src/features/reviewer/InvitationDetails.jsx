import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { validateInvitation, respondToInvitation } from '../../services/reviewerService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  card: {
    maxWidth: '560px',
    width: '100%',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    marginTop: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '16px',
    padding: '16px',
    background: 'var(--color-surface-sunken)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-rule-grey)',
    fontSize: 'var(--text-sm)',
  },
}

export default function InvitationDetails() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [invitation, setInvitation] = useState(null)
  const [respondError, setRespondError] = useState('')
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setStatus('invalid')
        return
      }
      try {
        const data = await validateInvitation(id, token)
        if (cancelled) return
        // Remove the token from the visible URL once safely validated.
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', `/reviewer/invitations/${id}`)
        }
        if (data.valid) {
          setInvitation(data)
          setStatus('valid')
        } else {
          setStatus(data.reason === 'expired' ? 'expired' : data.reason === 'accepted' || data.reason === 'declined' ? 'responded' : 'invalid')
        }
      } catch {
        if (!cancelled) setStatus('invalid')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [id, token])

  const loginUrl = `/login?returnTo=${encodeURIComponent(`/reviewer/invitations/${id}`)}`

  async function handleRespond(response) {
    setRespondError('')
    setResponding(true)
    try {
      await respondToInvitation(id, { response })
      setStatus('responded')
      setInvitation((prev) => ({ ...prev, owner_response: response }))
    } catch (err) {
      setRespondError(err?.response?.data?.error || 'Unable to respond to this invitation.')
    } finally {
      setResponding(false)
    }
  }

  function renderMeta(inv) {
    return (
      <div style={styles.meta}>
        <div>
          <strong>Manuscript: </strong>
          {inv?.manuscript_title || 'Manuscript'}
        </div>
        {inv?.submission_number && (
          <div>
            <strong>Submission: </strong>
            {inv.submission_number}
          </div>
        )}
        {inv?.deadline && (
          <div>
            <strong>Review deadline: </strong>
            {formatDate(inv.deadline)}
          </div>
        )}
      </div>
    )
  }

  const showRespond = invitation?.valid && invitation?.owns_invitation && !invitation?.requires_login
  const showLogin = invitation?.valid && !showRespond

  return (
    <div className="auth-page">
      <div className="auth-page-card" style={styles.card}>
        {status === 'loading' && (
          <>
            <div className="auth-page-spinner" />
            <h1 className="auth-page-title">Loading invitation...</h1>
            <p className="auth-page-text">Please wait while we validate your invitation.</p>
          </>
        )}

        {status === 'valid' && (
          <>
            <span className="auth-page-icon" aria-hidden="true">📬</span>
            <h1 className="auth-page-title">Review Invitation</h1>
            <p className="auth-page-text">You have been invited to review a manuscript for the journal.</p>
            {renderMeta(invitation)}

            {showRespond && (
              <>
                <div style={styles.actions}>
                  <button
                    className="auth-submit-btn"
                    onClick={() => handleRespond('accepted')}
                    disabled={responding}
                  >
                    {responding ? 'Processing...' : 'Accept Invitation'}
                  </button>
                  <Link to="/reviewer/invitations" className="auth-link" style={{ alignSelf: 'center' }}>Decline</Link>
                </div>
                {respondError && <div style={{ ...styles.alert, background: '#FDEDEC', color: 'var(--color-danger)' }}>{respondError}</div>}
              </>
            )}

            {showLogin && (
              <div style={{ marginTop: '24px' }}>
                <p className="auth-page-text">
                  Please sign in to your reviewer account to accept or decline this invitation.
                </p>
                <Link to={loginUrl} className="auth-submit-btn auth-submit-btn--link">Sign in to Respond</Link>
                <p className="auth-page-text">
                  Don't have an account? <Link to="/register" className="auth-link">Create account</Link>
                </p>
              </div>
            )}
          </>
        )}

        {status === 'responded' && (
          <>
            <span className="auth-page-icon" aria-hidden="true">✓</span>
            <h1 className="auth-page-title">
              {invitation?.owner_response === 'declined' ? 'Invitation declined' : 'Invitation accepted'}
            </h1>
            <p className="auth-page-text">
              {invitation?.owner_response === 'declined'
                ? 'You have declined this review invitation.'
                : 'You have accepted this review invitation. It will appear in your active assignments.'}
            </p>
            <Link to="/reviewer/invitations" className="auth-submit-btn auth-submit-btn--link">Go to Invitations</Link>
          </>
        )}

        {status === 'expired' && (
          <>
            <span className="auth-page-icon" aria-hidden="true">!</span>
            <h1 className="auth-page-title">Invitation expired</h1>
            <p className="auth-page-text">
              This invitation link has expired. If you believe this is a mistake, please contact the journal editorial office.
            </p>
            <Link to="/" className="auth-link auth-margin-top">Back to Home</Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <span className="auth-page-icon" aria-hidden="true">!</span>
            <h1 className="auth-page-title">Invalid link</h1>
            <p className="auth-page-text">
              This invitation link is no longer valid. Please contact the journal editorial office if you need assistance.
            </p>
            <Link to="/" className="auth-link auth-margin-top">Back to Home</Link>
          </>
        )}
      </div>
    </div>
  )
}
