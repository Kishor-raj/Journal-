import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNotificationDetail, retryNotification } from '../../../services/emailAdminService'
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
    padding: '28px 32px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    marginBottom: '16px',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    fontSize: 'var(--text-sm)',
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
    wordBreak: 'break-word',
  },
  jsonBlock: {
    background: 'rgba(0,0,0,0.04)',
    padding: '10px 12px',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    overflowX: 'auto',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  error: {
    background: '#FDEDEC',
    color: 'var(--color-danger)',
    padding: '10px 14px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: 'var(--text-sm)',
  },
}

function getStatusBadge(status) {
  switch (status) {
    case 'sent':
      return { background: '#EAF7F0', color: 'var(--color-success)' }
    case 'failed':
      return { background: '#FDEDEC', color: 'var(--color-danger)' }
    case 'retrying':
    case 'queued':
    case 'sending':
      return { background: '#FFF7ED', color: 'var(--color-warning)' }
    default:
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
  }
}

export default function NotificationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retryError, setRetryError] = useState('')
  const [retrySuccess, setRetrySuccess] = useState('')
  const [retryLoading, setRetryLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    getNotificationDetail(id)
      .then((data) => { if (mounted) setNotification(data) })
      .catch((err) => { if (mounted) setRetryError(err?.response?.data?.error || 'Failed to load notification.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [id])

  const handleRetry = async () => {
    setRetryError('')
    setRetrySuccess('')
    setRetryLoading(true)
    try {
      await retryNotification(id)
      setRetrySuccess(`Resend queued for notification ${id.slice(0, 8)}.`)
      const data = await getNotificationDetail(id)
      setNotification(data)
    } catch (err) {
      setRetryError(err?.response?.data?.error || 'Unable to resend notification.')
    } finally {
      setRetryLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading notification detail...</p>
      </div>
    )
  }

  if (!notification) {
    return (
      <div style={styles.page}>
        <PageHeader title="Notification Not Found" subtitle="The requested notification could not be located." />
        <Button variant="secondary" onClick={() => navigate('/admin/notifications')}>Back to History</Button>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <PageHeader
        title="Notification Detail"
        subtitle={`Audit view for notification ${notification.id}`}
        action={<Button variant="ghost" onClick={() => navigate('/admin/notifications')}>← Back to History</Button>}
      />

      {retryError && <div style={styles.error}>{retryError}</div>}
      {retrySuccess && <div style={{ background: '#EAF7F0', color: 'var(--color-success)', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>{retrySuccess}</div>}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Notification Information</h2>
        <div style={styles.grid}>
          <div>
            <div style={styles.label}>Notification ID</div>
            <div style={styles.val}>{notification.id}</div>
          </div>
          <div>
            <div style={styles.label}>Event</div>
            <div style={styles.val}>{(notification.template_key || '').toUpperCase()}</div>
          </div>
          <div>
            <div style={styles.label}>Status</div>
            <span style={{ ...styles.badge, ...getStatusBadge(notification.status) }}>{notification.status}</span>
          </div>
          <div>
            <div style={styles.label}>Attempts</div>
            <div style={styles.val}>{notification.attempt_count ?? 0}</div>
          </div>
          <div>
            <div style={styles.label}>Created At</div>
            <div style={styles.val}>{formatDateTime(notification.created_at)}</div>
          </div>
          <div>
            <div style={styles.label}>Sent At</div>
            <div style={styles.val}>{notification.sent_at ? formatDateTime(notification.sent_at) : '—'}</div>
          </div>
          <div>
            <div style={styles.label}>Recipient</div>
            <div style={styles.val}>{notification.recipient_email || '—'}</div>
          </div>
          <div>
            <div style={styles.label}>Provider</div>
            <div style={styles.val}>{notification.provider || '—'}</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Workflow Context</h2>
        <div style={styles.grid}>
          <div>
            <div style={styles.label}>Manuscript ID</div>
            <div style={styles.val}>{notification.manuscript_id ? `#${notification.manuscript_id.slice(0, 8)}` : '—'}</div>
          </div>
          <div>
            <div style={styles.label}>Submission Number</div>
            <div style={styles.val}>{notification.submission_number || '—'}</div>
          </div>
          <div>
            <div style={styles.label}>Author / Recipient</div>
            <div style={styles.val}>{notification.recipient_name || notification.recipient_current_email || notification.recipient_email || '—'}</div>
          </div>
          <div>
            <div style={styles.label}>Event Key</div>
            <div style={styles.val}>{notification.event_key || '—'}</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Provider Information</h2>
        <div style={styles.grid}>
          <div>
            <div style={styles.label}>Provider Message ID</div>
            <div style={styles.val}>{notification.provider_message_id || '—'}</div>
          </div>
          <div>
            <div style={styles.label}>Last Error</div>
            <div style={styles.val}>{notification.last_error || 'None'}</div>
          </div>
          <div>
            <div style={styles.label}>Failed At</div>
            <div style={styles.val}>{notification.failed_at ? formatDateTime(notification.failed_at) : '—'}</div>
          </div>
        </div>

        {(notification.status === 'failed' || notification.status === 'retrying') && (
          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="danger" loading={retryLoading} onClick={handleRetry}>Resend Notification</Button>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Only safe for non-security-sensitive notifications.
            </span>
          </div>
        )}
      </div>

      {notification.data && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Template Context</h2>
          <div style={styles.jsonBlock}>{JSON.stringify(notification.data, null, 2)}</div>
        </div>
      )}
    </div>
  )
}