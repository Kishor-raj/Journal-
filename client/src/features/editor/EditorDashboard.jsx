import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../../services/editorialService'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffMs = Date.now() - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatShortDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysOverdue(dateStr) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000))
}

/* decision / recommendation → display label */
const DECISION_LABEL = {
  accept: 'Accept',
  reject: 'Reject',
  minor_revision: 'Minor Revision',
  major_revision: 'Major Revision',
  desk_reject: 'Desk Reject',
}

/* ─── Shared styles ──────────────────────────────────────────────────────── */
const S = {
  page:   { padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" },
  card:   { background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden' },
  cardHdr:{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E2E4E8' },
  title:  { fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' },
  muted:  { fontSize: '12px', color: '#8B8F9A' },
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, accentColor, iconBg, loading }) {
  return (
    <div style={{ ...S.card, borderTop: `3px solid ${accentColor}` }}>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#8B8F9A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fas ${icon}`} style={{ fontSize: '15px', color: accentColor }} />
          </div>
        </div>
        <div style={{ fontSize: '32px', fontWeight: 800, color: '#1A1A2E', lineHeight: 1, marginBottom: '8px' }}>
          {loading ? <span style={{ color: '#E2E4E8' }}>—</span> : value}
        </div>
        <div style={{ fontSize: '12px', color: '#8B8F9A' }}>{sub}</div>
      </div>
    </div>
  )
}

/* ─── StatusBadge ────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    editor_assignment: { label: 'Awaiting Reviewers', bg: '#FEF7E8', color: '#C48B1E' },
    under_review:      { label: 'Under Review',       bg: '#EBF4FB', color: '#2E6B9E' },
    revision_requested:{ label: 'Revision Requested', bg: '#F3E8FF', color: '#7C3AED' },
    resubmitted:       { label: 'Resubmitted',        bg: '#EBF4FB', color: '#2E6B9E' },
    accepted:          { label: 'Accepted',           bg: '#E8F5EC', color: '#2B7A4B' },
    rejected:          { label: 'Rejected',           bg: '#FCECEC', color: '#B83333' },
    published:         { label: 'Published',          bg: '#E8F5EC', color: '#2B7A4B' },
    withdrawn:         { label: 'Withdrawn',          bg: '#F4F5F7', color: '#5A5E6B' },
  }
  const s = map[status] || { label: status?.replace(/_/g, ' ') || '—', bg: '#F4F5F7', color: '#5A5E6B' }
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      <i className="fas fa-circle" style={{ fontSize: '7px', marginRight: '5px' }} />{s.label}
    </span>
  )
}

/* ─── Buttons ─────────────────────────────────────────────────────────────── */
function PrimaryBtn({ children, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? '#2A3F6B' : '#1B2A4A', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', fontFamily: "'DM Sans', sans-serif", transition: 'background 150ms' }}>
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? '#F4F5F7' : 'none', border: '1px solid #E2E4E8', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#5A5E6B', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 150ms' }}>
      {children}
    </button>
  )
}

function ActionBtn({ color, hoverColor, children, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={(e) => { e.stopPropagation(); if (onClick) onClick() }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: h ? hoverColor : color, color: '#fff', whiteSpace: 'nowrap', transition: 'background 150ms' }}>
      {children}
    </button>
  )
}

/* ─── Urgent row ─────────────────────────────────────────────────────────── */
function UrgentRow({ icon, iconBg, iconColor, title, desc, action, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0',
        borderBottom: '1px solid #F4F5F7', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: '38px', height: '38px', minWidth: '38px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`fas ${icon}`} style={{ fontSize: '15px', color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#8B8F9A', marginTop: '3px', lineHeight: 1.5 }}>{desc}</div>
      </div>
      {action && <ActionBtn {...action} />}
    </div>
  )
}

function EmptyUrgent() {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <i className="fas fa-circle-check" style={{ fontSize: '20px', color: '#5EC487', marginBottom: '8px', display: 'block' }} />
      <div style={{ fontSize: '13px', color: '#8B8F9A' }}>All caught up — nothing requires your attention.</div>
    </div>
  )
}

