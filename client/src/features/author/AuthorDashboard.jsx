import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyManuscripts, createDraft, deleteManuscript } from './services/manuscriptService'
import Modal from '../../shared/components/Modal'
import Button from '../../shared/components/Button'
import './AuthorDashboard.css'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getStatusBadge(status) {
  switch(status) {
    case 'draft': return <span className="status-badge status-disabled"><i className="fas fa-circle"></i> Draft</span>
    case 'submitted': return <span className="status-badge status-info"><i className="fas fa-circle"></i> Submitted</span>
    case 'under_review': return <span className="status-badge status-info"><i className="fas fa-circle"></i> Under Review</span>
    case 'revision_requested': return <span className="status-badge status-pending"><i className="fas fa-circle"></i> Revision Requested</span>
    case 'resubmitted': return <span className="status-badge status-info"><i className="fas fa-circle"></i> Resubmitted</span>
    case 'accepted': return <span className="status-badge status-active"><i className="fas fa-circle"></i> Accepted</span>
    case 'rejected': return <span className="status-badge status-locked"><i className="fas fa-circle"></i> Rejected</span>
    default: return <span className="status-badge status-disabled"><i className="fas fa-circle"></i> {status?.replace(/_/g, ' ')}</span>
  }
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
  const revisionsNeeded = manuscripts.filter(m => m.current_status === 'revision_requested')
  const accepted = manuscripts.filter(m => m.current_status === 'accepted')

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
    <div className="content-area">
      <div className="page active" id="page-dashboard">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Author Dashboard</h1>
              <p className="page-subtitle">Your manuscripts, submission status, and items needing attention</p>
            </div>
            <button className="btn btn-primary" disabled={creating} onClick={handleNewSubmission}>
              <i className="fas fa-plus"></i> New Submission
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card kpi-draft">
            <div className="kpi-header">
              <span className="kpi-label">Drafts</span>
              <div className="kpi-icon"><i className="fas fa-file-pen"></i></div>
            </div>
            <div className="kpi-value">{drafts.length}</div>
            <div className="kpi-trend"><span>Continue where you left off</span></div>
          </div>
          <div className="kpi-card kpi-review">
            <div className="kpi-header">
              <span className="kpi-label">Under Review</span>
              <div className="kpi-icon"><i className="fas fa-magnifying-glass"></i></div>
            </div>
            <div className="kpi-value">{underReview.length}</div>
            <div className="kpi-trend"><span>Awaiting reviewer reports</span></div>
          </div>
          <div className="kpi-card kpi-revision">
            <div className="kpi-header">
              <span className="kpi-label">Revision Needed</span>
              <div className="kpi-icon"><i className="fas fa-rotate"></i></div>
            </div>
            <div className="kpi-value">{revisionsNeeded.length}</div>
            <div className="kpi-trend">
              {revisionsNeeded.length > 0 ? (
                <span style={{color: 'var(--danger)', fontWeight: 600}}>Action required</span>
              ) : (
                <span>All up to date</span>
              )}
            </div>
          </div>
          <div className="kpi-card kpi-accepted">
            <div className="kpi-header">
              <span className="kpi-label">Accepted</span>
              <div className="kpi-icon"><i className="fas fa-circle-check"></i></div>
            </div>
            <div className="kpi-value">{accepted.length}</div>
            <div className="kpi-trend"><span>Proceeding to publication</span></div>
          </div>
        </div>

        {revisionsNeeded.length > 0 && (
          <div className="alert-banner alert-danger mb-lg">
            <i className="fas fa-triangle-exclamation"></i>
            <div>
              <strong>Revision due soon:</strong> You have {revisionsNeeded.length} manuscript(s) needing revision. 
              Please review the feedback and submit your revised manuscripts.
            </div>
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Needs Attention</span></div>
            <div className="card-body" style={{padding: 'var(--spacing-md) var(--spacing-lg)'}}>
              <ul className="activity-list">
                {needsAction.length === 0 ? (
                  <div style={{color: 'var(--text-muted)', fontSize: '13px', padding: '12px 0'}}>
                    You're all caught up! No items need your immediate attention.
                  </div>
                ) : (
                  needsAction.slice(0, 5).map(m => (
                    <li key={m.id} className="activity-item" style={{cursor:'pointer'}} onClick={() => handleRowClick(m)}>
                      <div className={`activity-dot ${m.current_status === 'revision_requested' ? 'dot-danger' : m.current_status === 'accepted' ? 'dot-success' : 'dot-warning'}`}></div>
                      <div className="activity-content">
                        <div className="activity-text">
                          <strong>{m.submission_number || m.id}</strong> — {m.current_status?.replace(/_/g, ' ')}
                        </div>
                        <div className="activity-time">Updated: {formatDate(m.updated_at || m.created_at)}</div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Manuscripts</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/author/manuscripts')}>
                View All <i className="fas fa-arrow-right" style={{fontSize: '11px', marginLeft: '4px'}}></i>
              </button>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  {manuscripts.slice(0, 5).map(m => (
                    <tr key={m.id} style={{cursor:'pointer'}} onClick={() => handleRowClick(m)}>
                      <td className="cell-name">{m.submission_number || m.id.substring(0,8)}</td>
                      <td>{getStatusBadge(m.current_status)}</td>
                      <td className="cell-muted">{formatDate(m.updated_at || m.created_at)}</td>
                    </tr>
                  ))}
                  {manuscripts.length === 0 && !loading && (
                    <tr>
                      <td colSpan="3" style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)'}}>
                        No manuscripts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
