import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminApplications,
  fetchAllEditorialMembers,
  updateEditorialMember,
  deleteEditorialMember,
} from './services/editorialAdminService'

export default function EditorialApplications() {
  const [activeTab, setActiveTab] = useState('applications')
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [metrics, setMetrics] = useState({
    total: 0,
    submitted: 0,
    under_review: 0,
    verification: 0,
    clarification_required: 0,
    approved: 0,
    rejected: 0,
    hold: 0,
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Members Tab
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  const loadApplications = async (page = 1) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchAdminApplications({
        page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        role: roleFilter || undefined,
      })
      setApplications(data.applications || [])
      setMetrics(data.metrics || {})
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load editorial applications.')
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    setMembersLoading(true)
    try {
      const data = await fetchAllEditorialMembers()
      setMembers(data || [])
    } catch (err) {
      console.error('Failed to load members:', err)
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications(1)
    } else {
      loadMembers()
    }
  }, [activeTab, statusFilter, roleFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadApplications(1)
  }

  const handleTogglePublish = async (member) => {
    try {
      const updated = await updateEditorialMember(member.id, { is_published: !member.is_published })
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, is_published: updated.is_published } : m)))
    } catch (err) {
      alert(err.message || 'Failed to update member status.')
    }
  }

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the public editorial board?')) return
    try {
      await deleteEditorialMember(memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      alert(err.message || 'Failed to delete member.')
    }
  }

  const getStatusBadge = (status) => {
    const config = {
      SUBMITTED: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Submitted' },
      UNDER_REVIEW: { bg: '#F5F3FF', text: '#6D28D9', label: 'Under Review' },
      VERIFICATION: { bg: '#FFFBEB', text: '#B45309', label: 'Verification' },
      CLARIFICATION_REQUIRED: { bg: '#FEF3C7', text: '#92400E', label: 'Clarification' },
      APPROVED: { bg: '#ECFDF5', text: '#047857', label: 'Approved' },
      ACTIVE_MEMBER: { bg: '#ECFDF5', text: '#047857', label: 'Active Member' },
      REJECTED: { bg: '#FEF2F2', text: '#B91C1C', label: 'Rejected' },
      HOLD: { bg: '#F3F4F6', text: '#4B5563', label: 'On Hold' },
    }
    const c = config[status] || { bg: '#F3F4F6', text: '#374151', label: status }
    return (
      <span style={{
        background: c.bg,
        color: c.text,
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '11.5px',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}>
        {c.label}
      </span>
    )
  }

  return (
    <div style={{ padding: 'clamp(16px, 2.5vw, 32px)', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '4px' }}>
            Editorial Administration
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 600, color: '#0B1B3A', margin: 0 }}>
            Editorial Board Applications
          </h1>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: '#F0ECE3', borderRadius: '4px', padding: '3px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            style={{
              border: 'none',
              padding: '8px 18px',
              borderRadius: '3px',
              fontFamily: 'Jost, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'applications' ? '#0B1B3A' : 'transparent',
              color: activeTab === 'applications' ? '#FFFFFF' : '#0B1B3A',
            }}
          >
            Applications ({metrics.total || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            style={{
              border: 'none',
              padding: '8px 18px',
              borderRadius: '3px',
              fontFamily: 'Jost, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'members' ? '#0B1B3A' : 'transparent',
              color: activeTab === 'members' ? '#FFFFFF' : '#0B1B3A',
            }}
          >
            Public Board Members
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Total Submissions</div>
          <div style={{ ...metricValueStyle, color: '#0B1B3A' }}>{metrics.total || 0}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Pending / Submitted</div>
          <div style={{ ...metricValueStyle, color: '#1D4ED8' }}>{metrics.submitted || 0}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Under Review &amp; Verification</div>
          <div style={{ ...metricValueStyle, color: '#6D28D9' }}>{(metrics.under_review || 0) + (metrics.verification || 0)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Clarification Required</div>
          <div style={{ ...metricValueStyle, color: '#B45309' }}>{metrics.clarification_required || 0}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Approved Members</div>
          <div style={{ ...metricValueStyle, color: '#047857' }}>{metrics.approved || 0}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Rejected / On Hold</div>
          <div style={{ ...metricValueStyle, color: '#B91C1C' }}>{(metrics.rejected || 0) + (metrics.hold || 0)}</div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#FDEDEC', color: '#C0392B', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <>
          {/* Filters Bar */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E6E1D6',
            borderRadius: '4px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search by name, email, Editor ID (e.g. AIRJ0001), institution, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '3px',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#0B1B3A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Search
              </button>
            </form>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="VERIFICATION">Verification</option>
                <option value="CLARIFICATION_REQUIRED">Clarification Required</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="HOLD">On Hold</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="">All Preferred Roles</option>
                <option value="Editorial Board Member">Editorial Board Member</option>
                <option value="National Editorial Board">National Editorial Board</option>
                <option value="International Editorial Board">International Editorial Board</option>
                <option value="Editorial Leadership">Editorial Leadership</option>
                <option value="Reviewer">Reviewer</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E6E1D6',
            borderRadius: '4px',
            overflowX: 'auto',
            boxShadow: '0 2px 8px rgba(11,27,58,0.02)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E6E1D6' }}>
                  <th style={thStyle}>Reference</th>
                  <th style={thStyle}>Applicant</th>
                  <th style={thStyle}>Affiliation &amp; Country</th>
                  <th style={thStyle}>Preferred Role &amp; Section</th>
                  <th style={thStyle}>Account</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Submitted</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#6A728A' }}>
                      Loading applications...
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#6A728A' }}>
                      No applications found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #F0ECE3' }}>
                      <td style={tdStyle}>
                        <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 700, color: '#0B1B3A' }}>
                          {app.application_number}
                        </div>
                        {app.editor_id && (
                          <div style={{ marginTop: '3px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#0D1B3E',
                              color: '#C4922E',
                              border: '1px solid rgba(196,146,46,0.6)',
                              borderRadius: '999px',
                              padding: '1px 7px',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                            }} title={`Editor ID: ${app.editor_id}`}>
                              {app.editor_id}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#0B1B3A' }}>{app.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#6A728A' }}>{app.email}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: '#3A4157' }}>{app.designation}, {app.institution}</div>
                        <div style={{ fontSize: '12px', color: '#9A7B23' }}>📍 {app.country}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#0B1B3A' }}>{app.preferred_role}</div>
                        <div style={{ fontSize: '12px', color: '#6A728A' }}>{app.preferred_editorial_section}</div>
                      </td>
                      <td style={tdStyle}>
                        {app.existing_user_id ? (
                          <span style={{ fontSize: '11.5px', color: '#047857', background: '#ECFDF5', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
                            User Exists ✓
                          </span>
                        ) : app.role_grant_status === 'PENDING' ? (
                          <span style={{ fontSize: '11.5px', color: '#92400E', background: '#FEF3C7', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>
                            Invitation Sent ✉
                          </span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#6B7280', background: '#F3F4F6', padding: '2px 6px', borderRadius: '3px' }}>
                            New User
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {getStatusBadge(app.status)}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '12.5px', color: '#6A728A', whiteSpace: 'nowrap' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <Link
                          to={`/admin/editorial-applications/${app.id}`}
                          style={{
                            background: ['APPROVED', 'ACTIVE_MEMBER'].includes(app.status) ? '#1E293B' : '#0B1B3A',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            padding: '6px 14px',
                            borderRadius: '2px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          {['APPROVED', 'ACTIVE_MEMBER'].includes(app.status) ? 'View Details →' : 'Review →'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', fontSize: '13.5px', color: '#6A728A' }}>
              <div>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} items)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => loadApplications(pagination.page - 1)}
                  style={paginationBtnStyle}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadApplications(pagination.page + 1)}
                  style={paginationBtnStyle}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E6E1D6',
          borderRadius: '4px',
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(11,27,58,0.02)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#F8F9FB', borderBottom: '1px solid #E6E1D6' }}>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Member Name</th>
                <th style={thStyle}>Role Title</th>
                <th style={thStyle}>Section</th>
                <th style={thStyle}>Affiliation</th>
                <th style={thStyle}>Published</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#6A728A' }}>
                    Loading editorial members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#6A728A' }}>
                    No dynamic editorial members registered yet.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #F0ECE3' }}>
                    <td style={{ ...tdStyle, width: '60px' }}>
                      <span style={{ fontWeight: 700, color: '#9A7B23' }}>{m.display_order}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {m.profile_image_url ? (
                          <img src={m.profile_image_url} alt={m.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F0ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                            {m.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#0B1B3A' }}>{m.name}</span>
                            {m.editor_id && (
                              <span style={{
                                background: '#0D1B3E',
                                color: '#C4922E',
                                border: '1px solid rgba(196,146,46,0.5)',
                                borderRadius: '999px',
                                padding: '1px 6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                              }}>
                                {m.editor_id}
                              </span>
                            )}
                          </div>
                          {m.academic_title && <div style={{ fontSize: '11.5px', color: '#6A728A' }}>{m.academic_title}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#0B1B3A' }}>{m.role_title}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12.5px', color: '#6A728A' }}>{m.editorial_section || 'General'}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '12.5px', color: '#3A4157' }}>{m.institution}</div>
                      <div style={{ fontSize: '11.5px', color: '#9A7B23' }}>{m.country}</div>
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(m)}
                        style={{
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: m.is_published ? '#ECFDF5' : '#F3F4F6',
                          color: m.is_published ? '#047857' : '#6B7280',
                        }}
                      >
                        {m.is_published ? 'Published ✓' : 'Hidden'}
                      </button>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m.id)}
                        style={{
                          background: '#FDEDEC',
                          color: '#C0392B',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '2px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

const metricCardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E6E1D6',
  borderRadius: '4px',
  padding: '16px 20px',
  boxShadow: '0 2px 8px rgba(11,27,58,0.03)',
}

const metricLabelStyle = {
  fontFamily: 'Jost, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#6A728A',
  marginBottom: '6px',
}

const metricValueStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: '28px',
  fontWeight: 700,
  lineHeight: 1,
}

const filterSelectStyle = {
  padding: '8px 12px',
  border: '1px solid #D1D5DB',
  borderRadius: '3px',
  fontSize: '13.5px',
  color: '#0B1B3A',
  background: '#FFFFFF',
}

const thStyle = {
  padding: '12px 16px',
  fontFamily: 'Jost, sans-serif',
  fontSize: '11.5px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6A728A',
  fontWeight: 700,
}

const tdStyle = {
  padding: '14px 16px',
  verticalAlign: 'middle',
}

const paginationBtnStyle = {
  padding: '6px 14px',
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
}
