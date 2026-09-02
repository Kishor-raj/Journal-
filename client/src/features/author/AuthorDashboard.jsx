import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../shared/components/Button'
import StatusBadge from '../../shared/components/StatusBadge'
import { getMyManuscripts, createDraft } from './services/manuscriptService'

const DOT_COLORS = {
  danger:  'var(--dash-danger)',
  warning: 'var(--dash-warning)',
  info:    'var(--dash-info)',
  success: 'var(--dash-success)',
}

const KPI_CONFIG = [
  { key: 'drafts',         label: 'Drafts',          icon: 'fas fa-file-pen',          iconBg: '#F4F5F7', iconColor: '#8B8F9A', accent: '#8B8F9A', trend: 'Continue where you left off' },
  { key: 'underReview',    label: 'Under Review',    icon: 'fas fa-magnifying-glass',  iconBg: 'var(--dash-info-bg)', iconColor: 'var(--dash-info)', accent: 'var(--dash-info)', trend: 'Awaiting reviewer reports' },
  { key: 'revisionNeeded', label: 'Revision Needed',  icon: 'fas fa-rotate',            iconBg: 'var(--dash-warning-bg)', iconColor: 'var(--dash-warning)', accent: 'var(--dash-warning)', trend: null },
  { key: 'accepted',       label: 'Accepted',        icon: 'fas fa-circle-check',      iconBg: 'var(--dash-success-bg)', iconColor: 'var(--dash-success)', accent: 'var(--dash-success)', trend: 'Proceeding to publication' },
]

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function relativeTime(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(dateString)
}

