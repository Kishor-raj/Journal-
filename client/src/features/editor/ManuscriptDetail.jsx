import { useState, useEffect } from 'react'
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

function getFileVersionInfo(file, manuscript) {
  const versionNum = file.version_number
  const isLatest = file.is_current_version || (manuscript.current_version_id && file.version_id === manuscript.current_version_id)
  
  if (versionNum === 1 || file.version_type === 'initial' || (!versionNum && !file.version_id)) {
    return {
      label: 'Original Manuscript (v1)',
      shortLabel: 'Original (v1)',
      badgeBg: '#EBF4FB',
      badgeColor: '#1A4A6E',
      icon: 'fa-file-lines',
      isLatest,
    }
  }

  if (versionNum === 2) {
    return {
      label: 'Revision 1 (v2) — Round 1',
      shortLabel: 'Revision 1',
      badgeBg: '#F3E8FF',
      badgeColor: '#6B21A8',
      icon: 'fa-file-pen',
      isLatest,
    }
  }

  if (versionNum === 3) {
    return {
      label: 'Revision 2 (v3) — Round 2',
      shortLabel: 'Revision 2',
      badgeBg: '#EDE9FE',
      badgeColor: '#5B21B6',
      icon: 'fa-file-pen',
      isLatest,
    }
  }

  if (versionNum > 1) {
    return {
      label: `Revision ${versionNum - 1} (v${versionNum}) — Round ${versionNum - 1}`,
      shortLabel: `Revision ${versionNum - 1}`,
      badgeBg: '#F3E8FF',
      badgeColor: '#6B21A8',
      icon: 'fa-file-pen',
      isLatest,
    }
  }

  return {
    label: 'Manuscript File',
    shortLabel: 'File',
    badgeBg: '#F4F5F7',
    badgeColor: '#5A5E6B',
    icon: 'fa-file',
    isLatest,
  }
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
      await publishManuscript(id, {
        volume: publishForm.volume,
        issue: publishForm.issue,
        doi: publishForm.doi,
      })
      setManuscript((prev) => prev ? { ...prev, current_status: 'published' } : prev)
      setPublishSuccess(true)
      setPublishModal(false)
      setTimeout(() => setPublishSuccess(false), 6000)
    } catch (err) {
      alert(err.message || 'Failed to publish manuscript')
    } finally {
      setPublishing(false)
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
              Manuscript Files ({manuscript.files.length})
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              All uploaded versions &amp; revision files
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {manuscript.files.map((file, idx) => {
              const info = getFileVersionInfo(file, manuscript)
              const isFirstOrLatest = idx === 0 || info.isLatest
              return (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    border: '1px solid var(--color-rule-grey)',
                    borderRadius: 'var(--radius-md)',
                    background: isFirstOrLatest && info.label.includes('Revision') ? '#FAF7FF' : 'var(--color-surface)',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: info.badgeBg,
                        color: info.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <i className={`fas ${info.icon}`} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: info.badgeBg,
                            color: info.badgeColor,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {info.label}
                        </span>
                        {isFirstOrLatest && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#E8F5EC',
                              color: '#2B7A4B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <i className="fas fa-check" style={{ fontSize: '9px' }} /> Latest Version
                          </span>
                        )}
                        {file.file_type && file.file_type !== 'manuscript' && (
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                            ({file.file_type.replace(/_/g, ' ')})
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-ink-black)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.original_filename || file.file_type}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {file.file_size_bytes ? `${(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : '—'}
                        {file.uploaded_at && ` · Uploaded ${formatDate(file.uploaded_at)}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" onClick={() => openFile(file.id, 'view_url')}>
                      <i className="fas fa-eye" style={{ marginRight: '6px' }} /> View
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => openFile(file.id, 'download_url')}>
                      <i className="fas fa-download" style={{ marginRight: '6px' }} /> Download
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          {fileError && <p style={{ marginTop: '12px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{fileError}</p>}
        </div>
      )}

      {manuscript.revisions && manuscript.revisions.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Revision History &amp; Responses</h2>
          {manuscript.revisions.map((rev) => (
            <div
              key={rev.id}
              style={{
                border: '1px solid var(--color-rule-grey)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                marginBottom: '16px',
                background: rev.response_status === 'submitted' ? '#F8FAFC' : '#FFFDF5',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-ink-navy)' }}>
                    Round {rev.round_number}
                  </span>
                  <StatusBadge status={rev.request_type === 'major' ? 'major_revision' : 'minor_revision'} />
                  {rev.response_status === 'submitted' ? (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#E8F5EC', color: '#2B7A4B' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }} />
                      Resubmitted {formatDate(rev.response_submitted_at)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#FEF7E8', color: '#C48B1E' }}>
                      <i className="fas fa-clock" style={{ marginRight: '4px' }} />
                      Awaiting Author Response
                    </span>
                  )}
                </div>
                {rev.due_at && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Due: {formatDate(rev.due_at)}
                  </span>
                )}
              </div>

              {rev.instructions && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Editor Instructions
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {rev.instructions}
                  </div>
                </div>
              )}

              {rev.cover_letter && (
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-rule-grey)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Author Cover Letter
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {rev.cover_letter}
                  </div>
                </div>
              )}

              {rev.response_summary && (
                <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-rule-grey)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Author Response Summary
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {rev.response_summary}
                  </div>
                </div>
              )}

              {rev.reviewer_responses && rev.reviewer_responses.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Point-by-Point Author Responses ({rev.reviewer_responses.length})
                  </div>
                  {rev.reviewer_responses.map((resp, idx) => (
                    <div key={resp.id || idx} style={{ padding: '10px 12px', background: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-rule-grey)', marginBottom: '6px', fontSize: 'var(--text-sm)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-ink-navy)', marginBottom: '4px' }}>
                        Response to Reviewer {idx + 1}
                      </div>
                      <div style={{ color: 'var(--color-ink-black)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {resp.author_response}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
