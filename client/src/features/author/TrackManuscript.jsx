import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyManuscripts, getStatusHistory } from './services/manuscriptService'

/* ─── Workflow pipeline stages ───────────────────────────────────────────── */
// Each stage maps one-or-more manuscript statuses to a logical step.
const PIPELINE = [
  {
    id: 'submitted',
    label: 'Submitted',
    sublabel: 'Awaiting moderation screening',
    icon: 'fa-paper-plane',
    statuses: ['submitted'],
    color: '#1565C0',
    bg: '#E3EEF9',
  },
  {
    id: 'moderator',
    label: 'Moderator',
    sublabel: 'Technical screening in progress',
    icon: 'fa-clipboard-check',
    statuses: ['submitted'],           // moderator acts on 'submitted' — detected via history
    color: '#C2410C',
    bg: '#FFF7ED',
  },
  {
    id: 'editor',
    label: 'Editor',
    sublabel: 'Editorial assignment & review setup',
    icon: 'fa-pen-nib',
    statuses: ['under_review', 'revision_requested', 'resubmitted'],
    color: '#0369A1',
    bg: '#E0F2FE',
  },
  {
    id: 'reviewer',
    label: 'Peer Review',
    sublabel: 'Expert reviewers evaluating manuscript',
    icon: 'fa-magnifying-glass',
    statuses: ['under_review'],
    color: '#B45309',
    bg: '#FEF3C7',
  },
  {
    id: 'final_decision',
    label: 'Final Decision',
    sublabel: 'Editor reviewing all reports',
    icon: 'fa-gavel',
    statuses: ['revision_requested', 'resubmitted'],
    color: '#7C3AED',
    bg: '#F3E8FF',
  },
  {
    id: 'outcome',
    label: 'Outcome',
    sublabel: 'Accepted / Rejected / Published',
    icon: 'fa-circle-check',
    statuses: ['accepted', 'published', 'rejected', 'desk_rejected', 'withdrawn'],
    color: '#1A7F4B',
    bg: '#EAF7F0',
  },
]

const TERMINAL_STATUSES = ['accepted', 'published', 'rejected', 'desk_rejected', 'withdrawn']

/* ─── Map a manuscript's current_status → active pipeline step index ──────── */
function resolveActiveStep(status) {
  if (['draft'].includes(status)) return -1           // not submitted
  if (status === 'submitted') return 1                // at Moderator step
  if (status === 'under_review') return 3             // at Reviewer step
  if (['revision_requested', 'resubmitted'].includes(status)) return 4  // Final Decision
  if (TERMINAL_STATUSES.includes(status)) return 5   // Outcome
  return 2                                            // default: Editor
}

