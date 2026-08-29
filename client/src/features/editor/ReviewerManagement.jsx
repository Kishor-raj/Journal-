import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import { getReviewerManagement } from '../../services/editorialService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  chips: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  chip: {
    flex: '1 1 160px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
  },
  chipLabel: {
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
  },
  chipValue: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 700,
    color: 'var(--color-ink-navy)',
    lineHeight: 1.1,
  },
  manuscriptCell: {
    maxWidth: '320px',
  },
  title: {
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  submitNo: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
}

function daysLeft(dueAt) {
  if (!dueAt) return null
  const diff = new Date(dueAt).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function DeadlineCell({ assignment, dueAt }) {
  const days = daysLeft(dueAt)
  const done = ['completed', 'declined', 'revoked', 'expired'].includes(assignment)
  if (!dueAt || done) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
  const color = days < 0 ? 'var(--color-danger)' : days <= 3 ? 'var(--color-warning)' : 'var(--color-ink-black)'
  return (
    <span style={{ color }}>
      {formatDate(dueAt)}
      {` · ${days < 0 ? `${-days}d overdue` : `${days}d left`}`}
    </span>
  )
}

export default function ReviewerManagement() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReviewerManagement()
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active = assignments.filter((a) => ['invited', 'accepted'].includes(a.assignment_status))
  const completed = assignments.filter((a) => a.assignment_status === 'completed')
  const overdue = assignments.filter(
    (a) => ['invited', 'accepted'].includes(a.assignment_status) && a.due_at && daysLeft(a.due_at) < 0
  )

  const columns = [
    {
      key: 'title',
      label: 'Manuscript',
      render: (val, row) => (
        <div style={styles.manuscriptCell}>
          <div style={styles.title}>{row.manuscript_title || 'Untitled'}</div>
          <div style={styles.submitNo}>
            {row.submission_number ? `#${row.submission_number}` : '—'}
            {row.round_number > 1 ? ` · Round ${row.round_number}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'reviewer_name',
      label: 'Reviewer',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--color-ink-navy)' }}>{val || '—'}</div>
          {row.reviewer_email && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{row.reviewer_email}</div>
          )}
        </div>
      ),
    },
    {
      key: 'assignment_status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'assigned_at',
      label: 'Invited',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'due_at',
      label: 'Deadline',
      render: (val, row) => <DeadlineCell assignment={row.assignment_status} dueAt={val} />,
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/editor/manuscripts/${row.manuscript_id}`)
          }}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader title="Reviewer Management" subtitle="Track reviewer invitations and assignments across your manuscripts" />

      <div style={styles.chips}>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Active Invitations</div>
          <div style={styles.chipValue}>{active.length}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Completed Reviews</div>
          <div style={styles.chipValue}>{completed.length}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Overdue</div>
          <div style={{ ...styles.chipValue, color: overdue.length > 0 ? 'var(--color-danger)' : 'var(--color-ink-navy)' }}>
            {overdue.length}
          </div>
        </div>
      </div>

      {loading || assignments.length > 0 ? (
        <Table
          columns={columns}
          data={assignments}
          loading={loading}
          onRowClick={(row) => navigate(`/editor/manuscripts/${row.manuscript_id}`)}
          emptyMessage="No reviewer assignments for your manuscripts yet"
        />
      ) : (
        <EmptyState icon="🕵️" message="No reviewer assignments yet. Invite reviewers from the manuscript page." />
      )}
    </div>
  )
}