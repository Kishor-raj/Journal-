import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, getQueue } from '../../services/moderationService'

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

/* decision → display */
const DECISION_META = {
  proceed: { label: 'Approved',       dot: '#2B7A4B', verb: 'Approved'  },
  return:  { label: 'Returned',       dot: '#C48B1E', verb: 'Returned'  },
  reject:  { label: 'Rejected',       dot: '#B83333', verb: 'Rejected'  },
}

/* ─── Shared styles ──────────────────────────────────────────────────────── */
const S = {
  page:      { padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" },
  card:      { background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden' },
  cardHdr:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E2E4E8' },
  cardTitle: { fontSize: '14px', fontWeight: 700, color: '#1A1A2E' },
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon, sub, accentColor, iconBg, loading }) {
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
    submitted:       { label: 'New',         bg: '#EBF4FB', color: '#2E6B9E' },
    under_moderation:{ label: 'In Progress', bg: '#FEF7E8', color: '#C48B1E' },
    editor_assignment:{ label: 'Approved',   bg: '#E8F5EC', color: '#2B7A4B' },
    desk_rejected:   { label: 'Rejected',    bg: '#FCECEC', color: '#B83333' },
    draft:           { label: 'Returned',    bg: '#F3E8FF', color: '#7C3AED' },
  }
  const s = map[status] || { label: status?.replace(/_/g, ' ') || '—', bg: '#F4F5F7', color: '#5A5E6B' }
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: s.bg, color: s.color }}>
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

/* ─── Queue row ──────────────────────────────────────────────────────────── */
function QueueRow({ row, onClick }) {
  const [h, setH] = useState(false)
  const isInProgress = row.current_status === 'under_moderation'
  return (
    <tr onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ borderBottom: '1px solid #E2E4E8', background: h ? '#F9FAFB' : '#fff', cursor: 'pointer', transition: 'background 150ms' }}>
      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1B2A4A', whiteSpace: 'nowrap', fontSize: '13px' }}>
        {row.submission_number || '—'}
      </td>
      <td style={{ padding: '12px 16px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1A1A2E', fontSize: '13px' }}>
        {row.title || 'Untitled'}
      </td>
      <td style={{ padding: '12px 16px', color: '#8B8F9A', whiteSpace: 'nowrap', fontSize: '13px' }}>
        {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </td>
      <td style={{ padding: '12px 16px' }}><StatusBadge status={row.current_status} /></td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <ScreenBtn isInProgress={isInProgress} onClick={e => { e.stopPropagation(); onClick() }} />
      </td>
    </tr>
  )
}

