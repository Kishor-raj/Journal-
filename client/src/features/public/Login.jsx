import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { login, resendVerification } from '../../services/authService'
import { setStoredToken } from '../../services/apiClient'
import { useAuth } from '../../context/AuthContext'

const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/google`

/* ─── helper: validate returnTo to prevent open-redirect ─── */
function safeReturnTo(value) {
  if (!value) return null
  const candidate = String(value)
  if (!candidate.startsWith('/')) return null
  if (candidate.startsWith('//')) return null
  if (/^\/[^/]*:/.test(candidate) || candidate.includes('://')) return null
  return candidate
}

/* ─── SVG Icons ─── */
function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="m4 4 16 16" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C36.9 40.2 44 35 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function CapsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 15.8h.01" />
    </svg>
  )
}

/* ─── Particle background (left hero) ─── */
function Particles() {
  const wrapRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.innerHTML = ''
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('span')
      const size = 3 + Math.random() * 6
      p.className = 'lp-particle' + (Math.random() > 0.72 ? ' lp-particle--ring' : '')
      p.style.cssText = `
        left:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        --sway:${(Math.random() * 140 - 70).toFixed(0)}px;
        --o:${(0.2 + Math.random() * 0.5).toFixed(2)};
        animation-duration:${(9 + Math.random() * 14).toFixed(1)}s;
        animation-delay:${(-Math.random() * 20).toFixed(1)}s;
      `
      wrap.appendChild(p)
    }
  }, [])

  return <div ref={wrapRef} className="lp-particles" aria-hidden="true" />
}

/* ─── Ripple effect helper ─── */
function useRipple() {
  return useCallback((e) => {
    const btn = e.currentTarget
    const r = btn.getBoundingClientRect()
    const d = Math.max(r.width, r.height) * 2
    const span = document.createElement('span')
    span.className = 'lp-ripple-ink'
    span.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`
    btn.appendChild(span)
    span.addEventListener('animationend', () => span.remove())
  }, [])
}

