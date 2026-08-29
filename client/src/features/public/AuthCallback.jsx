import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
}

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 1500)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.spinner} />
        <h1 style={styles.title}>Signing you in...</h1>
        <p style={styles.text}>Please wait while we complete your authentication.</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
