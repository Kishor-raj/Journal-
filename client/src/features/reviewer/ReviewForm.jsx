import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import FormField from '../../shared/components/FormField'
import Modal from '../../shared/components/Modal'
import PageHeader from '../../shared/components/PageHeader'
import { getAssignment, getManuscript, submitReview } from '../../services/reviewerService'
import { getFileAccess } from '../../services/fileService'
import { formatDate } from '../../shared/utils/formatDate'

const RECOMMENDATION_OPTIONS = [
  { value: 'accept', label: 'Accept', sub: 'Ready for publication' },
  { value: 'minor_revision', label: 'Minor Revision', sub: 'Small changes needed' },
  { value: 'major_revision', label: 'Major Revision', sub: 'Significant rework' },
  { value: 'reject', label: 'Reject', sub: 'Not suitable' },
]

function recommendationLabel(value) {
  return RECOMMENDATION_OPTIONS.find((o) => o.value === value)?.label || value || '—'
}

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  section: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px',
    marginBottom: '24px',
  },
  recGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  recCard: {
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  recTitle: {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
  recSub: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    margin: '0 0 16px 0',
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    background: 'transparent',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    background: 'transparent',
  },
  scoresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  scoreLabel: {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    marginBottom: '6px',
    display: 'block',
  },
  scoreInput: {
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    background: 'transparent',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
}

export default function ReviewForm() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [assignment, setAssignment] = useState(null)
  const [manuscript, setManuscript] = useState(null)
  const [loadingManuscript, setLoadingManuscript] = useState(true)
  const [fileError, setFileError] = useState('')

  const [form, setForm] = useState({
    recommendation: '',
    public_comments: '',
    confidential_comments: '',
    originality: '',
    methodology: '',
    clarity: '',
  })

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  useEffect(() => {
    let active = true
    async function loadManuscript() {
      try {
        const assignment = await getAssignment(assignmentId)
        if (!assignment) throw new Error('Assignment not found')
        const data = await getManuscript(assignment.manuscript_id)
        if (active) {
          setAssignment(assignment)
          setManuscript(data)
        }
      } catch (err) {
        if (active) setFileError(err?.message || 'Unable to load the assigned manuscript.')
      } finally {
        if (active) setLoadingManuscript(false)
      }
    }
    loadManuscript()
    return () => { active = false }
  }, [assignmentId])

  const openFile = async (fileId, accessType) => {
    try {
      setFileError('')
      const access = await getFileAccess(fileId)
      window.open(access[accessType], '_blank', 'noopener,noreferrer')
    } catch (err) {
      setFileError(err?.message || 'This file is currently unavailable.')
    }
  }

  const validate = () => {
    const next = {}
    if (!form.recommendation) next.recommendation = 'Please select a recommendation'
    if (!form.public_comments.trim()) next.public_comments = 'Public comments are required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const openConfirm = () => {
    if (!validate()) return
    setConfirmOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitReview(assignmentId, {
        recommendation: form.recommendation,
        public_comments: form.public_comments,
        confidential_comments: form.confidential_comments,
        scores: {
          originality: form.originality ? Number(form.originality) : null,
          methodology: form.methodology ? Number(form.methodology) : null,
          clarity: form.clarity ? Number(form.clarity) : null,
        },
      })
      navigate('/reviewer/assignments')
    } catch {
      setSubmitting(false)
    }
  }

  const selectedOption = RECOMMENDATION_OPTIONS.find((o) => o.value === form.recommendation)
  const readOnly = assignment?.assignment_status === 'completed'
  const scores = assignment?.score || {}

  return (
    <div style={styles.page}>
      <PageHeader
        title="Submit Review"
        subtitle={manuscript ? `${manuscript.submission_number || 'Manuscript'} — ${manuscript.title || 'Untitled'}` : 'Provide your review for this manuscript'}
      />

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Manuscript Files</h2>
        {loadingManuscript ? <p style={styles.hint}>Loading assigned manuscript...</p> : manuscript?.files?.length ? (
          manuscript.files.map((file) => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-rule-grey)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, overflowWrap: 'anywhere' }}>{file.original_filename || file.file_type}</span>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <Button variant="secondary" size="sm" onClick={() => openFile(file.id, 'view_url')}>View</Button>
                <Button variant="primary" size="sm" onClick={() => openFile(file.id, 'download_url')}>Download</Button>
              </div>
            </div>
          ))
        ) : <p style={styles.hint}>No manuscript files are available.</p>}
        {fileError && <p style={{ marginTop: '8px', color: 'var(--color-danger)', fontSize: '0.8125rem' }}>{fileError}</p>}
      </div>

      {readOnly && (
        <div style={{ ...styles.section, border: '1px solid var(--color-rule-grey)', boxShadow: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-success)', marginBottom: '6px' }}>
            <i className="fas fa-lock" style={{ fontSize: '13px' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Review submitted — read only</span>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            You submitted your review for this manuscript{assignment?.review_submitted_at ? ` on ${formatDate(assignment.review_submitted_at)}` : ''}. You can still view the manuscript and your submitted review, but you cannot edit or resubmit it.
          </p>
        </div>
      )}

      {readOnly ? (
        <>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Submitted Review</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                Recommendation
              </span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-citation-gold)', background: '#FBF3DC', border: '1px solid var(--color-citation-gold)', borderRadius: '9999px', padding: '3px 12px' }}>
                {recommendationLabel(assignment?.recommendation)}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Submitted {assignment?.review_submitted_at ? formatDate(assignment.review_submitted_at) : '—'}
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={styles.scoreLabel}>Public Comments</label>
              <div style={{ background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {assignment?.public_comments || '—'}
              </div>
            </div>

            {assignment?.confidential_comments && (
              <div style={{ marginBottom: '16px' }}>
                <label style={styles.scoreLabel}>Confidential Comments</label>
                <div style={{ background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {assignment.confidential_comments}
                </div>
              </div>
            )}

            {Object.keys(scores).length > 0 && (
              <div>
                <label style={styles.scoreLabel}>Scores</label>
                <div style={styles.scoresGrid}>
                  {['originality', 'methodology', 'clarity'].map((key) => (
                    <div key={key} style={{ background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink-navy)', marginBottom: '4px', textTransform: 'capitalize' }}>{key}</div>
                      <div style={{ fontSize: 'var(--text-lg)', color: 'var(--color-citation-gold)', fontWeight: 700 }}>
                        {scores[key] ?? '—'}
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 400 }}> / 5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.actions}>
            <Button variant="ghost" onClick={() => navigate('/reviewer/assignments')}>
              Back to My Reviews
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recommendation</h2>
        <div style={styles.recGrid}>
          {RECOMMENDATION_OPTIONS.map((opt) => {
            const isActive = form.recommendation === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => updateField('recommendation', opt.value)}
                style={{
                  ...styles.recCard,
                  border: `2px solid ${isActive ? 'var(--color-citation-gold)' : 'var(--color-rule-grey)'}`,
                  background: isActive ? '#FBF3DC' : 'transparent',
                }}
              >
                <div style={styles.recTitle}>{opt.label}</div>
                <div style={styles.recSub}>{opt.sub}</div>
              </div>
            )
          })}
        </div>
        {errors.recommendation && (
          <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
            {errors.recommendation}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Comments</h2>
        <FormField label="Public Comments" required error={errors.public_comments}>
          <textarea
            value={form.public_comments}
            onChange={(e) => updateField('public_comments', e.target.value)}
            placeholder="Comments visible to the authors..."
            style={styles.textarea}
          />
        </FormField>

        <FormField label="Confidential Comments" helperText="Not visible to authors">
          <textarea
            value={form.confidential_comments}
            onChange={(e) => updateField('confidential_comments', e.target.value)}
            placeholder="Private comments for the editor only..."
            style={styles.textarea}
          />
        </FormField>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Scores</h2>
        <div style={styles.scoresGrid}>
          <div>
            <label style={styles.scoreLabel}>Originality</label>
            <FormField error={errors.originality}>
              <input
                type="number"
                min="1"
                max="5"
                step="1"
                value={form.originality}
                onChange={(e) => updateField('originality', e.target.value)}
                placeholder="1-5"
                style={styles.scoreInput}
              />
            </FormField>
            <div style={styles.hint}>1 = Low, 5 = High</div>
          </div>

          <div>
            <label style={styles.scoreLabel}>Methodology</label>
            <FormField error={errors.methodology}>
              <input
                type="number"
                min="1"
                max="5"
                step="1"
                value={form.methodology}
                onChange={(e) => updateField('methodology', e.target.value)}
                placeholder="1-5"
                style={styles.scoreInput}
              />
            </FormField>
            <div style={styles.hint}>1 = Low, 5 = High</div>
          </div>

          <div>
            <label style={styles.scoreLabel}>Clarity</label>
            <FormField error={errors.clarity}>
              <input
                type="number"
                min="1"
                max="5"
                step="1"
                value={form.clarity}
                onChange={(e) => updateField('clarity', e.target.value)}
                placeholder="1-5"
                style={styles.scoreInput}
              />
            </FormField>
            <div style={styles.hint}>1 = Low, 5 = High</div>
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={openConfirm}>
          Submit Review
        </Button>
      </div>
        </>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit Review"
        variant="confirmation"
      >
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)' }}>
          You are about to submit your review. Once submitted, you cannot edit it.
        </p>
        {selectedOption && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink-navy)' }}>
              Recommendation:
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 600 }}>
              {selectedOption.label}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Confirm Submission
          </Button>
        </div>
      </Modal>
    </div>
  )
}
