import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, respondToInvitation } from '../../services/reviewerService'
import { formatDate } from '../../shared/utils/formatDate'

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '36px 40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  title: {
    color: '#0D1B3E',
    fontSize: '1.65rem',
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    color: '#5A6480',
    margin: '4px 0 28px',
    fontSize: '0.93rem',
  },

  // ─ Stat cards row
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
    gap: '18px',
    marginBottom: '28px',
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(13,27,62,0.08)',
    padding: '22px 24px 20px',
    borderTop: '4px solid',
  },
  statLabel: {
    color: '#5A6480',
    fontWeight: 700,
    fontSize: '0.73rem',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#0D1B3E',
    fontSize: '2rem',
    fontWeight: 900,
    lineHeight: 1.15,
    marginTop: '8px',
  },
  statHint: {
    color: '#5A6480',
    fontSize: '0.82rem',
    marginTop: '3px',
  },

  // ─ Panel
  panel: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 2px 12px rgba(13,27,62,0.07)',
    marginBottom: '22px',
    overflow: 'hidden',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px',
    borderBottom: '1px solid #E4E8F1',
  },
  panelTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  panelTitle: {
    color: '#0D1B3E',
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
  },
  viewAllBtn: {
    background: '#fff',
    border: '1px solid #DDE2EE',
    color: '#0D1B3E',
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.82rem',
    fontWeight: 500,
    transition: 'border-color 0.15s',
  },

  // ─ Table
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#F4F6FB',
    color: '#5A6480',
    fontSize: '0.72rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    textAlign: 'left',
    padding: '12px 20px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '16px 20px',
    borderTop: '1px solid #E4E8F1',
    color: '#0D1B3E',
    fontSize: '0.92rem',
    verticalAlign: 'middle',
  },
  tdMuted: {
    padding: '16px 20px',
    borderTop: '1px solid #E4E8F1',
    color: '#5A6480',
    fontSize: '0.92rem',
    verticalAlign: 'middle',
  },
  emptyRow: {
    padding: '28px 22px',
    color: '#5A6480',
    fontSize: '0.9rem',
  },

  // ─ Buttons
  acceptBtn: {
    background: 'var(--color-citation-gold)',
    color: '#0D1B3E',
    border: 'none',
    padding: '7px 16px',
    borderRadius: '7px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.83rem',
    fontWeight: 700,
    marginRight: '6px',
    transition: 'background 0.15s',
  },
  declineBtn: {
    background: '#fff',
    color: '#0D1B3E',
    border: '1px solid #DDE2EE',
    padding: '7px 14px',
    borderRadius: '7px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.83rem',
    fontWeight: 500,
    transition: 'border-color 0.15s',
  },
  continueBtn: {
    background: 'var(--color-citation-gold)',
    color: '#0D1B3E',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '7px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.83rem',
    fontWeight: 700,
    transition: 'background 0.15s',
  },

  // ─ Status badge
  statusInProgress: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: '#FFF9EC',
    color: '#B45309',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#D97706',
    flexShrink: 0,
  },

  // ─ Error
  error: {
    marginBottom: '18px',
    padding: '12px 16px',
    borderRadius: '8px',
    background: '#FDEDEC',
    color: 'var(--color-danger)',
    fontSize: '0.9rem',
  },
  loading: {
    padding: '40px',
    color: '#5A6480',
  },
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, hint, borderColor }) {
  return (
    <div style={{ ...S.statCard, borderTopColor: borderColor }}>
      <div style={S.statLabel}>{label}</div>
      <div style={S.statValue}>{value ?? 0}</div>
      <div style={S.statHint}>{hint}</div>
    </div>
  )
}

