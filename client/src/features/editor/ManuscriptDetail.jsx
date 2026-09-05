import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import StatusBadge from '../../shared/components/StatusBadge'
import Table from '../../shared/components/Table'
import PageHeader from '../../shared/components/PageHeader'
import {
  getManuscript,
  getAssignments,
  setReviewerDeadline,
  getExtensionRequests,
  handleExtension,
  publishManuscript,
  getManuscriptCertificates,
  regenerateCertificates,
  revokeCertificate,
} from '../../services/editorialService'
import { getFileAccess } from '../../services/fileService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  subtitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  section: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    margin: '0 0 16px 0',
    fontWeight: 600,
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  metaItem: {
    fontSize: 'var(--text-sm)',
  },
  metaLabel: {
    color: 'var(--color-text-muted)',
    marginBottom: '4px',
  },
  metaValue: {
    color: 'var(--color-ink-black)',
    fontWeight: 500,
  },
  abstract: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  authorList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  authorItem: {
    padding: '8px 0',
    borderBottom: '1px solid var(--color-rule-grey)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
  },
  authorEmail: {
    color: 'var(--color-text-muted)',
    marginLeft: '8px',
  },
  correspondingBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#E3EEF9',
    color: '#1565C0',
    marginLeft: '8px',
  },
  fileList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--color-rule-grey)',
    fontSize: 'var(--text-sm)',
  },
  fileName: {
    color: 'var(--color-ink-black)',
    fontWeight: 500,
  },
  fileSize: {
    color: 'var(--color-text-muted)',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  dateInput: {
    padding: '6px 8px',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    cursor: 'pointer',
  },
}

const publishInputStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-rule-grey)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-ink-black)',
  marginTop: '4px',
  width: '100%',
  boxSizing: 'border-box',
}

