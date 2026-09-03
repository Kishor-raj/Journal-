import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login, resendVerification } from '../../services/authService'
import { setStoredToken } from '../../services/apiClient'
import { useAuth } from '../../context/AuthContext'

const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/google`

function DeskIllustration() {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="54" y="34" width="66" height="48" rx="4" fill="var(--color-vellum)" stroke="var(--color-rule)" strokeWidth="2" />
      <path d="M62 72 L 80 50 L 92 64 L 102 52 L 114 72 Z" fill="var(--color-gold-light)" opacity="0.7" />
      <circle cx="300" cy="58" r="20" fill="none" stroke="var(--color-rule)" strokeWidth="3" />
      <line x1="300" y1="58" x2="300" y2="46" stroke="var(--color-rule)" strokeWidth="2" strokeLinecap="round" />
      <line x1="300" y1="58" x2="309" y2="58" stroke="var(--color-rule)" strokeWidth="2" strokeLinecap="round" />

      <rect x="44" y="112" width="100" height="104" rx="3" fill="var(--color-vellum)" stroke="var(--color-rule)" strokeWidth="2" />
      <rect x="56" y="126" width="12" height="78" fill="var(--color-ink-navy)" />
      <rect x="72" y="126" width="12" height="78" fill="var(--color-gold)" />
      <rect x="88" y="126" width="12" height="78" fill="var(--color-ink-light)" />
      <rect x="104" y="126" width="12" height="78" fill="var(--color-gold-light)" />
      <rect x="120" y="126" width="12" height="78" fill="var(--color-ink-navy)" />

      <path d="M100 220 C 78 224, 70 250, 78 284" stroke="var(--color-ink-subtle)" strokeWidth="9" strokeLinecap="round" fill="none" />

      <rect x="58" y="304" width="9" height="46" fill="var(--color-ink-subtle)" />
      <rect x="357" y="304" width="9" height="46" fill="var(--color-ink-subtle)" />

      <circle cx="144" cy="210" r="19" fill="#C98A5E" />
      <rect x="120" y="228" width="48" height="64" rx="16" fill="var(--color-ink-navy)" />
      <path d="M156 244 C 172 250, 182 262, 186 278" stroke="var(--color-ink-navy)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <rect x="122" y="286" width="20" height="76" rx="7" fill="var(--color-ink-subtle)" />
      <rect x="150" y="286" width="20" height="76" rx="7" fill="var(--color-ink-subtle)" />
      <rect x="118" y="352" width="28" height="12" rx="6" fill="var(--color-ink-body)" />
      <rect x="146" y="352" width="28" height="12" rx="6" fill="var(--color-ink-body)" />

      <rect x="192" y="226" width="128" height="80" rx="5" fill="var(--color-ink-navy)" />
      <rect x="200" y="234" width="112" height="60" rx="2" fill="var(--color-surface)" />
      <rect x="210" y="244" width="92" height="9" rx="2" fill="var(--color-vellum)" />
      <rect x="210" y="260" width="92" height="9" rx="2" fill="var(--color-vellum)" />
      <rect x="210" y="278" width="92" height="11" rx="5.5" fill="var(--color-gold)" />

      <path d="M338 268 C 328 256, 328 240, 338 228" stroke="var(--color-archive-green)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M338 268 C 346 254, 350 240, 342 230" stroke="var(--color-archive-green)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M338 268 C 334 250, 340 236, 338 224" stroke="var(--color-archive-green)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="324" y="266" width="28" height="24" rx="4" fill="var(--color-gold-dark)" />

      <rect x="50" y="292" width="316" height="12" rx="3" fill="var(--color-ink-navy)" />

      <path d="M64 348 L 70 380 L 94 380 L 100 348 Z" fill="var(--color-ink-light)" opacity="0.75" />
      <rect x="61" y="344" width="42" height="7" rx="2" fill="var(--color-ink-light)" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function safeReturnTo(value) {
  if (!value) return null
  const candidate = String(value)
  if (!candidate.startsWith('/')) return null
  if (candidate.startsWith('//')) return null
  if (/^\/[^/]*:/.test(candidate) || candidate.includes('://')) return null
  return candidate
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refetchUser } = useAuth()

  const returnTo = safeReturnTo(searchParams.get('returnTo'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [resendSent, setResendSent] = useState(false)

  const urlError = searchParams.get('error')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setErrorCode('')
    setResendSent(false)

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    try {
      const data = await login({ email, password })
      setStoredToken(data.token)
      const userData = await refetchUser()
      if (returnTo) {
        navigate(returnTo, { replace: true })
      } else if (userData) {
        navigate('/auth/select-role', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      const code = err?.response?.data?.code
      const message = err?.response?.data?.error || 'Login failed. Please try again.'
      setError(message)
      setErrorCode(code || '')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendSent(false)
    if (!email.trim()) {
      setError('Enter your email to resend the verification link.')
      return
    }
    setLoading(true)
    try {
      await resendVerification(email)
      setError('')
      setResendSent(true)
    } catch {
      setError('Unable to resend verification email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-illustration">
        <img className="login-illustration-logo" src="/asgard-logo.jpg" alt="Asgard Publications" />
        <DeskIllustration />
      </div>

      <div className="login-panel">
        <span className="login-panel-ring login-panel-ring--outer" />
        <span className="login-panel-ring login-panel-ring--inner" />

        <div className="login-card">
          <h1 className="login-card-title">Hello!</h1>
          <p className="login-card-subtitle">Sign in to continue to Asgard Publications</p>

          {(urlError || error) && (
            <div className="auth-alert auth-alert--error">
              {urlError === 'auth_failed' ? 'Authentication failed. Please try again.' : error}
              {errorCode === 'EMAIL_NOT_VERIFIED' && (
                <button type="button" className="auth-alert-link" onClick={handleResend} disabled={loading}>
                  {resendSent ? 'Verification email sent. Check your inbox.' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-links">
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>

          <div className="auth-divider"><span>OR</span></div>

          <a href={GOOGLE_AUTH_URL} className="login-google-btn">
            <GoogleIcon />
            Continue with Google
          </a>

          <p className="login-footer">
            Don't have an account? <Link to="/register" className="auth-link">Create account</Link>
          </p>

          <p className="login-footer">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
