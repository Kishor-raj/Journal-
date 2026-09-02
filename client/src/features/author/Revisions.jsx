import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
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
    key: 'request_type',
    label: 'Type',
    render: (val) => <StatusBadge status={val === 'major' ? 'major_revision' : 'minor_revision'} />,
  },
  {
    key: 'round_number',
    label: 'Round',
    render: (val) => `Round ${val}`,
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
]

export default function Revisions() {
  const navigate = useNavigate()
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyRevisions()
      .then(setRevisions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRowClick = (row) => {
    navigate(`/author/revisions/${row.id}`)
  }

  return (
    <div style={styles.page}>
      <PageHeader title="Revisions" subtitle="Manuscripts requiring revision" />

      {loading || revisions.length > 0 ? (
        <Table
          columns={columns}
          data={revisions}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No pending revisions"
        />
      ) : (
        <EmptyState
          icon="📝"
          message="You have no pending revision requests."
        />
      )}
    </div>
  )
}
