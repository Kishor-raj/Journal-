import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { validateResetToken, resetPassword } from '../../services/authService'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function check() {
      if (!token) {
        setStatus('invalid')
        return
      }
      try {
        await validateResetToken(token)
        setStatus('valid')
      } catch {
        setStatus('invalid')
      }
    }

    check()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setStatus('success')
    } catch (err) {
      const message = err?.response?.data?.error || 'Unable to reset your password. Please try again.'
      setStatus('invalid')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="auth-page">
        <div className="auth-page-card">
          <div className="auth-page-spinner" />
          <h1 className="auth-page-title">Checking reset link...</h1>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-page-card">
          <span className="auth-page-icon" aria-hidden="true">✓</span>
          <h1 className="auth-page-title">Password reset successfully</h1>
          <p className="auth-page-text">
            Your password has been reset. Please sign in with your new password.
          </p>
          <Link to="/login" className="auth-submit-btn auth-submit-btn--link">Continue to Sign In</Link>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="auth-page">
        <div className="auth-page-card">
          <span className="auth-page-icon" aria-hidden="true">!</span>
          <h1 className="auth-page-title">Reset link invalid or expired</h1>
          <p className="auth-page-text">
            This password reset link is invalid or has expired. Please request a new password reset link.
            {error ? ` ${error}` : ''}
          </p>
          <Link to="/forgot-password" className="auth-submit-btn auth-submit-btn--link">Request New Link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <span className="auth-page-eyebrow">Asgard Publications</span>
        <h1 className="auth-page-title">Choose a new password</h1>
        <p className="auth-page-text">Enter a new password for your account.</p>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>New Password</span>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="auth-field">
            <span>Confirm Password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-page-text auth-page-text--muted">
          <Link to="/login" className="auth-link">Back to Sign In</Link>
        </p>
      </div>
    </div>
  )
}
