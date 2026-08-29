import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, getAuditLogs, getSecurityLogs } from '../../services/adminService'
import Button from '../../shared/components/Button'
import PageHeader from '../../shared/components/PageHeader'
import StatCard from '../../shared/components/StatCard'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  actionCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-ink-navy)',
    marginBottom: '10px',
  },
  cardDesc: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAuthors: 0,
    totalReviewers: 0,
    totalEditors: 0,
    totalAuditLogs: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getUsers({ limit: 1 }).catch(() => ({ total: 0 })),
      getUsers({ role: 'author', limit: 1 }).catch(() => ({ total: 0 })),
      getUsers({ role: 'reviewer', limit: 1 }).catch(() => ({ total: 0 })),
      getUsers({ role: 'editor', limit: 1 }).catch(() => ({ total: 0 })),
      getAuditLogs({ limit: 1 }).catch(() => ({ total: 0 })),
    ]).then(([allUsers, authors, reviewers, editors, audits]) => {
      setStats({
        totalUsers: allUsers?.total || 0,
        totalAuthors: authors?.total || 0,
        totalReviewers: reviewers?.total || 0,
        totalEditors: editors?.total || 0,
        totalAuditLogs: audits?.total || 0,
      })
      setLoading(false)
    })
  }, [])

  return (
    <div style={styles.page}>
      <PageHeader
        title="System Administration"
        subtitle="Platform security, role authorizations, user management, and compliance audit trail."
      />

      <div style={styles.statsGrid}>
        <StatCard label="Registered Users" value={loading ? '—' : stats.totalUsers} accent="gold" />
        <StatCard label="Authors" value={loading ? '—' : stats.totalAuthors} accent="blue" />
        <StatCard label="Peer Reviewers" value={loading ? '—' : stats.totalReviewers} accent="purple" />
        <StatCard label="Handling Editors" value={loading ? '—' : stats.totalEditors} accent="green" />
      </div>

      <div style={styles.cardsGrid}>
        <div style={styles.actionCard}>
          <div>
            <h2 style={styles.cardTitle}>User & Role Management</h2>
            <p style={styles.cardDesc}>
              Search across all platform accounts, upgrade authors to reviewers/editors/moderators, update account standing, and manage profile records.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/admin/users')}
          >
            Manage Users & Roles →
          </Button>
        </div>

        <div style={styles.actionCard}>
          <div>
            <h2 style={styles.cardTitle}>Audit & Security Logs</h2>
            <p style={styles.cardDesc}>
              Inspect system compliance logs, track role changes, review access denials, and inspect workflow transitions with full cryptographic traceability.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/audit-logs')}
          >
            View System Logs →
          </Button>
        </div>
      </div>
    </div>
  )
}
