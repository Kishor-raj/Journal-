import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import { getDecisionList } from '../../services/editorialService'
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
    maxWidth: '340px',
  },
  title: {
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
  submitNo: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
}

export default function DecisionQueue() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDecisionList()
      .then((data) => setManuscripts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const reviewsReceived = manuscripts.reduce((sum, m) => sum + (m.completed_reviews || 0), 0)

  const columns = [
    {
      key: 'title',
      label: 'Manuscript',
      render: (val, row) => (
        <div style={styles.manuscriptCell}>
          <div style={styles.title}>{val || 'Untitled'}</div>
          <div style={styles.submitNo}>{row.submission_number ? `#${row.submission_number}` : '—'}</div>
        </div>
      ),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      render: (_, row) => {
        const done = row.completed_reviews || 0
        const active = row.active_reviews || 0
        return (
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-ink-navy)' }}>
              {done === 0 ? 'No complete reviews' : `${done} of ${done + active} received`}
            </div>
            {active > 0 && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{active} reviewer{active > 1 ? 's' : ''} still active</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'current_status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'next_due',
      label: 'Due',
      render: (val) => (val ? formatDate(val) : '—'),
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
            navigate(`/editor/manuscripts/${row.id}/decision`)
          }}
        >
          Make decision
        </Button>
      ),
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader title="Decisions" subtitle="Manuscripts awaiting your editorial decision" />

      <div style={styles.chips}>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Awaiting Decision</div>
          <div style={styles.chipValue}>{manuscripts.length}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Reviews Received</div>
          <div style={styles.chipValue}>{reviewsReceived}</div>
        </div>
      </div>

      {loading || manuscripts.length > 0 ? (
        <Table
          columns={columns}
          data={manuscripts}
          loading={loading}
          onRowClick={(row) => navigate(`/editor/manuscripts/${row.id}/decision`)}
          emptyMessage="No manuscripts awaiting a decision"
        />
      ) : (
        <EmptyState icon="⚖️" message="No manuscripts awaiting a decision right now." />
      )}
    </div>
  )
}