import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../../shared/components/Table'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import Modal from '../../shared/components/Modal'
import { getMyManuscripts, createDraft, deleteManuscript, getMyCertificate } from './services/manuscriptService'
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
  const [certificateRow, setCertificateRow] = useState(null)
  const [certificate, setCertificate] = useState(null)
  const [certState, setCertState] = useState({ loading: false, error: '' })

  useEffect(() => {
    getMyManuscripts()
      .then(setManuscripts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openCertificate = async (row) => {
    setCertificateRow(row)
    setCertificate(null)
    setCertState({ loading: true, error: '' })
    try {
      const data = await getMyCertificate(row.id)
      setCertificate(data)
    } catch {
      setCertState({ loading: false, error: 'No certificate is available for this manuscript yet.' })
    } finally {
      setCertState((s) => ({ ...s, loading: false }))
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
        if (row.current_status === 'published') {
          return (
            <button
              onClick={(e) => { e.stopPropagation(); openCertificate(row); }}
              style={{ background: 'none', border: '1px solid #C4A24C', borderRadius: '4px', color: '#0B1B3A', cursor: 'pointer', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}
            >
              📜 Certificate
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

      <Modal
        isOpen={!!certificateRow}
        onClose={() => setCertificateRow(null)}
        title="Certificate of Publication"
      >
        {certState.loading ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading certificate...</p>
        ) : certState.error ? (
          <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: '0 0 20px' }}>{certState.error}</p>
        ) : certificate ? (
          <>
            <div style={{ marginBottom: '18px', padding: '14px 16px', border: '1px solid #C4A24C', borderRadius: 'var(--radius-sm)', background: '#FBF6EA' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#0B1B3A', marginBottom: '4px' }}>
                {certificate.certificate_number}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)' }}>
                {certificate.manuscript_title}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                {certificate.journal_name} · Vol. {certificate.volume}, Issue {certificate.issue}, {certificate.publication_year}
                {certificate.doi ? ` · ${certificate.doi}` : ''}
              </div>
            </div>

            {certificate.status === 'active' ? (
              <>
                <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.5 }}>
                  Your certificate is ready. Download the PDF or verify it publicly using the link below.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {certificate.download_url && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.open(certificate.download_url, '_blank', 'noopener,noreferrer')}
                    >
                      ⬇ Download Certificate PDF
                    </Button>
                  )}
                  {certificate.verification_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(certificate.verification_url, '_blank', 'noopener,noreferrer')}
                    >
                      🔍 Verify Certificate
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {certificate.status === 'revoked'
                  ? 'This certificate has been revoked.'
                  : 'Your certificate is being prepared. Please check back shortly.'}
              </p>
            )}
          </>
        ) : null}
      </Modal>
    </div>
  )
}
