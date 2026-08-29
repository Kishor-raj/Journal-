import { useState, useEffect } from 'react'
import StatusBadge from '../../shared/components/StatusBadge'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
import { getExtensionRequests } from '../../services/reviewerService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  chips: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  chip: {
    flex: '1 1 160px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
  },
  chipLabel: {
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
  },
  chipValue: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 700,
    color: 'var(--color-ink-navy)',
    lineHeight: 1.1,
  },
  activeCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderLeft: '3px solid var(--color-warning)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
    marginBottom: '16px',
  },
  tableCard: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  tableHead: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-rule-grey)',
    fontWeight: 600,
    fontSize: '0.8125rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-ink-navy)',
    background: 'var(--color-surface-sunken)',
  },
  tr: {
    borderBottom: '1px solid var(--color-rule-grey)',
  },
  td: {
    padding: '14px 20px',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    verticalAlign: 'top',
  },
  muted: {
    color: 'var(--color-text-muted)',
  },
  title: {
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
}

function DeadlineBox({ label, value, highlight }) {
  return (
    <div style={{
      flex: '1 1 200px',
      padding: '10px 14px',
      background: highlight ? 'rgba(196,146,46,0.12)' : 'var(--color-surface-sunken)',
      borderRadius: 'var(--radius-sm)',
    }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{label}</div>
      <strong style={{ color: highlight ? 'var(--color-warning)' : 'var(--color-ink-black)', fontWeight: 600 }}>
        {value ? formatDate(value) : '—'}
      </strong>
    </div>
  )
}

export default function ExtensionRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExtensionRequests()
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const active = requests.filter((r) => r.status === 'pending')
  const approved = requests.filter((r) => r.status === 'approved')

  return (
    <div style={styles.page}>
      <PageHeader title="Extension Requests" subtitle="Track and manage deadline extension requests" />

      <div style={styles.chips}>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Pending</div>
          <div style={styles.chipValue}>{active.length}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Approved</div>
          <div style={{ ...styles.chipValue, color: 'var(--color-success)' }}>{approved.length}</div>
        </div>
        <div style={styles.chip}>
          <div style={styles.chipLabel}>Rejected</div>
          <div style={{ ...styles.chipValue, color: 'var(--color-danger)' }}>{requests.length - active.length - approved.length}</div>
        </div>
      </div>

      {loading ? (
        <EmptyState icon="⏳" message="Loading extension requests…" />
      ) : requests.length === 0 ? (
        <EmptyState icon="📅" message="No extension requests yet. Request an extension from an active review if you need more time." />
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-ink-navy)', margin: '0 0 12px' }}>Active Extension{active.length > 1 ? 's' : ''}</h3>
              {active.map((req) => (
                <div key={req.id} style={styles.activeCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                      background: 'rgba(196,146,46,0.12)', color: 'var(--color-warning)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                    }}>
                      <i className="fas fa-clock" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        {req.submission_number ? `#${req.submission_number}` : 'Manuscript'}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{req.manuscript_title || 'Untitled'}</div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <DeadlineBox label="Current Deadline" value={req.current_due_at} />
                    <DeadlineBox label="Requested Deadline" value={req.requested_until} highlight />
                  </div>
                  {req.reason && (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', padding: '12px', background: 'var(--color-surface-sunken)', borderRadius: 'var(--radius-sm)', marginBottom: '10px' }}>
                      <strong style={{ color: 'var(--color-ink-navy)' }}>Reason:</strong> {req.reason}
                    </div>
                  )}
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Submitted: {formatDate(req.submitted_at)} — Awaiting editor response
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={styles.tableCard}>
            <div style={styles.tableHead}>Extension History</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={styles.tr}>
                  <th style={{ ...styles.td, fontWeight: 600, textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: 'var(--color-ink-navy)' }}>Manuscript</th>
                  <th style={{ ...styles.td, fontWeight: 600, textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: 'var(--color-ink-navy)' }}>Current Deadline</th>
                  <th style={{ ...styles.td, fontWeight: 600, textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: 'var(--color-ink-navy)' }}>Requested To</th>
                  <th style={{ ...styles.td, fontWeight: 600, textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: 'var(--color-ink-navy)' }}>Reason</th>
                  <th style={{ ...styles.td, fontWeight: 600, textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: 'var(--color-ink-navy)' }}>Status</th>
                  <th style={{ ...styles.td, fontWeight: 600, textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: 'var(--color-ink-navy)' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.title}>{req.manuscript_title || 'Untitled'}</div>
                      <div style={styles.muted}>{req.submission_number ? `#${req.submission_number}` : '—'}</div>
                    </td>
                    <td style={styles.td}>{req.current_due_at ? formatDate(req.current_due_at) : '—'}</td>
                    <td style={styles.td}>{req.requested_until ? formatDate(req.requested_until) : '—'}</td>
                    <td style={{ ...styles.td, maxWidth: '260px' }}>{req.reason || '—'}</td>
                    <td style={styles.td}><StatusBadge status={req.status} /></td>
                    <td style={{ ...styles.td, color: 'var(--color-text-muted)' }}>{formatDate(req.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}