import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StatusBadge from '../../shared/components/StatusBadge'
import Button from '../../shared/components/Button'
import Tabs from '../../shared/components/Tabs'
import { getManuscript, getMyCertificate, downloadCertificatePdf } from './services/manuscriptService'
import { formatDate, formatDateTime } from '../../shared/utils/formatDate'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'files', label: 'Files & Versions' },
  { key: 'coauthors', label: 'Co-Authors' },
]

const styles = {
  page: {
    fontFamily: 'inherit',
    padding: '40px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--color-citation-gold-dark)',
    textDecoration: 'none',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    marginBottom: '24px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  header: {
    marginBottom: '24px',
  },
  submissionNumber: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
    marginBottom: '8px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    color: 'var(--color-ink-navy)',
    margin: '0 0 12px 0',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-ink-navy)',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid var(--color-rule-grey)',
  },
  label: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
    fontWeight: 600,
    marginBottom: '4px',
  },
  value: {
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.6,
    marginTop: 0,
    marginBottom: '16px',
  },
  keywordsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: 0,
    marginBottom: '16px',
    padding: 0,
    listStyle: 'none',
  },
  keywordTag: {
    background: 'var(--color-vellum)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '9999px',
    padding: '4px 12px',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-navy)',
  },
  authorCard: {
    background: 'var(--color-vellum)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '10px',
  },
  authorHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 'var(--text-base)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    marginBottom: '4px',
  },
  authorRole: {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '3px 8px',
    borderRadius: '9999px',
    background: 'rgba(196, 162, 76, 0.16)',
    color: 'var(--color-citation-gold-dark)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    verticalAlign: 'middle',
  },
  authorMeta: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
  },
  authorDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '8px 18px',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-rule-grey)',
  },
  authorDetail: {
    minWidth: 0,
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.45,
    overflowWrap: 'anywhere',
  },
  authorDetailLabel: {
    display: 'block',
    marginBottom: '2px',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--color-vellum)',
    borderRadius: 'var(--radius-md)',
    marginBottom: '8px',
  },
  fileName: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    fontWeight: 500,
  },
  fileMeta: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
  },
  versionItem: {
    padding: '12px 0',
    borderBottom: '1px solid var(--color-rule-grey)',
  },
  versionLabel: {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    marginBottom: '4px',
  },
  versionMeta: {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
    opacity: 0.55,
  },
  emptyText: {
    color: 'var(--color-ink-black)',
    opacity: 0.55,
    fontSize: 'var(--text-sm)',
    fontStyle: 'italic',
  },
  declarationsBox: {
    background: 'var(--color-vellum)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    marginTop: '8px',
  },
  declarationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '8px',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-ink-black)',
  },
  checkIcon: {
    color: 'var(--color-success)',
    fontWeight: 700,
    fontSize: 'var(--text-base)',
    lineHeight: 1,
    flexShrink: 0,
    marginTop: '2px',
  },
  errorContainer: {
    padding: '60px 24px',
    textAlign: 'center',
    fontFamily: 'inherit',
  },
  errorMsg: {
    color: 'var(--color-danger)',
    fontSize: 'var(--text-base)',
    marginBottom: '20px',
  },
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAuthorField(author, field) {
  return author?.[`profile_${field}`] || author?.[field] || ''
}

function getAuthorName(author) {
  const firstName = getAuthorField(author, 'first_name')
  const lastName = getAuthorField(author, 'last_name')
  return [firstName, lastName].filter(Boolean).join(' ')
    || author?.profile_display_name
    || author?.display_name
    || author?.email
    || 'Unknown author'
}

function getAuthorAffiliation(author) {
  return [
    getAuthorField(author, 'institution'),
    getAuthorField(author, 'college'),
    getAuthorField(author, 'department'),
  ].filter(Boolean).join(' · ')
}

