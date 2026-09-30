import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getMyProfile, updateMyProfile, uploadUserProfilePhoto, removeUserProfilePhoto } from '../../services/userService'

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
    padding: '24px 28px',
    marginBottom: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap',
  },
  avatarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    minWidth: '240px',
  },
  avatarContainer: {
    position: 'relative',
    width: '82px',
    height: '82px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(13,27,62,0.12)',
    border: '2px solid #C4922E',
    background: 'var(--color-citation-gold, #C4922E)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'var(--color-citation-gold, #C4922E)',
    color: '#0D1B3E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: '1.75rem',
    letterSpacing: '-0.5px',
  },
  avatarActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
  },
  avatarBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  photoBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    background: '#0D1B3E',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.84rem',
    fontWeight: 600,
    transition: 'background 0.15s, opacity 0.15s',
  },
  photoRemoveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#FDEDEC',
    color: '#C0392B',
    border: '1px solid rgba(192,57,43,0.25)',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.84rem',
    fontWeight: 600,
    transition: 'background 0.15s, color 0.15s',
  },
  avatarInfo: {
    flex: 1,
    minWidth: '180px',
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
  photoHint: {
    fontSize: '0.76rem',
    color: '#8A94A6',
    margin: 0,
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
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    institution: '',
    college: '',
    department: '',
    state: '',
    country: '',
    course: '',
    orcid_id: '',
    bio: '',
  })
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        setProfileImageUrl(profile.profile_image_url || '')
        const data = {
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          display_name: profile.display_name || '',
          phone: profile.phone || '',
          institution: profile.institution || '',
          college: profile.college || '',
          department: profile.department || '',
          state: profile.state || '',
          country: profile.country || '',
          course: profile.course || '',
          orcid_id: profile.orcid_id || '',
          bio: profile.bio || '',
        }
        setForm(data)
        setOriginal(data)
      })
      .catch(() => {
        // Fallback to auth context
        if (user) {
          setProfileImageUrl(user.profile_image_url || '')
          const data = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            display_name: user.display_name || user.name || '',
            phone: user.phone || '',
            institution: user.institution || '',
            college: user.college || '',
            department: user.department || '',
            state: user.state || '',
            country: user.country || '',
            course: user.course || '',
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
    setPhotoError('')
    setSuccess(false)
  }

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Please select a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file size must be less than 5MB.')
      return
    }

    setPhotoError('')
    setUploadingPhoto(true)
    try {
      const updated = await uploadUserProfilePhoto(file)
      setProfileImageUrl(updated.profile_image_url)
      await refetchUser()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setPhotoError(err?.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!profileImageUrl) return
    setPhotoError('')
    setUploadingPhoto(true)
    try {
      await removeUserProfilePhoto()
      setProfileImageUrl('')
      await refetchUser()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setPhotoError(err?.message || 'Failed to remove photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!form.institution.trim() || !form.college.trim() || !form.department.trim() || !form.state.trim() || !form.country.trim() || !form.course.trim()) {
      setError('Institute, College, Department, State, Country, and Course are required.')
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

  const rawDisplayName = (form.display_name || '').replace(/\bundefined\b/g, '').trim()
  const formFullName = [form.first_name, form.last_name].filter((n) => n && n !== 'undefined').join(' ').trim()
  const cleanUserName = (user?.name || '').replace(/\bundefined\b/g, '').trim()
  const displayName = rawDisplayName || formFullName || cleanUserName || 'User'
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
        <div style={S.avatarLeft}>
          <div style={S.avatarContainer}>
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={displayName}
                style={S.avatarImage}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex'
                  }
                }}
              />
            ) : null}
            <div
              style={{
                ...S.avatarCircle,
                display: profileImageUrl ? 'none' : 'flex',
              }}
            >
              {initialsOf(displayName)}
            </div>
          </div>
          <div style={S.avatarInfo}>
            <p style={S.avatarName}>{displayName}</p>
            <p style={S.avatarEmail}>{user?.email || '—'}</p>
            {roleLabel && <span style={S.rolePill}>{roleLabel}</span>}
          </div>
        </div>

        <div style={S.avatarActions}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelected}
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
          />

          <div style={S.avatarBtnGroup}>
            <button
              type="button"
              style={{
                ...S.photoBtn,
                opacity: uploadingPhoto ? 0.7 : 1,
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
              }}
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingPhoto ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  {profileImageUrl ? 'Change Photo' : 'Upload Photo'}
                </>
              )}
            </button>

            {profileImageUrl && !uploadingPhoto && (
              <button
                type="button"
                style={S.photoRemoveBtn}
                onClick={handleRemovePhoto}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove
              </button>
            )}
          </div>

          <p style={S.photoHint}>JPG, PNG, or WebP up to 5MB</p>
          {photoError && <div style={{ color: '#C0392B', fontSize: '0.8rem', marginTop: '4px' }}>{photoError}</div>}
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
              <Field label="College" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.college}
                  onChange={set('college')}
                  placeholder="e.g. School of Engineering"
                  required
                />
              </Field>
            </div>

            <div style={S.row}>
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
              <Field label="Course / Program" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.course}
                  onChange={set('course')}
                  placeholder="e.g. Computer Science"
                  required
                />
              </Field>
            </div>

            <div style={S.row}>
              <Field label="State / Province" required>
                <input
                  type="text"
                  style={S.input}
                  value={form.state}
                  onChange={set('state')}
                  placeholder="e.g. Tamil Nadu"
                  required
                />
              </Field>
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
