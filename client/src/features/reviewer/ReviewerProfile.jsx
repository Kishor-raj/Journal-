import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMyProfile, updateMyProfile } from '../../services/userService'

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '36px 40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    color: '#0D1B3E',
    fontSize: '1.65rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    color: '#5A6480',
    margin: '4px 0 32px',
    fontSize: '0.93rem',
  },

  // Avatar card
  avatarCard: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 2px 12px rgba(13,27,62,0.08)',
    padding: '28px 32px',
    marginBottom: '22px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  avatarCircle: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    background: 'var(--color-citation-gold)',
    color: '#0D1B3E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '1.75rem',
    flexShrink: 0,
    letterSpacing: '-0.5px',
  },
  avatarInfo: {
    flex: 1,
  },
  avatarName: {
    color: '#0D1B3E',
    fontSize: '1.2rem',
    fontWeight: 700,
    margin: 0,
  },
  avatarEmail: {
    color: '#5A6480',
    fontSize: '0.88rem',
    marginTop: '4px',
  },
  rolePill: {
    display: 'inline-block',
    marginTop: '8px',
    background: 'rgba(201,162,39,0.13)',
    color: '#B8901E',
    borderRadius: '999px',
    padding: '3px 11px',
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'capitalize',
    letterSpacing: '0.03em',
  },

  // Form card
  card: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 2px 12px rgba(13,27,62,0.08)',
    marginBottom: '22px',
    overflow: 'hidden',
  },
  cardHead: {
    padding: '18px 28px',
    borderBottom: '1px solid #E4E8F1',
  },
  cardTitle: {
    color: '#0D1B3E',
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0,
  },
  cardBody: {
    padding: '24px 28px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '18px',
    marginBottom: '18px',
  },
  fieldGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    color: '#0D1B3E',
    fontSize: '0.82rem',
    fontWeight: 600,
    marginBottom: '6px',
    letterSpacing: '0.01em',
  },
  required: {
    color: '#C0392B',
    marginLeft: '3px',
  },
  input: {
    width: '100%',
    padding: '10px 13px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    color: '#17181C',
    border: '1px solid #DDE2EE',
    borderRadius: '8px',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  inputFocus: {
    borderColor: 'var(--color-citation-gold)',
  },
  inputReadonly: {
    background: '#F7F8FC',
    color: '#5A6480',
    cursor: 'not-allowed',
  },
  textarea: {
    width: '100%',
    minHeight: '90px',
    padding: '10px 13px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    color: '#17181C',
    border: '1px solid #DDE2EE',
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    background: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },

  // Footer actions
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '8px',
  },
  saveBtn: {
    background: 'var(--color-citation-gold)',
    color: '#0D1B3E',
    border: 'none',
    padding: '10px 26px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: 700,
    transition: 'background 0.15s, opacity 0.15s',
  },
  cancelBtn: {
    background: '#fff',
    color: '#0D1B3E',
    border: '1px solid #DDE2EE',
    padding: '10px 22px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },

  // Alerts
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#ECFDF5',
    border: '1px solid #6EE7B7',
    color: '#065F46',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '0.88rem',
    marginBottom: '22px',
  },
  errorBanner: {
    background: '#FDEDEC',
    border: '1px solid rgba(192,57,43,0.3)',
    color: '#C0392B',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '0.88rem',
    marginBottom: '22px',
  },

  loading: {
    padding: '40px',
    color: '#5A6480',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initialsOf(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function Field({ label, required, children }) {
  return (
    <div style={S.fieldGroup}>
      <label style={S.label}>
        {label}
        {required && <span style={S.required}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReviewerProfile() {
  const { user, refetchUser } = useAuth()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    institution: '',
    department: '',
    country: '',
    orcid_id: '',
    bio: '',
  })
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        const data = {
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          display_name: profile.display_name || '',
          phone: profile.phone || '',
          institution: profile.institution || '',
          department: profile.department || '',
          country: profile.country || '',
          orcid_id: profile.orcid_id || '',
          bio: profile.bio || '',
        }
        setForm(data)
        setOriginal(data)
      })
      .catch(() => {
        // Fallback to auth context
        if (user) {
          const data = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            display_name: user.display_name || user.name || '',
            phone: user.phone || '',
            institution: user.institution || '',
            department: user.department || '',
            country: user.country || '',
            orcid_id: user.orcid_id || '',
            bio: user.bio || '',
          }
          setForm(data)
          setOriginal(data)
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleCancel = () => {
    if (original) setForm(original)
    setError('')
    setSuccess(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!form.institution.trim() || !form.department.trim() || !form.country.trim()) {
      setError('Institution, Department, and Country are required.')
      return
    }

    setSaving(true)
    try {
      await updateMyProfile(form)
      await refetchUser()
      setOriginal(form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(err?.message || 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={S.loading}>Loading profile…</div>

  const displayName = form.display_name || `${form.first_name} ${form.last_name}`.trim() || user?.name || 'User'
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''

  return (
    <div style={S.page}>
      <h1 style={S.title}>My Profile</h1>
      <p style={S.subtitle}>Manage your academic information and account details</p>

      {success && (
        <div style={S.successBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Profile updated successfully.
        </div>
      )}
      {error && <div style={S.errorBanner}>{error}</div>}

      {/* ── Avatar / identity card ───────────────────── */}
      <div style={S.avatarCard}>
        <div style={S.avatarCircle}>{initialsOf(displayName)}</div>
        <div style={S.avatarInfo}>
          <p style={S.avatarName}>{displayName}</p>
          <p style={S.avatarEmail}>{user?.email || '—'}</p>
          {roleLabel && <span style={S.rolePill}>{roleLabel}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Personal info ────────────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Personal Information</h2>
          </div>
          <div style={S.cardBody}>
            <div style={S.row}>
              <Field label="First Name" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.first_name}
                  onChange={set('first_name')}
                  placeholder="Jane"
                  required
                />
              </Field>
              <Field label="Last Name" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.last_name}
                  onChange={set('last_name')}
                  placeholder="Doe"
                  required
                />
              </Field>
            </div>

            <Field label="Display Name / Public Citation Name" required>
              <input
                type="text"
                style={S.input}
                value={form.display_name}
                onChange={set('display_name')}
                placeholder="e.g. Dr. Jane Doe"
                required
              />
            </Field>

            <div style={S.row}>
              <Field label="Email">
                <input
                  type="email"
                  style={{ ...S.input, ...S.inputReadonly }}
                  value={user?.email || ''}
                  readOnly
                  tabIndex={-1}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  style={S.input}
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+1 555-0199"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Academic affiliation ──────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Academic Affiliation</h2>
          </div>
          <div style={S.cardBody}>
            <div style={S.row}>
              <Field label="Institution / University" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.institution}
                  onChange={set('institution')}
                  placeholder="e.g. Stanford University"
                  required
                />
              </Field>
              <Field label="Department" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.department}
                  onChange={set('department')}
                  placeholder="e.g. Computer Science"
                  required
                />
              </Field>
            </div>

            <Field label="Country" required>
              <input
                type="text"
                style={S.input}
                value={form.country}
                onChange={set('country')}
                placeholder="e.g. India"
                required
              />
            </Field>
          </div>
        </div>

        {/* ── Research identity ─────────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHead}>
            <h2 style={S.cardTitle}>Research Identity</h2>
          </div>
          <div style={S.cardBody}>
            <Field label="ORCID iD">
              <input
                type="text"
                style={S.input}
                value={form.orcid_id}
                onChange={set('orcid_id')}
                placeholder="0000-0002-1825-0097"
              />
            </Field>

            <Field label="Academic Bio / Research Interests">
              <textarea
                style={S.textarea}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Brief summary of your research background, expertise, and areas of interest…"
              />
            </Field>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────── */}
        <div style={S.footer}>
          <button type="button" style={S.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button
            type="submit"
            style={{
              ...S.saveBtn,
              opacity: saving ? 0.65 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
