import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications } from '../../services/moderationService'

/* ─── Type → visual metadata ─────────────────────────────────────────────── */
const TYPE_META = {
  New: {
    icon: 'fa-inbox',        iconBg: '#EBF4FB', iconColor: '#2E6B9E',
    typeBg: '#EBF4FB',       typeColor: '#2E6B9E',
    label: 'New',
    text: (n) => `<strong>New submission:</strong> ${n.submission_number || 'Manuscript'} "${n.title || 'Untitled'}"${n.first_author ? ` by ${n.first_author}` : ''}`,
  },
  Resubmission: {
    icon: 'fa-rotate',       iconBg: '#F3E8FF', iconColor: '#7C3AED',
    typeBg: '#F3E8FF',       typeColor: '#7C3AED',
    label: 'Resubmission',
    text: (n) => `<strong>Resubmission received:</strong> ${n.submission_number || 'Manuscript'} — "${n.title || 'Untitled'}" has been resubmitted for screening`,
  },
  Routed: {
    icon: 'fa-circle-check', iconBg: '#E8F5EC', iconColor: '#2B7A4B',
    typeBg: '#E8F5EC',       typeColor: '#2B7A4B',
    label: 'Routed',
    text: (n) => `Your approval of <strong>${n.submission_number || 'manuscript'}</strong> was accepted — manuscript forwarded to editorial assignment`,
  },
  Returned: {
    icon: 'fa-rotate-left',  iconBg: '#FEF7E8', iconColor: '#C48B1E',
    typeBg: '#FEF7E8',       typeColor: '#C48B1E',
    label: 'Returned',
    text: (n) => `<strong>${n.submission_number || 'Manuscript'}</strong> was returned to the author for corrections`,
  },
  Rejected: {
    icon: 'fa-ban',          iconBg: '#FCECEC', iconColor: '#B83333',
    typeBg: '#FCECEC',       typeColor: '#B83333',
    label: 'Rejected',
    text: (n) => `<strong>${n.submission_number || 'Manuscript'}</strong> was desk-rejected — out of scope or did not meet submission criteria`,
  },
}

const FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'New',          label: 'New Submissions' },
  { key: 'Resubmission', label: 'Resubmissions' },
  { key: 'Routed',       label: 'Routed' },
  { key: 'Returned',     label: 'Returned' },
  { key: 'Rejected',     label: 'Rejected' },
]