// ─── Panel title icon ─────────────────────────────────────────────────────────
function InviteIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5A6480" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}
function AssignIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)

  const load = async () => {
    try {
      setError('')
      setData(await getDashboard())
    } catch (err) {
      setError(err?.message || 'Unable to load your reviewer dashboard.')
    }
  }

  useEffect(() => { load() }, [])

  const respond = async (invitationId, response) => {
    try {
      setActionId(invitationId)
      await respondToInvitation(invitationId, { response })
      await load()
    } catch (err) {
      setError(err?.message || 'Unable to respond to this invitation.')
    } finally {
      setActionId(null)
    }
  }

  if (!data && !error) {
    return <div style={S.loading}>Loading reviewer dashboard…</div>
  }

  const summary = data?.summary || {}
  const invitations = data?.invitations || []
  const assignments = data?.assignments || []

  return (
    <div style={S.page}>
      <h1 style={S.title}>Reviewer Dashboard</h1>
      <p style={S.subtitle}>Your pending invitations and active review assignments</p>

      {error && <div style={S.error}>{error}</div>}

      {/* ── Stat cards ──────────────────────────────── */}
      <div style={S.statsRow}>
        <StatCard
          label="Pending Invitations"
          value={summary.pending_invitations}
          hint="Response needed"
          borderColor="#C87513"
        />
        <StatCard
          label="Active Assignments"
          value={summary.active_assignments}
          hint="In progress"
          borderColor="#1769D1"
        />
        <StatCard
          label="Due Soon"
          value={summary.due_soon}
          hint="Within 7 days"
          borderColor="#C87513"
        />
        <StatCard
          label="Completed"
          value={summary.completed}
          hint="All time"
          borderColor="#198754"
        />
      </div>

      {/* ── Pending Invitations panel ────────────────── */}
      <section style={S.panel}>
        <div style={S.panelHead}>
          <div style={S.panelTitleRow}>
            <InviteIcon />
            <h2 style={S.panelTitle}>Pending Invitations</h2>
          </div>
          <button
            type="button"
            style={S.viewAllBtn}
            onClick={() => navigate('/reviewer/invitations')}
          >
            View All
          </button>
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Manuscript</th>
                <th style={S.th}>Journal</th>
                <th style={S.th}>Invitation Date</th>
                <th style={S.th}>Respond By</th>
                <th style={{ ...S.th, width: '1px' }}></th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={S.emptyRow}>
                    You have no pending invitations.
                  </td>
                </tr>
              ) : (
                invitations.slice(0, 5).map((inv) => (
                  <tr key={inv.id}>
                    <td style={S.td}>
                      [Anonymized] — {inv.manuscript_title || 'Untitled manuscript'}
                    </td>
                    <td style={S.tdMuted}>{inv.journal_name || 'IJIDCR'}</td>
                    <td style={S.tdMuted}>{formatDate(inv.sent_at) || '—'}</td>
                    <td style={S.tdMuted}>
                      {formatDate(inv.deadline || inv.expires_at) || '—'}
                    </td>
                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        style={{
                          ...S.acceptBtn,
                          opacity: actionId === inv.id ? 0.6 : 1,
                          cursor: actionId === inv.id ? 'not-allowed' : 'pointer',
                        }}
                        disabled={actionId === inv.id}
                        onClick={() => respond(inv.id, 'accepted')}
                      >
                        {actionId === inv.id ? '…' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        style={{
                          ...S.declineBtn,
                          opacity: actionId === inv.id ? 0.6 : 1,
                          cursor: actionId === inv.id ? 'not-allowed' : 'pointer',
                        }}
                        disabled={actionId === inv.id}
                        onClick={() => respond(inv.id, 'declined')}
                      >
                        Decline
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Active Assignments panel ─────────────────── */}
      <section style={S.panel}>
        <div style={S.panelHead}>
          <div style={S.panelTitleRow}>
            <AssignIcon />
            <h2 style={S.panelTitle}>Active Assignments</h2>
          </div>
          <button
            type="button"
            style={S.viewAllBtn}
            onClick={() => navigate('/reviewer/assignments')}
          >
            View All
          </button>
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Manuscript</th>
                <th style={S.th}>Round</th>
                <th style={S.th}>Due Date</th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, width: '1px' }}></th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={S.emptyRow}>
                    You have no active review assignments.
                  </td>
                </tr>
              ) : (
                assignments.slice(0, 5).map((asgn) => (
                  <tr key={asgn.id}>
                    <td style={S.td}>
                      [Anonymized] — {asgn.manuscript_title || 'Untitled manuscript'}
                    </td>
                    <td style={S.tdMuted}>Round {asgn.round_number || 1}</td>
                    <td style={S.tdMuted}>{formatDate(asgn.due_at) || '—'}</td>
                    <td style={S.td}>
                      <span style={S.statusInProgress}>
                        <span style={S.statusDot} />
                        In Progress
                      </span>
                    </td>
                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        style={S.continueBtn}
                        onClick={() =>
                          navigate(`/reviewer/assignments/${asgn.id}/review`)
                        }
                      >
                        Continue Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
