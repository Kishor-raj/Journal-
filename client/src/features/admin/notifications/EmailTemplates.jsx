import React, { useState, useEffect, useCallback } from 'react'
import {
  getEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
  sendTemplateTestEmail,
} from '../../../services/emailAdminService'
import Table from '../../../shared/components/Table'
import Button from '../../../shared/components/Button'
import Modal from '../../../shared/components/Modal'
import FormField from '../../../shared/components/FormField'
import PageHeader from '../../../shared/components/PageHeader'
import EmptyState from '../../../shared/components/EmptyState'
import { formatDateTime } from '../../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: '180px',
    padding: '10px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--color-ink-black)',
    lineHeight: 1.5,
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  previewBox: {
    background: 'rgba(0,0,0,0.035)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    wordBreak: 'break-word',
  },
  varChip: {
    display: 'inline-block',
    background: '#E3EEF9',
    color: '#1565C0',
    padding: '3px 8px',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontFamily: 'var(--font-mono)',
    margin: '2px',
  },
  msg: {
    padding: '10px 14px',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: 'var(--text-sm)',
  },
}

function getActiveBadge(val) {
  return val
    ? { background: '#EAF7F0', color: 'var(--color-success)' }
    : { background: '#FDEDEC', color: 'var(--color-danger)' }
}

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // template being edited
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('info')
  const [previewHtml, setPreviewHtml] = useState(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [testMsg, setTestMsg] = useState('')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEmailTemplates()
      setTemplates(Array.isArray(data) ? data : [])
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMsgType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const openEditor = (template) => {
    setSelected(template)
    setForm({
      subject: template.subject || '',
      body_html: template.body_html || '',
      body_text: template.body_text || '',
      is_active: template.is_active !== false,
    })
    setPreviewHtml(null)
    setTestMsg('')
    setTestRecipient('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.subject?.trim()) {
      showMessage('Subject is required.', 'error')
      return
    }
    setSaving(true)
    try {
      const updated = await updateEmailTemplate(selected.template_key, {
        subject: form.subject.trim(),
        body_html: form.body_html,
        body_text: form.body_text,
        is_active: form.is_active,
      })
      showMessage(`Template "${selected.template_key}" saved.`, 'success')
      setSelected(updated)
      fetchTemplates()
    } catch (err) {
      showMessage(err?.response?.data?.error || 'Failed to save template.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    try {
      const preview = await previewEmailTemplate(selected.template_key, {})
      setPreviewHtml(preview)
      if (preview.missing_variables?.length) {
        showMessage(`Missing variables: ${preview.missing_variables.join(', ')}`, 'warning')
      }
    } catch (err) {
      showMessage(err?.response?.data?.error || 'Failed to render preview.', 'error')
    }
  }

  const handleSendTest = async () => {
    if (!testRecipient.trim()) {
      setTestMsg('Enter a recipient email.')
      return
    }
    try {
      const result = await sendTemplateTestEmail(selected.template_key, testRecipient.trim())
      setTestMsg(result.success || result.skipped ? 'Test email sent successfully.' : 'Test email failed.')
    } catch (err) {
      setTestMsg(err?.response?.data?.error || 'Test email failed.')
    }
  }

  const columns = [
    {
      key: 'template_key',
      label: 'Template Key',
      render: (val) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>{(val || '').toUpperCase()}</span>,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (val) => val || '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span style={{ ...styles.badge, ...getActiveBadge(val) }}>
          {val ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (val) => (val ? formatDateTime(val) : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => openEditor(row)}>Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader
        title="Email Templates"
        subtitle="Manage the journal's notification email templates, enable/disable status, and preview content."
      />

      {message && (
        <div style={{ ...styles.msg, background: msgType === 'error' ? '#FDEDEC' : msgType === 'success' ? '#EAF7F0' : '#FFF7ED', color: msgType === 'error' ? 'var(--color-danger)' : msgType === 'success' ? 'var(--color-success)' : 'var(--color-warning)' }}>
          {message}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>Loading templates...</p>
      ) : templates.length === 0 ? (
        <EmptyState icon="📝" message="No email templates found." />
      ) : (
        <Table columns={columns} data={templates} />
      )}

      {selected && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Edit Template: ${selected.template_key}`}
        >
          <div style={{ marginBottom: '16px' }}>
            <span style={styles.varChip}>firstName</span>
            <span style={styles.varChip}>lastName</span>
            <span style={styles.varChip}>email</span>
            <span style={styles.varChip}>manuscriptTitle</span>
            <span style={styles.varChip}>manuscriptId</span>
            <span style={styles.varChip}>decision</span>
            <span style={styles.varChip}>decisionComments</span>
            <span style={styles.varChip}>reviewDeadline</span>
            <span style={styles.varChip}>verificationUrl</span>
            <span style={styles.varChip}>resetPasswordUrl</span>
            <span style={styles.varChip}>invitationUrl</span>
            <span style={styles.varChip}>journalName</span>
            <span style={styles.varChip}>journalUrl</span>
          </div>

          <FormField label="Status">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              {form.is_active ? 'Enabled' : 'Disabled'}
            </label>
          </FormField>

          <FormField label="Subject" required>
            <input
              type="text"
              style={styles.input}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </FormField>

          <FormField label="HTML Template">
            <textarea
              style={styles.textarea}
              value={form.body_html}
              onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))}
            />
          </FormField>

          <FormField label="Plain Text Template">
            <textarea
              style={{ ...styles.textarea, minHeight: '120px' }}
              value={form.body_text}
              onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
            />
          </FormField>

          {previewHtml && (
            <FormField label="Preview">
              <div style={styles.previewBox}>
                <div><strong>Subject:</strong> {previewHtml.subject}</div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-rule-grey)' }}>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml.html }} />
                </div>
                {previewHtml.text && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-rule-grey)' }}>
                    <strong>Plain text:</strong>
                    <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{previewHtml.text}</pre>
                  </div>
                )}
              </div>
            </FormField>
          )}

          <FormField label="Send Test Email">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="email"
                style={{ ...styles.input, fontFamily: 'var(--font-body)' }}
                placeholder="admin@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
              />
              <Button variant="secondary" onClick={handleSendTest}>Send Test</Button>
            </div>
            {testMsg && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '6px' }}>{testMsg}</div>}
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--color-rule-grey)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={handlePreview}>Preview</Button>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            </div>
            <Button variant="primary" loading={saving} onClick={handleSave}>Save Changes</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}