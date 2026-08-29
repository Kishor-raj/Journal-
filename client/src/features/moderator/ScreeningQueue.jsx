import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQueue } from '../../services/moderationService'

/* ─── Status display map ─────────────────────────────────────────────────── */
const STATUS = {
  submitted:        { label: 'New',         bg: '#EBF4FB', color: '#2E6B9E' },
  under_moderation: { label: 'In Progress', bg: '#FEF7E8', color: '#C48B1E' },
}
function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status?.replace(/_/g, ' ') ?? '—', bg: '#F4F5F7', color: '#5A5E6B' }
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      <i className="fas fa-circle" style={{ fontSize: '7px', marginRight: '5px' }} />{s.label}
    </span>
  )
}

/* ─── Action button ──────────────────────────────────────────────────────── */
function ActionBtn({ isInProgress, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer',
        fontSize: '12px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
        background: h
          ? (isInProgress ? '#2A3F6B' : '#C4922E')
          : (isInProgress ? '#1B2A4A' : '#D9A94A'),
        color: '#fff', display: 'flex', alignItems: 'center', gap: '5px',
        transition: 'background 150ms',
      }}
    >
      <i className={`fas ${isInProgress ? 'fa-arrow-right' : 'fa-clipboard-check'}`} style={{ fontSize: '11px' }} />
      {isInProgress ? 'Continue' : 'Screen'}
    </button>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ScreeningQueue() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort]               = useState('newest')

  useEffect(() => {
    getQueue()
      .then(data => setManuscripts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let rows = [...manuscripts]

    // Search by ID or title
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(m =>
        m.submission_number?.toLowerCase().includes(q) ||
        m.title?.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter) {
      rows = rows.filter(m => m.current_status === statusFilter)
    }

    // Sort
    rows.sort((a, b) => {
      const da = new Date(a.submitted_at)
      const db = new Date(b.submitted_at)
      return sort === 'oldest' ? da - db : db - da
    })

    return rows
  }, [manuscripts, search, statusFilter, sort])

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    const diffMs = Date.now() - d
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return `Today, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px' }}>
          Moderation Queue
        </h1>
        <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
          All submissions awaiting or currently in screening
        </p>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden' }}>

        {/* Filter bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E4E8', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#8B8F9A', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID or title..."
              style={{ width: '100%', padding: '8px 12px 8px 34px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', outline: 'none', background: '#FAFAFA' }}
              onFocus={e => { e.target.style.borderColor = '#C4922E' }}
              onBlur={e => { e.target.style.borderColor = '#E2E4E8' }}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', background: '#FAFAFA', outline: 'none', cursor: 'pointer', minWidth: '140px' }}
          >
            <option value="">All Statuses</option>
            <option value="submitted">New</option>
            <option value="under_moderation">In Progress</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', background: '#FAFAFA', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E2E4E8' }}>
                {['Manuscript', 'Title', 'Author', 'Type', 'Submitted', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === '' ? 'right' : 'left', fontWeight: 600, color: '#5A5E6B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filtered.length === 0 ? (
                <EmptyRow search={search} />
              ) : (
                filtered.map(m => (
                  <ManuscriptRow
                    key={m.id}
                    m={m}
                    formatDate={formatDate}
                    onScreen={() => navigate(`/moderator/screening/${m.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E4E8', fontSize: '12px', color: '#8B8F9A' }}>
            Showing {filtered.length} of {manuscripts.length} {manuscripts.length === 1 ? 'item' : 'items'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Row ────────────────────────────────────────────────────────────────── */
function ManuscriptRow({ m, formatDate, onScreen }) {
  const [h, setH] = useState(false)
  const isInProgress = m.current_status === 'under_moderation'

  // First author from authors array if present, else submitter name
  const author = m.authors?.[0]?.full_name ?? m.submitter_name ?? '—'
  const articleType = m.article_type ?? m.category_name ?? '—'

  return (
    <tr
      onClick={onScreen}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ borderBottom: '1px solid #E2E4E8', background: h ? '#F9FAFB' : '#fff', cursor: 'pointer', transition: 'background 150ms' }}
    >
      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#1B2A4A', whiteSpace: 'nowrap', fontSize: '13px' }}>
        {m.submission_number || '—'}
      </td>
      <td style={{ padding: '13px 16px', maxWidth: '260px', color: '#1A1A2E' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.title || 'Untitled'}
        </div>
      </td>
      <td style={{ padding: '13px 16px', color: '#5A5E6B', whiteSpace: 'nowrap' }}>{author}</td>
      <td style={{ padding: '13px 16px', color: '#5A5E6B', whiteSpace: 'nowrap' }}>{articleType}</td>
      <td style={{ padding: '13px 16px', color: '#8B8F9A', whiteSpace: 'nowrap' }}>{formatDate(m.submitted_at)}</td>
      <td style={{ padding: '13px 16px' }}><StatusBadge status={m.current_status} /></td>
      <td style={{ padding: '13px 16px', textAlign: 'right' }}>
        <ActionBtn isInProgress={isInProgress} onClick={onScreen} />
      </td>
    </tr>
  )
}

/* ─── Loading skeleton rows ──────────────────────────────────────────────── */
function LoadingRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i} style={{ borderBottom: '1px solid #E2E4E8' }}>
      {Array.from({ length: 7 }).map((_, j) => (
        <td key={j} style={{ padding: '13px 16px' }}>
          <div style={{ height: '13px', background: '#F4F5F7', borderRadius: '4px', width: j === 1 ? '160px' : '80px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  ))
}

/* ─── Empty state row ────────────────────────────────────────────────────── */
function EmptyRow({ search }) {
  return (
    <tr>
      <td colSpan={7} style={{ padding: '60px 16px', textAlign: 'center' }}>
        <i className="fas fa-inbox" style={{ fontSize: '24px', color: '#E2E4E8', marginBottom: '12px', display: 'block' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '4px' }}>
          {search ? `No results for "${search}"` : 'Queue is empty'}
        </div>
        <div style={{ fontSize: '13px', color: '#8B8F9A' }}>
          {search ? 'Try a different search term or clear the filter.' : 'No manuscripts are currently awaiting screening.'}
        </div>
      </td>
    </tr>
  )
}
