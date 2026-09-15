import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { contactService } from '../../services/contactService'
import Table from '../../shared/components/Table'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import Pagination from '../../shared/components/Pagination'
import EmptyState from '../../shared/components/EmptyState'
import PageHeader from '../../shared/components/PageHeader'
import FormField from '../../shared/components/FormField'
import { formatDate } from '../../shared/utils/formatDate'

const STATUSES = ['NEW', 'READ', 'REPLIED', 'CLOSED']

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
  },
  detailCard: {
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
  messageBox: {
    background: '#FDFCF9',
    border: '1px solid var(--color-rule-grey)',
    borderLeft: '3px solid var(--color-citation-gold)',
    borderRadius: 'var(--radius-sm)',
    padding: '16px 20px',
    fontSize: 'var(--text-sm)',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    color: 'var(--color-ink-black)',
  },
}

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'NEW':
      return { background: '#FFF7ED', color: 'var(--color-warning)' }
    case 'READ':
      return { background: '#E3EEF9', color: '#1565C0' }
    case 'REPLIED':
      return { background: '#EAF7F0', color: 'var(--color-success)' }
    case 'CLOSED':
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
    default:
      return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
  }
}

export default function ContactInquiries() {
  const { id } = useParams()
  const [inquiries, setInquiries] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })
  const [page, setPage] = useState(1)
  const limit = 10
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusSuccess, setStatusSuccess] = useState('')

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await contactService.getInquiries({
        page,
        limit,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      })
      setInquiries(data.inquiries || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 })
    } catch (err) {
      console.error('Failed to fetch inquiries:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, search])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  useEffect(() => {
    if (id) {
      handleOpenInquiry({ id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleOpenInquiry = async (row) => {
    setStatusError('')
    setStatusSuccess('')
    try {
      const full = await contactService.getInquiry(row.id)
      setSelectedInquiry(full)
      setNewStatus(full.status)
      setIsModalOpen(true)
    } catch (err) {
      console.error('Failed to load inquiry:', err)
    }
  }

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    setStatusLoading(true)
    setStatusError('')
    setStatusSuccess('')
    try {
      const result = await contactService.updateStatus(selectedInquiry.id, newStatus)
      setSelectedInquiry(result.inquiry)
      setStatusSuccess(`Status updated to "${newStatus}".`)
      fetchInquiries()
    } catch (err) {
      setStatusError(err?.response?.data?.error || 'Failed to update status.')
    } finally {
      setStatusLoading(false)
    }
  }

  const columns = [
    {
      key: 'full_name',
      label: 'Name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-ink-navy)' }}>
            {val || '—'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (val) => val || '—',
    },
    {
      key: 'category',
      label: 'Category',
      render: (val) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span style={{ ...styles.badge, ...getStatusBadgeStyle(val) }}>
          {val || 'NEW'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button variant="secondary" size="sm" onClick={() => handleOpenInquiry(row)}>
          View
        </Button>
      ),
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader
        title="Contact Inquiries"
        subtitle="View and manage inquiries submitted through the public contact form."
      />

      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name, email, or subject..."
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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '20px 0' }}>
          Loading inquiries...
        </p>
      ) : inquiries.length === 0 ? (
        <EmptyState icon="📩" message="No contact inquiries match the selected filters." />
      ) : (
        <>
          <Table columns={columns} data={inquiries} />
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              currentPage={page}
              totalPages={pagination.pages || 1}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </>
      )}

      {selectedInquiry && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Inquiry: ${selectedInquiry.subject}`}
        >
          {statusError && (
            <div style={{ background: '#FDEDEC', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
              {statusError}
            </div>
          )}
          {statusSuccess && (
            <div style={{ background: '#EAF7F0', color: 'var(--color-success)', padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
              {statusSuccess}
            </div>
          )}

          <div style={styles.detailCard}>
            <div style={styles.infoGrid}>
              <div>
                <div style={styles.infoLabel}>Name</div>
                <div style={styles.infoVal}>{selectedInquiry.full_name}</div>
              </div>
              <div>
                <div style={styles.infoLabel}>Email</div>
                <div style={styles.infoVal}>
                  <a href={`mailto:${selectedInquiry.email}`} style={{ color: 'var(--color-citation-gold-dark)' }}>
                    {selectedInquiry.email}
                  </a>
                </div>
              </div>
              <div>
                <div style={styles.infoLabel}>Institution</div>
                <div style={styles.infoVal}>{selectedInquiry.institution || '—'}</div>
              </div>
              <div>
                <div style={styles.infoLabel}>Country</div>
                <div style={styles.infoVal}>{selectedInquiry.country || '—'}</div>
              </div>
              <div>
                <div style={styles.infoLabel}>Category</div>
                <div style={styles.infoVal}>{selectedInquiry.category}</div>
              </div>
              <div>
                <div style={styles.infoLabel}>Status</div>
                <span style={{ ...styles.badge, ...getStatusBadgeStyle(selectedInquiry.status) }}>
                  {selectedInquiry.status}
                </span>
              </div>
              <div>
                <div style={styles.infoLabel}>Received</div>
                <div style={styles.infoVal}>{formatDate(selectedInquiry.created_at)}</div>
              </div>
              {selectedInquiry.notification_sent ? (
                <div>
                  <div style={styles.infoLabel}>Notification</div>
                  <div style={{ ...styles.infoVal, color: 'var(--color-success)' }}>Email sent</div>
                </div>
              ) : selectedInquiry.notification_error ? (
                <div>
                  <div style={styles.infoLabel}>Notification</div>
                  <div style={{ ...styles.infoVal, color: 'var(--color-danger)' }}>Failed</div>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={styles.infoLabel}>Message</div>
            <div style={styles.messageBox}>{selectedInquiry.message}</div>
          </div>

          <form onSubmit={handleUpdateStatus}>
            <FormField label="Update Status">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  style={{ ...styles.select, flex: 1 }}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Button variant="primary" type="submit" loading={statusLoading}>
                  Update
                </Button>
              </div>
            </FormField>
          </form>

          <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-rule-grey)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Tip: To reply, click the visitor's email address above. The notification email already has the visitor set as Reply-To.
          </div>
        </Modal>
      )}
    </div>
  )
}