import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { register } from '../../services/authService'
import apiClient from '../../services/apiClient'

export default function Register() {
  const [searchParams] = useSearchParams()
  const invitationToken = searchParams.get('invitation') || searchParams.get('token') || ''
  const emailParam = searchParams.get('email') || ''

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState(emailParam)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [invitationData, setInvitationData] = useState(null)

  useEffect(() => {
    if (invitationToken) {
      apiClient.get('/auth/invitation/validate', { params: { token: invitationToken } })
        .then((res) => {
          if (res.valid) {
            setInvitationData(res)
            if (res.email) setEmail(res.email)
            if (res.name) {
              const parts = res.name.split(' ')
              if (parts.length > 1) {
                setFirstName(parts[0])
                setLastName(parts.slice(1).join(' '))
              } else {
                setFirstName(res.name)
              }
            }
          }
        })
        .catch(() => {
          // Token invalid/expired - user can still register normally
        })
    }
  }, [invitationToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!firstName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
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
      const data = await register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      setSuccess(true)
      return data
    } catch (err) {
      const message = err?.response?.data?.error || 'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-page-card">
          <span className="auth-page-icon" aria-hidden="true">✉</span>
          <h1 className="auth-page-title">Check your email</h1>
          <p className="auth-page-text">
            Registration successful. We&rsquo;ve sent a verification link to <strong>{email}</strong>.
            Click the link in the email to verify your account, then you can sign in.
          </p>
          <Link to="/login" className="auth-submit-btn auth-submit-btn--link">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <span className="auth-page-eyebrow">Asgard Publications</span>
        <h1 className="auth-page-title">Create your account</h1>
        <p className="auth-page-text">
          {invitationData ? (
            <span>Welcome to the IJIDCR Editorial Board! Please set up your password to activate your <strong>Editor</strong> account.</span>
          ) : (
            <span>Join Asgard Publications to submit and track your manuscripts.</span>
          )}
        </p>

        {invitationData && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #047857',
            color: '#065F46',
            padding: '12px 14px',
            borderRadius: '4px',
            fontSize: '13px',
            marginBottom: '16px',
            lineHeight: 1.5,
          }}>
            <strong>Editorial Appointment Invitation:</strong> You are registering as <strong>{invitationData.preferred_role || 'Editor'}</strong> ({invitationData.section || 'General Section'}). Once verified, your account will have Editor privileges.
          </div>
        )}

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-grid-2">
            <label className="auth-field">
              <span>First Name *</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                autoComplete="given-name"
              />
            </label>

            <label className="auth-field">
              <span>Last Name</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Email *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>Password *</span>
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
            <span>Confirm Password *</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-page-text auth-page-text--muted">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
