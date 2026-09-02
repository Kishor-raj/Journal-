import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import FormField from '../../shared/components/FormField'
import Tabs from '../../shared/components/Tabs'
import { getRevisionRequest, submitRevisionResponse } from '../../services/revisionService'
import { formatDate } from '../../shared/utils/formatDate'

const TABS = [
  { key: 'request', label: 'Request' },
  { key: 'comments', label: 'Reviewer Comments' },
  { key: 'upload', label: 'Upload & Submit' },
]

const styles = {
  page: {
    fontFamily: 'inherit',
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
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
    background: 'var(--color-surface-sunken)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '12px',
  },
  reviewerName: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    margin: '0 0 8px 0',
  },
  commentText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '10px 12px',
    fontFamily: 'inherit',
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
    fontFamily: 'inherit',
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
}

export default function RevisionResponseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('request')

  const [form, setForm] = useState({
    cover_letter: '',
    response_summary: '',
    reviewer_responses: [],
  })

  useEffect(() => {
    getRevisionRequest(id)
      .then((data) => {
        setRequest(data)
        if (data.reviews) {
          setForm((prev) => ({
            ...prev,
            reviewer_responses: data.reviews.map((review) => ({
              review_id: review.id,
              reviewer_name: review.reviewer_name,
              public_comments: review.public_comments,
              author_response: '',
            })),
          }))
        }
      })
      .catch(() => {})
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

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitRevisionResponse(id, {
        cover_letter: form.cover_letter,
        response_summary: form.response_summary,
        reviewer_responses: form.reviewer_responses.filter((r) => r.author_response.trim()),
      })
      navigate('/author/revisions')
    } catch {
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
        <p style={{ color: 'var(--color-text-muted)' }}>Revision request not found.</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Submit Revision</h1>
        <p style={styles.subtitle}>
          #{request.submission_number} — Round {request.round_number}
        </p>
      </div>

      <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'request' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Editor Instructions</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', lineHeight: 1.6 }}>
            {request.instructions || request.decision_letter || 'No specific instructions provided.'}
          </p>
          {request.due_at && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Due: {formatDate(request.due_at)}
            </p>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <>
          {request.reviews && request.reviews.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Reviewer Comments</h2>
              {request.reviews.map((review, idx) => (
                <div key={review.id} style={styles.reviewCard}>
                  <h3 style={styles.reviewerName}>Reviewer {idx + 1}</h3>
                  {review.public_comments && (
                    <p style={styles.commentText}>{review.public_comments}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {form.reviewer_responses.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Point-by-Point Responses</h2>
              {form.reviewer_responses.map((resp, idx) => (
                <div key={resp.review_id} style={styles.reviewCard}>
                  <h3 style={styles.reviewerName}>Response to Reviewer {idx + 1}</h3>
                  {resp.public_comments && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Original Comment
                      </div>
                      <p style={styles.commentText}>{resp.public_comments}</p>
                    </div>
                  )}
                  <FormField label="Your Response" required>
                    <textarea
                      value={resp.author_response}
                      onChange={(e) => updateReviewerResponse(idx, e.target.value)}
                      placeholder={`Respond to reviewer ${idx + 1}'s comments...`}
                      style={styles.textarea}
                    />
                  </FormField>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'upload' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Response</h2>
          <FormField label="Cover Letter" helperText="Summarize your changes at a high level">
            <textarea
              value={form.cover_letter}
              onChange={(e) => setForm((prev) => ({ ...prev, cover_letter: e.target.value }))}
              placeholder="Describe the major changes made in this revision..."
              style={styles.textarea}
            />
          </FormField>

          <FormField label="Response Summary" helperText="Overview of how you addressed the reviewers' concerns">
            <textarea
              value={form.response_summary}
              onChange={(e) => setForm((prev) => ({ ...prev, response_summary: e.target.value }))}
              placeholder="Provide a summary of your responses to the reviewers..."
              style={styles.textarea}
            />
          </FormField>
        </div>
      )}

      <div style={styles.actions}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button variant="primary" loading={submitting} onClick={handleSubmit}>
          Submit Revision
        </Button>
      </div>
    </div>
  )
}
