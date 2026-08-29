import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import FormField from '../../shared/components/FormField'
import StatusBadge from '../../shared/components/StatusBadge'
import PageHeader from '../../shared/components/PageHeader'
import { getManuscript, submitDecision } from '../../services/editorialService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  reviewsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  reviewCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  reviewerName: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    margin: 0,
  },
  reviewDate: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted)',
  },
  commentSection: {
    marginBottom: '12px',
  },
  commentLabel: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  commentText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  },
  scoresRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  scoreItem: {
    fontSize: '0.8125rem',
    color: 'var(--color-ink-black)',
  },
  scoreValue: {
    fontWeight: 700,
    color: 'var(--color-citation-gold-dark)',
  },
  confidentialNote: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
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
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  emptyReview: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
  },
  decisionCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px',
  },
  decisionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    margin: '0 0 20px 0',
    fontWeight: 600,
  },
}

function formatRecommendation(val) {
  if (!val) return '—'
  return val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function DecisionPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [manuscript, setManuscript] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    decision: '',
    comments_to_author: '',
    internal_notes: '',
  })

  useEffect(() => {
    getManuscript(id)
      .then((data) => {
        setManuscript(data)
        setReviews(data.reviews || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.decision) return
    setSubmitting(true)
    try {
      await submitDecision(id, form)
      navigate('/editor/queue')
    } catch {
      setSubmitting(false)
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

  return (
    <div style={styles.page}>
      <PageHeader
        title="Editorial Decision"
        subtitle={`#${manuscript.submission_number} — ${manuscript.title || 'Untitled'}`}
      />

      <div style={styles.reviewsGrid}>
        {reviews.length === 0 ? (
          <div style={{ ...styles.reviewCard, gridColumn: '1 / -1' }}>
            <div style={styles.emptyReview}>No reviews submitted yet.</div>
          </div>
        ) : (
          reviews.map((review, idx) => (
            <div key={review.id || idx} style={styles.reviewCard}>
              <div style={styles.reviewHeader}>
                <h3 style={styles.reviewerName}>
                  Reviewer {idx + 1}
                </h3>
                <span style={styles.reviewDate}>
                  {formatDate(review.submitted_at)}
                </span>
              </div>

              {review.recommendation && (
                <div style={{ marginBottom: '12px' }}>
                  <StatusBadge status={review.recommendation} />
                </div>
              )}

              {review.scores && Object.keys(review.scores).length > 0 && (
                <div style={styles.scoresRow}>
                  {Object.entries(review.scores).map(([key, val]) => (
                    <span key={key} style={styles.scoreItem}>
                      {formatRecommendation(key)}:{' '}
                      <span style={styles.scoreValue}>{val}</span>
                    </span>
                  ))}
                </div>
              )}

              {review.public_comments && (
                <div style={styles.commentSection}>
                  <div style={styles.commentLabel}>Public Comments</div>
                  <div style={styles.commentText}>{review.public_comments}</div>
                </div>
              )}

              {review.confidential_comments && (
                <div style={styles.commentSection}>
                  <div style={styles.commentLabel}>Confidential Comments</div>
                  <div style={styles.commentText}>{review.confidential_comments}</div>
                  <div style={styles.confidentialNote}>
                    Not visible to authors
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={styles.decisionCard}>
        <h2 style={styles.decisionTitle}>Your Decision</h2>

        <FormField label="Decision" required>
          <select
            value={form.decision}
            onChange={(e) => updateField('decision', e.target.value)}
            style={{
              ...styles.input,
              background: 'var(--color-surface)',
              cursor: 'pointer',
            }}
          >
            <option value="">Select a decision...</option>
            <option value="accept">Accept</option>
            <option value="minor_revision">Minor Revision</option>
            <option value="major_revision">Major Revision</option>
            <option value="reject">Reject</option>
          </select>
        </FormField>

        <FormField label="Comments to Author">
          <textarea
            value={form.comments_to_author}
            onChange={(e) => updateField('comments_to_author', e.target.value)}
            placeholder="Feedback to include with the decision letter..."
            style={styles.textarea}
          />
        </FormField>

        <FormField label="Internal Notes">
          <textarea
            value={form.internal_notes}
            onChange={(e) => updateField('internal_notes', e.target.value)}
            placeholder="Private notes for editorial records..."
            style={styles.textarea}
          />
        </FormField>

        <div style={styles.actions}>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={!form.decision}
            onClick={handleSubmit}
          >
            Submit Decision
          </Button>
        </div>
      </div>
    </div>
  )
}
