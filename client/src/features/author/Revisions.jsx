import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import Tabs from '../../shared/components/Tabs'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
import Button from '../../shared/components/Button'
import { getMyRevisions } from '../../services/revisionService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'inherit',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
}

export default function Revisions() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingRevisions, setPendingRevisions] = useState([])
  const [completedRevisions, setCompletedRevisions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRevisions = () => {
    setLoading(true)
    Promise.all([
      getMyRevisions('pending'),
      getMyRevisions('completed'),
    ])
      .then(([pendingData, completedData]) => {
        setPendingRevisions(pendingData || [])
        setCompletedRevisions(completedData || [])
      })
      .catch((err) => {
        console.error('Failed to load revisions:', err)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRevisions()
  }, [])

  const pendingColumns = [
    {
      key: 'submission_number',
      label: 'Submission #',
      render: (val) => (
        <span style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>
          {val ? `#${val}` : '—'}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (val) => val || 'Untitled',
    },
    {
      key: 'request_type',
      label: 'Type',
      render: (val) => <StatusBadge status={val === 'major' ? 'major_revision' : 'minor_revision'} />,
    },
    {
      key: 'round_number',
      label: 'Round',
      render: (val) => (
        <span style={{ fontWeight: 600, color: 'var(--color-info, #2E6B9E)' }}>
          Round {val}
        </span>
      ),
    },
    {
      key: 'due_at',
      label: 'Due Date',
      render: (val) => {
        if (!val) return '—'
        const isOverdue = new Date(val) < new Date()
        return (
          <span style={isOverdue ? { color: 'var(--color-danger)', fontWeight: 600 } : { fontWeight: 600 }}>
            {formatDate(val)}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <Button
          size="sm"
          variant="primary"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/author/revisions/${row.id}`)
          }}
        >
          Submit Revision →
        </Button>
      ),
    },
  ]

  const completedColumns = [
    {
      key: 'submission_number',
      label: 'Submission #',
      render: (val) => (
        <span style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>
          {val ? `#${val}` : '—'}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (val) => val || 'Untitled',
    },
    {
      key: 'round_number',
      label: 'Round',
      render: (val) => `Round ${val}`,
    },
    {
      key: 'response_submitted_at',
      label: 'Submitted On',
      render: (val) => val ? formatDate(val) : '—',
    },
    {
      key: 'current_status',
      label: 'Current Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/author/track/${row.manuscript_id}`)
          }}
        >
          Track Progress
        </Button>
      ),
    },
  ]

  const tabs = [
    {
      key: 'pending',
      label: `Action Required (${pendingRevisions.length})`,
    },
    {
      key: 'completed',
      label: `Submitted History (${completedRevisions.length})`,
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader
        title="Revisions"
        subtitle={
          activeTab === 'pending'
            ? 'Manuscripts currently requiring your revision'
            : 'Previously submitted revision rounds'
        }
      />

      <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'pending' ? (
        loading || pendingRevisions.length > 0 ? (
          <Table
            columns={pendingColumns}
            data={pendingRevisions}
            loading={loading}
            onRowClick={(row) => navigate(`/author/revisions/${row.id}`)}
            emptyMessage="No pending revisions requiring action."
          />
        ) : (
          <EmptyState
            icon="📝"
            message="You have no pending revision requests."
          />
        )
      ) : (
        loading || completedRevisions.length > 0 ? (
          <Table
            columns={completedColumns}
            data={completedRevisions}
            loading={loading}
            onRowClick={(row) => navigate(`/author/track/${row.manuscript_id}`)}
            emptyMessage="No completed revisions found."
          />
        ) : (
          <EmptyState
            icon="📂"
            message="No revision history yet."
          />
        )
      )}
    </div>
  )
}
