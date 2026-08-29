import { useState, useEffect } from 'react'
import Button from '../../shared/components/Button'
import FormField from '../../shared/components/FormField'
import EmptyState from '../../shared/components/EmptyState'
import StatusBadge from '../../shared/components/StatusBadge'
import Modal from '../../shared/components/Modal'
import PageHeader from '../../shared/components/PageHeader'
import { getInvitations, respondToInvitation } from '../../services/reviewerService'
import { formatDate } from '../../shared/utils/formatDate'

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  invitationCard: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-elevated)',
    padding: '24px',
    marginBottom: '16px',
  },
  manuscriptTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-base)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    margin: '0 0 8px 0',
  },
  meta: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-muted)',
    marginBottom: '16px',
  },
  deadline: {
    fontWeight: 600,
    color: 'var(--color-ink-black)',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  declineForm: {
    marginTop: '16px',
    padding: '16px',
    background: 'var(--color-surface-sunken)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-rule-grey)',
  },
  declineTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    margin: '0 0 12px 0',
  },
  declineActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    background: 'transparent',
  },
  textarea: {
    width: '100%',
    minHeight: '60px',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    border: 'none',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    background: 'transparent',
  },
}

export default function Invitations() {
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState(null)
  const [confirmAcceptId, setConfirmAcceptId] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [declineForm, setDeclineForm] = useState({
    reason: '',
    suggested_name: '',
    suggested_email: '',
    suggested_institution: '',
  })

  useEffect(() => {
    getInvitations()
      .then(setInvitations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAccept = async (invitationId) => {
    setAccepting(true)
    try {
      await respondToInvitation(invitationId, { response: 'accepted' })
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId ? { ...inv, status: 'accepted' } : inv
        )
      )
      setConfirmAcceptId(null)
    } catch {
      // silent
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async (invitationId) => {
    try {
      await respondToInvitation(invitationId, {
        response: 'declined',
        suggestion: {
          name: declineForm.suggested_name,
          email: declineForm.suggested_email,
          institution: declineForm.suggested_institution,
          reason: declineForm.reason,
        },
      })
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.id === invitationId ? { ...inv, status: 'declined' } : inv
        )
      )
      setRespondingId(null)
      setDeclineForm({ reason: '', suggested_name: '', suggested_email: '', suggested_institution: '' })
    } catch {
      // silent
    }
  }

  const toggleDeclineForm = (invitationId) => {
    if (respondingId === invitationId) {
      setRespondingId(null)
      setDeclineForm({ reason: '', suggested_name: '', suggested_email: '', suggested_institution: '' })
    } else {
      setRespondingId(invitationId)
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading invitations...</p>
      </div>
    )
  }

  const pending = invitations.filter((inv) => inv.status === 'pending')
  const responded = invitations.filter((inv) => inv.status !== 'pending')

  return (
    <div style={styles.page}>
      <PageHeader title="Review Invitations" subtitle="Manuscripts assigned for your review" />

      {invitations.length === 0 ? (
        <EmptyState
          icon="📬"
          message="You have no review invitations at this time."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-ink-navy)',
                  marginBottom: '16px',
                }}
              >
                Pending ({pending.length})
              </h2>
              {pending.map((inv) => (
                <div key={inv.id} style={styles.invitationCard}>
                  <h3 style={styles.manuscriptTitle}>
                    {inv.manuscript_title || 'Untitled Manuscript'}
                  </h3>
                  <div style={styles.meta}>
                    {inv.submitted_at && (
                      <span>Submitted {formatDate(inv.submitted_at)}</span>
                    )}
                    {inv.deadline && (
                      <span>
                        {' · Deadline: '}
                        <span style={styles.deadline}>{formatDate(inv.deadline)}</span>
                      </span>
                    )}
                  </div>

                  {respondingId !== inv.id && (
                    <div style={styles.actions}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setConfirmAcceptId(inv.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => toggleDeclineForm(inv.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {respondingId === inv.id && (
                    <div style={styles.declineForm}>
                      <h4 style={styles.declineTitle}>Decline with Suggestion</h4>
                      <FormField label="Reason (optional)">
                        <textarea
                          value={declineForm.reason}
                          onChange={(e) =>
                            setDeclineForm((prev) => ({ ...prev, reason: e.target.value }))
                          }
                          placeholder="Why are you declining this review?"
                          style={styles.textarea}
                        />
                      </FormField>

                      <FormField label="Suggested Reviewer Name">
                        <input
                          type="text"
                          value={declineForm.suggested_name}
                          onChange={(e) =>
                            setDeclineForm((prev) => ({ ...prev, suggested_name: e.target.value }))
                          }
                          placeholder="Full name"
                          style={styles.input}
                        />
                      </FormField>

                      <FormField label="Suggested Reviewer Email">
                        <input
                          type="email"
                          value={declineForm.suggested_email}
                          onChange={(e) =>
                            setDeclineForm((prev) => ({ ...prev, suggested_email: e.target.value }))
                          }
                          placeholder="email@example.com"
                          style={styles.input}
                        />
                      </FormField>

                      <FormField label="Suggested Reviewer Institution">
                        <input
                          type="text"
                          value={declineForm.suggested_institution}
                          onChange={(e) =>
                            setDeclineForm((prev) => ({
                              ...prev,
                              suggested_institution: e.target.value,
                            }))
                          }
                          placeholder="University or organization"
                          style={styles.input}
                        />
                      </FormField>

                      <div style={styles.declineActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDeclineForm(inv.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDecline(inv.id)}
                        >
                          Confirm Decline
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {responded.length > 0 && (
            <>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-ink-navy)',
                  marginTop: pending.length > 0 ? '32px' : 0,
                  marginBottom: '16px',
                }}
              >
                Responded
              </h2>
              {responded.map((inv) => (
                <div key={inv.id} style={styles.invitationCard}>
                  <h3 style={styles.manuscriptTitle}>
                    {inv.manuscript_title || 'Untitled Manuscript'}
                  </h3>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </>
          )}
        </>
      )}

      <Modal
        isOpen={confirmAcceptId !== null}
        onClose={() => setConfirmAcceptId(null)}
        title="Accept Review Invitation"
        variant="confirmation"
      >
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)' }}>
          You are accepting to review{' '}
          <em>
            {invitations.find((inv) => inv.id === confirmAcceptId)?.manuscript_title || 'this manuscript'}
          </em>
          . Once accepted, it will move to your active assignments.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="ghost" onClick={() => setConfirmAcceptId(null)}>
            Cancel
          </Button>
          <Button variant="primary" loading={accepting} onClick={() => handleAccept(confirmAcceptId)}>
            Accept Review
          </Button>
        </div>
      </Modal>
    </div>
  )
}