/* ─── Outcome colour for terminal statuses ────────────────────────────────── */
function outcomeStyle(status) {
  if (['accepted', 'published'].includes(status))
    return { color: '#1A7F4B', bg: '#EAF7F0', border: '#1A7F4B', icon: 'fa-circle-check' }
  if (['rejected', 'desk_rejected'].includes(status))
    return { color: '#C0392B', bg: '#FDEDEC', border: '#C0392B', icon: 'fa-circle-xmark' }
  if (status === 'withdrawn')
    return { color: '#64748B', bg: '#F1F5F9', border: '#94A3B8', icon: 'fa-circle-minus' }
  return { color: '#1A7F4B', bg: '#EAF7F0', border: '#1A7F4B', icon: 'fa-circle-check' }
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function humanStatus(s) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ─── Single manuscript tracker card ─────────────────────────────────────── */
function ManuscriptTracker({ manuscript }) {
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory]   = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const navigate = useNavigate()

  const activeStep = resolveActiveStep(manuscript.current_status)
  const isTerminal = TERMINAL_STATUSES.includes(manuscript.current_status)
  const isDraft    = manuscript.current_status === 'draft'

  const loadHistory = useCallback(async () => {
    if (history !== null || loadingHistory) return
    setLoadingHistory(true)
    try {
      const rows = await getStatusHistory(manuscript.id)
      setHistory(rows)
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [manuscript.id, history, loadingHistory])

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadHistory()
  }

  if (isDraft) return null   // don't show drafts

  const outcomeS = isTerminal ? outcomeStyle(manuscript.current_status) : null

  return (
    <div style={{
      background: 'var(--dash-surface)',
      border: '1px solid var(--dash-surface-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '20px',
      boxShadow: 'var(--dash-shadow-sm)',
      transition: 'box-shadow 150ms ease',
    }}>

      {/* ── Card header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: expanded ? '1px solid var(--dash-surface-border)' : 'none',
        cursor: 'pointer',
        gap: '12px',
      }} onClick={handleToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dash-text-primary)', fontFamily: "'Playfair Display', serif" }}>
              {manuscript.submission_number || manuscript.id}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 10px',
              borderRadius: '20px',
              background: isTerminal ? outcomeS.bg : '#E3EEF9',
              color: isTerminal ? outcomeS.color : '#1565C0',
              border: `1px solid ${isTerminal ? outcomeS.border : '#1565C0'}`,
            }}>
              {humanStatus(manuscript.current_status)}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--dash-text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {manuscript.title || 'Untitled Manuscript'}
          </div>
          {manuscript.submitted_at && (
            <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', marginTop: '3px' }}>
              <i className="fas fa-calendar-alt" style={{ marginRight: '4px' }} />
              Submitted {formatDate(manuscript.submitted_at)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/author/manuscripts/${manuscript.id}`) }}
            style={{
              background: 'none', border: '1px solid var(--dash-surface-border)',
              borderRadius: '6px', padding: '5px 12px',
              fontSize: '12px', color: 'var(--dash-text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1565C0'; e.currentTarget.style.color = '#1565C0' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--dash-surface-border)'; e.currentTarget.style.color = 'var(--dash-text-secondary)' }}
          >
            <i className="fas fa-eye" style={{ marginRight: '4px', fontSize: '11px' }} />
            View
          </button>
          <i
            className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}
            style={{ fontSize: '13px', color: 'var(--dash-text-muted)', transition: 'transform 200ms ease' }}
          />
        </div>
      </div>

      {/* ── Expanded: pipeline tracker + history ────────────────────────── */}
      {expanded && (
        <div style={{ padding: '24px 20px' }}>

          {/* Pipeline stepper */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
              Manuscript Journey
            </div>

            {/* Horizontal stepper (desktop) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>
              {PIPELINE.map((step, idx) => {
                const isDone    = idx < activeStep
                const isCurrent = idx === activeStep
                const isPending = idx > activeStep

                let circleColor, circleBg, circleBorder, labelColor
                if (isDone)    { circleColor = '#fff'; circleBg = '#22C55E'; circleBorder = '#22C55E'; labelColor = 'var(--dash-text-primary)' }
                else if (isCurrent) { circleColor = '#fff'; circleBg = step.color; circleBorder = step.color; labelColor = step.color }
                else           { circleColor = 'rgba(0,0,0,0.3)'; circleBg = 'var(--dash-bg)'; circleBorder = 'var(--dash-surface-border)'; labelColor = 'var(--dash-text-muted)' }

                // Override outcome step if terminal
                if (isTerminal && idx === 5) {
                  const os = outcomeStyle(manuscript.current_status)
                  circleColor = '#fff'; circleBg = os.color; circleBorder = os.color; labelColor = os.color
                }

                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', flex: idx < PIPELINE.length - 1 ? '1' : '0 0 auto', minWidth: '80px' }}>
                    {/* Step node */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                      {/* Circle */}
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: circleBg,
                        border: `2px solid ${circleBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '15px', color: circleColor,
                        flexShrink: 0,
                        boxShadow: isCurrent ? `0 0 0 4px ${step.color}25` : 'none',
                        transition: 'all 200ms ease',
                        position: 'relative',
                      }}>
                        {isDone
                          ? <i className="fas fa-check" style={{ fontSize: '14px' }} />
                          : isTerminal && idx === 5
                            ? <i className={`fas ${outcomeStyle(manuscript.current_status).icon}`} style={{ fontSize: '15px' }} />
                            : <i className={`fas ${step.icon}`} style={{ fontSize: '14px' }} />
                        }
                        {isCurrent && !isTerminal && (
                          <span style={{
                            position: 'absolute', top: '-4px', right: '-4px',
                            width: '12px', height: '12px',
                            borderRadius: '50%', background: '#F59E0B',
                            border: '2px solid var(--dash-surface)',
                            animation: 'pulse-dot 1.5s ease-in-out infinite',
                          }} />
                        )}
                      </div>
                      {/* Label */}
                      <div style={{ marginTop: '8px', textAlign: 'center', lineHeight: 1.3 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: labelColor, whiteSpace: 'nowrap' }}>
                          {step.label}
                        </div>
                        {(isCurrent || isDone) && (
                          <div style={{ fontSize: '10px', color: 'var(--dash-text-muted)', maxWidth: '80px', marginTop: '2px', lineHeight: 1.3, whiteSpace: 'normal' }}>
                            {isCurrent ? step.sublabel : 'Complete'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connector line */}
                    {idx < PIPELINE.length - 1 && (
                      <div style={{
                        flex: 1,
                        height: '2px',
                        background: idx < activeStep ? '#22C55E' : 'var(--dash-surface-border)',
                        marginTop: '19px',
                        transition: 'background 300ms ease',
                        minWidth: '20px',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Current stage callout */}
          {!isTerminal && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '8px', marginBottom: '24px',
              background: PIPELINE[activeStep]?.bg || '#E3EEF9',
              border: `1px solid ${PIPELINE[activeStep]?.color || '#1565C0'}30`,
            }}>
              <i className={`fas ${PIPELINE[activeStep]?.icon || 'fa-circle-info'}`}
                style={{ color: PIPELINE[activeStep]?.color || '#1565C0', fontSize: '18px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: PIPELINE[activeStep]?.color || '#1565C0' }}>
                  Currently at: {PIPELINE[activeStep]?.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginTop: '2px' }}>
                  {PIPELINE[activeStep]?.sublabel}
                </div>
              </div>
            </div>
          )}

          {/* Terminal outcome callout */}
          {isTerminal && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', borderRadius: '8px', marginBottom: '24px',
              background: outcomeS.bg,
              border: `1px solid ${outcomeS.border}40`,
            }}>
              <i className={`fas ${outcomeS.icon}`} style={{ color: outcomeS.color, fontSize: '18px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: outcomeS.color }}>
                  {humanStatus(manuscript.current_status)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginTop: '2px' }}>
                  {manuscript.updated_at ? `Decision on ${formatDate(manuscript.updated_at)}` : 'Final decision reached'}
                </div>
              </div>
            </div>
          )}

          {/* Status history timeline */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              <i className="fas fa-history" style={{ marginRight: '6px' }} />
              Activity Timeline
            </div>
            {loadingHistory && (
              <div style={{ padding: '16px 0', color: 'var(--dash-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                <i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />
                Loading history...
              </div>
            )}
            {!loadingHistory && history && history.length === 0 && (
              <div style={{ color: 'var(--dash-text-muted)', fontSize: '13px', padding: '8px 0' }}>
                No status history recorded yet.
              </div>
            )}
            {!loadingHistory && history && history.length > 0 && (
              <div style={{ position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical line */}
                <div style={{
                  position: 'absolute', left: '7px', top: '8px',
                  width: '2px',
                  height: `calc(100% - 16px)`,
                  background: 'var(--dash-surface-border)',
                }} />
                {history.map((row, i) => (
                  <div key={row.id || i} style={{ position: 'relative', marginBottom: '16px' }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: '-16px', top: '3px',
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: i === history.length - 1 ? '#22C55E' : 'var(--dash-surface-border)',
                      border: `2px solid ${i === history.length - 1 ? '#22C55E' : 'var(--dash-surface-border)'}`,
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--dash-text-primary)' }}>
                          <span style={{ color: 'var(--dash-text-muted)', marginRight: '4px' }}>
                            {humanStatus(row.from_status)} →
                          </span>
                          <strong>{humanStatus(row.to_status)}</strong>
                        </div>
                        {row.changed_by_name && (
                          <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', marginTop: '2px' }}>
                            by {row.changed_by_name}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--dash-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatDate(row.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function TrackManuscript() {
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('active')   // 'all' | 'active' | 'terminal'
  const navigate = useNavigate()

  useEffect(() => {
    getMyManuscripts()
      .then(setManuscripts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const submitted = manuscripts.filter((m) => m.current_status !== 'draft')

  const filtered = submitted.filter((m) => {
    if (filter === 'active')   return !TERMINAL_STATUSES.includes(m.current_status)
    if (filter === 'terminal') return TERMINAL_STATUSES.includes(m.current_status)
    return true
  })

  const activeCount   = submitted.filter((m) => !TERMINAL_STATUSES.includes(m.current_status)).length
  const terminalCount = submitted.filter((m) => TERMINAL_STATUSES.includes(m.current_status)).length

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Keyframe for pulsing dot */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button
            onClick={() => navigate('/author/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dash-text-muted)', fontSize: '13px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <i className="fas fa-arrow-left" style={{ fontSize: '11px' }} /> Dashboard
          </button>
          <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--dash-text-muted)' }} />
          <span style={{ fontSize: '13px', color: 'var(--dash-text-muted)' }}>Track Manuscript</span>
        </div>

        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', fontWeight: 700, color: 'var(--dash-text-primary)', margin: 0, lineHeight: 1.2 }}>
          <i className="fas fa-route" style={{ fontSize: '20px', marginRight: '10px', color: '#1565C0' }} />
          Track Manuscripts
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
          Follow your submission's journey through the editorial pipeline in real time.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'active',   label: 'In Progress', count: activeCount },
          { key: 'terminal', label: 'Concluded',   count: terminalCount },
          { key: 'all',      label: 'All',          count: submitted.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: '20px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 150ms ease',
              background: filter === tab.key ? '#1B2A4A' : 'var(--dash-surface)',
              color: filter === tab.key ? '#fff' : 'var(--dash-text-secondary)',
              border: filter === tab.key ? '1px solid #1B2A4A' : '1px solid var(--dash-surface-border)',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: '6px', fontSize: '11px',
                background: filter === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--dash-bg)',
                padding: '1px 6px', borderRadius: '10px',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '14px' }}>
          <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '24px', marginBottom: '12px', display: 'block' }} />
          Loading manuscripts...
        </div>
      )}

      {!loading && submitted.length === 0 && (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          background: 'var(--dash-surface)', border: '1px solid var(--dash-surface-border)',
          borderRadius: '12px',
        }}>
          <i className="fas fa-paper-plane" style={{ fontSize: '32px', color: 'var(--dash-text-muted)', marginBottom: '12px', display: 'block' }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--dash-text-primary)', marginBottom: '8px' }}>
            No submitted manuscripts yet
          </div>
          <div style={{ fontSize: '13px', color: 'var(--dash-text-muted)', marginBottom: '20px' }}>
            Once you submit a manuscript, you can track its journey here.
          </div>
          <button
            onClick={() => navigate('/author/dashboard')}
            style={{
              background: '#1B2A4A', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 20px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: '6px' }} />
            New Submission
          </button>
        </div>
      )}

      {!loading && submitted.length > 0 && filtered.length === 0 && (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          background: 'var(--dash-surface)', border: '1px solid var(--dash-surface-border)',
          borderRadius: '12px',
        }}>
          <i className="fas fa-inbox" style={{ fontSize: '24px', color: 'var(--dash-text-muted)', marginBottom: '12px', display: 'block' }} />
          <div style={{ fontSize: '14px', color: 'var(--dash-text-muted)' }}>
            No manuscripts in this category.
          </div>
        </div>
      )}

      {!loading && filtered.map((m) => (
        <ManuscriptTracker key={m.id} manuscript={m} />
      ))}
    </div>
  )
}
