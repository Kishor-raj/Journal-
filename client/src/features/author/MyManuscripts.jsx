import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../shared/components/Modal'
import Button from '../../shared/components/Button'
import { getMyManuscripts, createDraft, deleteManuscript } from './services/manuscriptService'
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

export default function MyManuscripts() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOption, setSortOption] = useState('newest')

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

  const filteredManuscripts = manuscripts.filter(m => {
    const matchSearch = (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (m.submission_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === '' || m.current_status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (sortOption === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortOption === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortOption === 'title') return (a.title || '').localeCompare(b.title || '');
    return 0;
  });

  return (
    <div className="content-area">
      <div className="page active" id="page-manuscripts">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">My Manuscripts</h1>
              <p className="page-subtitle">All your submissions and their current status</p>
            </div>
            <button className="btn btn-primary" disabled={creating} onClick={handleNewSubmission}>
              <i className="fas fa-plus"></i> New Submission
            </button>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body" style={{padding: 'var(--spacing-md) var(--spacing-lg)'}}>
            <div className="filter-bar" style={{marginBottom: 0}}>
              <div className="filter-search">
                <i className="fas fa-search"></i>
                <input 
                  type="text" 
                  placeholder="Search by ID or title..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="revision_requested">Revision Requested</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
              <select className="filter-select" value={sortOption} onChange={e => setSortOption(e.target.value)}>
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="title">Sort: Title A-Z</option>
              </select>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table" id="msTable">
              <thead>
                <tr>
                  <th>Manuscript ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th style={{textAlign: 'right'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredManuscripts.map(m => (
                  <tr key={m.id} onClick={() => handleRowClick(m)}>
                    <td className="cell-name">{m.submission_number || m.id.substring(0,8)}</td>
                    <td style={{maxWidth: '300px'}} className="text-truncate" title={m.title}>{m.title || 'Untitled'}</td>
                    <td>{m.article_type || '—'}</td>
                    <td className="cell-muted">{m.submitted_at ? formatDate(m.submitted_at) : '—'}</td>
                    <td>{getStatusBadge(m.current_status)}</td>
                    <td style={{textAlign: 'right'}}>
                      {m.current_status === 'draft' ? (
                        <button 
                          className="btn btn-ghost btn-sm"
                          style={{color: 'var(--danger)'}}
                          onClick={(e) => { e.stopPropagation(); setPendingDeleteId(m.id); }}
                        >
                          Delete
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm">View <i className="fas fa-chevron-right" style={{fontSize:'10px'}}></i></button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredManuscripts.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>
                      No manuscripts found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Showing {filteredManuscripts.length} manuscripts</span>
            <div className="pagination-pages">
              <button className="pagination-btn active">1</button>
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
        <p style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: '14px' }}>
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
