import { useState, useEffect } from 'react'
import Table from '../../shared/components/Table'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
import { getMyWithdrawals } from '../../services/withdrawalService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'inherit',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
}

function getStatusStyle(status) {
  switch (status) {
    case 'requested':
      return { background: '#FFF7ED', color: '#C2410C' }
    case 'approved':
      return { background: '#EAF7F0', color: 'var(--color-success)' }
    case 'rejected':
      return { background: '#FDEDEC', color: 'var(--color-danger)' }
    default:
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
  }
}

const columns = [
  {
    key: 'submission_number',
    label: 'Submission #',
    render: (val) => val ? `#${val}` : '—',
  },
  {
    key: 'title',
    label: 'Title',
    render: (val) => val || 'Untitled',
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => (
      <span style={{ ...styles.statusBadge, ...getStatusStyle(val) }}>
        {val}
      </span>
    ),
  },
  {
    key: 'reason',
    label: 'Reason',
    render: (val) => val ? (val.length > 50 ? val.substring(0, 50) + '...' : val) : '—',
  },
  {
    key: 'requested_at',
    label: 'Requested',
    render: (val) => formatDate(val) || '—',
  },
  {
    key: 'decision_notes',
    label: 'Decision Notes',
    render: (val) => val ? (val.length > 50 ? val.substring(0, 50) + '...' : val) : '—',
  },
]

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyWithdrawals()
      .then(setWithdrawals)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={styles.page}>
      <PageHeader title="Withdrawals" subtitle="Your withdrawal requests" />

      {loading || withdrawals.length > 0 ? (
        <Table
          columns={columns}
          data={withdrawals}
          loading={loading}
          emptyMessage="No withdrawal requests"
        />
      ) : (
        <EmptyState
          icon="📋"
          message="You have no withdrawal requests."
        />
      )}
    </div>
  )
}