/* ─── Time helper ─────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffMs = Date.now() - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1)   return 'Just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHours < 24) return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays < 7)   return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ModeratorNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [filter, setFilter]     = useState('all')

  // Read state persisted in localStorage
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mod_notif_read') || '[]')) }
    catch { return new Set() }
  })

  const persistRead = useCallback((ids) => {
    localStorage.setItem('mod_notif_read', JSON.stringify([...ids]))
  }, [])

  useEffect(() => {
    getNotifications()
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  function markRead(id) {
    setReadIds(prev => {
      const next = new Set(prev); next.add(id); persistRead(next); return next
    })
  }

  function markAllRead() {
    const all = new Set(notifications.map(n => n.id))
    setReadIds(all); persistRead(all)
  }

  // Enrich each notification with visual metadata
  const enriched = notifications.map(n => {
    const meta = TYPE_META[n.type] ?? TYPE_META.New
    return { ...n, meta, html: meta.text(n), isRead: readIds.has(n.id) }
  })

  const filtered = filter === 'all' ? enriched : enriched.filter(n => n.type === filter)
  const unreadCount = enriched.filter(n => !n.isRead).length

  return (
    <div style={{ padding: '32px 40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: '10px', background: '#B83333', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', verticalAlign: 'middle', fontFamily: "'DM Sans', sans-serif" }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
            New submissions, resubmissions, and routing confirmations
          </p>
        </div>
        {unreadCount > 0 && <MarkAllBtn onClick={markAllRead} />}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '14px 18px', borderRadius: '8px', background: '#FCECEC', border: '1px solid #E8B8B8', fontSize: '13px', color: '#B83333', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <i className="fas fa-triangle-exclamation" />
          Failed to load notifications. Please refresh the page.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #E2E4E8', flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const count = f.key === 'all'
            ? enriched.filter(n => !n.isRead).length
            : enriched.filter(n => n.type === f.key && !n.isRead).length
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: active ? 600 : 400,
              color: active ? '#1B2A4A' : '#8B8F9A',
              borderBottom: active ? '2px solid #C4922E' : '2px solid transparent',
              marginBottom: '-1px', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {f.label}
              {count > 0 && (
                <span style={{ background: '#B83333', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          filtered.map((n, idx) => (
            <NotifItem
              key={n.id}
              notif={n}
              isLast={idx === filtered.length - 1}
              onRead={() => markRead(n.id)}
              onClick={() => {
                markRead(n.id)
                n.manuscript_id
                  ? navigate(`/moderator/screening/${n.manuscript_id}`)
                  : navigate('/moderator/screening')
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ─── NotifItem ──────────────────────────────────────────────────────────── */
function NotifItem({ notif, isLast, onRead, onClick }) {
  const [hovered, setHovered] = useState(false)
  const { meta, html, isRead } = notif
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: '14px', padding: '16px 20px',
        borderBottom: isLast ? 'none' : '1px solid #E2E4E8',
        background: hovered ? '#F9FAFB' : (!isRead ? 'rgba(43,122,75,0.03)' : '#fff'),
        cursor: 'pointer', transition: 'background 150ms', alignItems: 'flex-start',
      }}
    >
      {/* Unread dot */}
      <div style={{ width: '8px', minWidth: '8px', marginTop: '7px' }}>
        {!isRead && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2B7A4B' }} />}
      </div>

      {/* Icon */}
      <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '8px', background: meta.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`fas ${meta.icon}`} style={{ fontSize: '14px', color: meta.iconColor }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: '13px', color: '#1A1A2E', lineHeight: 1.55, opacity: isRead ? 0.65 : 1 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div style={{ fontSize: '12px', color: '#8B8F9A', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fas fa-clock" style={{ fontSize: '10px' }} />
          {timeAgo(notif.created_at)}
        </div>
      </div>

      {/* Badge + mark-read */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: meta.typeBg, color: meta.typeColor, whiteSpace: 'nowrap' }}>
          {meta.label}
        </span>
        {!isRead && (
          <button
            onClick={e => { e.stopPropagation(); onRead() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#8B8F9A', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => { e.currentTarget.style.color = '#1B2A4A' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8B8F9A' }}
          >
            <i className="fas fa-check" style={{ marginRight: '3px', fontSize: '10px' }} />Mark read
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── States ─────────────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '22px', color: '#8B8F9A', marginBottom: '12px', display: 'block' }} />
      <div style={{ fontSize: '13px', color: '#8B8F9A' }}>Loading notifications…</div>
    </div>
  )
}

function EmptyState({ filter }) {
  return (
    <div style={{ padding: '72px 20px', textAlign: 'center' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <i className="fas fa-bell-slash" style={{ fontSize: '20px', color: '#8B8F9A' }} />
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E', marginBottom: '6px' }}>
        {filter === 'all' ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}
      </div>
      <div style={{ fontSize: '13px', color: '#8B8F9A', maxWidth: '320px', margin: '0 auto' }}>
        {filter === 'all'
          ? 'New submissions and routing updates will appear here once manuscripts enter the queue.'
          : 'No notifications matching this filter.'}
      </div>
    </div>
  )
}

function MarkAllBtn({ onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: `1px solid ${h ? '#C4922E' : '#E2E4E8'}`, borderRadius: '6px', background: '#fff', color: h ? '#C4922E' : '#5A5E6B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 150ms' }}>
      <i className="fas fa-check-double" style={{ fontSize: '13px' }} />
      Mark all read
    </button>
  )
}
