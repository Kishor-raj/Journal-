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
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginTop: '20px',
    borderBottom: '1px solid var(--color-rule-grey)',
    paddingBottom: '12px',
  },
  tabBtn: (active) => ({
    background: active ? 'var(--color-ink-navy)' : 'transparent',
    color: active ? '#FFFFFF' : 'var(--color-ink-black)',
    border: active ? '1px solid var(--color-ink-navy)' : '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 14px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginTop: '20px',
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
    border: '1px solid var(--color-success)',
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
    background: '#0B1B3A',
    color: '#D9A94A',
    border: '1px solid #C4A24C',
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
  const isPublished = manuscript.current_status === 'published'

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
        {isPublished ? (
          <div style={styles.publishedBadge}>
            <i className="fas fa-globe" style={{ fontSize: '10px' }} />
            Published
          </div>
        ) : (
          <div style={styles.acceptedBadge}>
            <i className="fas fa-circle-check" style={{ fontSize: '10px' }} />
            Accepted
          </div>
        )}
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

        {isPublished ? (
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: '#1A7F4B',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <i className="fas fa-check-circle" /> Live on Site
          </span>
        ) : (
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
        )}
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
  const [filter, setFilter] = useState('all') // 'all' | 'accepted' | 'published'

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
      setSuccessMessage('Manuscript successfully published! It remains listed here with Published status and is live on the site.')
      loadManuscripts()
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      alert(err.message || 'Failed to publish manuscript')
    } finally {
      setPublishingId(null)
    }
  }

  const filteredManuscripts = manuscripts.filter((m) => {
    if (filter === 'accepted') return m.current_status === 'accepted'
    if (filter === 'published') return m.current_status === 'published'
    return true
  })

  const acceptedCount = manuscripts.filter(m => m.current_status === 'accepted').length
  const publishedCount = manuscripts.filter(m => m.current_status === 'published').length

  return (
    <div style={styles.page}>
      <PageHeader
        title="Accepted & Published Manuscripts"
        subtitle="Manage accepted manuscripts and track published articles"
      />

      {/* Filter Tabs */}
      <div style={styles.tabsContainer}>
        <button
          style={styles.tabBtn(filter === 'all')}
          onClick={() => setFilter('all')}
          type="button"
        >
          All ({manuscripts.length})
        </button>
        <button
          style={styles.tabBtn(filter === 'accepted')}
          onClick={() => setFilter('accepted')}
          type="button"
        >
          Pending Publication ({acceptedCount})
        </button>
        <button
          style={styles.tabBtn(filter === 'published')}
          onClick={() => setFilter('published')}
          type="button"
        >
          Published ({publishedCount})
        </button>
      </div>

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
          Loading manuscripts...
        </div>
      ) : filteredManuscripts.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📂</div>
          <div style={styles.emptyTitle}>No Manuscripts in this View</div>
          <div style={styles.emptyMsg}>
            {filter === 'accepted'
              ? 'No manuscripts are currently waiting to be published.'
              : filter === 'published'
              ? 'No published manuscripts found.'
              : 'Manuscripts will appear here once accepted or published.'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '12px' }}>
            Showing {filteredManuscripts.length} of {manuscripts.length} manuscript{manuscripts.length !== 1 ? 's' : ''}
          </div>
          <div style={styles.grid}>
            {filteredManuscripts.map((m) => (
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


