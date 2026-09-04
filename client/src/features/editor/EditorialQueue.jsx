import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import { getQueue, claimManuscript } from '../../services/editorialService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  declinedCard: {
    background: '#FDEDEC',
    border: '1px solid #f5c6c1',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  declinedTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-danger)',
    margin: '0 0 8px 0',
  },
  declinedItem: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    marginBottom: '4px',
  },
}

const columns = [
  {
    key: 'submission_number',
    label: 'Submission #',
    render: (val) => val || '—',
  },
  {
    key: 'title',
    label: 'Title',
    render: (val) => val || 'Untitled',
  },
  {
    key: 'status',
    label: 'Status',
    render: (val) => <StatusBadge status={val} />,
  },
  {
    key: 'submitted_at',
    label: 'Submitted',
    render: (val) => formatDate(val) || '—',
  },
  {
    key: 'actions',
    label: '',
    render: () => null,
  },
]

export default function EditorialQueue() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [declined, setDeclined] = useState([])

  useEffect(() => {
    getQueue()
      .then((data) => {
        if (Array.isArray(data)) {
          setManuscripts(data)
          setDeclined([])
        } else {
          setManuscripts(data.queue || [])
          setDeclined(data.declined_invitations || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRowClick = (row) => {
    navigate(`/editor/manuscripts/${row.id}`)
  }

  const handleClaim = async (e, manuscriptId) => {
    e.stopPropagation()
    try {
      await claimManuscript(manuscriptId)
      setManuscripts((prev) =>
        prev.map((m) =>
          m.id === manuscriptId ? { ...m, status: 'under_review' } : m
        )
      )
    } catch {
      // silent
    }
  }

  const enrichedColumns = columns.map((col) => {
    if (col.key === 'actions') {
      return {
        ...col,
        render: (_, row) => {
          if (row.current_status === 'editor_assignment') {
            return (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => handleClaim(e, row.id)}
              >
                Claim manuscript
              </Button>
            )
          }
          return null
        },
      }
    }
    return col
  })

  return (
    <div style={styles.page}>
      <PageHeader title="Editorial Queue" subtitle="Manuscripts requiring editor attention" />

      {declined.length > 0 && (
        <div style={styles.declinedCard}>
          <h3 style={styles.declinedTitle}>Declined Review Invitations</h3>
          {declined.map((item, idx) => (
            <div key={idx} style={styles.declinedItem}>
              <strong>{item.manuscript_title || 'Untitled'}</strong>
              {item.reviewer_name && ` — ${item.reviewer_name} declined`}
              {item.suggested_reviewer && ` (Suggested: ${item.suggested_reviewer})`}
            </div>
          ))}
        </div>
      )}

      {loading || manuscripts.length > 0 ? (
        <Table
          columns={enrichedColumns}
          data={manuscripts}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No manuscripts in editorial queue"
        />
      ) : (
        <EmptyState
          icon="📝"
          message="The editorial queue is empty."
        />
      )}
    </div>
  )
}
