import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyProfile, updateMyProfile } from '../../services/userService'
import FormField from '../../shared/components/FormField'
import Button from '../../shared/components/Button'

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
    maxWidth: '680px',
    width: '100%',
    padding: '40px',
  },
  header: {
    marginBottom: '28px',
    textAlign: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-ink-navy)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    background: 'var(--color-surface)',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    resize: 'vertical',
    background: 'var(--color-surface)',
    boxSizing: 'border-box',
  },
  errorBanner: {
    background: 'rgba(192, 57, 43, 0.08)',
    border: '1px solid var(--color-danger)',
    color: 'var(--color-danger)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-sm)',
    marginBottom: '20px',
  },
  note: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: '12px',
    textAlign: 'center',
  },
}

export default function CompleteProfile() {
  const { user, refetchUser } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        setFormData({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          display_name: profile.display_name || '',
          phone: profile.phone || '',
          institution: profile.institution || '',
          department: profile.department || '',
          country: profile.country || '',
          orcid_id: profile.orcid_id || '',
          bio: profile.bio || '',
        })
      })
      .catch(() => {
        if (user) {
          setFormData((prev) => ({
            ...prev,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            display_name: user.display_name || '',
          }))
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.institution.trim() || !formData.department.trim() || !formData.country.trim()) {
      setError('Institution, Department, and Country are required to complete your profile.')
      return
    }

    setSubmitting(true)
    try {
      await updateMyProfile(formData)
      await refetchUser()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading profile information...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Complete Your Academic Profile</h1>
          <p style={styles.subtitle}>
            Please fill in your affiliation and academic details before accessing the editorial system.
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <FormField label="First Name" required>
              <input
                type="text"
                style={styles.input}
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Last Name" required>
              <input
                type="text"
                style={styles.input}
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Display Name / Public Citation Name" required>
            <input
              type="text"
              style={styles.input}
              value={formData.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
              placeholder="e.g. Dr. Jane Doe"
              required
            />
          </FormField>

          <div style={styles.row}>
            <FormField label="Institution / University" required>
              <input
                type="text"
                style={styles.input}
                value={formData.institution}
                onChange={(e) => handleChange('institution', e.target.value)}
                placeholder="e.g. Stanford University"
                required
              />
            </FormField>
            <FormField label="Department" required>
              <input
                type="text"
                style={styles.input}
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="e.g. Department of Computer Science"
                required
              />
            </FormField>
          </div>

          <div style={styles.row}>
            <FormField label="Country" required>
              <input
                type="text"
                style={styles.input}
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="e.g. United States"
                required
              />
            </FormField>
            <FormField label="Phone (optional)">
              <input
                type="tel"
                style={styles.input}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 555-0199"
              />
            </FormField>
          </div>

          <FormField label="ORCID ID (optional)">
            <input
              type="text"
              style={styles.input}
              value={formData.orcid_id}
              onChange={(e) => handleChange('orcid_id', e.target.value)}
              placeholder="0000-0002-1825-0097"
            />
          </FormField>

          <FormField label="Academic Bio / Research Interests (optional)">
            <textarea
              style={styles.textarea}
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Brief summary of your field of study and research background..."
            />
          </FormField>

          <div style={{ marginTop: '28px' }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              style={{ width: '100%' }}
            >
              Complete Profile & Continue
            </Button>
          </div>

          <p style={styles.note}>
            Affiliation details are required for conflict-of-interest checks and manuscript authorship attribution.
          </p>
        </form>
      </div>
    </div>
  )
}
