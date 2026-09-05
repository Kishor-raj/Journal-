import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../shared/components/PageHeader'
import Modal from '../../shared/components/Modal'
import Button from '../../shared/components/Button'
import { getAcceptedManuscripts, publishManuscript } from '../../services/editorialService'
import { useToast } from '../../shared/components/Toast'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '24px',
  },
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    lineHeight: 1.35,
    flex: 1,
  },
  acceptedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#EAF7F0',
    color: 'var(--color-success)',
    flexShrink: 0,
  },
  publishedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#E3EEF9',
    color: '#1565C0',
    flexShrink: 0,
  },
  meta: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-text-muted)',
  },
  metaValue: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    fontWeight: 500,
    wordBreak: 'break-word',
  },
  cardDivider: {
    borderTop: '1px solid var(--color-rule-grey)',
    paddingTop: '12px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewButton: {
    background: 'none',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 14px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    color: 'var(--color-ink-navy)',
    cursor: 'pointer',
    transition: 'background 150ms ease, border-color 150ms ease',
  },
  publishButton: {
    background: 'var(--color-ink-navy)',
    border: '1px solid var(--color-ink-navy)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 14px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    color: 'var(--color-surface)',
    cursor: 'pointer',
    transition: 'background 150ms ease, border-color 150ms ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'var(--color-text-muted)',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-ink-navy)',
    marginBottom: '8px',
  },
  emptyMsg: {
    fontSize: 'var(--text-base)',
    lineHeight: 1.6,
  },
}

function ManuscriptCard({ manuscript, onView, onPublish }) {
  const [hovered, setHovered] = useState(false)
  const isPublished = manuscript.current_status === 'published'

  return (
    <div
      style={{
        ...styles.card,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
        borderColor: hovered ? 'rgba(196,146,46,0.5)' : 'var(--color-rule-grey)',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
      }}
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{manuscript.title || 'Untitled Manuscript'}</div>
        <div style={isPublished ? styles.publishedBadge : styles.acceptedBadge}>
          <i className="fas fa-circle-check" style={{ fontSize: '10px' }} />
          {isPublished ? 'Published' : 'Accepted'}
        </div>
      </div>

      <div style={styles.meta}>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Manuscript ID</span>
          <span style={styles.metaValue}>
            {manuscript.submission_number ? `#${manuscript.submission_number}` : manuscript.id?.slice(0, 8)}
          </span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Primary Author</span>
          <span style={styles.metaValue}>{manuscript.primary_author || manuscript.author_email || '—'}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>Submitted</span>
          <span style={styles.metaValue}>{manuscript.submission_date ? formatDate(manuscript.submission_date) : '—'}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>{isPublished ? 'Published' : 'Accepted'}</span>
          <span style={styles.metaValue}>
            {isPublished
              ? (manuscript.published_at ? formatDate(manuscript.published_at) : '—')
              : (manuscript.acceptance_date ? formatDate(manuscript.acceptance_date) : '—')}
          </span>
        </div>
      </div>

      <div style={{ ...styles.cardDivider, gap: '8px' }}>
        <button
          style={{
            ...styles.viewButton,
            background: hovered ? 'var(--color-vellum)' : 'none',
            borderColor: hovered ? 'var(--color-citation-gold)' : 'var(--color-rule-grey)',
          }}
          type="button"
          onClick={(e) => { e.stopPropagation(); onView() }}
        >
          View Details →
        </button>
        {!isPublished && (
          <button
            style={styles.publishButton}
            type="button"
            onClick={(e) => { e.stopPropagation(); onPublish() }}
          >
            Publish
          </button>
        )}
      </div>
    </div>
  )
}

export default function AcceptedManuscripts() {
  const navigate = useNavigate()
  const toast = useToast()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingPublish, setPendingPublish] = useState(null)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    getAcceptedManuscripts()
      .then((data) => setManuscripts(Array.isArray(data) ? data : []))
      .catch(() => setManuscripts([]))
      .finally(() => setLoading(false))
  }, [])

  const confirmPublish = async () => {
    if (!pendingPublish) return
    setPublishing(true)
    try {
      const result = await publishManuscript(pendingPublish.id)
      setManuscripts((prev) =>
        prev.map((m) =>
          m.id === pendingPublish.id
            ? { ...m, current_status: 'published', published_at: result?.manuscript?.published_at || new Date().toISOString() }
            : m
        )
      )
      toast(result?.message || 'Manuscript published successfully.', 'success')
      setPendingPublish(null)
    } catch (err) {
      toast(err?.message || 'Failed to publish manuscript.', 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div style={styles.page}>
      <PageHeader
        title="Accepted Manuscripts"
        subtitle="Manuscripts that have been accepted by the editorial team"
      />

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px 0' }}>
          Loading accepted manuscripts...
        </div>
      ) : manuscripts.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>✅</div>
          <div style={styles.emptyTitle}>No Accepted Manuscripts</div>
          <div style={styles.emptyMsg}>
            Accepted manuscripts will appear here once editorial decisions have been made.
          </div>
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '8px' }}>
            {manuscripts.length} manuscript{manuscripts.length !== 1 ? 's' : ''} accepted or published
          </div>
          <div style={styles.grid}>
            {manuscripts.map((m) => (
              <ManuscriptCard
                key={m.id}
                manuscript={m}
                onView={() => navigate(`/editor/manuscripts/${m.id}`)}
                onPublish={() => setPendingPublish(m)}
              />
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={!!pendingPublish}
        onClose={() => setPendingPublish(null)}
        title="Publish Manuscript?"
        variant="confirmation"
      >
        <p style={{ margin: '0 0 12px', color: 'var(--color-ink-black)', fontSize: 'var(--text-sm)' }}>
          This will mark <strong>{pendingPublish?.title || 'the manuscript'}</strong> as Published and
          make it eligible for public publication areas.
        </p>
        <p style={{ margin: '0 0 20px', color: 'var(--color-ink-black)', fontSize: 'var(--text-sm)' }}>
          This action should only be performed after the final publication requirements have been completed.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="sm" onClick={() => setPendingPublish(null)} disabled={publishing}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" loading={publishing} onClick={confirmPublish}>
            Publish
          </Button>
        </div>
      </Modal>
    </div>
  )
}
