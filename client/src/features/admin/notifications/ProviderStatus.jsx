import React, { useState, useEffect } from 'react'
import {
  getEmailProviderHealth,
  validateEmailTemplates,
  runEmailWorker,
} from '../../../services/emailAdminService'
import Button from '../../../shared/components/Button'
import PageHeader from '../../../shared/components/PageHeader'
import { formatDateTime } from '../../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px 28px',
    marginTop: '24px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    marginBottom: '16px',
    fontWeight: 600,
  },
  label: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '2px',
  },
  val: {
    color: 'var(--color-ink-black)',
    fontWeight: 500,
    fontSize: 'var(--text-sm)',
    wordBreak: 'break-word',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  pill: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'var(--text-sm)',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontWeight: 600,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-ink-navy)',
    borderBottom: '1px solid var(--color-rule-grey)',
    background: 'rgba(0,0,0,0.02)',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-rule-grey)',
    color: 'var(--color-ink-black)',
  },
  monoBox: {
    background: 'rgba(0,0,0,0.04)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '4px',
    padding: '12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  message: {
    padding: '10px 14px',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: 'var(--text-sm)',
  },
}

function getProviderPill(healthy) {
  return healthy
    ? { background: '#EAF7F0', color: 'var(--color-success)' }
    : { background: '#FDEDEC', color: 'var(--color-danger)' }
}

export default function ProviderStatus() {
  const [health, setHealth] = useState(null)
  const [validation, setValidation] = useState(null)
  const [workerResult, setWorkerResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [runningWorker, setRunningWorker] = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('info')

  useEffect(() => {
    getEmailProviderHealth()
      .then(setHealth)
      .catch((err) => setHealth({ provider: 'error', status: 'error', error: err?.response?.data?.error || 'Unable to reach provider health endpoint.' }))
      .finally(() => setLoading(false))
  }, [])

  const showMessage = (text, type = 'info') => {
    setMessage(text)
    setMsgType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleValidate = async () => {
    setValidating(true)
    try {
      const result = await validateEmailTemplates()
      setValidation(result)
    } catch (err) {
      setValidation(null)
      showMessage(err?.response?.data?.error || 'Validation failed.', 'error')
    } finally {
      setValidating(false)
    }
  }

  const handleRunWorker = async () => {
    if (!window.confirm('Run the email worker now (process queued emails)?')) return
    setRunningWorker(true)
    try {
      const result = await runEmailWorker()
      setWorkerResult(result)
      showMessage('Worker run completed.', 'success')
    } catch (err) {
      setWorkerResult(null)
      showMessage(err?.response?.data?.error || 'Worker run failed.', 'error')
    } finally {
      setRunningWorker(false)
    }
  }

  const provider = health?.provider || 'unknown'
  const healthy = health?.status === 'ok'

  return (
    <div style={styles.page}>
      <PageHeader
        title="Email Provider Status"
        subtitle="Health of the email delivery provider (Resend) and administrative worker tooling."
      />

      {message && (
        <div style={{ ...styles.message, background: msgType === 'error' ? '#FDEDEC' : '#EAF7F0', color: msgType === 'error' ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {message}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>Checking provider health...</p>
      ) : (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Provider: {provider}</h2>
          <div style={styles.grid}>
            <div>
              <div style={styles.label}>Status</div>
              <span style={{ ...styles.pill, ...getProviderPill(healthy) }}>{health?.status || 'unknown'}</span>
            </div>
            <div>
              <div style={styles.label}>Checked At</div>
              <div style={styles.val}>{health?.checked_at ? formatDateTime(health.checked_at) : '—'}</div>
            </div>
            <div>
              <div style={styles.label}>Region</div>
              <div style={styles.val}>{health?.region || '—'}</div>
            </div>
          </div>
          {health?.error && <div style={{ marginTop: '16px', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{health.error}</div>}
          {health?.meta && (
            <div style={{ marginTop: '16px' }}>
              <div style={styles.label}>Provider Details</div>
              <div style={{ ...styles.monoBox, marginTop: '6px' }}>{JSON.stringify(health.meta, null, 2)}</div>
            </div>
          )}
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Template Validation</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 0 }}>
          Validate all email templates against sample variables to detect missing or malformed replacement tokens.
        </p>
        <Button variant="secondary" loading={validating} onClick={handleValidate}>Validate All Templates</Button>

        {validation && (
          <div style={{ marginTop: '20px' }}>
            {Array.isArray(validation.templates) && validation.templates.length > 0 && (
              <table style={{ ...styles.table, marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Variables</th>
                    <th style={styles.th}>Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {validation.templates.map((t) => (
                    <tr key={t.template_key}>
                      <td style={styles.td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{t.template_key.toUpperCase()}</span></td>
                      <td style={styles.td}>{t.subject}</td>
                      <td style={styles.td}>{(t.variables || []).join(', ')}</td>
                      <td style={styles.td}><span style={{ ...styles.pill, ...getProviderPill(t.ok) }}>{t.ok ? 'OK' : t.missing?.length ? `Missing: ${t.missing.join(', ')}` : 'Error'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {validation.error && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', marginTop: '12px' }}>{validation.error}</div>}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Worker</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 0 }}>
          Manually trigger the email background worker to process queued / retrying notifications.
        </p>
        <Button loading={runningWorker} onClick={handleRunWorker}>Run Worker Now</Button>
        {workerResult && (
          <div style={{ ...styles.monoBox, marginTop: '16px' }}>{JSON.stringify(workerResult, null, 2)}</div>
        )}
      </div>
    </div>
  )
}