/* ─── Main Login Component ─── */
export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refetchUser } = useAuth()

  const returnTo = safeReturnTo(searchParams.get('returnTo'))

  /* form state */
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [capsOn, setCapsOn] = useState(false)

  /* field-level validation */
  const [emailErr, setEmailErr] = useState('')
  const [passErr, setPassErr] = useState('')

  /* card shake ref */
  const cardRef = useRef(null)
  const stageRef = useRef(null)

  const urlError = searchParams.get('error')

  /* prefill remembered email */
  useEffect(() => {
    const saved = localStorage.getItem('asgard_email')
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  /* 3D card tilt on mouse move */
  useEffect(() => {
    const stage = stageRef.current
    const card = cardRef.current
    if (!stage || !card) return
    if (!matchMedia('(pointer:fine)').matches) return

    const onMove = (e) => {
      const r = stage.getBoundingClientRect()
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -6
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 8
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
    }
    const onLeave = () => { card.style.transform = '' }

    stage.addEventListener('mousemove', onMove)
    stage.addEventListener('mouseleave', onLeave)
    return () => {
      stage.removeEventListener('mousemove', onMove)
      stage.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  /* shake card on validation error */
  function shakeCard() {
    const card = cardRef.current
    if (!card) return
    card.classList.remove('lp-card--shake')
    void card.offsetWidth // reflow
    card.classList.add('lp-card--shake')
  }

  /* submit */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setErrorCode('')
    setResendSent(false)

    let ok = true
    const em = email.trim()

    if (!em) { setEmailErr('Email is required.'); ok = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setEmailErr('Enter a valid email address.'); ok = false }
    else { setEmailErr('') }

    if (!password) { setPassErr('Password is required.'); ok = false }
    else if (password.length < 6) { setPassErr('Password must be at least 6 characters.'); ok = false }
    else { setPassErr('') }

    if (!ok) { shakeCard(); return }

    /* remember-me */
    remember
      ? localStorage.setItem('asgard_email', em)
      : localStorage.removeItem('asgard_email')

    setLoading(true)
    try {
      const data = await login({ email: em, password })
      setStoredToken(data.token)
      setSuccess(true)
      const userData = await refetchUser()
      setTimeout(() => {
        if (returnTo) {
          navigate(returnTo, { replace: true })
        } else if (userData) {
          navigate('/auth/select-role', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }, 900)
    } catch (err) {
      const code = err?.response?.data?.code
      const message = err?.response?.data?.error || 'Login failed. Please try again.'
      setError(message)
      setErrorCode(code || '')
      shakeCard()
    } finally {
      setLoading(false)
    }
  }

  /* resend verification */
  async function handleResend() {
    setResendSent(false)
    if (!email.trim()) { setError('Enter your email to resend the verification link.'); return }
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

  const ripple = useRipple()

  return (
    <div className="lp-page">

      {/* ═══════════════ LEFT / HERO ═══════════════ */}
      <section className="lp-hero" aria-hidden="true">
        <Particles />

        <div className="lp-hero-inner">
          {/* Brand */}
          <div className="lp-brand lp-rise" style={{ '--d': '0.05s' }}>
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.6" opacity=".9" />
              <circle cx="24" cy="24" r="17.5" stroke="currentColor" strokeWidth=".8" opacity=".45" />
              <path d="M24 19.2c-2.2-1.6-5.6-1.9-8.4-.9v11.4c2.8-1 6.2-.7 8.4.9 2.2-1.6 5.6-1.9 8.4-.9V18.3c-2.8-1-6.2-.7-8.4.9Z"
                stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M24 19.2v11.4" stroke="currentColor" strokeWidth="1.2" />
              <path d="m24 8.6 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.2-2 1.2.4-2.3-1.7-1.6 2.3-.3Z" fill="currentColor" />
            </svg>
            <div>
              <strong>Asgard</strong>
              <span>Publications</span>
            </div>
          </div>

          <h1 className="lp-hero-h1 lp-rise" style={{ '--d': '0.15s' }}>
            Where research<br /><em>takes flight.</em>
          </h1>

          <p className="lp-lede lp-rise" style={{ '--d': '0.25s' }}>
            Submit, review, and publish world-class journals alongside a community
            of 48,000+ researchers across the globe.
          </p>

          {/* Floating book illustration */}
          <div className="lp-art lp-rise" style={{ '--d': '0.35s' }}>
            <svg viewBox="0 0 520 400" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="lpPageL" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fdfaf2" /><stop offset="1" stopColor="#efe6cf" />
                </linearGradient>
                <linearGradient id="lpPageR" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fdfaf2" /><stop offset="1" stopColor="#efe6cf" />
                </linearGradient>
                <radialGradient id="lpGlow" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor="#e9c04a" stopOpacity=".26" />
                  <stop offset="1" stopColor="#e9c04a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="260" cy="215" r="185" fill="url(#lpGlow)" />
              <ellipse cx="260" cy="332" rx="150" ry="15" fill="#0b1526" opacity=".55" />
              <g className="lp-float">
                <path d="M84 238c50-22 128-26 176 2 48-28 126-24 176 2v14c-50-26-128-30-176-2-48-28-126-24-176 2Z" fill="#8a6a14" />
                <path d="M88 232c50-22 128-26 176 2 48-28 126-24 176 2v16c-50-26-128-30-176-2-48-28-126-24-176 2Z" fill="#c9a227" />
                <path d="M260 240c-44-26-116-28-166-6v58c50-22 122-20 166 6Z" fill="url(#lpPageL)" />
                <path d="M260 240c44-26 116-28 166-6v58c-50-22-122-20-166 6Z" fill="url(#lpPageR)" />
                <path d="M260 240c-3 2-3 58 0 58s3-56 0-58Z" fill="#d9cba4" />
                <g stroke="#c9a227" strokeWidth="4" strokeLinecap="round" opacity=".85">
                  <path d="M118 250c26-8 54-9 76-2" />
                  <path d="M118 268c26-8 54-9 76-2" />
                  <path d="M118 286c20-6 42-7 60-2" opacity=".55" />
                </g>
                <g stroke="#b9c2d8" strokeWidth="4" strokeLinecap="round" opacity=".8">
                  <path d="M326 248c22-7 50-6 76 2" />
                  <path d="M326 266c22-7 50-6 76 2" />
                  <path d="M326 284c18-6 38-5 56 1" opacity=".55" />
                </g>
                <path d="M256 298l-8 34 9-6 8 6 2-34Z" fill="#c9a227" />
              </g>
              <g className="lp-float lp-float--2">
                <g transform="translate(392 92) rotate(18)">
                  <path d="M0 46C6 22 22 4 44 0c-2 22-14 40-34 48Z" fill="#f6efe0" />
                  <path d="M0 46C6 22 22 4 44 0" stroke="#c9a227" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4 44 22 26" stroke="#c9a227" strokeWidth="1.6" opacity=".7" />
                  <path d="M-8 56l8-10 4 4Z" fill="#c9a227" />
                </g>
              </g>
              <g className="lp-float lp-float--3">
                <g transform="translate(96 104) rotate(-10)">
                  <rect width="52" height="66" rx="6" fill="#f6efe0" />
                  <g stroke="#c9a227" strokeWidth="3.4" strokeLinecap="round">
                    <path d="M11 16h30M11 28h30M11 40h20" />
                  </g>
                </g>
              </g>
              <g className="lp-float lp-float--2">
                <g transform="translate(430 188) rotate(8)">
                  <rect width="44" height="56" rx="6" fill="#f6efe0" />
                  <g stroke="#b9c2d8" strokeWidth="3.2" strokeLinecap="round">
                    <path d="M9 14h26M9 25h26M9 36h16" />
                  </g>
                </g>
              </g>
              <g fill="#e9c04a">
                <path className="lp-twinkle" d="M204 64l4.5 12 12 4.5-12 4.5-4.5 12-4.5-12-12-4.5 12-4.5Z" />
                <path className="lp-twinkle lp-twinkle--2" d="M336 44l3.6 9.6 9.6 3.6-9.6 3.6-3.6 9.6-3.6-9.6-9.6-3.6 9.6-3.6Z" />
                <path className="lp-twinkle lp-twinkle--3" d="M468 84l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
              </g>
              <g stroke="#e9c04a" opacity=".65">
                <circle className="lp-float lp-float--3" cx="76" cy="196" r="7" />
                <circle className="lp-float" cx="470" cy="252" r="5" />
                <circle className="lp-float lp-float--2" cx="140" cy="46" r="4" />
              </g>
            </svg>
          </div>

          {/* Stats */}
          <ul className="lp-stats lp-rise" style={{ '--d': '0.45s' }}>
            <li><b>120+</b><span>Journals</span></li>
            <li><b>48k</b><span>Researchers</span></li>
            <li><b>190</b><span>Countries</span></li>
          </ul>

          <p className="lp-quote lp-rise" style={{ '--d': '0.55s' }}>
            "Quality is never an accident — it is always the result of intelligent effort."
          </p>
        </div>
      </section>

      {/* ═══════════════ RIGHT / AUTH ═══════════════ */}
      <section className="lp-auth">
        <span className="lp-deco lp-deco--ring1" aria-hidden="true" />
        <span className="lp-deco lp-deco--ring2" aria-hidden="true" />

        <div className="lp-stage" ref={stageRef}>
          <div className="lp-card" ref={cardRef}>

            {/* Crest header */}
            <div className="lp-crest lp-rise" style={{ '--d': '0.05s' }}>
              <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.6" />
                <path d="M24 19.2c-2.2-1.6-5.6-1.9-8.4-.9v11.4c2.8-1 6.2-.7 8.4.9 2.2-1.6 5.6-1.9 8.4-.9V18.3c-2.8-1-6.2-.7-8.4.9Z"
                  stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M24 19.2v11.4" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span>Asgard Publications</span>
            </div>

            <h2 className="lp-card-h2 lp-rise" style={{ '--d': '0.12s' }}>Welcome back</h2>
            <p className="lp-card-sub lp-rise" style={{ '--d': '0.18s' }}>
              Sign in to continue to your editorial dashboard.
            </p>

            {/* Error alert */}
            {(urlError || error) && (
              <div className="lp-alert lp-alert--error" role="alert">
                {urlError === 'auth_failed' ? 'Authentication failed. Please try again.' : error}
                {errorCode === 'EMAIL_NOT_VERIFIED' && (
                  <button type="button" className="lp-alert-action" onClick={handleResend} disabled={loading}>
                    {resendSent ? 'Verification email sent. Check your inbox.' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}

            {/* Google button */}
            <a
              href={GOOGLE_AUTH_URL}
              className="lp-btn-google lp-ripple lp-rise"
              style={{ '--d': '0.24s' }}
              onClick={ripple}
            >
              <GoogleIcon />
              Continue with Google
            </a>

            <div className="lp-divider lp-rise" style={{ '--d': '0.30s' }}>
              <span>or sign in with email</span>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* Email field */}
              <div className={`lp-field lp-rise${emailErr ? ' lp-field--invalid' : ''}`} style={{ '--d': '0.34s' }}>
                <span className="lp-field-icon"><EmailIcon /></span>
                <input
                  type="email"
                  id="lp-email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailErr('') }}
                  autoComplete="email"
                />
                <label htmlFor="lp-email">Email address</label>
                {emailErr && <small className="lp-err">{emailErr}</small>}
              </div>

              {/* Password field */}
              <div className={`lp-field lp-rise${passErr ? ' lp-field--invalid' : ''}`} style={{ '--d': '0.40s' }}>
                <span className="lp-field-icon"><LockIcon /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="lp-password"
                  placeholder=" "
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassErr('') }}
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.getModifierState) setCapsOn(e.getModifierState('CapsLock')) }}
                  onKeyUp={(e) => { if (e.getModifierState) setCapsOn(e.getModifierState('CapsLock')) }}
                  onBlur={() => setCapsOn(false)}
                />
                <label htmlFor="lp-password">Password</label>
                <button
                  type="button"
                  className={`lp-eye${showPassword ? ' lp-eye--showing' : ''}`}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
                {passErr && <small className="lp-err">{passErr}</small>}
              </div>

              {/* Caps-lock hint */}
              {capsOn && (
                <p className="lp-caps-hint">
                  <CapsIcon /> Caps Lock is on
                </p>
              )}

              {/* Remember / Forgot row */}
              <div className="lp-row lp-rise" style={{ '--d': '0.46s' }}>
                <label className="lp-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="lp-check-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  Remember me
                </label>
                <Link to="/forgot-password" className="lp-link">Forgot password?</Link>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className={`lp-btn-primary lp-ripple lp-rise${loading ? ' lp-btn-primary--loading' : ''}${success ? ' lp-btn-primary--success' : ''}`}
                style={{ '--d': '0.52s' }}
                disabled={loading || success}
                onClick={ripple}
              >
                <span className="lp-spinner" aria-hidden="true" />
                <span className="lp-btn-label">
                  {success ? 'Signed in!' : loading ? 'Signing in…' : 'Sign In'}
                </span>
                {!loading && !success && <ArrowIcon />}
                {success && <CheckIcon />}
              </button>
            </form>

            <p className="lp-switch lp-rise" style={{ '--d': '0.58s' }}>
              New to Asgard?{' '}
              <Link to="/register" className="lp-link">Create an account</Link>
            </p>
            <p className="lp-terms lp-rise" style={{ '--d': '0.64s' }}>
              By signing in, you agree to our{' '}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
