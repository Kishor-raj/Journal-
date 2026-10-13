import React, { useState, useEffect, useCallback } from 'react'
import {
  getUsers,
  getUser,
  updateUserRole,
  updateUserStatus,
  getUserActivity,
  deleteUser,
  getAdminRoles,
  exportUsersCsv,
} from '../../services/adminService'
import Table from '../../shared/components/Table'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import FormField from '../../shared/components/FormField'
import Pagination from '../../shared/components/Pagination'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
import Tabs from '../../shared/components/Tabs'
import { formatDate } from '../../shared/utils/formatDate'

const MODAL_TABS = [
  { key: 'details', label: 'Overview' },
  { key: 'role', label: 'Change Role' },
  { key: 'status', label: 'Account Status' },
  { key: 'activity', label: 'Activity Log' },
  { key: 'delete', label: 'Delete User' },
]

const ROLES = ['author', 'moderator', 'editor', 'reviewer', 'admin']
const STATUSES = ['active', 'disabled', 'locked']

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '24px',
    background: 'var(--color-surface)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-rule-grey)',
  },
  searchBox: {
    flex: 1,
    minWidth: '220px',
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    padding: '8px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    background: 'var(--color-surface)',
    minWidth: '140px',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  userCard: {
    padding: '16px',
    background: 'rgba(0,0,0,0.02)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    fontSize: 'var(--text-sm)',
  },
  infoLabel: {
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  infoVal: {
    color: 'var(--color-ink-black)',
    fontWeight: 500,
  },
  actionSection: {
    borderTop: '1px solid var(--color-rule-grey)',
    paddingTop: '20px',
    marginTop: '20px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-navy)',
    marginBottom: '12px',
    fontWeight: 600,
  },
  activityItem: {
    padding: '8px 0',
    borderBottom: '1px solid var(--color-rule-grey)',
    fontSize: 'var(--text-xs)',
    display: 'flex',
    justifyContent: 'space-between',
  },
}

function getRoleBadgeStyle(role) {
  switch (role) {
    case 'admin':
      return { background: '#FDEDEC', color: 'var(--color-danger)' }
    case 'editor':
      return { background: '#FBF3DC', color: 'var(--color-citation-gold-dark)' }
    case 'moderator':
      return { background: '#EAF7F0', color: 'var(--color-success)' }
    case 'reviewer':
      return { background: '#E3EEF9', color: '#1565C0' }
    default:
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
  }
}

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'active':
      return { background: '#EAF7F0', color: 'var(--color-success)' }
    case 'disabled':
      return { background: '#FDEDEC', color: 'var(--color-danger)' }
    case 'locked':
      return { background: '#FFF7ED', color: 'var(--color-warning)' }
    default:
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
  }
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  // Selected User Modal
  const [selectedUser, setSelectedUser] = useState(null)
  const [userActivity, setUserActivity] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState('details') // 'details' | 'role' | 'status' | 'activity'

  // Form states
  const [newRole, setNewRole] = useState('')
  const [roleReason, setRoleReason] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Available roles (fetched dynamically from backend with fallback)
  const [availableRoles, setAvailableRoles] = useState(ROLES)

  // Export states
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [exportSuccess, setExportSuccess] = useState('')

  // Fetch dynamic roles on mount
  useEffect(() => {
    let mounted = true
    getAdminRoles()
      .then((roles) => {
        if (mounted && Array.isArray(roles) && roles.length > 0) {
          const names = roles.map((r) => r.name.toLowerCase())
          setAvailableRoles(names)
        }
      })
      .catch((err) => {
        console.warn('Could not fetch roles dynamically, using fallback:', err?.message)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleExportCsv = async () => {
    if (total === 0) {
      const roleText = roleFilter
        ? `for role "${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}"`
        : 'matching the selected filters'
      setExportError(`No users found ${roleText}. CSV export was cancelled to prevent generating an empty file.`)
      setExportSuccess('')
      return
    }

    setExportLoading(true)
    setExportError('')
    setExportSuccess('')
    try {
      const { blob, filename } = await exportUsersCsv({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      const scopeLabel = roleFilter
        ? `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}s`
        : 'All Roles'
      setExportSuccess(`Successfully downloaded "${filename}" (${scopeLabel}, ${total} total records).`)
    } catch (err) {
      console.error('Export CSV error:', err)
      if (err.status === 404) {
        const roleText = roleFilter
          ? `for role "${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}"`
          : 'matching the selected criteria'
        setExportError(`No users found ${roleText}. CSV export was cancelled to prevent generating an empty file.`)
      } else {
        setExportError(err.message || 'Failed to download CSV export. Please try again.')
      }
    } finally {
      setExportLoading(false)
    }
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsers({
        page,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      })
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, roleFilter, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleOpenUserModal = async (u) => {
    setActionError('')
    setActionSuccess('')
    setModalTab('details')
    try {
      const fullUser = await getUser(u.id)
      setSelectedUser(fullUser)
      setNewRole(fullUser.role_name || '')
      setNewStatus(fullUser.account_status || 'active')
      setRoleReason('')
      setStatusReason('')
      setDeleteConfirmText('')
      setIsModalOpen(true)

      const activity = await getUserActivity(u.id)
      setUserActivity(activity || [])
    } catch (err) {
      console.error('Failed to load user details:', err)
    }
  }

  const handleUpdateRole = async (e) => {
    e.preventDefault()
    if (!roleReason.trim()) {
      setActionError('A reason is required to modify user roles.')
      return
    }
    setActionLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      await updateUserRole(selectedUser.id, {
        role_name: newRole,
        reason: roleReason.trim(),
      })
      setActionSuccess(`Role successfully changed to "${newRole}".`)
      setRoleReason('')
      fetchUsers()
      const updated = await getUser(selectedUser.id)
      setSelectedUser(updated)
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Failed to update role.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    if (!statusReason.trim()) {
      setActionError('A reason is required to change account status.')
      return
    }
    setActionLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      await updateUserStatus(selectedUser.id, {
        status: newStatus,
        reason: statusReason.trim(),
      })
      setActionSuccess(`Account status updated to "${newStatus}".`)
      setStatusReason('')
      fetchUsers()
      const updated = await getUser(selectedUser.id)
      setSelectedUser(updated)
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Failed to update status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setActionError('Please type DELETE to confirm.')
      return
    }
    setDeleteLoading(true)
    setActionError('')
    setActionSuccess('')
    try {
      await deleteUser(selectedUser.id)
      setIsModalOpen(false)
      setDeleteConfirmText('')
      fetchUsers()
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Failed to delete user.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = [
    {
      key: 'display_name',
      label: 'Name / Display Name',
      render: (val, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>
              {val || `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'}
            </span>
            {row.reviewer_id && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#0D1B3E',
                  color: '#C4922E',
                  border: '1px solid rgba(196,146,46,0.6)',
                  borderRadius: '999px',
                  padding: '1px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                }}
                title={`Reviewer ID: ${row.reviewer_id}`}
              >
                {row.reviewer_id}
              </span>
            )}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: 'role_name',
      label: 'Role',
      render: (val) => (
        <span style={{ ...styles.badge, ...getRoleBadgeStyle(val) }}>
          {val || 'Author'}
        </span>
      ),
    },
    {
      key: 'account_status',
      label: 'Status',
      render: (val) => (
        <span style={{ ...styles.badge, ...getStatusBadgeStyle(val) }}>
          {val || 'Active'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenUserModal(row)}
        >
          Manage
        </Button>
      ),
    },
  ]

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div style={styles.page}>
      <PageHeader
        title="User & Role Management"
        subtitle="Oversee user accounts, assign editorial roles, and manage access privileges."
      />

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name, email, or Reviewer ID (e.g. AIRJ0001)..."
            style={styles.input}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <select
          style={styles.select}
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
            setExportError('')
            setExportSuccess('')
          }}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
            setExportError('')
            setExportSuccess('')
          }}
          aria-label="Filter by account status"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          loading={exportLoading}
          disabled={exportLoading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          title={`Download ${roleFilter ? roleFilter.toUpperCase() : 'ALL ROLES'} dataset as CSV`}
        >
          <i className="fa-solid fa-download" style={{ color: 'var(--color-citation-gold-dark)' }} />
          <span>
            Download CSV {roleFilter ? `(${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)})` : '(All Roles)'}
          </span>
        </Button>
      </div>

      {/* Export Success Feedback */}
      {exportSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: 'var(--radius-sm)',
            background: '#EAF7F0',
            border: '1px solid #C3E6CB',
            color: 'var(--color-success)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-circle-check" />
            <span>{exportSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportSuccess('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: 1 }}
            aria-label="Dismiss success message"
          >
            &times;
          </button>
        </div>
      )}

      {/* Export Error / Empty Feedback */}
      {exportError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: 'var(--radius-sm)',
            background: '#FDEDEC',
            border: '1px solid #F5C6CB',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-triangle-exclamation" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', lineHeight: 1 }}
            aria-label="Dismiss error message"
          >
            &times;
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>
          Loading user records...
        </p>
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          message="No users match the selected search and filter criteria."
        />
      ) : (
        <>
          <Table columns={columns} data={users} />
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </>
      )}

      {/* User Management Modal */}
      {selectedUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`User Management: ${selectedUser.display_name || selectedUser.email}`}
        >
          {/* Tabs */}
          <Tabs
            tabs={MODAL_TABS}
            activeKey={modalTab}
            onChange={(key) => { setModalTab(key); setActionError(''); setActionSuccess('') }}
          />

          {actionError && (
            <div style={{ background: '#FDEDEC', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div style={{ background: '#EAF7F0', color: 'var(--color-success)', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
              {actionSuccess}
            </div>
          )}

          {/* Tab 1: Details */}
          {modalTab === 'details' && (
            <div>
              <div style={styles.userCard}>
                <div style={styles.infoGrid}>
                  <div>
                    <div style={styles.infoLabel}>Email</div>
                    <div style={styles.infoVal}>{selectedUser.email}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Current Role</div>
                    <span style={{ ...styles.badge, ...getRoleBadgeStyle(selectedUser.role_name) }}>
                      {selectedUser.role_name}
                    </span>
                  </div>
                  {selectedUser.reviewer_id && (
                    <div>
                      <div style={styles.infoLabel}>Reviewer ID</div>
                      <div style={{ ...styles.infoVal, color: '#C4922E', fontWeight: 700, letterSpacing: '0.04em' }}>
                        {selectedUser.reviewer_id}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={styles.infoLabel}>Account Status</div>
                    <span style={{ ...styles.badge, ...getStatusBadgeStyle(selectedUser.account_status) }}>
                      {selectedUser.account_status}
                    </span>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Institution</div>
                    <div style={styles.infoVal}>{selectedUser.institution || '—'}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Department</div>
                    <div style={styles.infoVal}>{selectedUser.department || '—'}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Country</div>
                    <div style={styles.infoVal}>{selectedUser.country || '—'}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>ORCID ID</div>
                    <div style={styles.infoVal}>{selectedUser.orcid_id || '—'}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Created At</div>
                    <div style={styles.infoVal}>{formatDate(selectedUser.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Change Role */}
          {modalTab === 'role' && (
            <form onSubmit={handleUpdateRole}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Assigning a new role grants corresponding access permissions immediately. An audit record will be logged.
              </p>
              <FormField label="Select Role" required>
                <select
                  style={{ ...styles.select, width: '100%' }}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Audit Reason" required>
                <textarea
                  style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }}
                  placeholder="Explain why this user role is being changed (mandatory for compliance)..."
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  required
                />
              </FormField>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={actionLoading}>
                  Confirm Role Change
                </Button>
              </div>
            </form>
          )}

          {/* Tab 3: Change Status */}
          {modalTab === 'status' && (
            <form onSubmit={handleUpdateStatus}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                Disabling or locking an account immediately revokes all active sessions for this user.
              </p>
              <FormField label="Account Status" required>
                <select
                  style={{ ...styles.select, width: '100%' }}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Audit Reason" required>
                <textarea
                  style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }}
                  placeholder="Reason for account status change..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                />
              </FormField>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant={newStatus === 'active' ? 'primary' : 'danger'}
                  type="submit"
                  loading={actionLoading}
                >
                  Save Status
                </Button>
              </div>
            </form>
          )}

          {/* Tab 4: Activity Log */}
          {modalTab === 'activity' && (
            <div>
              <h3 style={styles.sectionTitle}>Recent User Actions</h3>
              {userActivity.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  No recent activity logged for this user.
                </p>
              ) : (
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {userActivity.map((act) => (
                    <div key={act.id} style={styles.activityItem}>
                      <div>
                        <strong>{act.activity_type}</strong>
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                          {act.metadata ? JSON.stringify(act.metadata) : ''}
                        </span>
                      </div>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {formatDate(act.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Delete User */}
          {modalTab === 'delete' && (
            <div>
              <div style={{ background: '#FDEDEC', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', marginBottom: '8px' }}>
                  ⚠️ Danger Zone – Delete User
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-danger)', lineHeight: 1.6, margin: 0 }}>
                  This action will permanently anonymize this user's account and revoke all their active sessions.
                  Manuscripts, reviews, and audit records will be preserved for compliance.
                  <strong> This action cannot be undone.</strong>
                </p>
              </div>
              <div style={styles.userCard}>
                <div style={styles.infoGrid}>
                  <div>
                    <div style={styles.infoLabel}>User</div>
                    <div style={styles.infoVal}>{selectedUser.display_name || selectedUser.email}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Email</div>
                    <div style={styles.infoVal}>{selectedUser.email}</div>
                  </div>
                  <div>
                    <div style={styles.infoLabel}>Role</div>
                    <span style={{ ...styles.badge, ...getRoleBadgeStyle(selectedUser.role_name) }}>
                      {selectedUser.role_name}
                    </span>
                  </div>
                </div>
              </div>
              <FormField label="Type DELETE to confirm" required>
                <input
                  type="text"
                  style={styles.input}
                  value={deleteConfirmText}
                  onChange={(e) => { setDeleteConfirmText(e.target.value); setActionError('') }}
                  placeholder="Type DELETE here"
                  autoComplete="off"
                />
              </FormField>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteUser}
                  loading={deleteLoading}
                  disabled={deleteConfirmText !== 'DELETE'}
                >
                  Permanently Delete User
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
