import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../shared/components/PageHeader'
import { getAcceptedManuscripts, publishManuscript } from '../../services/editorialService'
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
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

function ManuscriptCard({ manuscript, onClick, onPublish, isPublishing }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        ...styles.card,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
        borderColor: hovered ? 'rgba(196,146,46,0.5)' : 'var(--color-rule-grey)',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{manuscript.title || 'Untitled Manuscript'}</div>
        <div style={styles.acceptedBadge}>
          <i className="fas fa-circle-check" style={{ fontSize: '10px' }} />
          Accepted
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
          <span style={styles.metaLabel}>Accepted</span>
          <span style={styles.metaValue}>{manuscript.acceptance_date ? formatDate(manuscript.acceptance_date) : '—'}</span>
        </div>
      </div>

      <div style={styles.cardDivider}>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick() }}
        >
          View Details
        </button>

        <button
          style={{
            background: '#0B1B3A',
            border: '1px solid #C4A24C',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: isPublishing ? 'not-allowed' : 'pointer',
            transition: 'background 150ms ease',
            opacity: isPublishing ? 0.7 : 1,
          }}
          type="button"
          disabled={isPublishing}
          onClick={(e) => {
            e.stopPropagation()
            onPublish(manuscript.id)
          }}
        >
          {isPublishing ? 'Publishing...' : 'Publish to Issue 🚀'}
        </button>
      </div>
    </div>
  )
}

export default function AcceptedManuscripts() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const loadManuscripts = () => {
    getAcceptedManuscripts()
      .then((data) => setManuscripts(Array.isArray(data) ? data : []))
      .catch(() => setManuscripts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadManuscripts()
  }, [])

  const handlePublish = async (id) => {
    if (!window.confirm('Are you sure you want to publish this manuscript to the current issue and home page?')) {
      return
    }
    setPublishingId(id)
    try {
      await publishManuscript(id)
      setSuccessMessage('Manuscript successfully published! It is now visible on the Home and Current Issue pages.')
      loadManuscripts()
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      alert(err.message || 'Failed to publish manuscript')
    } finally {
      setPublishingId(null)
    }
  }


  return (
    <div style={styles.page}>
      <PageHeader
        title="Accepted Manuscripts"
        subtitle="Manuscripts that have been accepted by the editorial team"
      />

      {successMessage && (
        <div style={{
          background: '#EAF7F0',
          border: '1px solid var(--color-success)',
          color: 'var(--color-success)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginTop: '16px',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}>
          {successMessage}
        </div>
      )}

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
            {manuscripts.length} manuscript{manuscripts.length !== 1 ? 's' : ''} ready to publish
          </div>
          <div style={styles.grid}>
            {manuscripts.map((m) => (
              <ManuscriptCard
                key={m.id}
                manuscript={m}
                onClick={() => navigate(`/editor/manuscripts/${m.id}`)}
                onPublish={handlePublish}
                isPublishing={publishingId === m.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

