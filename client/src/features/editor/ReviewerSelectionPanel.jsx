import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../shared/components/Button'
import EmptyState from '../../shared/components/EmptyState'
import Table from '../../shared/components/Table'
import PageHeader from '../../shared/components/PageHeader'
import { getEligibleReviewers, inviteReviewer } from '../../services/editorialService'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  proficiencyBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  invitedBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#EAF7F0',
    color: 'var(--color-success)',
  },
  conflictNote: {
    fontSize: '0.8125rem',
    color: 'var(--color-danger)',
    marginTop: '4px',
  },
  dateInput: {
    padding: '6px 8px',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    cursor: 'pointer',
  },
}

function getProficiencyStyle(level) {
  const n = Number(level)
  if (n >= 4) {
    return { background: '#EAF7F0', color: 'var(--color-success)' }
  }
  if (n === 3) {
    return { background: '#E3EEF9', color: '#1565C0' }
  }
  if (n >= 1) {
    return { background: '#FFF7ED', color: '#C2410C' }
  }
  return { background: '#F1F5F9', color: 'var(--color-text-muted)' }
}

function formatProficiency(level) {
  const n = Number(level)
  if (Number.isFinite(n)) return `/5 ${n}`.trim()
  return level || 'Unknown'
}

export default function ReviewerSelectionPanel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [reviewers, setReviewers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [invitedIds, setInvitedIds] = useState(new Set())
  const [deadlines, setDeadlines] = useState({})
  const [inviteError, setInviteError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    getEligibleReviewers(id)
      .then(setReviewers)
      .catch((err) => setLoadError(err?.message || 'Unable to load reviewer candidates.'))
      .finally(() => setLoading(false))
  }, [id])

  const defaultDeadline = () => {
    const d = new Date()
    d.setDate(d.getDate() + 21)
    return d.toISOString().slice(0, 10)
  }

  const handleInvite = async (reviewerId) => {
    const deadline = deadlines[reviewerId] || defaultDeadline()
    try {
      setInviteError('')
      setSuccessMessage('')
      await inviteReviewer(id, { reviewer_id: reviewerId, deadline })
      setInvitedIds((prev) => new Set([...prev, reviewerId]))
      const reviewer = reviewers.find((item) => item.id === reviewerId)
      setSuccessMessage(`Invitation sent to ${reviewer?.name || 'the reviewer'}.`)
    } catch (err) {
      setInviteError(err?.message || 'Unable to send the reviewer invitation.')
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading eligible reviewers...</p>
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (_, reviewer) => (
        <>
          <div style={{ fontWeight: 500 }}>{reviewer.name}</div>
          {reviewer.conflict_reason && (
            <div style={styles.conflictNote}>Conflict: {reviewer.conflict_reason}</div>
          )}
          {reviewer.exclusion_reason && (
            <div style={styles.conflictNote}>Excluded: {reviewer.exclusion_reason}</div>
          )}
        </>
      ),
    },
    {
      key: 'institution',
      label: 'Institution',
      render: (val) => val || '—',
    },
    {
      key: 'proficiency_level',
      label: 'Proficiency',
      render: (val) => (
        <span style={{ ...styles.proficiencyBadge, ...getProficiencyStyle(val) }}>
          {formatProficiency(val)}
        </span>
      ),
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (_, reviewer) => (
        <input
          type="date"
          value={deadlines[reviewer.id] || defaultDeadline()}
          onChange={(e) =>
            setDeadlines((prev) => ({
              ...prev,
              [reviewer.id]: e.target.value,
            }))
          }
          style={styles.dateInput}
        />
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (_, reviewer) =>
        invitedIds.has(reviewer.id) ? (
          <span style={styles.invitedBadge}>Invited</span>
        ) : reviewer.conflict_reason || reviewer.exclusion_reason ? (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Not eligible</span>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => handleInvite(reviewer.id)}>
            Invite
          </Button>
        ),
    },
  ]

  return (
    <div style={styles.page}>
      <PageHeader
        title="Reviewer Selection"
        subtitle="Select and invite reviewers for this manuscript"
        action={<Button variant="ghost" onClick={() => navigate(`/editor/manuscripts/${id}`)}>Back to manuscript</Button>}
      />

      {successMessage && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#EAF7F0', color: 'var(--color-success)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          {successMessage}
        </div>
      )}
      {inviteError && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#FDEDEC', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          {inviteError}
        </div>
      )}

      {loadError ? (
        <EmptyState icon="⚠️" message={loadError} />
      ) : reviewers.length === 0 ? (
        <EmptyState
          icon="👥"
          message="No eligible reviewers found for this manuscript."
        />
      ) : (
        <Table columns={columns} data={reviewers} />
      )}
    </div>
  )
}
