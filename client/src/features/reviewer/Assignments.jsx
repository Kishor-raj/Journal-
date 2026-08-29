import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import { getAssignments } from '../../services/reviewerService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  dueDate: {
    fontWeight: 600,
    color: 'var(--color-ink-black)',
  },
  overdue: {
    color: 'var(--color-danger)',
  },
}

const columns = [
  {
    key: 'submission_number',
    label: 'Submission #',
    render: (val) => val ? `#${val}` : '—',
  },
  {
    key: 'manuscript_title',
    label: 'Title',
    render: (val) => val || 'Untitled',
  },
  {
    key: 'assignment_status',
    label: 'Status',
    render: (val) => <StatusBadge status={val} />,
  },
  {
    key: 'due_at',
    label: 'Due Date',
    render: (val) => {
      if (!val) return '—'
      const isOverdue = new Date(val) < new Date()
      return (
        <span style={isOverdue ? styles.overdue : styles.dueDate}>
          {formatDate(val)}
        </span>
      )
    },
  },
]

function enrichColumns(navigate) {
  return [
    ...columns,
    {
      key: 'actions',
      label: '',
      render: (_, row) => {
        if (row.assignment_status === 'completed') {
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/reviewer/assignments/${row.id}/review`)
              }}
            >
              View Review
            </Button>
          )
        }
        if (row.assignment_status === 'accepted') {
          return (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/reviewer/assignments/${row.id}/review`)
                }}
              >
                Review
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/reviewer/assignments/${row.id}/extension`)
                }}
              >
                Request Extension
              </Button>
            </div>
          )
        }
        return null
      },
    },
  ]
}

export default function Assignments() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAssignments()
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRowClick = (row) => {
    if (row.assignment_status === 'accepted' || row.assignment_status === 'completed') {
      navigate(`/reviewer/assignments/${row.id}/review`)
    }
  }

  const tableColumns = enrichColumns(navigate)

  return (
    <div style={styles.page}>
      <PageHeader title="My Assignments" subtitle="Manuscripts assigned for your review" />

      {loading || assignments.length > 0 ? (
        <Table
          columns={tableColumns}
          data={assignments}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No active assignments"
        />
      ) : (
        <EmptyState
          icon="📋"
          message="You have no active review assignments."
        />
      )}
    </div>
  )
}