export default function AuthorDashboard() {
  const navigate = useNavigate()
  const [manuscripts, setManuscripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [hoveredKpi, setHoveredKpi] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    getMyManuscripts()
      .then(setManuscripts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const drafts         = manuscripts.filter((m) => m.current_status === 'draft')
  const underReview    = manuscripts.filter((m) => ['submitted', 'under_review', 'resubmitted'].includes(m.current_status))
  const revisionNeeded = manuscripts.filter((m) => m.current_status === 'revision_requested')
  const accepted       = manuscripts.filter((m) => ['accepted', 'published'].includes(m.current_status))

  const kpiValues = { drafts: drafts.length, underReview: underReview.length, revisionNeeded: revisionNeeded.length, accepted: accepted.length }

  const revisionDeadline = revisionNeeded.length > 0 ? revisionNeeded.find((m) => m.revision_deadline) : null

  const recentManuscripts = manuscripts.filter((m) => m.current_status !== 'draft').slice(0, 5)

  const needsAttention = [
    ...revisionNeeded.map((m) => ({ id: m.id, label: m.submission_number || m.id, desc: 'Revision requested', time: m.submitted_at ? `Submitted ${relativeTime(m.submitted_at)}` : '', dot: 'warning', manuscript: m })),
    ...underReview.map((m) => ({ id: m.id, label: m.submission_number || m.id, desc: 'Under review', time: m.submitted_at ? `Submitted ${relativeTime(m.submitted_at)}` : '', dot: 'info', manuscript: m })),
  ]
  if (needsAttention.length === 0) {
    drafts.slice(0, 2).forEach((m) => {
      needsAttention.push({ id: m.id, label: m.submission_number || m.id || 'Untitled', desc: 'Draft ready to continue', time: m.created_at ? `Created ${relativeTime(m.created_at)}` : '', dot: 'success', manuscript: m })
    })
  }

  const handleNewSubmission = async () => {
    const emptyDraft = drafts.find((d) => !d.title || d.title.trim() === '')
    if (emptyDraft) { navigate(`/author/submit/${emptyDraft.id}`); return }
    setCreating(true)
    try { const draft = await createDraft(); navigate(`/author/submit/${draft.id}`) } catch { setCreating(false) }
  }

  const handleRowClick = (manuscript) => {
    if (manuscript.current_status === 'draft') navigate(`/author/submit/${manuscript.id}`)
    else navigate(`/author/manuscripts/${manuscript.id}`)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>

      {/* ─── Page Header ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--dash-text-primary)', lineHeight: 1.2, margin: 0 }}>
            Author Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)', marginTop: '4px' }}>
            Your manuscripts, submission status, and items needing attention
          </p>
        </div>
        <Button variant="primary" size="md" loading={creating} onClick={handleNewSubmission}>
          <i className="fas fa-plus" style={{ fontSize: '13px' }} /> New Submission
        </Button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {KPI_CONFIG.map((kpi) => (
          <div
            key={kpi.key}
            onMouseEnter={() => setHoveredKpi(kpi.key)}
            onMouseLeave={() => setHoveredKpi(null)}
            style={{
              background: 'var(--dash-surface)',
              border: '1px solid var(--dash-surface-border)',
              borderRadius: '12px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'default',
              transition: 'box-shadow 150ms ease, transform 150ms ease',
              boxShadow: hoveredKpi === kpi.key ? 'var(--dash-shadow-md)' : 'var(--dash-shadow-sm)',
              transform: hoveredKpi === kpi.key ? 'translateY(-1px)' : 'none',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.accent }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {kpi.label}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', background: kpi.iconBg, color: kpi.iconColor }}>
                <i className={`fas ${kpi.icon}`} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--dash-text-primary)', lineHeight: 1, marginBottom: '4px' }}>
              {kpiValues[kpi.key]}
            </div>
            <div style={{
              fontSize: '12px',
              color: kpi.key === 'revisionNeeded' && revisionNeeded.length > 0 ? 'var(--dash-danger)' : 'var(--dash-text-muted)',
              fontWeight: kpi.key === 'revisionNeeded' && revisionNeeded.length > 0 ? 600 : 400,
            }}>
              {kpi.key === 'revisionNeeded' && revisionNeeded.length > 0
                ? `${revisionNeeded.length} need${revisionNeeded.length === 1 ? 's' : ''} attention`
                : kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Revision Alert ─── */}
      {revisionDeadline && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px',
          borderRadius: '8px', fontSize: '13px', marginBottom: '24px',
          background: 'var(--dash-danger-bg)', border: '1px solid #E8B8B8', color: '#7A1A1A',
        }}>
          <i className="fas fa-triangle-exclamation" style={{ marginTop: '2px', fontSize: '15px', flexShrink: 0 }} />
          <div>
            <strong>Revision due soon:</strong>{' '}
            {revisionDeadline.submission_number || revisionDeadline.id} &ldquo;{revisionDeadline.title || 'Untitled'}&rdquo; — revision may be due soon.
          </div>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '14px' }}>
          Loading manuscripts...
        </div>
      )}

      {/* ─── Two-column grid ─── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Needs Attention */}
          <div style={{ background: 'var(--dash-surface)', border: '1px solid var(--dash-surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--dash-surface-border)' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text-primary)' }}>Needs Attention</span>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {needsAttention.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '13px' }}>
                  No items need attention right now.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {needsAttention.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => handleRowClick(item.manuscript)}
                      style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--dash-surface-border)', cursor: 'pointer', transition: 'background 150ms ease' }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '7px', flexShrink: 0, background: DOT_COLORS[item.dot] }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--dash-text-primary)', lineHeight: 1.5 }}>
                          <strong>{item.label}</strong> — {item.desc}
                        </div>
                        {item.time && <div style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginTop: '2px' }}>{item.time}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Manuscripts */}
          <div style={{ background: 'var(--dash-surface)', border: '1px solid var(--dash-surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--dash-surface-border)' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--dash-text-primary)' }}>Recent Manuscripts</span>
              <button
                onClick={() => navigate('/author/manuscripts')}
                style={{ background: 'none', border: 'none', color: 'var(--dash-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 0' }}
              >
                View All <i className="fas fa-arrow-right" style={{ fontSize: '11px' }} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {recentManuscripts.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--dash-text-muted)', fontSize: '14px' }}>
                  No submitted manuscripts yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {['ID', 'Title', 'Status', 'Updated'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--dash-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--dash-bg)', borderBottom: '1px solid var(--dash-surface-border)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentManuscripts.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => handleRowClick(m)}
                        onMouseEnter={() => setHoveredRow(m.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ borderBottom: '1px solid var(--dash-surface-border)', background: hoveredRow === m.id ? 'var(--dash-surface-hover)' : 'transparent', transition: 'background 150ms ease', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--dash-text-primary)', whiteSpace: 'nowrap' }}>
                          {m.submission_number || m.id}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                          {m.title || 'Untitled'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={m.current_status} />
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--dash-text-muted)', whiteSpace: 'nowrap' }}>
                          {relativeTime(m.updated_at || m.submitted_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