function AuthorDetailCard({ author, index }) {
  const contributionRoles = Array.isArray(author.contribution_roles)
    ? author.contribution_roles.filter(Boolean).join(', ')
    : author.contribution_role
  const details = [
    ['Email', author.email || author.profile_email],
    ['Institution', getAuthorField(author, 'institution')],
    ['College', getAuthorField(author, 'college')],
    ['Department', getAuthorField(author, 'department')],
    ['Course', getAuthorField(author, 'course')],
    ['State', getAuthorField(author, 'state')],
    ['Country', getAuthorField(author, 'country')],
    ['ORCID', getAuthorField(author, 'orcid_id')],
    ['Contribution', contributionRoles],
  ].filter(([, value]) => value)

  return (
    <div style={styles.authorCard}>
      <div style={styles.authorHeader}>
        <div>
          <div style={styles.authorName}>
            {getAuthorName(author)}
            <span style={styles.authorRole}>
              {index === 0 ? 'Primary Author' : 'Co-Author'}
            </span>
            {author.is_corresponding && (
              <span style={{ ...styles.authorRole, background: 'rgba(46, 107, 158, 0.12)', color: 'var(--color-info, #2E6B9E)' }}>
                Corresponding
              </span>
            )}
          </div>
          {getAuthorAffiliation(author) && (
            <div style={styles.authorMeta}>{getAuthorAffiliation(author)}</div>
          )}
        </div>
        <div style={{ ...styles.authorMeta, whiteSpace: 'nowrap' }}>
          Author {author.author_order || index + 1}
        </div>
      </div>

      {details.length > 0 && (
        <div style={styles.authorDetails}>
          {details.map(([label, value]) => (
            <div key={label} style={styles.authorDetail}>
              <span style={styles.authorDetailLabel}>{label}</span>
              {label === 'ORCID' ? (
                <a
                  href={`https://orcid.org/${String(value).replace(/^https?:\/\/orcid\.org\//, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--color-citation-gold-dark)' }}
                >
                  {value}
                </a>
              ) : value}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ManuscriptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [manuscript, setManuscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!id) return
    getManuscript(id)
      .then(setManuscript)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyText}>Loading manuscript...</div>
      </div>
    )
  }

  if (error || !manuscript) {
    return (
      <div style={styles.page}>
        <button style={styles.backLink} onClick={() => navigate('/author/manuscripts')}>
          ← Back to Manuscripts
        </button>
        <div style={styles.errorContainer}>
          <p style={styles.errorMsg}>{error || 'Manuscript not found'}</p>
          <Button variant="secondary" onClick={() => navigate('/author/manuscripts')}>
            Back to Manuscripts
          </Button>
        </div>
      </div>
    )
  }

  const declarations = []
  if (manuscript.originality_declaration) declarations.push('Originality: This work is original and has not been published elsewhere.')
  if (manuscript.ethics_declaration) declarations.push('Ethics: Research was conducted in accordance with ethical guidelines.')
  if (manuscript.conflict_of_interest === false || manuscript.conflict_of_interest_declaration) declarations.push('Conflicts: No conflicts of interest to declare.')

  const hasFilesTabContent = (manuscript.versions && manuscript.versions.length > 0) || (manuscript.files && manuscript.files.length > 0)
  const hasCoauthorsTabContent = manuscript.authors && manuscript.authors.length > 0
  const tabs = TABS.filter((t) => {
    if (t.key === 'files') return hasFilesTabContent
    if (t.key === 'coauthors') return hasCoauthorsTabContent
    return true
  })
  const currentTab = tabs.some((t) => t.key === activeTab) ? activeTab : 'overview'

  return (
    <div style={styles.page}>
      <button style={styles.backLink} onClick={() => navigate('/author/manuscripts')}>
        ← Back to Manuscripts
      </button>

      <div style={styles.header}>
        {manuscript.submission_number && (
          <div style={styles.submissionNumber}>{manuscript.submission_number}</div>
        )}
        <h1 style={styles.title}>{manuscript.title || 'Untitled Manuscript'}</h1>
        <div style={styles.metaRow}>
          <StatusBadge status={manuscript.current_status} />
          {manuscript.submitted_at && (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', opacity: 0.55 }}>
              Submitted {formatDate(manuscript.submitted_at)}
            </span>
          )}
          {manuscript.category && (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-black)', opacity: 0.55 }}>
              {manuscript.category}
            </span>
          )}
          {manuscript.current_status === 'draft' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/author/submit/${manuscript.id}`)}
              style={{ marginLeft: 'auto' }}
            >
              Continue Editing
            </Button>
          )}
          {manuscript.current_status === 'revision_requested' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/author/revisions')}
              style={{ marginLeft: 'auto' }}
            >
              <i className="fas fa-rotate" style={{ marginRight: '6px' }} />
              Submit Revision
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} activeKey={currentTab} onChange={setActiveTab} />

      {currentTab === 'overview' && (
        <>
          {manuscript.abstract && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Abstract</h2>
              <p style={styles.value}>{manuscript.abstract}</p>
            </div>
          )}

          {manuscript.keywords && manuscript.keywords.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Keywords</h2>
              <ul style={styles.keywordsList}>
                {manuscript.keywords.map((kw, i) => (
                  <li key={i} style={styles.keywordTag}>{kw}</li>
                ))}
              </ul>
            </div>
          )}

          {manuscript.status_history && manuscript.status_history.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Status History</h2>
              {manuscript.status_history.map((entry, i) => (
                <div key={i} style={styles.versionItem}>
                  <div style={styles.versionLabel}>
                    {entry.status?.replace(/_/g, ' ')}
                  </div>
                  <div style={styles.versionMeta}>
                    {formatDateTime(entry.changed_at || entry.created_at)}
                    {entry.changed_by && ` · by ${entry.changed_by}`}
                    {entry.note && ` · ${entry.note}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {declarations.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Declarations</h2>
              <div style={styles.declarationsBox}>
                {declarations.map((d, i) => (
                  <div key={i} style={styles.declarationItem}>
                    <span style={styles.checkIcon}>✓</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {manuscript.current_status === 'published' && (
            <PublicationCertificateSection manuscriptId={manuscript.id} />
          )}
        </>
      )}

      {currentTab === 'files' && (
        <>
          {manuscript.versions && manuscript.versions.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Version History</h2>
              {manuscript.versions.map((version, i) => (
                <div key={version.id || i} style={styles.versionItem}>
                  <div style={styles.versionLabel}>
                    Version {version.version_number || i + 1}
                  </div>
                  <div style={styles.versionMeta}>
                    {formatDateTime(version.created_at)}
                    {version.submitted_at && ` · Submitted ${formatDateTime(version.submitted_at)}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {manuscript.files && manuscript.files.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Files</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {manuscript.files.map((file, i) => {
                  const versionNum = file.version_number
                  const isLatest = Boolean(file.is_current_version || (manuscript.current_version_id && file.version_id === manuscript.current_version_id))
                  const isRevision = versionNum && versionNum > 1
                  return (
                    <div key={file.id || i} style={styles.fileItem}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isRevision ? '#F3E8FF' : '#EBF4FB',
                              color: isRevision ? '#6B21A8' : '#1A4A6E',
                            }}
                          >
                            {versionNum ? (versionNum === 1 ? 'Original (v1)' : `Revision ${versionNum - 1} (v${versionNum})`) : 'Original (v1)'}
                          </span>
                          {isLatest && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#E8F5EC',
                                color: '#2B7A4B',
                              }}
                            >
                              Latest Version
                            </span>
                          )}
                        </div>
                        <div style={styles.fileName}>{file.original_filename || file.original_name || file.filename || file.file_type}</div>
                        <div style={styles.fileMeta}>
                          {file.file_type}
                          {file.file_size_bytes && ` · ${(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB`}
                          {file.uploaded_at && ` · Uploaded ${formatDate(file.uploaded_at)}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {currentTab === 'coauthors' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Authors &amp; Co-Authors</h2>
          {manuscript.authors.map((author, i) => (
            <AuthorDetailCard key={author.id || i} author={author} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function PublicationCertificateSection({ manuscriptId }) {
  const [cert, setCert] = useState(null)
  const [state, setState] = useState({ loading: true, error: '' })

  useEffect(() => {
    let active = true
    getMyCertificate(manuscriptId)
      .then((data) => { if (active) { setCert(data); setState({ loading: false, error: '' }) } })
      .catch((err) => {
        if (active) {
          setState({
            loading: false,
            error: err.response?.data?.error || 'Certificate is not available yet.'
          })
        }
      })
    return () => { active = false }
  }, [manuscriptId])

  return (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>Certificate of Publication</h2>
      <div style={styles.declarationsBox}>
        {state.loading ? (
          <div style={styles.emptyText}>Loading certificate...</div>
        ) : state.error ? (
          <div style={styles.emptyText}>{state.error}</div>
        ) : cert ? (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: '#0B1B3A', marginBottom: '4px' }}>
              {cert.certificate_number}
            </div>
            {(cert.author_name || cert.author?.name) && (
              <div style={{ fontSize: 'var(--text-sm)', color: '#0B1B3A', marginBottom: '6px' }}>
                <strong>Author:</strong> {cert.author_name || cert.author?.name}
              </div>
            )}
            <div style={styles.authorMeta}>
              {cert.journal_name} · Vol. {cert.volume}, Issue {cert.issue}, {cert.publication_year}
              {cert.doi ? ` · ${cert.doi}` : ''}
            </div>
            {cert.status === 'active' ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                {(cert.download_url || cert.pdf_url) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      try {
                        await downloadCertificatePdf(manuscriptId, cert.certificate_number)
                      } catch (err) {
                        alert('Failed to download certificate: ' + (err.message || 'Unknown error'))
                      }
                    }}
                  >
                    ⬇ Download Certificate PDF
                  </Button>
                )}
                {cert.verification_url && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(cert.verification_url, '_blank', 'noopener,noreferrer')}
                  >
                    🔍 Verify Certificate
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ ...styles.emptyText, marginTop: '8px' }}>
                {cert.status === 'revoked' ? 'This certificate has been revoked.' : 'Your certificate is being prepared. Please check back shortly.'}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
