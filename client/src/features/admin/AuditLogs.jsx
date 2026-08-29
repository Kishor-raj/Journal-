import React, { useState, useEffect, useCallback } from 'react'
import { getAuditLogs, getSecurityLogs, getWorkflowLogs } from '../../services/adminService'
import Table from '../../shared/components/Table'
import Pagination from '../../shared/components/Pagination'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
import Tabs from '../../shared/components/Tabs'
import { formatDate } from '../../shared/utils/formatDate'

const LOG_TABS = [
  { key: 'audit', label: 'Administrative Audit Logs' },
  { key: 'security', label: 'Security & Access Logs' },
  { key: 'workflow', label: 'Workflow Event Logs' },
]

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  jsonBlock: {
    background: 'rgba(0,0,0,0.04)',
    padding: '6px 8px',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '100px',
    overflowY: 'auto',
  },
  severityBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
}

function getSeverityStyle(sev) {
  switch (sev?.toLowerCase()) {
    case 'critical':
    case 'error':
      return { background: '#FDEDEC', color: 'var(--color-danger)' }
    case 'warning':
      return { background: '#FFF7ED', color: 'var(--color-warning)' }
    default:
      return { background: '#EAF7F0', color: 'var(--color-success)' }
  }
}

export default function AuditLogs() {
  const [activeTab, setActiveTab] = useState('audit') // 'audit' | 'security' | 'workflow'
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      let data = {}
      if (activeTab === 'audit') {
        data = await getAuditLogs({ page, limit })
      } else if (activeTab === 'security') {
        data = await getSecurityLogs({ page, limit })
      } else if (activeTab === 'workflow') {
        data = await getWorkflowLogs({ page, limit })
      }
      setLogs(data.logs || data.data || (Array.isArray(data) ? data : []))
      setTotal(data.total || (Array.isArray(data) ? data.length : 0))
    } catch (err) {
      console.error('Failed to fetch logs:', err)
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, limit])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const auditColumns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'action',
      label: 'Action',
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'entity_type',
      label: 'Target',
      render: (val, row) => (
        <span>{val} {row.entity_id ? `(#${row.entity_id.slice(0, 8)})` : ''}</span>
      ),
    },
    {
      key: 'actor_email',
      label: 'Actor',
      render: (val, row) => val || row.actor_user_id || 'System',
    },
    {
      key: 'new_values',
      label: 'Changes',
      render: (val) => (
        val ? <div style={styles.jsonBlock}>{JSON.stringify(val, null, 1)}</div> : '—'
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (val) => val || '—',
    },
  ]

  const securityColumns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => (
        <span style={{ ...styles.severityBadge, ...getSeverityStyle(val) }}>
          {val || 'INFO'}
        </span>
      ),
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (val) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'actor_email',
      label: 'User',
      render: (val, row) => val || row.actor_user_id || 'Anonymous',
    },
    {
      key: 'details',
      label: 'Details',
      render: (val) => (
        val ? <div style={styles.jsonBlock}>{JSON.stringify(val, null, 1)}</div> : '—'
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (val) => val || '—',
    },
  ]

  const workflowColumns = [
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'workflow_name',
      label: 'Workflow',
      render: (val) => (
        <span style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>{val}</span>
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
      render: (val) => val || '—',
    },
    {
      key: 'details',
      label: 'Payload',
      render: (val) => (
        val ? <div style={styles.jsonBlock}>{JSON.stringify(val, null, 1)}</div> : '—'
      ),
    },
  ]

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div style={styles.page}>
      <PageHeader
        title="System Audit & Security Logs"
        subtitle="Immutable record of role changes, access denials, security events, and workflow state transitions."
      />

      <Tabs tabs={LOG_TABS} activeKey={activeTab} onChange={handleTabChange} />

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>
          Loading log records...
        </p>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="🛡️"
          message={`No ${activeTab} log records recorded yet.`}
        />
      ) : (
        <>
          <Table
            columns={
              activeTab === 'audit'
                ? auditColumns
                : activeTab === 'security'
                ? securityColumns
                : workflowColumns
            }
            data={logs}
          />
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </>
      )}
    </div>
  )
}
