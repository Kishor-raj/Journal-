import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyManuscripts } from './services/manuscriptService'
import apiClient from '../../services/apiClient'

/* ─── Status → notification metadata ─────────────────────────────────────── */
const STATUS_META = {
  submitted: {
    type: 'Submitted',
    typeColor: '#2E6B9E',
    typeBg: '#EBF4FB',
    icon: 'fa-paper-plane',
    iconColor: '#2E6B9E',
    text: (m) =>
      `<strong>${m.submission_number || m.title || 'Your manuscript'}</strong> submitted successfully. Awaiting moderation screening.`,
  },
  under_review: {
    type: 'Review',
    typeColor: '#2E6B9E',
    typeBg: '#EBF4FB',
    icon: 'fa-magnifying-glass',
    iconColor: '#2E6B9E',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> has entered peer review. Reviewers have been assigned.`,
  },
  revision_requested: {
    type: 'Revision',
    typeColor: '#C48B1E',
    typeBg: '#FEF7E8',
    icon: 'fa-rotate',
    iconColor: '#C48B1E',
    text: (m) =>
      `<strong>Revision required</strong> for ${m.submission_number || m.title}. Review comments are available in the manuscript detail page.`,
  },
  resubmitted: {
    type: 'Resubmitted',
    typeColor: '#2E6B9E',
    typeBg: '#EBF4FB',
    icon: 'fa-paper-plane',
    iconColor: '#2E6B9E',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> resubmission received. Under editorial review.`,
  },
  accepted: {
    type: 'Accepted',
    typeColor: '#2B7A4B',
    typeBg: '#E8F5EC',
    icon: 'fa-circle-check',
    iconColor: '#2B7A4B',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> has been <strong>accepted</strong> for publication. Congratulations! The production team will contact you regarding proof review.`,
  },
  rejected: {
    type: 'Decision',
    typeColor: '#B83333',
    typeBg: '#FCECEC',
    icon: 'fa-circle-xmark',
    iconColor: '#B83333',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> was not accepted for publication in this cycle. Reviewer feedback is available.`,
  },
  withdrawn: {
    type: 'Withdrawn',
    typeColor: '#8B8F9A',
    typeBg: '#F4F5F7',
    icon: 'fa-ban',
    iconColor: '#8B8F9A',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> has been withdrawn as requested.`,
  },
  screening_passed: {
    type: 'Screening',
    typeColor: '#2B7A4B',
    typeBg: '#E8F5EC',
    icon: 'fa-clipboard-check',
    iconColor: '#2B7A4B',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> passed moderation screening and is awaiting editorial assignment.`,
  },
  screening_failed: {
    type: 'Screening',
    typeColor: '#B83333',
    typeBg: '#FCECEC',
    icon: 'fa-triangle-exclamation',
    iconColor: '#B83333',
    text: (m) =>
      `<strong>${m.submission_number || m.title}</strong> did not pass moderation screening. Please review the checklist notes.`,
  },
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined })
}

/* Build notification objects from status history events */
function buildNotifications(manuscripts, historyMap) {
  const all = []

  manuscripts.forEach((manuscript) => {
    const history = historyMap[manuscript.id] || []

    history.forEach((event) => {
      const meta = STATUS_META[event.status]
      if (!meta) return

      all.push({
        id: `${manuscript.id}-${event.status}-${event.created_at}`,
        manuscriptId: manuscript.id,
        submissionNumber: manuscript.submission_number,
        title: manuscript.title,
        status: event.status,
        type: meta.type,
        typeColor: meta.typeColor,
        typeBg: meta.typeBg,
        icon: meta.icon,
        iconColor: meta.iconColor,
        html: meta.text(manuscript),
        createdAt: event.created_at,
        read: false,
      })
    })
  })

  // Sort newest first
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return all
}

/* ─── Filter tabs ──────────────────────────────────────────────────────────── */
const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'Revision', label: 'Revisions' },
  { key: 'Review',   label: 'Reviews' },
  { key: 'Accepted', label: 'Decisions' },
  { key: 'Submitted', label: 'Submissions' },
]

