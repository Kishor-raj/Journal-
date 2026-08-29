import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import { useAuth } from '../../context/AuthContext'
import { selectRole } from '../../services/authService'

const ROLE_LABELS = [
  { value: 'admin', label: 'Admin' },
  { value: 'author', label: 'Author' },
  { value: 'editor', label: 'Editor' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'reviewer', label: 'Reviewer' },
]

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-vellum)',
    padding: '40px 20px',
    fontFamily: 'var(--font-body)',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    maxWidth: '480px',
    width: '100%',
    padding: '40px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-ink-navy)',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '28px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    background: 'rgba(47, 74, 62, 0.06)',
    border: '1px solid var(--color-rule-grey)',
    marginBottom: '20px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    background: 'var(--color-archive-green)',
    color: 'var(--color-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1rem',
  },
  userEmail: {
    fontSize: '0.875rem',
    color: 'var(--color-ink-black)',
    fontWeight: 500,
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    background: 'transparent',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  error: {
    marginTop: '8px',
    fontSize: '0.8125rem',
    color: 'var(--color-danger)',
  },
}

export default function RoleSelect() {
  const navigate = useNavigate()
  const { user, loading, refetchUser } = useAuth()
  const [role, setRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
      return
    }
    if (user) setRole(user.role || '')
  }, [user, loading, navigate])

  const roles = (user?.available_roles || [user?.role]).filter(Boolean)

  const handleSelect = async () => {
    if (!role) {
      setError('Please select a role to continue')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await selectRole(role)
      await refetchUser()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'Failed to select role')
      setSubmitting(false)
    }
  }

  const initials = user?.display_name
    ? user.display_name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Choose your role</h1>
        <p style={styles.subtitle}>
          You signed in successfully. Select which role you would like to use for this session.
        </p>

        <div style={styles.userBadge}>
          {user?.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={user.display_name || 'avatar'}
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatar}>{initials}</div>
          )}
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-ink-navy)' }}>
              {user?.display_name || 'User'}
            </div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>

        <label style={styles.label}>Login as</label>
        <div
          style={{
            border: '1px solid var(--color-rule-grey)',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setError('')
            }}
            style={styles.select}
          >
            <option value="" disabled>
              Select a role...
            </option>
            {roles.map((value) => {
              const roleInfo = ROLE_LABELS.find((item) => item.value === value)
              return (
                <option key={value} value={value}>
                  {roleInfo?.label || value}
                </option>
              )
            })}
          </select>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <Button variant="primary" loading={submitting} onClick={handleSelect} style={{ width: '100%' }}>
          Continue
        </Button>
      </div>
    </div>
  )
}
