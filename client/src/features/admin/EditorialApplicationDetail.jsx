import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  fetchApplicationDetail,
  updateVerification,
  requestClarification,
  updateApplicationStatus,
  approveApplication,
  rejectApplication,
  resendInvitation,
} from './services/editorialAdminService'

const EDITORIAL_SECTIONS = [
  'Artificial Intelligence',
  'Machine Learning',
  'Deep Learning',
  'Data Science',
  'Cyber Security',
  'Computer Vision',
  'Natural Language Processing (NLP)',
  'Cloud Computing & IoT',
  'Software Engineering',
  'Digital Computing',
  'Emerging Technologies & Quantum Computing',
]

const POSITIONS = [
  'Editorial Board Member',
  'Associate Editor',
  'Section Editor',
  'Executive Editor',
  'Editorial Leadership',
]

export default function EditorialApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Verification State
  const [verification, setVerification] = useState({
    email_verified: false,
    institution_verified: false,
    orcid_verified: false,
    cv_verified: false,
    experience_verified: false,
  })
  const [verificationNotes, setVerificationNotes] = useState('')
  const [adminRemarks, setAdminRemarks] = useState('')
  const [savingVerification, setSavingVerification] = useState(false)

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [approveForm, setApproveForm] = useState({
    position: '',
    section: '',
    appointment_date: new Date().toISOString().split('T')[0],
    term_start_date: new Date().toISOString().split('T')[0],
    term_end_date: '',
    is_published: true,
    notes: '',
  })
  const [approving, setApproving] = useState(false)

  const [showClarificationModal, setShowClarificationModal] = useState(false)
  const [clarificationMsg, setClarificationMsg] = useState('')
  const [requestingClarification, setRequestingClarification] = useState(false)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [resending, setResending] = useState(false)

  const loadDetail = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await fetchApplicationDetail(id)
      setApplication(data)
      if (data.verification_status) {
        setVerification({
          email_verified: Boolean(data.verification_status.email_verified),
          institution_verified: Boolean(data.verification_status.institution_verified),
          orcid_verified: Boolean(data.verification_status.orcid_verified),
          cv_verified: Boolean(data.verification_status.cv_verified),
          experience_verified: Boolean(data.verification_status.experience_verified),
        })
      }
      setVerificationNotes(data.verification_notes || '')
      setAdminRemarks(data.admin_remarks || '')
      setApproveForm({
        position: data.preferred_role || POSITIONS[0],
        section: data.preferred_editorial_section || EDITORIAL_SECTIONS[0],
        appointment_date: new Date().toISOString().split('T')[0],
        term_start_date: new Date().toISOString().split('T')[0],
        term_end_date: '',
        is_published: true,
        notes: '',
      })
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load application details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  const handleSaveVerification = async () => {
    setSavingVerification(true)
    setErrorMsg('')
    setActionSuccess('')
    try {
      await updateVerification(id, {
        verification_status: verification,
        verification_notes: verificationNotes,
        admin_remarks: adminRemarks,
      })
      setActionSuccess('Verification record updated successfully.')
      await loadDetail()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save verification.')
    } finally {
      setSavingVerification(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await updateApplicationStatus(id, newStatus, adminRemarks)
      setActionSuccess(`Application status changed to ${newStatus}.`)
      await loadDetail()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update status.')
    }
  }

  const handleApproveSubmit = async (e) => {
    e.preventDefault()
    setApproving(true)
    setErrorMsg('')
    try {
      const res = await approveApplication(id, approveForm)
      setActionSuccess(res.message || 'Application approved successfully.')
      setShowApproveModal(false)
      await loadDetail()
    } catch (err) {
      setErrorMsg(err.message || 'Approval failed.')
    } finally {
      setApproving(false)
    }
  }

  const handleClarificationSubmit = async (e) => {
    e.preventDefault()
    if (!clarificationMsg.trim()) return
    setRequestingClarification(true)
    setErrorMsg('')
    try {
      await requestClarification(id, clarificationMsg.trim())
      setActionSuccess('Clarification request sent to applicant.')
      setShowClarificationModal(false)
      setClarificationMsg('')
      await loadDetail()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send clarification request.')
    } finally {
      setRequestingClarification(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    setRejecting(true)
    setErrorMsg('')
    try {
      await rejectApplication(id, { reason: rejectReason, admin_remarks: rejectRemarks })
      setActionSuccess('Application has been rejected and applicant notified.')
      setShowRejectModal(false)
      await loadDetail()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject application.')
    } finally {
      setRejecting(false)
    }
  }

  const handleResendInvitation = async () => {
    setResending(true)
    setErrorMsg('')
    try {
      const res = await resendInvitation(id)
      setActionSuccess(res.message || 'Invitation resent.')
      await loadDetail()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resend invitation.')
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6A728A' }}>
        Loading applicant dossier...
      </div>
    )
  }

  if (!application) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#E74C3C' }}>Application record not found.</p>
        <Link to="/admin/editorial-applications" style={{ color: '#0B1B3A', fontWeight: 600 }}>
          ← Return to Applications List
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(16px, 2.5vw, 32px)', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/admin/editorial-applications" style={{ color: '#0B1B3A', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>
          ← Back to Editorial Applications
        </Link>
      </div>

      {/* Title & Action Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E6E1D6',
        borderRadius: '4px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 2px 8px rgba(11,27,58,0.03)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '16px', fontWeight: 700, color: '#9A7B23' }}>
              {application.application_number}
            </span>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              background:
                ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? '#ECFDF5' :
                application.status === 'REJECTED' ? '#FEF2F2' :
                application.status === 'CLARIFICATION_REQUIRED' ? '#FEF3C7' : '#EFF6FF',
              color:
                ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? '#047857' :
                application.status === 'REJECTED' ? '#B91C1C' :
                application.status === 'CLARIFICATION_REQUIRED' ? '#92400E' : '#1D4ED8',
            }}>
              {application.status.replace('_', ' ')}
            </span>
          </div>

          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 600, color: '#0B1B3A', margin: '0 0 4px' }}>
            {application.full_name}
          </h1>
          <div style={{ fontSize: '14px', color: '#6A728A' }}>
            {application.designation} • {application.department}, {application.institution}, {application.country}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#047857',
              padding: '8px 16px',
              borderRadius: '3px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}>
              <span>✓ Accepted &amp; Appointed (Read-Only)</span>
            </div>
          ) : application.status === 'REJECTED' ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              padding: '8px 16px',
              borderRadius: '3px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}>
              <span>Application Rejected</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                style={{
                  background: '#047857',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '2px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                ✓ Approve Application
              </button>

              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                style={{
                  background: '#FDEDEC',
                  color: '#C0392B',
                  border: '1px solid #E74C3C',
                  padding: '10px 16px',
                  borderRadius: '2px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => setShowClarificationModal(true)}
                style={{
                  background: '#FFFBEB',
                  color: '#B45309',
                  border: '1px solid #F59E0B',
                  padding: '10px 16px',
                  borderRadius: '2px',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Request Clarification
              </button>
            </>
          )}

          {application.role_grant_status === 'PENDING' && (
            <button
              type="button"
              onClick={handleResendInvitation}
              disabled={resending}
              style={{
                background: '#F0ECE3',
                color: '#0B1B3A',
                border: '1px solid #C4A24C',
                padding: '10px 16px',
                borderRadius: '2px',
                fontFamily: 'Jost, sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                cursor: resending ? 'not-allowed' : 'pointer',
              }}
            >
              {resending ? 'Sending...' : 'Resend Invitation ✉'}
            </button>
          )}
        </div>
      </div>

      {['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) && (
        <div style={{
          background: '#F8FAF9',
          border: '1px solid #A7F3D0',
          borderLeft: '4px solid #047857',
          borderRadius: '4px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Editorial Board Member Appointed
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0B1B3A' }}>
              {application.appointment_position || application.preferred_role} — {application.appointment_section || application.preferred_editorial_section}
            </div>
            <div style={{ fontSize: '12.5px', color: '#6A728A', marginTop: '3px' }}>
              Appointed: {application.appointment_date ? new Date(application.appointment_date).toLocaleDateString() : 'Active'} • Term: {application.term_start_date ? new Date(application.term_start_date).toLocaleDateString() : 'Active'} {application.term_end_date ? `to ${new Date(application.term_end_date).toLocaleDateString()}` : '(Ongoing)'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: application.member_is_published ? '#ECFDF5' : '#F3F4F6',
              color: application.member_is_published ? '#047857' : '#6B7280',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}>
              {application.member_is_published ? 'Published on Public Board ✓' : 'Hidden from Public Board'}
            </span>
          </div>
        </div>
      )}

      {actionSuccess && (
        <div style={{ background: '#ECFDF5', color: '#047857', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FDEDEC', color: '#C0392B', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Grid Layout: Left Dossier / Right Verification & Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))', gap: '24px' }}>
        
        {/* LEFT: Applicant Dossier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Card */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>1. Applicant Profile</h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '14px' }}>
              {application.profile_image_url ? (
                <img
                  src={application.profile_image_url}
                  alt={application.full_name}
                  style={{ width: '80px', height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #C4A24C' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '4px', background: '#F0ECE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0B1B3A', fontSize: '24px' }}>
                  {application.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              )}

              <div style={{ flex: 1 }}>
                <div style={detailRowStyle}>
                  <span style={detailLabelStyle}>Email:</span>
                  <span style={detailValueStyle}>
                    <strong>{application.email}</strong>
                    {application.existing_user_id ? (
                      <span style={{ marginLeft: '8px', color: '#047857', fontSize: '11.5px', background: '#ECFDF5', padding: '2px 6px', borderRadius: '3px' }}>
                        Linked User Account ✓
                      </span>
                    ) : (
                      <span style={{ marginLeft: '8px', color: '#6A728A', fontSize: '11.5px', background: '#F3F4F6', padding: '2px 6px', borderRadius: '3px' }}>
                        No account yet
                      </span>
                    )}
                  </span>
                </div>

                {application.phone && (
                  <div style={detailRowStyle}>
                    <span style={detailLabelStyle}>Phone:</span>
                    <span style={detailValueStyle}>{application.phone}</span>
                  </div>
                )}

                <div style={detailRowStyle}>
                  <span style={detailLabelStyle}>Institution:</span>
                  <span style={detailValueStyle}>{application.institution} ({application.country})</span>
                </div>
              </div>
            </div>

            {/* External Links */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F0ECE3', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {application.orcid_id && (
                <a
                  href={application.orcid_id.startsWith('http') ? application.orcid_id : `https://orcid.org/${application.orcid_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={tagLinkStyle}
                >
                  ORCID: {application.orcid_id} ↗
                </a>
              )}
              {application.google_scholar_url && (
                <a href={application.google_scholar_url} target="_blank" rel="noopener noreferrer" style={tagLinkStyle}>
                  Google Scholar (h-index: {application.google_scholar_h_index}) ↗
                </a>
              )}
              {application.scopus_url && (
                <a href={application.scopus_url} target="_blank" rel="noopener noreferrer" style={tagLinkStyle}>
                  Scopus Profile ↗
                </a>
              )}
              {application.wos_profile_url && (
                <a href={application.wos_profile_url} target="_blank" rel="noopener noreferrer" style={tagLinkStyle}>
                  Web of Science ↗
                </a>
              )}
            </div>
          </div>

          {/* Academic Qualifications Card */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>2. Academic Qualification</h3>
            <div style={{ marginTop: '14px' }}>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Degree / Level:</span>
                <span style={detailValueStyle}><strong>{application.highest_qualification}</strong></span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Specialization:</span>
                <span style={detailValueStyle}>{application.specialization}</span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>University:</span>
                <span style={detailValueStyle}>{application.university} ({application.year_of_completion})</span>
              </div>
              {application.phd_title && (
                <div style={detailRowStyle}>
                  <span style={detailLabelStyle}>Ph.D. Thesis:</span>
                  <span style={detailValueStyle}><em>"{application.phd_title}"</em></span>
                </div>
              )}
            </div>
          </div>

          {/* Research & Publications Card */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>3. Research &amp; Publications</h3>
            <div style={{ marginTop: '14px' }}>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Primary Area:</span>
                <span style={detailValueStyle}><strong>{application.primary_research_area}</strong></span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Preferred Section:</span>
                <span style={detailValueStyle}><strong style={{ color: '#9A7B23' }}>{application.preferred_editorial_section}</strong></span>
              </div>
              <div style={detailRowStyle}>
                <span style={detailLabelStyle}>Keywords:</span>
                <span style={detailValueStyle}>
                  {(application.research_keywords || []).map((k, i) => (
                    <span key={i} style={{ background: '#F0ECE3', color: '#0B1B3A', padding: '2px 8px', borderRadius: '3px', fontSize: '12px', marginRight: '6px' }}>
                      {k}
                    </span>
                  ))}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '16px', background: '#F8F9FB', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6A728A', textTransform: 'uppercase' }}>Journals</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0B1B3A' }}>{application.total_journal_publications || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6A728A', textTransform: 'uppercase' }}>Conferences</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0B1B3A' }}>{application.total_conference_publications || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6A728A', textTransform: 'uppercase' }}>Books / Ch.</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0B1B3A' }}>{application.book_chapters_count || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6A728A', textTransform: 'uppercase' }}>Patents</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0B1B3A' }}>{application.patents_count || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Editorial Experience Card */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>4. Editorial &amp; Reviewer Experience</h3>
            <div style={{ marginTop: '14px' }}>
              {application.has_previous_editorial_experience && (application.editorial_experiences || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {application.editorial_experiences.map((exp, i) => (
                    <div key={i} style={{ background: '#F8F9FB', padding: '10px 14px', borderRadius: '4px', border: '1px solid #EAECEF', fontSize: '13px' }}>
                      <div style={{ fontWeight: 700, color: '#0B1B3A' }}>{exp.journal_name} ({exp.publisher || 'N/A'})</div>
                      <div style={{ color: '#6A728A' }}>Position: <strong>{exp.editorial_position}</strong> • Manuscripts: {exp.manuscripts_reviewed || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13.5px', color: '#6A728A', margin: 0 }}>
                  No prior editorial experience recorded by applicant.
                </p>
              )}
            </div>
          </div>

          {/* Statements */}
          {(application.statement_of_interest || application.contribution_statement) && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>5. Applicant Statements</h3>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {application.statement_of_interest && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A728A', textTransform: 'uppercase' }}>Motivation:</div>
                    <p style={{ fontSize: '14px', color: '#3A4157', lineHeight: 1.6, margin: '4px 0 0' }}>{application.statement_of_interest}</p>
                  </div>
                )}
                {application.contribution_statement && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#6A728A', textTransform: 'uppercase' }}>Contribution:</div>
                    <p style={{ fontSize: '14px', color: '#3A4157', lineHeight: 1.6, margin: '4px 0 0' }}>{application.contribution_statement}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: Verification, Documents & Audit Trail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* CV Document Card */}
          <div style={{ ...cardStyle, borderTop: '3px solid #C4A24C' }}>
            <h3 style={cardTitleStyle}>Academic Curriculum Vitae</h3>
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FCFBF8', padding: '16px', borderRadius: '4px', border: '1px solid #E6E1D6' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0B1B3A', fontSize: '14px' }}>
                  📄 {application.cv_file_name || 'Academic_CV.pdf'}
                </div>
                <div style={{ fontSize: '12px', color: '#6A728A' }}>
                  {application.cv_file_size ? `${Math.round(application.cv_file_size / 1024)} KB • ` : ''} PDF Document
                </div>
              </div>

              {application.cv_file_url && (
                <a
                  href={application.cv_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#0B1B3A',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    padding: '8px 16px',
                    borderRadius: '2px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  View / Download PDF ↗
                </a>
              )}
            </div>
          </div>

          {/* Verification Checklist Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={cardTitleStyle}>Verification Checklist &amp; Notes</h3>
              {['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) && (
                <span style={{ fontSize: '11.5px', color: '#047857', background: '#ECFDF5', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  Locked ✓
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#6A728A', margin: '4px 0 16px' }}>
              {['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)
                ? 'Verification record is locked as this member is accepted and appointed.'
                : 'Verify applicant academic credentials before approval.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ ...checkLabelStyle, cursor: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                  checked={verification.email_verified}
                  onChange={(e) => setVerification(prev => ({ ...prev, email_verified: e.target.checked }))}
                  style={checkInputStyle}
                />
                <span>Email address verified &amp; institutional domain confirmed</span>
              </label>

              <label style={{ ...checkLabelStyle, cursor: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                  checked={verification.institution_verified}
                  onChange={(e) => setVerification(prev => ({ ...prev, institution_verified: e.target.checked }))}
                  style={checkInputStyle}
                />
                <span>Institution affiliation &amp; designation verified</span>
              </label>

              <label style={{ ...checkLabelStyle, cursor: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                  checked={verification.orcid_verified}
                  onChange={(e) => setVerification(prev => ({ ...prev, orcid_verified: e.target.checked }))}
                  style={checkInputStyle}
                />
                <span>ORCID / Google Scholar research profile cross-checked</span>
              </label>

              <label style={{ ...checkLabelStyle, cursor: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                  checked={verification.cv_verified}
                  onChange={(e) => setVerification(prev => ({ ...prev, cv_verified: e.target.checked }))}
                  style={checkInputStyle}
                />
                <span>Academic CV evaluated and publication record verified</span>
              </label>

              <label style={{ ...checkLabelStyle, cursor: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? 'default' : 'pointer' }}>
                <input
                  type="checkbox"
                  disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                  checked={verification.experience_verified}
                  onChange={(e) => setVerification(prev => ({ ...prev, experience_verified: e.target.checked }))}
                  style={checkInputStyle}
                />
                <span>Prior reviewing or editorial experience confirmed</span>
              </label>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#3A4157', marginBottom: '4px' }}>
                Verification Notes (Internal):
              </label>
              <textarea
                rows={3}
                disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Notes on profile cross-checks, citation metrics, or verification remarks..."
                style={{ ...textareaStyle, background: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? '#F9FAFB' : '#FFFFFF' }}
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#3A4157', marginBottom: '4px' }}>
                Admin Remarks:
              </label>
              <textarea
                rows={2}
                disabled={['APPROVED', 'ACTIVE_MEMBER'].includes(application.status)}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="General administrative notes..."
                style={{ ...textareaStyle, background: ['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? '#F9FAFB' : '#FFFFFF' }}
              />
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              {['APPROVED', 'ACTIVE_MEMBER'].includes(application.status) ? (
                <span style={{ fontSize: '12.5px', color: '#047857', fontWeight: 600 }}>
                  ✓ Record finalized for appointed member
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveVerification}
                  disabled={savingVerification}
                  style={{
                    background: '#0B1B3A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '2px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: savingVerification ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingVerification ? 'Saving...' : 'Save Verification Record'}
                </button>
              )}
            </div>
          </div>

          {/* Audit Logs Trail */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Audit &amp; Action History</h3>
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {(application.audit_logs || []).length === 0 ? (
                <p style={{ fontSize: '13px', color: '#6A728A', margin: 0 }}>No audit records yet.</p>
              ) : (
                application.audit_logs.map((log) => (
                  <div key={log.id} style={{ fontSize: '12.5px', borderBottom: '1px solid #F0ECE3', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0B1B3A', fontWeight: 600 }}>
                      <span>{log.action.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: '11px', color: '#888' }}>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.actor_name && <div style={{ color: '#6A728A', fontSize: '11.5px' }}>By: {log.actor_name}</div>}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* APPROVE MODAL */}
      {showApproveModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', margin: '0 0 14px', color: '#0B1B3A' }}>
              Approve Editorial Board Application
            </h2>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '20px' }}>
              {application.existing_user_id ? (
                <span>An active user account exists for <strong>{application.email}</strong>. Approving will promote this user to the <strong>Editor</strong> role and establish their appointment.</span>
              ) : (
                <span>No user account currently exists for <strong>{application.email}</strong>. Approving will create a secure single-use invitation grant and dispatch an invitation email with setup instructions.</span>
              )}
            </p>

            <form onSubmit={handleApproveSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Appointment Position *</label>
                  <select
                    value={approveForm.position}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, position: e.target.value }))}
                    style={inputStyle}
                  >
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Editorial Section *</label>
                  <select
                    value={approveForm.section}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, section: e.target.value }))}
                    style={inputStyle}
                  >
                    {EDITORIAL_SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Term Start Date</label>
                  <input
                    type="date"
                    value={approveForm.term_start_date}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, term_start_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Term End Date (Optional)</label>
                  <input
                    type="date"
                    value={approveForm.term_end_date}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, term_end_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#0B1B3A', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={approveForm.is_published}
                    onChange={(e) => setApproveForm(prev => ({ ...prev, is_published: e.target.checked }))}
                    style={{ width: '16px', height: '16px', accentColor: '#C4A24C' }}
                  />
                  Publish profile to public Editorial Board page immediately
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  style={{ background: '#F0ECE3', border: 'none', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  style={{ background: '#047857', color: '#FFFFFF', border: 'none', padding: '8px 20px', borderRadius: '2px', cursor: approving ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                >
                  {approving ? 'Processing Approval...' : 'Confirm & Approve →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLARIFICATION MODAL */}
      {showClarificationModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', margin: '0 0 12px', color: '#0B1B3A' }}>
              Request Clarification from Applicant
            </h2>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '16px' }}>
              An email will be dispatched to <strong>{application.email}</strong> with a secure link allowing them to provide the requested details.
            </p>

            <form onSubmit={handleClarificationSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Clarification Message *</label>
                <textarea
                  rows={4}
                  value={clarificationMsg}
                  onChange={(e) => setClarificationMsg(e.target.value)}
                  placeholder="e.g. Please provide your institutional faculty webpage or verify your highest degree completion certificate..."
                  style={textareaStyle}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowClarificationModal(false)}
                  style={{ background: '#F0ECE3', border: 'none', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingClarification}
                  style={{ background: '#B45309', color: '#FFFFFF', border: 'none', padding: '8px 20px', borderRadius: '2px', cursor: requestingClarification ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                >
                  {requestingClarification ? 'Sending...' : 'Send Clarification Request →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', margin: '0 0 12px', color: '#C0392B' }}>
              Reject Editorial Board Application
            </h2>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginBottom: '16px' }}>
              Please specify the decision reason for records. A respectful notification email will be sent to <strong>{application.email}</strong>.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Decision Reason (Included in notification email)</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Current editorial capacity for this section is full; applicant research profile does not align with section scope..."
                  style={textareaStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Internal Remarks (Private)</label>
                <textarea
                  rows={2}
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Internal notes..."
                  style={textareaStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{ background: '#F0ECE3', border: 'none', padding: '8px 16px', borderRadius: '2px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  style={{ background: '#C0392B', color: '#FFFFFF', border: 'none', padding: '8px 20px', borderRadius: '2px', cursor: rejecting ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                >
                  {rejecting ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E6E1D6',
  borderRadius: '4px',
  padding: '22px 24px',
  boxShadow: '0 2px 8px rgba(11,27,58,0.02)',
}

const cardTitleStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: '20px',
  fontWeight: 600,
  color: '#0B1B3A',
  margin: 0,
  paddingBottom: '10px',
  borderBottom: '1px solid #F0ECE3',
}

const detailRowStyle = {
  display: 'flex',
  marginBottom: '8px',
  fontSize: '13.5px',
  lineHeight: 1.5,
}

const detailLabelStyle = {
  width: '130px',
  color: '#6A728A',
  fontWeight: 600,
  flexShrink: 0,
}

const detailValueStyle = {
  color: '#0B1B3A',
  flex: 1,
}

const tagLinkStyle = {
  background: '#F0ECE3',
  color: '#0B1B3A',
  textDecoration: 'none',
  padding: '3px 8px',
  borderRadius: '3px',
  fontSize: '12px',
  fontWeight: 600,
}

const checkLabelStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  fontSize: '13px',
  color: '#3A4157',
  cursor: 'pointer',
}

const checkInputStyle = {
  width: '16px',
  height: '16px',
  marginTop: '2px',
  accentColor: '#C4A24C',
  flexShrink: 0,
}

const labelStyle = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#3A4157',
  marginBottom: '4px',
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #D1D5DB',
  borderRadius: '3px',
  fontSize: '13.5px',
  boxSizing: 'border-box',
}

const textareaStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #D1D5DB',
  borderRadius: '3px',
  fontSize: '13.5px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(11, 27, 58, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
}

const modalBoxStyle = {
  background: '#FFFFFF',
  borderRadius: '4px',
  maxWidth: '600px',
  width: '100%',
  padding: '28px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
}
