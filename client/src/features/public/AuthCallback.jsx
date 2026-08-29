import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { setStoredToken } from '../../services/apiClient'

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--color-vellum)',
  },
  content: {
    textAlign: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    color: 'var(--color-ink-navy)',
    marginBottom: '1rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--color-rule-grey)',
    borderTopColor: 'var(--color-citation-gold)',
    borderRadius: '50%',
    margin: '0 auto 1.5rem',
    animation: 'spin 0.8s linear infinite',
  },
  text: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
  },
  errorText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--color-danger, #d9534f)',
    marginTop: '0.75rem',
  },
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refetchUser } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function handleAuth() {
      const token = searchParams.get('token')
      const oauthError = searchParams.get('error')

      if (oauthError) {
        navigate(`/login?error=${encodeURIComponent(oauthError)}`, { replace: true })
        return
      }

      if (token) {
        setStoredToken(token)
      }

      try {
        const userData = await refetchUser()
        if (!isMounted) return

        if (userData) {
          navigate('/auth/select-role', { replace: true })
        } else {
          setError('Authentication verification failed. Redirecting to login...')
          setTimeout(() => navigate('/login', { replace: true }), 1500)
        }
      } catch (err) {
        if (!isMounted) return
        setError(err?.message || 'Authentication error. Redirecting to login...')
        setTimeout(() => navigate('/login', { replace: true }), 1500)
      }
    }

    handleAuth()

    return () => {
      isMounted = false
    }
  }, [navigate, searchParams, refetchUser])

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.spinner} />
        <h1 style={styles.title}>Signing you in...</h1>
        <p style={styles.text}>Please wait while we complete your authentication.</p>
        {error && <p style={styles.errorText}>{error}</p>}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
