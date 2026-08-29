import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import FormField from '../../shared/components/FormField'
import PageHeader from '../../shared/components/PageHeader'
import { requestExtension } from '../../services/reviewerService'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  formCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    background: 'transparent',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    background: 'transparent',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  errorText: {
    fontSize: '0.8125rem',
    color: 'var(--color-danger)',
    marginTop: '4px',
  },
}

export default function ExtensionRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    new_deadline: '',
    reason: '',
  })

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = () => {
    const next = {}
    if (!form.new_deadline) next.new_deadline = 'Please select a new deadline'
    if (!form.reason.trim()) next.reason = 'Reason is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      await requestExtension(id, {
        requested_until: new Date(form.new_deadline).toISOString(),
        reason: form.reason,
      })
      navigate('/reviewer/extensions')
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <PageHeader title="Request Extension" subtitle="Request additional time to complete this review" />

      <div style={styles.formCard}>
        <FormField label="New Deadline" required error={errors.new_deadline}>
          <input
            type="date"
            value={form.new_deadline}
            onChange={(e) => updateField('new_deadline', e.target.value)}
            style={{
              ...styles.input,
              cursor: 'pointer',
            }}
          />
        </FormField>

        <FormField label="Reason" required error={errors.reason}>
          <textarea
            value={form.reason}
            onChange={(e) => updateField('reason', e.target.value)}
            placeholder="Explain why you need an extension..."
            style={styles.textarea}
          />
        </FormField>

        <div style={styles.actions}>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Request Extension
          </Button>
        </div>
      </div>
    </div>
  )
}
