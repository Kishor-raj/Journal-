import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import StatCard from '../../shared/components/StatCard'
import Modal from '../../shared/components/Modal'
import { getMyManuscripts, createDraft, deleteManuscript } from './services/manuscriptService'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-ink-navy)',
    marginBottom: '20px',
  },
  recentList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-rule-grey)',
    borderRadius: '0',
    cursor: 'pointer',
    transition: 'background 0.12s ease',
  },
  recentTitle: {
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-black)',
    fontWeight: 500,
  },
  recentMeta: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
  },
  recentContainer: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
  },
  emptyText: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
    fontSize: 'var(--text-base)',
  },
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function AuthorDashboard() {
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

  const drafts = manuscripts.filter((m) => m.current_status === 'draft')
  const underReview = manuscripts.filter((m) =>
    ['submitted', 'under_review', 'resubmitted'].includes(m.current_status)
  )
  const needsAction = manuscripts.filter((m) =>
    ['revision_requested', 'accepted', 'rejected'].includes(m.current_status)
  )

  const handleNewSubmission = async () => {
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

  const requestDelete = (e, id) => {
    e.stopPropagation()
    setPendingDeleteId(id)
  }

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

  const handleRowClick = (manuscript) => {
    if (manuscript.current_status === 'draft') {
      navigate(`/author/submit/${manuscript.id}`)
    } else {
      navigate(`/author/manuscripts/${manuscript.id}`)
    }
  }

  return (
    <div style={styles.page}>
      <PageHeader
        title="Author Dashboard"
        subtitle="Welcome back — here's your submission overview"
        action={(
          <Button variant="primary" size="md" loading={creating} onClick={handleNewSubmission}>
            ➕ New Submission
          </Button>
        )}
      />

      <div style={styles.statsGrid}>
        <StatCard label="Drafts" value={drafts.length} accent="gold" />
        <StatCard label="Under Review" value={underReview.length} accent="blue" />
        <StatCard label="Needing Action" value={needsAction.length} accent="amber" />
      </div>

      <h2 style={styles.sectionTitle}>Recent Manuscripts</h2>
      <div style={styles.recentContainer}>
        {loading ? (
          <div style={styles.emptyText}>Loading manuscripts...</div>
        ) : manuscripts.length === 0 ? (
          <div style={styles.emptyText}>
            No manuscripts yet. Start your first submission to get going.
          </div>
        ) : (
          <ul style={styles.recentList}>
            {manuscripts.slice(0, 10).map((m) => (
              <li
                key={m.id}
                style={styles.recentItem}
                onClick={() => handleRowClick(m)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(13, 27, 62, 0.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div>
                  <div style={styles.recentTitle}>{m.title || 'Untitled'}</div>
                  <div style={styles.recentMeta}>
                    {m.submission_number && `#${m.submission_number}`}
                    {m.submitted_at && ` · Submitted ${formatDate(m.submitted_at)}`}
                    {!m.submitted_at && m.created_at && ` · Created ${formatDate(m.created_at)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--color-citation-gold-dark)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {m.current_status?.replace(/_/g, ' ')}
                  </span>
                  {m.current_status === 'draft' && (
                    <button
                      onClick={(e) => requestDelete(e, m.id)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-danger)',
                        borderRadius: '4px',
                        color: 'var(--color-danger)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '12px',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
