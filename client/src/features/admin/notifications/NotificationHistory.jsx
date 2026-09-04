import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotificationHistory,
  getEmailTemplates,
  retryNotification,
} from '../../../services/emailAdminService'
import Table from '../../../shared/components/Table'
import Button from '../../../shared/components/Button'
import Pagination from '../../../shared/components/Pagination'
import EmptyState from '../../../shared/components/EmptyState'
import PageHeader from '../../../shared/components/PageHeader'
import { formatDateTime } from '../../../shared/utils/formatDate'

const STATUSES = ['queued', 'sending', 'sent', 'retrying', 'failed', 'skipped', 'cancelled']

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
    background: 'var(--color-surface)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-rule-grey)',
  },
  searchBox: {
    flex: '1',
    minWidth: '200px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    padding: '8px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    background: 'var(--color-surface)',
    minWidth: '130px',
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
    case 'skipped':
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
    default:
      return { background: '#E3EEF9', color: '#1565C0' }
  }
}

export default function NotificationHistory() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 15
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState([])

  const [statusFilter, setStatusFilter] = useState('')
  const [templateFilter, setTemplateFilter] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [retryMsg, setRetryMsg] = useState('')

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getEmailTemplates()
      setTemplates(Array.isArray(data) ? data : [])
    } catch {
      setTemplates([])
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getNotificationHistory({
        page,
        limit,
        status: statusFilter || undefined,
        template_key: templateFilter || undefined,
        recipient_email: recipientSearch.trim() || undefined,
      })
      setNotifications(data?.notifications || [])
      setTotal(data?.total || 0)
    } catch (err) {
      console.error('Failed to fetch notification history:', err)
      setNotifications([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, templateFilter, recipientSearch])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleRetry = async (row) => {
    if (!window.confirm(`Resend notification ${row.id.slice(0, 8)}?`)) return
    setRetryMsg('')
    try {
      await retryNotification(row.id)
      setRetryMsg(`Resend queued for ${row.id.slice(0, 8)}.`)
      fetchHistory()
    } catch (err) {
      setRetryMsg(err?.response?.data?.error || 'Unable to resend notification.')
    }
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Date/Time',
      render: (val) => (val ? formatDateTime(val) : '—'),
    },
    {
      key: 'recipient_email',
      label: 'Recipient',
      render: (val) => val || '—',
    },
    {
      key: 'template_key',
      label: 'Event',
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
          {(val || '').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'manuscript_id',
      label: 'Manuscript',
      render: (val) => (val ? `#${val.slice(0, 8)}` : '—'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span style={{ ...styles.badge, ...getStatusBadge(val) }}>{val || '—'}</span>
      ),
    },
    {
      key: 'attempt_count',
      label: 'Attempts',
      render: (val) => val ?? 0,
    },
    {
      key: 'provider_message_id',
      label: 'Provider Msg ID',
      render: (val) => (val ? val.slice(0, 12) : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/notifications/${row.id}`)}>
            View
          </Button>
          {(row.status === 'failed' || row.status === 'retrying') && (
            <Button variant="danger" size="sm" onClick={() => handleRetry(row)}>
              Resend
            </Button>
          )}
        </div>
      ),
    },
  ]

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div style={styles.page}>
      <PageHeader
        title="Notification History"
        subtitle="Audit trail of all application-generated email notifications, delivery states, and retry activity."
        action={
          <Button variant="secondary" onClick={() => navigate('/admin/email-stats')}>
            Delivery Statistics →
          </Button>
        }
      />

      {retryMsg && (
        <div style={{ background: '#EAF7F0', color: 'var(--color-success)', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
          {retryMsg}
        </div>
      )}

      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search recipient email..."
            style={styles.input}
            value={recipientSearch}
            onChange={(e) => {
              setRecipientSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <select style={styles.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select style={styles.select} value={templateFilter} onChange={(e) => { setTemplateFilter(e.target.value); setPage(1) }}>
          <option value="">All Events</option>
          {templates.map((t) => (
            <option key={t.template_key} value={t.template_key}>{t.template_key}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <EmptyState icon="📬" message="No notifications match the selected filters." />
      ) : (
        <>
          <Table columns={columns} data={notifications} />
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
          </div>
        </>
      )}
    </div>
  )
}