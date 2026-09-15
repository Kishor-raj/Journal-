import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import FormField from '../../shared/components/FormField'
import Tabs from '../../shared/components/Tabs'
import StatusBadge from '../../shared/components/StatusBadge'
import { getRevisionRequest, submitRevisionResponse } from '../../services/revisionService'
import { requestSignature, confirmUpload, deleteManuscriptFile } from './services/manuscriptService'
import { formatDate } from '../../shared/utils/formatDate'

const TABS = [
  { key: 'request', label: 'Request' },
  { key: 'comments', label: 'Reviewer Comments' },
  { key: 'upload', label: 'Upload & Submit' },
]

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--color-info, #2E6B9E)',
    textDecoration: 'none',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    marginBottom: '16px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-ink-navy)',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  section: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
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
  reviewCard: {
    background: 'var(--color-surface-sunken, #F8F9FA)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  reviewerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  reviewerName: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    margin: 0,
  },
  commentText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    margin: '0 0 8px 0',
  },
  textarea: {
    width: '100%',
    minHeight: '110px',
    padding: '10px 12px',
    fontFamily: 'inherit',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    background: 'var(--color-surface)',
    boxSizing: 'border-box',
  },
  uploadZone: {
    border: '2px dashed var(--color-rule-grey)',
    borderRadius: '8px',
    padding: '28px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'var(--color-surface-sunken, #FBFBFB)',
    transition: 'all 0.15s ease',
    marginBottom: '16px',
  },
  uploadIcon: {
    fontSize: '28px',
    color: 'var(--color-info, #2E6B9E)',
    marginBottom: '8px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '6px',
    marginBottom: '8px',
    background: 'var(--color-surface)',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  alertDanger: {
    background: 'rgba(184, 51, 51, 0.08)',
    border: '1px solid rgba(184, 51, 51, 0.3)',
    color: '#7A1A1A',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  alertSuccess: {
    background: 'rgba(43, 122, 75, 0.08)',
    border: '1px solid rgba(43, 122, 75, 0.3)',
    color: '#1A5A30',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
}

export default function RevisionResponseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('request')
  const [previousFiles, setPreviousFiles] = useState([])
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [removingFileId, setRemovingFileId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [form, setForm] = useState({
    cover_letter: '',
    response_summary: '',
    reviewer_responses: [],
  })

  useEffect(() => {
    getRevisionRequest(id)
      .then((data) => {
        setRequest(data)
        const submittedResp = data.responses && data.responses.find((r) => r.status === 'submitted')
        if (data.reviews && data.reviews.length > 0) {
          setForm((prev) => ({
            ...prev,
            cover_letter: submittedResp?.cover_letter || '',
            response_summary: submittedResp?.response_summary || '',
            reviewer_responses: data.reviews.map((review) => {
              const matchedComment = data.comment_responses?.find((cr) => cr.review_id === review.id)
              return {
                review_id: review.id,
                reviewer_name: review.reviewer_name,
                public_comments: review.public_comments,
                recommendation: review.recommendation,
                author_response: matchedComment?.author_response || '',
              }
            }),
          }))
        } else if (submittedResp) {
          setForm((prev) => ({
            ...prev,
            cover_letter: submittedResp.cover_letter || '',
            response_summary: submittedResp.response_summary || '',
          }))
        }
        if (data.files) {
          setPreviousFiles(data.files)
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || 'Failed to load revision request.')
      })
      .finally(() => setLoading(false))
  }, [id])

  const updateReviewerResponse = (index, value) => {
    setForm((prev) => ({
      ...prev,
      reviewer_responses: prev.reviewer_responses.map((resp, i) =>
        i === index ? { ...resp, author_response: value } : resp
      ),
    }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !request?.manuscript_id) return
    setUploading(true)
    setErrorMessage('')
    try {
      const sig = await requestSignature(request.manuscript_id, 'current', 'manuscript')
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', sig.api_key)
      formData.append('timestamp', sig.timestamp)
      formData.append('signature', sig.signature)
      formData.append('folder', sig.folder)
      formData.append('public_id', sig.public_id)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`, {
        method: 'POST',
        body: formData,
      })
      
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed')

      const savedFile = await confirmUpload(request.manuscript_id, 'current', {
        file_type: 'manuscript',
        original_filename: file.name,
        public_id: uploadData.public_id,
        resource_type: uploadData.resource_type,
        format: uploadData.format,
        mime_type: file.type,
        file_size_bytes: file.size,
      })

      setNewlyUploadedFiles((prev) => [...prev, savedFile])
    } catch (err) {
      console.error('Upload error:', err)
      setErrorMessage(err.message || 'Failed to upload revised manuscript file.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = async (fileId) => {
    if (!request?.manuscript_id || !fileId) return
    setRemovingFileId(fileId)
    try {
      await deleteManuscriptFile(request.manuscript_id, fileId)
      setNewlyUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch (err) {
      console.error('File remove error:', err)
    } finally {
      setRemovingFileId(null)
    }
  }

  const handleSubmit = async () => {
    setErrorMessage('')
    if (!form.cover_letter.trim() && !form.response_summary.trim() && form.reviewer_responses.every(r => !r.author_response.trim())) {
      setErrorMessage('Please enter a cover letter, response summary, or response to reviewer comments before submitting.')
      return
    }

    setSubmitting(true)
    try {
      await submitRevisionResponse(id, {
        cover_letter: form.cover_letter,
        response_summary: form.response_summary,
        reviewer_responses: form.reviewer_responses.filter((r) => r.author_response.trim()),
        file_ids: newlyUploadedFiles.map((f) => f.id),
      })
      setSuccessMessage('Revision submitted successfully! Redirecting...')
      setTimeout(() => {
        navigate('/author/revisions')
      }, 1200)
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to submit revision response. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading revision request...</p>
      </div>
    )
  }

  if (!request) {
    return (
      <div style={styles.page}>
        <button style={styles.backLink} onClick={() => navigate('/author/revisions')}>
          ← Back to Revisions
        </button>
        <p style={{ color: 'var(--color-danger)' }}>{errorMessage || 'Revision request not found.'}</p>
      </div>
    )
  }

  const isSubmitted = Boolean(request?.responses?.some((r) => r.status === 'submitted'))

  return (
    <div style={styles.page}>
      <button style={styles.backLink} onClick={() => navigate('/author/revisions')}>
        ← Back to Revisions
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>
          {isSubmitted ? `Revision Details (Round ${request.round_number})` : 'Submit Revision'}
        </h1>
        <p style={styles.subtitle}>
          #{request.submission_number} — Round {request.round_number}
        </p>
        <div style={styles.badgeRow}>
          <StatusBadge status={request.request_type === 'major' ? 'major_revision' : 'minor_revision'} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Manuscript: {request.title || 'Untitled'}
          </span>
        </div>
      </div>

      {isSubmitted && (
        <div style={{
          background: 'rgba(46, 107, 158, 0.08)',
          border: '1px solid rgba(46, 107, 158, 0.3)',
          color: '#1A4366',
          padding: '14px 18px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <i className="fas fa-circle-check" style={{ marginRight: '8px', color: 'var(--color-success)' }} />
            <strong>Revision Submitted:</strong> You have already submitted your response for Round {request.round_number}.
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/author/track/${request.manuscript_id}`)}
          >
            Track Manuscript Status →
          </Button>
        </div>
      )}

      {errorMessage && (
        <div style={styles.alertDanger}>
          <i className="fas fa-circle-exclamation" style={{ marginRight: '8px' }} />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={styles.alertSuccess}>
          <i className="fas fa-circle-check" style={{ marginRight: '8px' }} />
          {successMessage}
        </div>
      )}

      <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'request' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Editor Instructions &amp; Request</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.6 }}>
            {request.instructions || request.decision_letter || 'Please address the reviewers’ comments and upload the revised manuscript.'}
          </p>
          {request.due_at && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '16px' }}>
              <strong>Due Date:</strong> {formatDate(request.due_at)}
            </p>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => setActiveTab('comments')}>
              Next: Reviewer Comments →
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Reviewer Comments &amp; Point-by-Point Response</h2>
          
          {(!request.reviews || request.reviews.length === 0) && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              No individual reviewer comments recorded for this round. Please see editor instructions in the Request tab.
            </p>
          )}

          {form.reviewer_responses.map((resp, idx) => (
            <div key={resp.review_id || idx} style={styles.reviewCard}>
              <div style={styles.reviewerHeader}>
                <h3 style={styles.reviewerName}>Reviewer {idx + 1}</h3>
                {resp.recommendation && <StatusBadge status={resp.recommendation} />}
              </div>

              {resp.public_comments && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Reviewer Comments
                  </div>
                  <p style={styles.commentText}>{resp.public_comments}</p>
                </div>
              )}

              <FormField label="Your Point-by-Point Response" required={!isSubmitted}>
                <textarea
                  value={resp.author_response}
                  onChange={(e) => updateReviewerResponse(idx, e.target.value)}
                  placeholder={isSubmitted ? 'No response entered.' : `Detail how you addressed reviewer ${idx + 1}'s comments...`}
                  style={{
                    ...styles.textarea,
                    ...(isSubmitted ? { background: '#f8fafc', color: 'var(--color-text-primary)', cursor: 'default' } : {})
                  }}
                  readOnly={isSubmitted}
                />
              </FormField>
            </div>
          ))}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="secondary" onClick={() => setActiveTab('request')}>
              ← Back: Request
            </Button>
            <Button variant="primary" onClick={() => setActiveTab('upload')}>
              Next: {isSubmitted ? 'View Files & Responses →' : 'Upload & Submit →'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Revised Manuscript Files</h2>
            {!isSubmitted ? (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Upload your updated manuscript file (with revisions incorporated).
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.tex"
                />

                <div
                  style={styles.uploadZone}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  <div style={styles.uploadIcon}>
                    <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-arrow-up'} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink-navy)', marginBottom: '4px' }}>
                    {uploading ? 'Uploading file...' : 'Click to select revised manuscript file'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    PDF, Word (.docx, .doc), or LaTeX supported
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Files submitted for this revision round:
              </p>
            )}

            {newlyUploadedFiles.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-navy)', marginBottom: '8px' }}>
                  Newly Attached Files ({newlyUploadedFiles.length})
                </div>
                {newlyUploadedFiles.map((file) => (
                  <div key={file.id} style={styles.fileItem}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                        <i className="fas fa-file-lines" style={{ marginRight: '8px', color: 'var(--color-info, #2E6B9E)' }} />
                        {file.original_filename || file.file_type}
                      </div>
                      {file.file_size_bytes && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                    {!isSubmitted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id)}
                        disabled={removingFileId === file.id}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        {removingFileId === file.id ? 'Removing...' : 'Remove'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isSubmitted && previousFiles.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-navy)', marginBottom: '8px' }}>
                  Attached Files ({previousFiles.length})
                </div>
                {previousFiles.map((file) => (
                  <div key={file.id} style={styles.fileItem}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-black)' }}>
                        <i className="fas fa-file-lines" style={{ marginRight: '8px', color: 'var(--color-info, #2E6B9E)' }} />
                        {file.original_filename || file.file_type}
                      </div>
                      {file.file_size_bytes && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Your Response</h2>
            <FormField label="Cover Letter" helperText={isSubmitted ? undefined : 'Summarize major modifications made in this revision'}>
              <textarea
                value={form.cover_letter}
                onChange={(e) => setForm((prev) => ({ ...prev, cover_letter: e.target.value }))}
                placeholder={isSubmitted ? 'No cover letter provided.' : 'Describe the major changes made in this revision round...'}
                style={{
                  ...styles.textarea,
                  ...(isSubmitted ? { background: '#f8fafc', color: 'var(--color-text-primary)', cursor: 'default' } : {})
                }}
                readOnly={isSubmitted}
              />
            </FormField>

            <FormField label="Response Summary" helperText={isSubmitted ? undefined : 'Overview of how you addressed the reviewer and editor concerns'}>
              <textarea
                value={form.response_summary}
                onChange={(e) => setForm((prev) => ({ ...prev, response_summary: e.target.value }))}
                placeholder={isSubmitted ? 'No response summary provided.' : 'Provide a summary overview of your responses...'}
                style={{
                  ...styles.textarea,
                  ...(isSubmitted ? { background: '#f8fafc', color: 'var(--color-text-primary)', cursor: 'default' } : {})
                }}
                readOnly={isSubmitted}
              />
            </FormField>
          </div>

          <div style={styles.actions}>
            <Button variant="secondary" onClick={() => setActiveTab('comments')}>
              ← Back: Reviewer Comments
            </Button>
            <Button variant="ghost" onClick={() => navigate('/author/revisions')}>
              Back to Revisions
            </Button>
            {isSubmitted ? (
              <Button
                variant="primary"
                onClick={() => navigate(`/author/track/${request.manuscript_id}`)}
              >
                Track Manuscript Status →
              </Button>
            ) : (
              <Button variant="primary" loading={submitting} onClick={handleSubmit}>
                Submit Revision
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