export default function ManuscriptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [manuscript, setManuscript] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [extensions, setExtensions] = useState([])
  const [deadlineEdits, setDeadlineEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [fileError, setFileError] = useState('')
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishModal, setPublishModal] = useState(false)
  const [publishForm, setPublishForm] = useState({ volume: '', issue: '', doi: '' })
  const [certificates, setCertificates] = useState([])
  const [certLoading, setCertLoading] = useState(false)
  const [certNote, setCertNote] = useState('')
  const [revokingId, setRevokingId] = useState(null)

  const openFile = async (fileId, accessType) => {
    try {
      setFileError('')
      const access = await getFileAccess(fileId)
      window.open(access[accessType], '_blank', 'noopener,noreferrer')
    } catch (err) {
      setFileError(err?.message || 'This file is currently unavailable.')
    }
  }

  useEffect(() => {
    getManuscript(id)
      .then(setManuscript)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    getAssignments(id)
      .then(setAssignments)
      .catch(() => {})
  }, [id])

  useEffect(() => {
    getExtensionRequests(id)
      .then(setExtensions)
      .catch(() => {})
  }, [id])

  const loadCertificates = useCallback(() => {
    getManuscriptCertificates(id)
      .then((rows) => setCertificates(Array.isArray(rows) ? rows : []))
      .catch(() => setCertificates([]))
      .finally(() => setCertLoading(false))
  }, [id])

  useEffect(() => {
    if (manuscript?.current_status === 'published') {
      setCertLoading(true)
      loadCertificates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscript?.current_status])

  const toDateInputValue = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const handleSaveDeadline = async (assignmentId) => {
    const deadline = deadlineEdits[assignmentId]
    if (!deadline) return
    try {
      await setReviewerDeadline(id, assignmentId, deadline)
      setAssignments((prev) =>
        prev.map((a) =>
          a.assignment_id === assignmentId ? { ...a, due_at: new Date(deadline).toISOString() } : a
        )
      )
      setDeadlineEdits((prev) => {
        const next = { ...prev }
        delete next[assignmentId]
        return next
      })
    } catch {
      // silent
    }
  }

  const handleExtensionDecision = async (extensionId, approved) => {
    try {
      await handleExtension(extensionId, approved)
      setExtensions((prev) =>
        prev.map((e) =>
          e.id === extensionId
            ? { ...e, status: approved ? 'approved' : 'rejected' }
            : e
        )
      )
    } catch {
      // silent
    }
  }

  const handlePublish = () => {
    setPublishForm({ volume: '', issue: '', doi: '' })
    setPublishModal(true)
  }

  const handleConfirmPublish = async () => {
    setPublishing(true)
    try {
      const result = await publishManuscript(id, {
        volume: publishForm.volume,
        issue: publishForm.issue,
        doi: publishForm.doi,
      })
      setManuscript((prev) => prev ? { ...prev, current_status: 'published' } : prev)
      const certNote =
        result?.certificates_created > 0
          ? ` Certificate(s) prepared: ${result.certificates_created} (${result.certificates_generated ?? 0} generated).`
          : ''
      setPublishSuccess(true)
      setPublishModal(false)
      setTimeout(() => setPublishSuccess(false), 6000)
      setTimeout(() => setCertNote(certNote), 400)
      loadCertificates()
    } catch (err) {
      alert(err.message || 'Failed to publish manuscript')
    } finally {
      setPublishing(false)
    }
  }

  const handleRegenerateCertificates = async () => {
    setCertLoading(true)
    try {
      const result = await regenerateCertificates(id)
      const generated = result?.results?.filter((r) => r.status === 'active').length ?? 0
      setCertNote(`Certificate regeneration finished. ${generated} active, ${(result?.results?.length ?? 0) - generated} pending/failed.`)
      setTimeout(() => setCertNote(''), 6000)
    } catch (err) {
      alert(err.message || 'Failed to regenerate certificates')
    } finally {
      setCertLoading(false)
      loadCertificates()
    }
  }

  const handleRevokeCertificate = async (certificate) => {
    const reason = window.prompt(`Revoke certificate ${certificate.certificate_number}? Enter a reason (optional):`, '')
    if (reason === null) return
    setRevokingId(certificate.id)
    try {
      await revokeCertificate(certificate.id, reason)
      setCertNote(`Certificate ${certificate.certificate_number} revoked.`)
      setTimeout(() => setCertNote(''), 6000)
      loadCertificates()
    } catch (err) {
      alert(err.message || 'Failed to revoke certificate')
    } finally {
      setRevokingId(null)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading manuscript...</p>
      </div>
    )
  }

  if (!manuscript) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--color-text-muted)' }}>Manuscript not found.</p>
      </div>
    )
  }

  const reviewerColumns = [
    {
      key: 'reviewer_name',
      label: 'Reviewer',
      render: (_, row) => (
        <>
          <div style={{ fontWeight: 500 }}>{row.reviewer_name}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{row.reviewer_email}</div>
        </>
      ),
    },
    { key: 'assignment_status', label: 'Status' },
    {
      key: 'due_at',
      label: 'Current Deadline',
      render: (val) => formatDate(val) || '—',
    },
    {
      key: 'update_deadline',
      label: 'Update Deadline',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="date"
            value={deadlineEdits[row.assignment_id] ?? toDateInputValue(row.due_at)}
            onChange={(e) =>
              setDeadlineEdits((prev) => ({
                ...prev,
                [row.assignment_id]: e.target.value,
              }))
            }
            style={styles.dateInput}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!deadlineEdits[row.assignment_id]}
            onClick={() => handleSaveDeadline(row.assignment_id)}
          >
            Save
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader
        title={manuscript.title || 'Untitled'}
        subtitle={
          <>
            #{manuscript.submission_number} — <StatusBadge status={manuscript.current_status} />
          </>
        }
        action={
          <div style={styles.actions}>
            <Button variant="ghost" onClick={() => navigate('/editor/queue')}>
              Back to Queue
            </Button>
            {manuscript.current_status === 'accepted' ? (
              <Button variant="primary" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish Article 🚀'}
              </Button>
            ) : manuscript.current_status !== 'published' ? (
              <Button variant="primary" onClick={() => navigate(`/editor/manuscripts/${id}/decision`)}>
                Make Decision
              </Button>
            ) : null}
          </div>
        }
      />

      {publishSuccess && (
        <div style={{
          background: '#EAF7F0',
          border: '1px solid var(--color-success)',
          color: 'var(--color-success)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}>
          ✅ Manuscript published successfully! The status has been updated to <strong>Published</strong> and is now live on the website.
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Manuscript Details</h2>
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Category</div>
            <div style={styles.metaValue}>{manuscript.category_name || '—'}</div>
          </div>
          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Journal</div>
            <div style={styles.metaValue}>{manuscript.journal_name || '—'}</div>
          </div>
          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Submitted</div>
            <div style={styles.metaValue}>{formatDate(manuscript.submitted_at) || '—'}</div>
          </div>
          <div style={styles.metaItem}>
            <div style={styles.metaLabel}>Status</div>
            <div style={styles.metaValue}>{manuscript.current_status}</div>
          </div>
        </div>
      </div>

      {manuscript.abstract && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Abstract</h2>
          <p style={styles.abstract}>{manuscript.abstract}</p>
        </div>
      )}

      {manuscript.authors && manuscript.authors.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Authors</h2>
          <ul style={styles.authorList}>
            {manuscript.authors.map((author) => (
              <li key={author.id} style={styles.authorItem}>
                <span>{author.first_name} {author.last_name}</span>
                {author.email && <span style={styles.authorEmail}>({author.email})</span>}
                {author.is_corresponding && (
                  <span style={styles.correspondingBadge}>Corresponding</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {manuscript.files && manuscript.files.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Files</h2>
          <ul style={styles.fileList}>
            {manuscript.files.map((file) => (
              <li key={file.id} style={styles.fileItem}>
                <span style={styles.fileName}>
                  {file.original_filename || file.file_type}
                </span>
                <span style={styles.fileSize}>
                  {file.file_size_bytes ? `${(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : '—'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="sm" onClick={() => openFile(file.id, 'view_url')}>View</Button>
                  <Button variant="primary" size="sm" onClick={() => openFile(file.id, 'download_url')}>Download</Button>
                </div>
              </li>
            ))}
          </ul>
          {fileError && <p style={{ marginTop: '12px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{fileError}</p>}
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Reviewers &amp; Deadlines</h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/editor/manuscripts/${id}/invite`)}
          >
            Invite Reviewers
          </Button>
        </div>
        <Table
          columns={reviewerColumns}
          data={assignments}
          emptyMessage="No reviewers assigned yet."
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Extension Requests</h2>
        {extensions.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            No extension requests for this manuscript.
          </p>
        ) : (
          extensions.map((ext) => {
            const pending = ext.status === 'pending'
            return (
              <div
                key={ext.id}
                style={{
                  border: '1px solid var(--color-rule-grey)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '12px',
                  background: pending ? '#FFF7ED' : 'transparent',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>
                      {ext.reviewer_name}
                      {pending && (
                        <StatusBadge
                          status="pending"
                          style={{ marginLeft: '8px' }}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Requests extension to{' '}
                      <strong style={{ color: 'var(--color-ink-black)' }}>
                        {formatDate(ext.requested_until)}
                      </strong>
                      {ext.current_due_at && (
                        <>
                          {' '} (current deadline:{' '}
                          {formatDate(ext.current_due_at)}
                          {')'}
                        </>
                      )}
                    </div>
                    {ext.reason && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-ink-black)', marginTop: '8px' }}>
                        {ext.reason}
                      </div>
                    )}
                  </div>
                  {pending && (
                    <div style={{ display: 'flex', gap: '8px', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleExtensionDecision(ext.id, true)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleExtensionDecision(ext.id, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {!pending && (
                    <div style={{ whiteSpace: 'nowrap' }}>
                      <StatusBadge status={ext.status === 'approved' ? 'accepted' : 'declined'} />
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {certNote && (
        <div style={{
          background: '#FBF6EA',
          border: '1px solid #C4A24C',
          color: '#0B1B3A',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}>
          {certNote}
        </div>
      )}

      {manuscript.current_status === 'published' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Certificates of Publication</h2>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <Button
              variant="secondary"
              size="sm"
              loading={certLoading}
              onClick={handleRegenerateCertificates}
            >
              Regenerate Certificates
            </Button>
          </div>
          {certLoading && certificates.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Loading certificates...</p>
          ) : certificates.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              No certificates found. Regenerate to create Certificate of Publication PDFs for each author.
            </p>
          ) : (
            certificates.map((c) => (
              <div
                key={c.id}
                style={{
                  border: '1px solid var(--color-rule-grey)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  background: c.status === 'active' ? '#F4FAF6' : c.status === 'revoked' ? '#FDF3F0' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {c.certificate_number}
                  </div>
                  {c.status === 'revoked' && c.revocation_reason && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', marginTop: '4px' }}>
                      Reason: {c.revocation_reason}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <StatusBadge status={c.status === 'active' ? 'published' : c.status === 'revoked' ? 'revoked' : c.status} />
                  {c.status === 'active' && c.pdf_file_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(c.pdf_file_url, '_blank', 'noopener,noreferrer')}
                    >
                      View
                    </Button>
                  )}
                  {c.status === 'active' && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={revokingId === c.id}
                      onClick={() => handleRevokeCertificate(c)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {publishModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 14, 27, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => { if (!publishing) setPublishModal(false) }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-navy)', margin: '0 0 6px' }}>
              Publish Manuscript
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0 0 18px' }}>
              {manuscript.title || 'This manuscript'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={styles.metaLabel}>Volume (optional)</span>
                <input
                  type="number"
                  min="1"
                  value={publishForm.volume}
                  onChange={(e) => setPublishForm({ ...publishForm, volume: e.target.value })}
                  placeholder="Defaults to 1"
                  style={publishInputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={styles.metaLabel}>Issue (optional)</span>
                <input
                  type="number"
                  min="1"
                  value={publishForm.issue}
                  onChange={(e) => setPublishForm({ ...publishForm, issue: e.target.value })}
                  placeholder="Defaults to 1"
                  style={publishInputStyle}
                />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
              <span style={styles.metaLabel}>DOI (optional)</span>
              <input
                type="text"
                value={publishForm.doi}
                onChange={(e) => setPublishForm({ ...publishForm, doi: e.target.value })}
                placeholder="10.xxxx/journal.xxxxxxxx"
                style={publishInputStyle}
              />
            </label>

            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Publishing creates the official record of publication and a Certificate of Publication
              for each author (Article No. is reused from the manuscript).
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" size="sm" disabled={publishing} onClick={() => setPublishModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={publishing} onClick={handleConfirmPublish}>
                Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
