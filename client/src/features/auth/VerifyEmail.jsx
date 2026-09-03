import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail, resendVerification } from '../../services/authService'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const [resendEmail, setResendEmail] = useState(email || '')
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function run() {
      if (!token) {
        setStatus('invalid')
        setMessage('No verification token was provided.')
        return
      }

      try {
        await verifyEmail(token)
        setStatus('success')
      } catch (err) {
        const code = err?.response?.data?.code
        if (code === 'VERIFICATION_EXPIRED') {
          setStatus('expired')
          setMessage('This verification link has expired.')
        } else {
          setStatus('invalid')
          setMessage('This verification link is no longer valid.')
        }
      }
    }

    run()
  }, [token])

  async function handleResend() {
    if (!resendEmail.trim()) return
    setResending(true)
    setResendSent(false)
    try {
      await resendVerification(resendEmail.trim())
      setResendSent(true)
    } catch {
      setMessage('Unable to resend verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        {status === 'loading' && (
          <>
            <div className="auth-page-spinner" />
            <h1 className="auth-page-title">Verifying your email...</h1>
            <p className="auth-page-text">Please wait while we confirm your address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <span className="auth-page-icon" aria-hidden="true">✓</span>
            <h1 className="auth-page-title">Email verified successfully</h1>
            <p className="auth-page-text">You can now sign in with your email and password.</p>
            <Link to="/login" className="auth-submit-btn auth-submit-btn--link">Continue to Sign In</Link>
          </>
        )}

        {(status === 'expired' || status === 'invalid') && (
          <>
            <span className="auth-page-icon" aria-hidden="true">!</span>
            <h1 className="auth-page-title">{status === 'expired' ? 'Verification link expired' : 'Link no longer valid'}</h1>
            <p className="auth-page-text">{message}</p>

            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <button
              type="button"
              className="auth-submit-btn"
              onClick={handleResend}
              disabled={resending || !resendEmail.trim()}
            >
              {resendSent ? 'Verification email sent' : (resending ? 'Sending...' : 'Resend Verification Email')}
            </button>

            <Link to="/login" className="auth-link auth-margin-top">Back to Sign In</Link>
          </>
        )}
      </div>
    </div>
  )
}
