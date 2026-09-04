import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import Modal from '../../shared/components/Modal'
import { getMyManuscripts, createDraft, deleteManuscript } from './services/manuscriptService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'inherit',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
}

export default function MyManuscripts() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getMyManuscripts()
      .then(setManuscripts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    setDeleting(true)
    try {
      await deleteManuscript(pendingDeleteId)
      setManuscripts((prev) => prev.filter((m) => m.id !== pendingDeleteId))
      setPendingDeleteId(null)
    } catch (err) {
      alert('Failed to delete draft')
    } finally {
      setDeleting(false)
    }
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
      key: 'current_status',
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
      render: (_, row) => {
        if (row.current_status === 'draft') {
          return (
            <button
              onClick={(e) => { e.stopPropagation(); setPendingDeleteId(row.id); }}
              style={{ background: 'none', border: '1px solid var(--color-danger)', borderRadius: '4px', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}
            >
              Delete
            </button>
          )
        }
        return null
      }
    }
  ]

  const handleRowClick = (row) => {
    if (row.current_status === 'draft') {
      navigate(`/author/submit/${row.id}`)
    } else {
      navigate(`/author/manuscripts/${row.id}`)
    }
  }

  const handleNewSubmission = async () => {
    const drafts = manuscripts.filter((m) => m.current_status === 'draft')
    const emptyDraft = drafts.find((d) => !d.title || d.title.trim() === '')
    if (emptyDraft) {
      navigate(`/author/submit/${emptyDraft.id}`)
      return
    }

    setCreating(true)
    try {
      const draft = await createDraft()
      navigate(`/author/submit/${draft.id}`)
    } catch {
      setCreating(false)
    }
  }

  return (
    <div style={styles.page}>
      <PageHeader
        title="My Manuscripts"
        subtitle="All manuscripts you have submitted"
        action={(
          <Button variant="primary" size="md" loading={creating} onClick={handleNewSubmission}>
            ➕ New Submission
          </Button>
        )}
      />

      {loading || manuscripts.length > 0 ? (
        <Table
          columns={columns}
          data={manuscripts}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No manuscripts found"
        />
      ) : (
        <EmptyState
          icon="📝"
          message="You haven't submitted any manuscripts yet. Start your first submission to get going."
          actionLabel="New Submission"
          onAction={handleNewSubmission}
        />
      )}

      <Modal
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        title="Delete Draft"
        variant="confirmation"
      >
        <p style={{ margin: '0 0 20px', color: 'var(--color-ink-black)', fontSize: 'var(--text-sm)' }}>
          Are you sure you want to delete this draft? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={confirmDelete}>
            Delete Draft
          </Button>
        </div>
      </Modal>
    </div>
  )
}
