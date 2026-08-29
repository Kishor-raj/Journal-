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
    marginBottom: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
  selectWrapper: {
    position: 'relative',
    marginBottom: '24px',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1.5px solid var(--color-rule-grey)',
    borderRadius: '6px',
    outline: 'none',
    background: 'var(--color-surface)',
    cursor: 'pointer',
    boxSizing: 'border-box',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 14px center',
    backgroundSize: '16px',
  },
  error: {
    marginTop: '-12px',
    marginBottom: '16px',
    fontSize: '0.8125rem',
    color: 'var(--color-danger)',
  },
}

function sanitizeName(name) {
  if (!name || typeof name !== 'string') return ''
  return name.replace(/\bundefined\b/g, '').trim()
}

export default function RoleSelect() {
  const navigate = useNavigate()
  const { user, loading, refetchUser } = useAuth()
  const [role, setRole] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const userRoles = (user?.available_roles?.length ? user.available_roles : user?.role ? [user.role] : []).filter(Boolean)
  const roles = userRoles.length > 0 ? userRoles : ROLE_LABELS.map((item) => item.value)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
      return
    }
    if (user) {
      setRole(user.role || roles[0] || 'author')
    }
  }, [user, loading, navigate])

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

  const rawName = sanitizeName(user?.display_name) || sanitizeName(user?.name)
  const fallbackName = [user?.first_name, user?.last_name]
    .filter((n) => n && n !== 'undefined')
    .join(' ')
    .trim()
  const displayName = rawName || fallbackName || (user?.email ? user.email.split('@')[0] : 'User')

  const initials = displayName
    ? displayName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
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
              alt={displayName}
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatar}>{initials}</div>
          )}
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-ink-navy)' }}>
              {displayName}
            </div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>

        <label style={styles.label}>Login as</label>
        <div style={styles.selectWrapper}>
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
                  {roleInfo?.label || (typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : value)}
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