/* ─── Queue row ──────────────────────────────────────────────────────────── */
function QueueRow({ row, onClick }) {
  const [h, setH] = useState(false)
  return (
    <tr onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ borderBottom: '1px solid #E2E4E8', background: h ? '#F9FAFB' : '#fff', cursor: 'pointer', transition: 'background 150ms' }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, color: '#1B2A4A', whiteSpace: 'nowrap', fontSize: '13px' }}>
          {row.submission_number || '—'}
        </div>
        <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#8B8F9A', marginTop: '2px' }}>
          {row.title || 'Untitled'}
        </div>
      </td>
      <td style={{ padding: '12px 16px' }}><StatusBadge status={row.current_status} /></td>
      <td style={{ padding: '12px 16px', color: '#5A5E6B', whiteSpace: 'nowrap', fontSize: '12px' }}>
        {formatShortDate(row.next_due)}
      </td>
    </tr>
  )
}

function EmptyRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '40px 16px', textAlign: 'center', color: '#8B8F9A', fontSize: '13px' }}>
        <i className="fas fa-inbox" style={{ fontSize: '20px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
        {message}
      </td>
    </tr>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function EditorDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getDashboardStats()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const kpi = data?.kpi ?? {}
  const urgent = data?.urgent ?? {}
  const queue = data?.queue ?? []
  const activity = data?.recent_activity ?? []
  const urgentCount = (urgent.overdue_reviews?.length || 0) + (urgent.decisions_pending?.length || 0) + (urgent.no_reviewers?.length || 0)

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={S.title}>Editor Dashboard</h1>
          <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
            Your editorial queue, deadlines, and review progress at a glance
          </p>
        </div>
        <PrimaryBtn onClick={() => navigate('/editor/queue')}>
          <i className="fas fa-file-lines" style={{ marginRight: '6px' }} /> View All Manuscripts
        </PrimaryBtn>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: '8px', background: '#FCECEC', border: '1px solid #E8B8B8', fontSize: '13px', color: '#B83333', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <i className="fas fa-triangle-exclamation" />
          Failed to load dashboard data. Check your connection and refresh.
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <KpiCard loading={loading} label="Assigned to Me"     value={kpi.assigned_to_me ?? 0}      icon="fa-folder-open"     accentColor="#2E6B9E" iconBg="#EBF4FB" sub="Manuscripts I'm handling" />
        <KpiCard loading={loading} label="Awaiting Reviewers" value={kpi.awaiting_reviewers ?? 0} icon="fa-hourglass-half"  accentColor="#C48B1E" iconBg="#FEF7E8" sub="Need reviewer invites" />
        <KpiCard loading={loading} label="Under Review"       value={kpi.under_review ?? 0}       icon="fa-magnifying-glass" accentColor="#2B7A4B" iconBg="#E8F5EC" sub="Reviews in progress" />
        <KpiCard loading={loading} label="Decision Due"       value={kpi.decision_due ?? 0}       icon="fa-gavel"           accentColor="#B83333" iconBg="#FCECEC" sub="Await your decision" />
      </div>

      {/* Urgent items */}
      <div style={{ ...S.card, marginBottom: '24px' }}>
        <div style={S.cardHdr}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>
            <i className="fas fa-triangle-exclamation" style={{ color: '#B83333' }} />
            Urgent Items
          </span>
          {urgentCount > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: '#FCECEC', color: '#B83333' }}>
              <i className="fas fa-circle" style={{ fontSize: '7px', marginRight: '5px' }} />{urgentCount} require attention
            </span>
          )}
        </div>
        <div style={{ padding: '4px 20px 16px' }}>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#8B8F9A', fontSize: '13px' }}>Loading urgent items…</div>
          ) : urgentCount === 0 && !loading && !error ? (
            <EmptyUrgent />
          ) : (
            <>
              {(urgent.overdue_reviews || []).map((item) => (
                <UrgentRow
                  key={`overdue-${item.manuscript_id}-${item.due_at}`}
                  icon="fa-clock"
                  iconBg="#FCECEC"
                  iconColor="#B83333"
                  title={`${item.submission_number || 'Manuscript'} — Reviewer overdue by ${daysOverdue(item.due_at)} day${daysOverdue(item.due_at) === 1 ? '' : 's'}`}
                  desc={`${item.reviewer_name || 'A reviewer'} has not submitted review. Deadline was ${formatShortDate(item.due_at)}. Consider sending a reminder or inviting a replacement.`}
                  action={{ color: '#B83333', hoverColor: '#9F2424', children: 'Act Now', onClick: () => navigate(`/editor/manuscripts/${item.manuscript_id}`) }}
                  onClick={() => navigate(`/editor/manuscripts/${item.manuscript_id}`)}
                />
              ))}
              {(urgent.decisions_pending || []).map((item) => (
                <UrgentRow
                  key={`pending-${item.id}`}
                  icon="fa-gavel"
                  iconBg="#FEF7E8"
                  iconColor="#C48B1E"
                  title={`${item.submission_number || 'Manuscript'} — Editorial decision pending`}
                  desc="All reviews received. A decision (Accept / Minor Revision / Major Revision / Reject) is expected."
                  action={{ color: '#C48B1E', hoverColor: '#A9772B', children: 'Decide', onClick: () => navigate(`/editor/manuscripts/${item.id}/decision`) }}
                  onClick={() => navigate(`/editor/manuscripts/${item.id}/decision`)}
                />
              ))}
              {(urgent.no_reviewers || []).map((item) => (
                <UrgentRow
                  key={`norev-${item.id}`}
                  icon="fa-user-magnifying-glass"
                  iconBg="#FEF7E8"
                  iconColor="#C48B1E"
                  title={`${item.submission_number || 'Manuscript'} — No reviewers assigned yet`}
                  desc="Manuscript passed moderation and is awaiting editor action. Reviewer selection is pending."
                  action={{ color: '#C48B1E', hoverColor: '#A9772B', children: 'Assign', onClick: () => navigate(`/editor/manuscripts/${item.id}/invite`) }}
                  onClick={() => navigate(`/editor/manuscripts/${item.id}/invite`)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Queue + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

        {/* Editorial Queue */}
        <div style={S.card}>
          <div style={S.cardHdr}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>
              <i className="fas fa-file-lines" style={{ color: '#C4922E' }} />
              Editorial Queue
            </span>
            <GhostBtn onClick={() => navigate('/editor/queue')}>
              View All <i className="fas fa-arrow-right" style={{ fontSize: '11px' }} />
            </GhostBtn>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E4E8', background: '#F9FAFB' }}>
                  {['Manuscript', 'Status', 'Due'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#5A5E6B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow cols={3} message="Loading queue…" />
                ) : queue.length === 0 ? (
                  <EmptyRow cols={3} message="No manuscripts in your queue right now." />
                ) : (
                  queue.slice(0, 5).map((row) => (
                    <QueueRow
                      key={row.id}
                      row={row}
                      onClick={() => navigate(`/editor/manuscripts/${row.id}`)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={S.card}>
          <div style={S.cardHdr}><span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A2E' }}>Recent Activity</span></div>
          <div style={{ padding: '8px 20px 16px' }}>
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#8B8F9A', fontSize: '13px' }}>Loading…</div>
            ) : activity.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <i className="fas fa-clipboard-list" style={{ fontSize: '20px', color: '#E2E4E8', marginBottom: '8px', display: 'block' }} />
                <div style={{ fontSize: '13px', color: '#8B8F9A' }}>No editorial activity yet.</div>
              </div>
            ) : (
              activity.map((a, i) => {
                const text = activityText(a)
                return (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid #F4F5F7' : 'none' }}>
                    <div style={{ width: '8px', height: '8px', minWidth: '8px', borderRadius: '50%', background: a.kind === 'review_submitted' ? '#5EC487' : a.kind === 'decision_made' ? '#7CB9D4' : '#C48B1E', marginTop: '6px' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: '#1A1A2E', lineHeight: 1.5 }}>{text}</div>
                      <div style={{ fontSize: '11px', color: '#8B8F9A', marginTop: '3px' }}>{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* kind → activity sentence (real data only) */
function activityText(a) {
  const ref = a.submission_number ? <strong>{a.submission_number}</strong> : 'manuscript'
  if (a.kind === 'review_submitted') {
    const rec = DECISION_LABEL[a.value] || a.value?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return (
      <>
        <strong>{a.reviewer_name || 'A reviewer'}</strong> submitted review for {ref}
        {rec ? <> — Recommendation: {rec}</> : null}
      </>
    )
  }
  if (a.kind === 'decision_made') {
    const label = DECISION_LABEL[a.value] || a.value?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return <>You sent decision: <strong>{label || '—'}</strong> for {ref}</>
  }
  if (a.kind === 'reviewer_invited') {
    return <>You invited <strong>{a.reviewer_name || 'a reviewer'}</strong> for {ref}</>
  }
  return <>Activity for {ref}</>
}