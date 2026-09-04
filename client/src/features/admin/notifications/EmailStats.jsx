import React, { useState, useEffect } from 'react'
import { getEmailStats, getEmailTemplates } from '../../../services/emailAdminService'
import StatCard from '../../../shared/components/StatCard'
import PageHeader from '../../../shared/components/PageHeader'
import { formatDateTime } from '../../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px 28px',
    marginTop: '24px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    marginBottom: '16px',
    fontWeight: 600,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'var(--text-sm)',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontWeight: 600,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-ink-navy)',
    borderBottom: '1px solid var(--color-rule-grey)',
    background: 'rgba(0,0,0,0.02)',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-rule-grey)',
    color: 'var(--color-ink-black)',
  },
  meta: {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
  },
}

export default function EmailStats() {
  const [stats, setStats] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getEmailStats().catch(() => null), getEmailTemplates().catch(() => [])])
      .then(([d, t]) => {
        setStats(d)
        setTemplates(Array.isArray(t) ? t : [])
      })
      .finally(() => setLoading(false))
  }, [])

  const summary = stats?.summary || {}

  return (
    <div style={styles.page}>
      <PageHeader
        title="Email Delivery Statistics"
        subtitle="Aggregated metrics across all application-generated email notifications."
      />

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>Loading statistics...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <StatCard label="Total Emails" value={summary.total ?? 0} />
            <StatCard label="Delivered" value={summary.sent ?? 0} accentColor="#2B7A4B" />
            <StatCard label="Queued / Retrying" value={(summary.queued ?? 0) + (summary.retrying ?? 0)} accentColor="#D97706" />
            <StatCard label="Failed" value={summary.failed ?? 0} accentColor="#A52D20" />
            <StatCard label="Skipped" value={summary.skipped ?? 0} accentColor="#8B8F9A" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
            <StatCard label="Last 24 Hours" value={summary.last_24h ?? 0} icon="fas fa-clock" />
            <StatCard label="Last 7 Days" value={summary.last_7d ?? 0} icon="fas fa-calendar-week" />
            <StatCard label="Active Templates" value={templates.filter((t) => t.is_active).length} icon="fas fa-file-lines" />
            <StatCard label="Success Rate" value={summary.success_rate != null ? `${Math.round(summary.success_rate)}%` : '—'} icon="fas fa-bullseye" />
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Breakdown by Event</h2>
            {stats?.by_template?.length ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Count</th>
                    <th style={styles.th}>Sent</th>
                    <th style={styles.th}>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_template.map((row) => (
                    <tr key={row.template_key}>
                      <td style={styles.td}><span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>{row.template_key.toUpperCase()}</span></td>
                      <td style={styles.td}>{row.count ?? 0}</td>
                      <td style={styles.td}>{row.sent ?? 0}</td>
                      <td style={styles.td}>{row.failed ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No delivery data yet.</p>
            )}
          </div>

          {summary.first_email_at && (
            <p style={styles.meta}>
              First email: {formatDateTime(summary.first_email_at)} · Last email: {formatDateTime(summary.last_email_at)}
            </p>
          )}
        </>
      )}
    </div>
  )
}