function ScreenBtn({ isInProgress, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", background: h ? (isInProgress ? '#2A3F6B' : '#C4922E') : (isInProgress ? '#1B2A4A' : '#D9A94A'), color: '#fff', display: 'flex', alignItems: 'center', gap: '5px', transition: 'background 150ms' }}>
      <i className={`fas ${isInProgress ? 'fa-arrow-right' : 'fa-clipboard-check'}`} style={{ fontSize: '11px' }} />
      {isInProgress ? 'Continue' : 'Screen'}
    </button>
  )
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
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
export default function ModeratorDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]   = useState(null)
  const [queue, setQueue]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  useEffect(() => {
    Promise.all([getDashboardStats(), getQueue()])
      .then(([s, q]) => {
        setStats(s)
        setQueue(Array.isArray(q) ? q : [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const kpi   = stats?.kpi   ?? {}
  const st    = stats?.stats ?? {}
  const activity = stats?.recent_activity ?? []
  const total = st.total || 0
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '—'

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' }}>
            Moderator Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
            Screening queue overview and your recent moderation activity
          </p>
        </div>
        <PrimaryBtn onClick={() => navigate('/moderator/screening')}>
          <i className="fas fa-layer-group" style={{ marginRight: '6px' }} /> Open Queue
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
        <KpiCard loading={loading} label="New in Queue"          value={kpi.new_in_queue ?? 0}       icon="fa-inbox"         accentColor="#2E6B9E" iconBg="#EBF4FB" sub="Awaiting screening" />
        <KpiCard loading={loading} label="In Progress"           value={kpi.in_progress ?? 0}         icon="fa-spinner"       accentColor="#C48B1E" iconBg="#FEF7E8" sub="Currently screening" />
        <KpiCard loading={loading} label="Returned (This Month)" value={kpi.returned_this_month ?? 0} icon="fa-rotate-left"   accentColor="#B83333" iconBg="#FCECEC" sub="Sent back to author" />
        <KpiCard loading={loading} label="Approved (This Month)" value={kpi.approved_this_month ?? 0} icon="fa-circle-check"  accentColor="#2B7A4B" iconBg="#E8F5EC" sub="Forwarded to editor" />
      </div>

      {/* Queue table */}
      <div style={{ ...S.card, marginBottom: '24px' }}>
        <div style={S.cardHdr}>
          <span style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-triangle-exclamation" style={{ color: '#C48B1E' }} />
            Current Queue
          </span>
          <GhostBtn onClick={() => navigate('/moderator/screening')}>
            View Full Queue <i className="fas fa-arrow-right" style={{ fontSize: '11px' }} />
          </GhostBtn>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E4E8', background: '#F9FAFB' }}>
                {['Manuscript', 'Title', 'Submitted', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === '' ? 'right' : 'left', fontWeight: 600, color: '#5A5E6B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow cols={5} message="Loading queue…" />
              ) : queue.length === 0 ? (
                <EmptyRow cols={5} message="No manuscripts in the queue right now." />
              ) : (
                queue.slice(0, 5).map(row => (
                  <QueueRow
                    key={row.id}
                    row={row}
                    onClick={() => navigate(`/moderator/screening/${row.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity + Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Recent activity (real decisions) */}
        <div style={S.card}>
          <div style={S.cardHdr}><span style={S.cardTitle}>My Recent Activity</span></div>
          <div style={{ padding: '8px 20px 16px' }}>
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#8B8F9A', fontSize: '13px' }}>Loading…</div>
            ) : activity.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <i className="fas fa-clipboard-list" style={{ fontSize: '20px', color: '#E2E4E8', marginBottom: '8px', display: 'block' }} />
                <div style={{ fontSize: '13px', color: '#8B8F9A' }}>No screening activity yet.</div>
              </div>
            ) : (
              activity.map((a, i) => {
                const meta = DECISION_META[a.decision] ?? { verb: a.decision, dot: '#8B8F9A' }
                return (
                  <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid #F4F5F7' : 'none' }}>
                    <div style={{ width: '8px', height: '8px', minWidth: '8px', borderRadius: '50%', background: meta.dot, marginTop: '6px' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: '#1A1A2E', lineHeight: 1.5 }}>
                        {meta.verb} <strong>{a.submission_number || 'manuscript'}</strong>
                        {a.title ? ` — ${a.title.length > 50 ? a.title.slice(0, 50) + '…' : a.title}` : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8B8F9A', marginTop: '3px' }}>{timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Screening stats (real counts) */}
        <div style={S.card}>
          <div style={S.cardHdr}>
            <span style={S.cardTitle}>Screening Statistics (This Month)</span>
          </div>
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#8B8F9A', fontSize: '13px' }}>Loading…</div>
            ) : total === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <i className="fas fa-chart-bar" style={{ fontSize: '20px', color: '#E2E4E8', marginBottom: '8px', display: 'block' }} />
                <div style={{ fontSize: '13px', color: '#8B8F9A' }}>No decisions recorded this month.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Approved',       value: st.approved ?? 0, pct: pct(st.approved), bg: '#E8F5EC', color: '#2B7A4B', icon: 'fa-circle-check' },
                  { label: 'Returned',       value: st.returned ?? 0, pct: pct(st.returned), bg: '#FEF7E8', color: '#C48B1E', icon: 'fa-rotate-left' },
                  { label: 'Rejected',       value: st.rejected ?? 0, pct: pct(st.rejected), bg: '#FCECEC', color: '#B83333', icon: 'fa-ban' },
                  { label: 'Total Screened', value: total,            pct: '',               bg: '#EBF4FB', color: '#2E6B9E', icon: 'fa-clipboard-check' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '16px', background: s.bg, borderRadius: '8px', textAlign: 'center' }}>
                    <i className={`fas ${s.icon}`} style={{ fontSize: '20px', color: s.color, marginBottom: '8px', display: 'block' }} />
                    <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: s.color, marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
                    {s.pct && <div style={{ fontSize: '11px', color: s.color, opacity: 0.7 }}>{s.pct} of total</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