/* ─── Component ────────────────────────────────────────────────────────────── */
export default function AuthorNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [readIds, setReadIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('author_notif_read') || '[]'))
    } catch {
      return new Set()
    }
  })

  // Persist read state
  const persistRead = useCallback((ids) => {
    localStorage.setItem('author_notif_read', JSON.stringify([...ids]))
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const manuscripts = await getMyManuscripts()
        // Fetch status history for every manuscript in parallel
        const historyResults = await Promise.allSettled(
          manuscripts.map((m) =>
            apiClient.get(`/manuscripts/${m.id}/status-history`)
              .then((data) => ({ id: m.id, data }))
              .catch(() => ({ id: m.id, data: [] }))
          )
        )
        const historyMap = {}
        historyResults.forEach((r) => {
          if (r.status === 'fulfilled') {
            historyMap[r.value.id] = Array.isArray(r.value.data) ? r.value.data : []
          }
        })
        setNotifications(buildNotifications(manuscripts, historyMap))
      } catch {
        // If API fails, show empty state — no crash
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function markRead(id) {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      persistRead(next)
      return next
    })
  }

  function markAllRead() {
    const allIds = new Set(notifications.map((n) => n.id))
    setReadIds(allIds)
    persistRead(allIds)
  }

  const filtered = filter === 'all'
    ? notifications
    : filter === 'Accepted'
    ? notifications.filter((n) => ['Accepted', 'Decision'].includes(n.type))
    : notifications.filter((n) => n.type === filter)

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length

  return (
    <div style={{ padding: '32px 40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '10px',
                background: '#B83333',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                verticalAlign: 'middle',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
            Decisions, review updates, and submission status changes
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px',
              border: '1px solid #E2E4E8',
              borderRadius: '6px',
              background: '#fff',
              color: '#5A5E6B',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'border-color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4922E'; e.currentTarget.style.color = '#C4922E' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E4E8'; e.currentTarget.style.color = '#5A5E6B' }}
          >
            <i className="fas fa-check-double" style={{ fontSize: '13px' }} />
            Mark all read
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #E2E4E8', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.key
          const count = f.key === 'all'
            ? notifications.filter(n => !readIds.has(n.id)).length
            : f.key === 'Accepted'
            ? notifications.filter(n => ['Accepted','Decision'].includes(n.type) && !readIds.has(n.id)).length
            : notifications.filter(n => n.type === f.key && !readIds.has(n.id)).length

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#1B2A4A' : '#8B8F9A',
                borderBottom: isActive ? '2px solid #C4922E' : '2px solid transparent',
                marginBottom: '-1px',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'color 150ms',
              }}
            >
              {f.label}
              {count > 0 && (
                <span style={{ background: '#B83333', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Notification list ── */}
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
              isRead={readIds.has(n.id)}
              isLast={idx === filtered.length - 1}
              onRead={() => markRead(n.id)}
              onNavigate={() => {
                markRead(n.id)
                navigate(`/author/manuscripts/${n.manuscriptId}`)
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ─── NotifItem ─────────────────────────────────────────────────────────────── */
function NotifItem({ notif, isRead, isLast, onRead, onNavigate }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: '14px',
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : '1px solid #E2E4E8',
        background: hovered
          ? '#F9FAFB'
          : isRead
          ? '#fff'
          : 'rgba(43,122,75,0.03)',
        cursor: 'pointer',
        transition: 'background 150ms',
        alignItems: 'flex-start',
      }}
    >
      {/* Unread dot */}
      <div style={{ width: '8px', minWidth: '8px', marginTop: '7px' }}>
        {!isRead && (
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2B7A4B' }} />
        )}
      </div>

      {/* Icon */}
      <div style={{
        width: '36px', height: '36px', minWidth: '36px',
        borderRadius: '8px',
        background: notif.typeBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`fas ${notif.icon}`} style={{ fontSize: '15px', color: notif.iconColor }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: '13px', color: '#1A1A2E', lineHeight: 1.55, opacity: isRead ? 0.7 : 1 }}
          dangerouslySetInnerHTML={{ __html: notif.html }}
        />
        <div style={{ fontSize: '12px', color: '#8B8F9A', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-clock" style={{ fontSize: '10px' }} />
          {timeAgo(notif.createdAt)}
        </div>
      </div>

      {/* Type badge + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '3px 8px',
          borderRadius: '4px',
          background: notif.typeBg,
          color: notif.typeColor,
          whiteSpace: 'nowrap',
        }}>
          {notif.type}
        </span>
        {!isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: '#8B8F9A', padding: '0',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#1B2A4A' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8B8F9A' }}
            title="Mark as read"
          >
            <i className="fas fa-check" style={{ fontSize: '11px', marginRight: '3px' }} />
            Mark read
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── States ────────────────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#8B8F9A', marginBottom: '12px', display: 'block' }} />
      <div style={{ fontSize: '14px', color: '#8B8F9A' }}>Loading notifications…</div>
    </div>
  )
}

function EmptyState({ filter }) {
  return (
    <div style={{ padding: '72px 20px', textAlign: 'center' }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%',
        background: '#F4F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <i className="fas fa-bell-slash" style={{ fontSize: '22px', color: '#8B8F9A' }} />
      </div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A2E', marginBottom: '6px' }}>
        {filter === 'all' ? 'No notifications yet' : `No ${filter.toLowerCase()} notifications`}
      </div>
      <div style={{ fontSize: '13px', color: '#8B8F9A', maxWidth: '340px', margin: '0 auto' }}>
        {filter === 'all'
          ? 'Status updates for your manuscripts will appear here once you submit.'
          : 'No notifications matching this filter.'}
      </div>
    </div>
  )
}
