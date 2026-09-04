import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import FormField from '../../shared/components/FormField'
import Button from '../../shared/components/Button'
import FileUpload from '../../shared/components/FileUpload'
import {
  createDraft,
  getManuscript,
  updateManuscript,
  addAuthor,
  submitManuscript,
  requestSignature,
  confirmUpload,
  deleteManuscriptFile,
} from './services/manuscriptService'

const STEPS = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'authors', label: 'Authors' },
  { key: 'files', label: 'Manuscript Files' },
  { key: 'metadata', label: 'Metadata & Declarations' },
  { key: 'review', label: 'Review' },
  { key: 'submit', label: 'Submit' },
]

const CATEGORIES = [
  'Original Research',
  'Review Article',
  'Case Study',
  'Short Communication',
  'Commentary',
  'Letter to Editor',
  'Book Review',
  'Technical Note',
]

const SUBJECTS = [
  'Machine Learning',
  'Computer Vision',
  'Natural Language Processing',
  'Software Engineering',
  'Cybersecurity',
  'Quantum Computing',
  'IoT / Edge Computing',
  'Data Science',
  'Artificial Intelligence',
]

const CONTRIBUTION_ROLES = [
  'Conceptualization',
  'Data Curation',
  'Formal Analysis',
  'Investigation',
  'Methodology',
  'Project Administration',
  'Resources',
  'Software',
  'Supervision',
  'Validation',
  'Visualization',
  'Writing – Original Draft',
  'Writing – Review & Editing',
]

// Enhanced styles matching the author.html design
const styles = {
  page: {
    fontFamily: "'DM Sans', sans-serif",
    maxWidth: '100%',
  },
  
  // Wizard progress bar
  wizardProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    marginBottom: '32px',
    position: 'relative',
  },
  wizardStep: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    position: 'relative',
    zIndex: 1,
  },
  wizardNum: (isActive, isCompleted) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    border: `2px solid ${isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-info, #2E6B9E)' : 'var(--color-rule-grey)'}`,
    background: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-info, #2E6B9E)' : 'var(--color-surface)',
    color: isCompleted || isActive ? 'white' : 'var(--color-text-muted)',
    boxShadow: isActive ? '0 0 0 4px rgba(46, 107, 158, 0.15)' : 'none',
    transition: 'all 0.15s ease',
  }),
  wizardStepLabel: (isActive, isCompleted) => ({
    fontSize: '11px',
    fontWeight: 600,
    color: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-info, #2E6B9E)' : 'var(--color-text-muted)',
    textAlign: 'center',
  }),
  wizardLine: (isCompleted) => ({
    position: 'absolute',
    top: '18px',
    left: 'calc(50% + 18px)',
    right: 'calc(-50% + 18px)',
    height: '2px',
    background: isCompleted ? 'var(--color-success)' : 'var(--color-rule-grey)',
    zIndex: 0,
    transition: 'background 0.2s ease',
  }),
  
  // Card styling
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  cardBody: {
    padding: '24px',
    minHeight: '400px',
  },
  
  // Typography
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-ink-navy)',
    marginBottom: '24px',
  },
  
  // Form inputs
  input: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    transition: 'all 0.15s ease',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    resize: 'vertical',
    minHeight: '100px',
    transition: 'all 0.15s ease',
  },
  select: {
    width: '100%',
    padding: '9px 32px 9px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    outline: 'none',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-black)',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238B8F9A' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    transition: 'all 0.15s ease',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formHint: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
  
  // Alert banners
  alertBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  alertInfo: {
    background: 'rgba(46, 107, 158, 0.08)',
    border: '1px solid rgba(46, 107, 158, 0.3)',
    color: '#1A4A6E',
  },
  alertWarning: {
    background: 'rgba(196, 139, 30, 0.08)',
    border: '1px solid rgba(196, 139, 30, 0.3)',
    color: '#7A5A10',
  },
  alertDanger: {
    background: 'rgba(184, 51, 51, 0.08)',
    border: '1px solid rgba(184, 51, 51, 0.3)',
    color: '#7A1A1A',
  },
  alertSuccess: {
    background: 'rgba(43, 122, 75, 0.08)',
    border: '1px solid rgba(43, 122, 75, 0.3)',
    color: '#1A5A30',
  },
  
  // Upload zone
  uploadZone: {
    border: '2px dashed var(--color-rule-grey)',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    background: 'var(--color-surface)',
  },
  uploadZoneHover: {
    borderColor: 'var(--color-info, #2E6B9E)',
    background: 'var(--dash-info-bg)',
  },
  uploadIcon: {
    fontSize: '32px',
    color: 'var(--color-info, #2E6B9E)',
    marginBottom: '12px',
  },
  uploadText: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    marginBottom: '4px',
  },
  uploadHint: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  
  // File item
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    marginBottom: '8px',
    background: 'var(--color-surface)',
  },
  fileItemIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  fileItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileItemName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
  fileItemMeta: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  
  // Author chip
  authorChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    marginBottom: '8px',
    background: 'var(--color-surface)',
  },
  authorChipAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: 'white',
    flexShrink: 0,
  },
  authorChipInfo: {
    flex: 1,
    minWidth: 0,
  },
  authorChipName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
  },
  authorChipAffil: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  
  // Co-author notice
  coauthorNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    background: 'rgba(124, 58, 237, 0.08)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#5B21B6',
    marginBottom: '16px',
  },
  
  // Navigation buttons
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '16px',
  },
  
  // Checkbox
  checkbox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '16px',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    accentColor: 'var(--color-success)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: '14px',
    color: 'var(--color-ink-black)',
    lineHeight: 1.5,
    cursor: 'pointer',
  },
  
  // Review section
  reviewSection: {
    padding: '16px',
    background: 'var(--color-vellum, #F9F8F6)',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
    lineHeight: 1.8,
  },
  reviewLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  
  // Submit section
  submitContainer: {
    textAlign: 'center',
    padding: '32px 20px',
  },
  submitIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(43, 122, 75, 0.08)',
    color: 'var(--color-success)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    margin: '0 auto 24px',
  },
  submitTitle: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '8px',
    color: 'var(--color-ink-navy)',
  },
  submitDesc: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    maxWidth: '500px',
    margin: '0 auto 24px',
    lineHeight: 1.7,
  },
  
  // Keywords
  tagInput: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 12px',
    minHeight: '40px',
    alignItems: 'center',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '8px',
    background: 'var(--color-surface)',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'var(--color-citation-gold)',
    color: 'var(--color-ink-navy)',
    borderRadius: '9999px',
    padding: '3px 10px',
    fontSize: '13px',
    fontWeight: 500,
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--color-ink-navy)',
    cursor: 'pointer',
    padding: 0,
    marginLeft: '2px',
    fontSize: '14px',
    fontWeight: 700,
  },
  tagInputField: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    flex: 1,
    minWidth: '120px',
    background: 'transparent',
    color: 'var(--color-ink-black)',
  },
}

// Keyword Input Component
function KeywordInput({ value = [], onChange }) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed])
      }
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeKeyword = (idx) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <FormField label="Keywords" required helperText="Enter 3-6 keywords separated by commas">
      <div style={styles.tagInput}>
        {value.map((kw, i) => (
          <span key={i} style={styles.tag}>
            {kw}
            <button style={styles.tagRemove} onClick={() => removeKeyword(i)} type="button">
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'e.g., machine learning, neural networks, NLP' : ''}
          style={styles.tagInputField}
        />
      </div>
    </FormField>
  )
}

// Step 1: Basic Information
function StepBasic({ manuscript, onChange, errors }) {
  const handleChange = (field, value) => {
    onChange({ ...manuscript, [field]: value })
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Basic Information</h2>
      
      <FormField label="Manuscript Title" required error={errors.title}>
        <input
          type="text"
          value={manuscript.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter the full title of your manuscript"
          style={styles.input}
        />
      </FormField>
      
      <FormField label="Abstract" required error={errors.abstract} helperText="Do not include author names or affiliations if the journal uses double-blind review.">
        <textarea
          value={manuscript.abstract || ''}
          onChange={(e) => handleChange('abstract', e.target.value)}
          placeholder="Structured or unstructured abstract (typically 200-300 words)..."
          style={{ ...styles.textarea, minHeight: '120px' }}
        />
      </FormField>
      
      <div style={styles.formRow}>
        <FormField label="Article Type" required error={errors.category}>
          <select
            value={manuscript.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            style={styles.select}
          >
            <option value="">Select type...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </FormField>
        
        <FormField label="Subject / Category" required error={errors.subject}>
          <select
            value={manuscript.subject || ''}
            onChange={(e) => handleChange('subject', e.target.value)}
            style={styles.select}
          >
            <option value="">Select subject...</option>
            {SUBJECTS.map((subj) => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </FormField>
      </div>
      
      <KeywordInput
        value={manuscript.keywords || []}
        onChange={(kw) => handleChange('keywords', kw)}
      />
    </div>
  )
}

// Step 2: Authors
function StepAuthors({ manuscript, onChange }) {
  const { user } = useAuth()
  const authors = manuscript.authors || []
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [emailError, setEmailError] = useState('')

  const coAuthors = authors.filter(
    (a) => a.email?.toLowerCase() !== user?.email?.toLowerCase()
  )

  const handleAddAuthor = async () => {
    if (!email.trim()) return
    if (email.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError('You are already listed as the primary author.')
      return
    }
    if (coAuthors.some((a) => a.email?.toLowerCase() === email.trim().toLowerCase())) {
      setEmailError('This co-author has already been added.')
      return
    }
    setEmailError('')
    setAdding(true)
    try {
      const newAuthor = await addAuthor(manuscript.id, { email: email.trim() })
      onChange({
        ...manuscript,
        authors: [...authors, { ...newAuthor, contribution_role: '' }],
      })
      setEmail('')
    } catch {
      const tempAuthor = {
        id: `temp-${Date.now()}`,
        email: email.trim(),
        name: email.trim(),
        is_corresponding: false,
        contribution_role: '',
      }
      onChange({ ...manuscript, authors: [...authors, tempAuthor] })
      setEmail('')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveAuthor = (authorId) => {
    const updated = authors.filter((a) => a.id !== authorId)
    onChange({ ...manuscript, authors: updated })
  }

  const handleUpdateAuthor = (authorId, field, value) => {
    const updated = authors.map((a) =>
      a.id === authorId ? { ...a, [field]: value } : a
    )
    onChange({ ...manuscript, authors: updated })
  }

  const handleSetCorresponding = (authorId) => {
    const updated = authors.map((a) => ({
      ...a,
      is_corresponding: a.id === authorId,
    }))
    onChange({ ...manuscript, authors: updated })
  }

  const getInitials = (name) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const avatarColors = ['var(--color-success)', 'var(--color-info, #2E6B9E)', 'var(--color-purple, #7C3AED)']

  return (
    <div>
      <h2 style={styles.sectionTitle}>Authors</h2>
      
      <div style={styles.coauthorNotice}>
        <i className="fas fa-info-circle" style={{ marginTop: '2px' }}></i>
        <div>
          You are automatically added as the corresponding author. Add co-authors below. Author order determines the published byline.
        </div>
      </div>
      
      {/* Primary Author */}
      <div style={styles.authorChip}>
        <div style={{ ...styles.authorChipAvatar, background: 'var(--color-success)' }}>
          {getInitials(user?.display_name || user?.name || user?.email)}
        </div>
        <div style={styles.authorChipInfo}>
          <div style={styles.authorChipName}>
            {user?.display_name || user?.name || user?.email}
            <span style={{ 
              fontSize: '11px', 
              color: 'var(--color-success)', 
              fontWeight: 600, 
              marginLeft: '6px' 
            }}>
              Corresponding Author
            </span>
          </div>
          <div style={styles.authorChipAffil}>{user?.organization || user?.email}</div>
        </div>
      </div>
      
      {/* Co-Authors */}
      {coAuthors.map((author, index) => (
        <div key={author.id} style={styles.authorChip}>
          <div style={{ 
            ...styles.authorChipAvatar, 
            background: avatarColors[index % avatarColors.length] 
          }}>
            {getInitials(author.name || author.email)}
          </div>
          <div style={styles.authorChipInfo}>
            <div style={styles.authorChipName}>
              {author.name || author.email}
              {author.is_corresponding && (
                <span style={{ 
                  fontSize: '11px', 
                  color: 'var(--color-success)', 
                  fontWeight: 600, 
                  marginLeft: '6px' 
                }}>
                  Corresponding
                </span>
              )}
            </div>
            <div style={styles.authorChipAffil}>{author.affiliation || author.email}</div>
          </div>
          {!author.is_corresponding && (
            <button
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--color-info, #2E6B9E)', 
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 8px',
                marginRight: '4px',
              }}
              onClick={() => handleSetCorresponding(author.id)}
              type="button"
            >
              Set Corresponding
            </button>
          )}
          <button
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-danger)', 
              cursor: 'pointer',
              fontSize: '14px',
              padding: '4px',
            }}
            onClick={() => handleRemoveAuthor(author.id)}
            type="button"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
      
      {/* Add Co-Author */}
      <FormField label="Add Co-Author by Email">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAuthor())}
            placeholder="colleague@university.edu"
            style={{ ...styles.input, flex: 1 }}
          />
          <Button variant="secondary" onClick={handleAddAuthor} loading={adding}>
            <i className="fas fa-user-plus" style={{ marginRight: '6px' }}></i>
            Add Co-Author
          </Button>
        </div>
        {emailError && (
          <div style={{ ...styles.formHint, color: 'var(--color-danger)', marginTop: '4px' }}>
            {emailError}
          </div>
        )}
      </FormField>
      
      <div style={styles.formHint}>
        In a production system, co-authors can be added by email. They will receive a confirmation link to verify their information and affiliate with the manuscript.
      </div>
    </div>
  )
}

// Step 3: Files
function StepFiles({ manuscript, onChange, errors }) {
  const [uploading, setUploading] = useState(null)
  const [removing, setRemoving] = useState(null)

  const handleFileRemove = async (fileId) => {
    if (!manuscript.id || !fileId) return
    setRemoving(fileId)
    try {
      await deleteManuscriptFile(manuscript.id, fileId)
      const updated = await getManuscript(manuscript.id)
      onChange(updated)
    } catch (err) {
      console.error('Failed to remove file:', err)
    } finally {
      setRemoving(null)
    }
  }

  const handleFileSelect = async (file, fileType) => {
    if (!file || !manuscript.id) return
    setUploading(fileType)
    try {
      const sig = await requestSignature(manuscript.id, manuscript.current_version_id || 'current', fileType)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', sig.api_key)
      formData.append('timestamp', sig.timestamp)
      formData.append('signature', sig.signature)
      formData.append('folder', sig.folder)
      formData.append('public_id', sig.public_id)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`, {
        method: 'POST',
        body: formData,
      })
      
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed')

      await confirmUpload(manuscript.id, manuscript.current_version_id || 'current', {
        file_type: fileType,
        original_filename: file.name,
        public_id: uploadData.public_id,
        resource_type: uploadData.resource_type,
        format: uploadData.format,
        mime_type: file.type,
        file_size_bytes: uploadData.bytes,
        sha256_checksum: null,
      })
      const updated = await getManuscript(manuscript.id)
      onChange(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(null)
    }
  }

  const mainFile = (manuscript.files || []).find((f) => f.file_type === 'main_manuscript')
  const suppFiles = (manuscript.files || []).filter((f) => f.file_type === 'supplementary')

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return { icon: 'fa-file-pdf', color: 'var(--color-danger)', bg: 'rgba(184, 51, 51, 0.08)' }
    if (['xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: 'var(--color-success)', bg: 'rgba(43, 122, 75, 0.08)' }
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) return { icon: 'fa-file-image', color: 'var(--color-info, #2E6B9E)', bg: 'rgba(46, 107, 158, 0.08)' }
    return { icon: 'fa-file', color: 'var(--color-text-muted)', bg: 'var(--color-vellum, #F9F8F6)' }
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Manuscript Files</h2>
      
      <FormField label="Manuscript File" required error={errors.main_manuscript}>
        {mainFile ? (
          <div style={styles.fileItem}>
            <div style={{ 
              ...styles.fileItemIcon, 
              background: getFileIcon(mainFile.original_name).bg,
              color: getFileIcon(mainFile.original_name).color,
            }}>
              <i className={`fas ${getFileIcon(mainFile.original_name).icon}`}></i>
            </div>
            <div style={styles.fileItemInfo}>
              <div style={styles.fileItemName}>{mainFile.original_name}</div>
              <div style={styles.fileItemMeta}>
                {(mainFile.file_size_bytes / 1024 / 1024).toFixed(1)} MB — Uploaded
              </div>
            </div>
            <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '13px', marginRight: '8px' }}>
              <i className="fas fa-check-circle"></i>
            </span>
            <button
              type="button"
              onClick={() => handleFileRemove(mainFile.id)}
              disabled={removing === mainFile.id}
              style={{
                background: 'rgba(184, 51, 51, 0.08)',
                border: '1px solid rgba(184, 51, 51, 0.3)',
                color: 'var(--color-danger)',
                cursor: removing === mainFile.id ? 'not-allowed' : 'pointer',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: removing === mainFile.id ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              {removing === mainFile.id ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-trash-can"></i>
              )}
              Remove
            </button>
          </div>
        ) : (
          <FileUpload
            accept=".pdf,.doc,.docx"
            onFileSelect={(f) => handleFileSelect(f, 'main_manuscript')}
            label={
              <div>
                <div style={styles.uploadIcon}>
                  <i className="fas fa-cloud-arrow-up"></i>
                </div>
                <div style={styles.uploadText}>Click to upload your manuscript</div>
                <div style={styles.uploadHint}>PDF only, max 20 MB. Ensure all figures and tables are embedded or attached separately.</div>
                {uploading === 'main_manuscript' && (
                  <div style={{ ...styles.uploadHint, color: 'var(--color-info, #2E6B9E)', marginTop: '8px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                    Uploading manuscript...
                  </div>
                )}
              </div>
            }
          />
        )}
      </FormField>
      
      <FormField label="Supplementary Files (optional)" helperText="ZIP, XLSX, CSV, or individual image files.">
        {suppFiles.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {suppFiles.map((f, i) => (
              <div key={i} style={styles.fileItem}>
                <div style={{ 
                  ...styles.fileItemIcon, 
                  background: getFileIcon(f.original_name).bg,
                  color: getFileIcon(f.original_name).color,
                }}>
                  <i className={`fas ${getFileIcon(f.original_name).icon}`}></i>
                </div>
                <div style={styles.fileItemInfo}>
                  <div style={styles.fileItemName}>{f.original_name}</div>
                  <div style={styles.fileItemMeta}>
                    {(f.file_size_bytes / 1024 / 1024).toFixed(1)} MB — Uploaded
                  </div>
                </div>
                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '13px', marginRight: '8px' }}>
                  <i className="fas fa-check-circle"></i>
                </span>
                <button
                  type="button"
                  onClick={() => handleFileRemove(f.id)}
                  disabled={removing === f.id}
                  style={{
                    background: 'rgba(184, 51, 51, 0.08)',
                    border: '1px solid rgba(184, 51, 51, 0.3)',
                    color: 'var(--color-danger)',
                    cursor: removing === f.id ? 'not-allowed' : 'pointer',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: removing === f.id ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  {removing === f.id ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-trash-can"></i>
                  )}
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <FileUpload
          accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.zip"
          multiple
          onFileSelect={(files) => {
            if (Array.isArray(files)) {
              files.forEach((f) => handleFileSelect(f, 'supplementary'))
            }
          }}
          label={
            <div>
              <div style={styles.uploadIcon}>
                <i className="fas fa-paperclip"></i>
              </div>
              <div style={styles.uploadText}>Click to upload supplementary files</div>
              <div style={styles.uploadHint}>ZIP, XLSX, CSV, images. Multiple files can be uploaded.</div>
              {uploading === 'supplementary' && (
                <div style={{ ...styles.uploadHint, color: 'var(--color-info, #2E6B9E)', marginTop: '8px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                  Uploading files...
                </div>
              )}
            </div>
          }
        />
      </FormField>
    </div>
  )
}

// Step 4: Metadata & Declarations
function StepMetadata({ manuscript, onChange, errors }) {
  const handleChange = (field, value) => {
    onChange({ ...manuscript, [field]: value })
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Metadata and Declarations</h2>
      
      <FormField label="Conflict of Interest" required error={errors.conflict_of_interest}>
        <textarea
          value={manuscript.conflict_of_interest || ''}
          onChange={(e) => handleChange('conflict_of_interest', e.target.value)}
          placeholder="Declare any financial, personal, or professional conflicts of interest. Write 'None declared' if none apply."
          style={styles.textarea}
        />
      </FormField>
      
      <FormField label="Ethics Approval" required error={errors.ethics_approval}>
        <textarea
          value={manuscript.ethics_approval || ''}
          onChange={(e) => handleChange('ethics_approval', e.target.value)}
          placeholder="If your research involves human or animal subjects, provide the ethics committee name and reference number. If not applicable, state 'Not applicable.'"
          style={styles.textarea}
        />
      </FormField>
      
      <FormField label="Funding Information" helperText="List all funding sources with grant numbers.">
        <textarea
          value={manuscript.funding || ''}
          onChange={(e) => handleChange('funding', e.target.value)}
          placeholder="List all funding sources with grant numbers. Write 'No external funding' if none."
          style={{ ...styles.textarea, minHeight: '60px' }}
        />
      </FormField>
      
      <FormField label="Acknowledgements">
        <textarea
          value={manuscript.acknowledgements || ''}
          onChange={(e) => handleChange('acknowledgements', e.target.value)}
          placeholder="Acknowledge anyone who contributed but does not qualify for authorship."
          style={{ ...styles.textarea, minHeight: '60px' }}
        />
      </FormField>
      
      <FormField label="Data Availability Statement">
        <textarea
          value={manuscript.data_availability || ''}
          onChange={(e) => handleChange('data_availability', e.target.value)}
          placeholder="Describe where the data/code used in this study can be accessed."
          style={{ ...styles.textarea, minHeight: '60px' }}
        />
      </FormField>
    </div>
  )
}

// Step 5: Review
function StepReview({ manuscript }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Review Your Submission</h2>
      
      <div style={{ ...styles.alertBanner, ...styles.alertInfo }}>
        <i className="fas fa-info-circle" style={{ marginTop: '2px' }}></i>
        <div>Review all information below before submitting. You can still go back to make changes.</div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Title</div>
        <div>{manuscript.title || <span style={{ color: 'var(--color-text-muted)' }}>Not provided yet</span>}</div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Abstract</div>
        <div>{manuscript.abstract || <span style={{ color: 'var(--color-text-muted)' }}>Not provided yet</span>}</div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Article Type</div>
        <div>{manuscript.category || <span style={{ color: 'var(--color-text-muted)' }}>Not selected</span>}</div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Subject</div>
        <div>{manuscript.subject || <span style={{ color: 'var(--color-text-muted)' }}>Not selected</span>}</div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Keywords</div>
        <div>
          {(manuscript.keywords || []).length > 0
            ? manuscript.keywords.join(', ')
            : <span style={{ color: 'var(--color-text-muted)' }}>Not provided</span>}
        </div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Authors</div>
        <div>
          {(manuscript.authors || []).length > 0 ? (
            manuscript.authors.map((a, i) => (
              <div key={a.id || i} style={{ marginBottom: '4px' }}>
                {a.name || a.email}
                {a.is_corresponding && (
                  <span style={{ color: 'var(--color-success)', marginLeft: '8px', fontSize: '12px', fontWeight: 600 }}>
                    (Corresponding)
                  </span>
                )}
              </div>
            ))
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>No co-authors</span>
          )}
        </div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Files</div>
        <div>
          {(manuscript.files || []).length > 0 ? (
            manuscript.files.map((f, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                {f.original_name}
                <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px', fontSize: '12px' }}>
                  ({f.file_type?.replace(/_/g, ' ')})
                </span>
              </div>
            ))
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>No files uploaded</span>
          )}
        </div>
      </div>
      
      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Declarations</div>
        <div>
          {manuscript.conflict_of_interest ? 'Completed' : <span style={{ color: 'var(--color-text-muted)' }}>Not completed</span>}
        </div>
      </div>
      
      <div style={{ ...styles.alertBanner, ...styles.alertWarning }}>
        <i className="fas fa-exclamation-triangle" style={{ marginTop: '2px' }}></i>
        <div>
          <strong>Validation warnings:</strong> Several required fields may be incomplete. Please go back to the relevant steps and fill in all required information before submitting.
        </div>
      </div>
    </div>
  )
}

// Step 6: Submit
function StepSubmit({ manuscript, declarations, onDeclarationChange, onSubmit, submitting, errors }) {
  const allChecked = declarations.originality && declarations.ethics && declarations.conflicts && declarations.authorship

  return (
    <div>
      <h2 style={styles.sectionTitle}>Submit Manuscript</h2>
      
      <div style={styles.submitContainer}>
        <div style={styles.submitIcon}>
          <i className="fas fa-paper-plane"></i>
        </div>
        <div style={styles.submitTitle}>Ready to Submit</div>
        <p style={styles.submitDesc}>
          By submitting, you confirm that this manuscript is original, has not been published elsewhere, and all authors have approved the submission and order.
        </p>
        
        <div style={{ ...styles.alertBanner, ...styles.alertInfo, textAlign: 'left', maxWidth: '500px', margin: '0 auto 24px' }}>
          <i className="fas fa-shield-halved" style={{ marginTop: '2px' }}></i>
          <div>
            <strong>Declaration:</strong> I confirm this manuscript is original work, all authors have approved this submission, and I accept the journal's submission policies and terms.
          </div>
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>
          <input
            type="checkbox"
            style={styles.checkboxInput}
            checked={allChecked}
            onChange={(e) => {
              const checked = e.target.checked
              onDeclarationChange({
                originality: checked,
                ethics: checked,
                conflicts: checked,
                authorship: checked,
              })
            }}
          />
          I confirm the above declaration
        </label>
        
        {errors.submit && (
          <div style={{ ...styles.alertBanner, ...styles.alertDanger, maxWidth: '500px', margin: '0 auto 16px' }}>
            <i className="fas fa-triangle-exclamation"></i>
            <div>{errors.submit}</div>
          </div>
        )}
        
        <Button
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!allChecked}
          onClick={onSubmit}
        >
          <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i>
          Submit Manuscript
        </Button>
      </div>
    </div>
  )
}

// Main Wizard Component
export default function SubmissionWizard() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [manuscript, setManuscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [declarations, setDeclarations] = useState({
    originality: false,
    ethics: false,
    conflicts: false,
    authorship: false,
  })

  useEffect(() => {
    if (id) {
      getManuscript(id)
        .then((data) => {
          setManuscript(data)
          if (data.current_status && data.current_status !== 'draft') {
            navigate(`/author/manuscripts/${id}`)
          }
        })
        .catch(() => navigate('/author'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    if (!id) {
      const createNewDraft = async () => {
        try {
          const draft = await createDraft()
          setManuscript(draft)
          navigate(`/author/submit/${draft.id}`, { replace: true })
        } catch {
          navigate('/author')
        }
      }
      createNewDraft()
    }
  }, [id, navigate])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stepParam = parseInt(params.get('step'), 10)
    if (!isNaN(stepParam) && stepParam >= 0 && stepParam < STEPS.length) {
      setStep(stepParam)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('step', step.toString())
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [step])

  useEffect(() => {
    if (!manuscript?.id || step === 0) return
    const timeout = setTimeout(() => {
      updateManuscript(manuscript.id, {
        title: manuscript.title,
        abstract: manuscript.abstract,
        keywords: manuscript.keywords,
        category: manuscript.category,
        subject: manuscript.subject,
        conflict_of_interest: manuscript.conflict_of_interest,
        ethics_approval: manuscript.ethics_approval,
        funding: manuscript.funding,
        acknowledgements: manuscript.acknowledgements,
        data_availability: manuscript.data_availability,
      }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timeout)
  }, [
    manuscript?.id, step, 
    manuscript?.title, manuscript?.abstract, manuscript?.keywords, 
    manuscript?.category, manuscript?.subject,
    manuscript?.conflict_of_interest, manuscript?.ethics_approval,
    manuscript?.funding, manuscript?.acknowledgements, manuscript?.data_availability,
  ])

  const validateStep = useCallback(() => {
    const newErrors = {}
    
    if (step === 1) {
      if (!manuscript?.title?.trim()) newErrors.title = 'Title is required'
      if (!manuscript?.abstract?.trim()) newErrors.abstract = 'Abstract is required'
      if (!manuscript?.category) newErrors.category = 'Category is required'
      if (!manuscript?.subject) newErrors.subject = 'Subject is required'
    }
    
    if (step === 3) {
      const hasMain = (manuscript?.files || []).some((f) => f.file_type === 'main_manuscript')
      if (!hasMain) newErrors.main_manuscript = 'Main manuscript file is required'
    }
    
    if (step === 4) {
      if (!manuscript?.conflict_of_interest?.trim()) newErrors.conflict_of_interest = 'Conflict of interest statement is required'
      if (!manuscript?.ethics_approval?.trim()) newErrors.ethics_approval = 'Ethics approval statement is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, manuscript])

  const handleSave = async () => {
    if (!manuscript?.id) return
    setSaving(true)
    try {
      await updateManuscript(manuscript.id, {
        title: manuscript.title || '',
        abstract: manuscript.abstract || '',
        keywords: manuscript.keywords || [],
        category: manuscript.category || '',
        subject: manuscript.subject || '',
        conflict_of_interest: manuscript.conflict_of_interest || '',
        ethics_approval: manuscript.ethics_approval || '',
        funding: manuscript.funding || '',
        acknowledgements: manuscript.acknowledgements || '',
        data_availability: manuscript.data_availability || '',
      })
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    if (!validateStep()) return
    if (manuscript?.id && step > 0) {
      await handleSave()
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleStepClick = (index) => {
    if (index < step) setStep(index)
  }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    try {
      await handleSave()
      await submitManuscript(manuscript.id)
      navigate(`/author/manuscripts/${manuscript.id}`)
    } catch (err) {
      setErrors({ ...errors, submit: err.response?.data?.error || 'Failed to submit manuscript' })
      setSubmitting(false)
    }
  }

  const handleManuscriptChange = (updated) => {
    setManuscript(updated)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px 0' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
        <div>Loading submission wizard...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: 'var(--color-ink-navy)', marginBottom: '4px' }}>
          New Submission
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Submit a new manuscript for peer review — progress is saved automatically
        </p>
      </div>
      
      {/* Wizard Progress */}
      <div style={styles.wizardProgress}>
        {STEPS.map((s, i) => (
          <div key={s.key} style={styles.wizardStep}>
            <div
              style={styles.wizardNum(i === step, i < step)}
              onClick={() => handleStepClick(i)}
            >
              {i < step ? <i className="fas fa-check" style={{ fontSize: '12px' }}></i> : i + 1}
            </div>
            <div style={styles.wizardStepLabel(i === step, i < step)}>{s.label}</div>
            {i < STEPS.length - 1 && (
              <div style={styles.wizardLine(i < step)}></div>
            )}
          </div>
        ))}
      </div>
      
      {/* Card with Content */}
      <div style={styles.card}>
        <div style={styles.cardBody}>
          {step === 0 && (
            <StepBasic
              manuscript={manuscript || {}}
              onChange={handleManuscriptChange}
              errors={errors}
            />
          )}
          {step === 1 && (
            <StepAuthors
              manuscript={manuscript || {}}
              onChange={handleManuscriptChange}
            />
          )}
          {step === 2 && (
            <StepFiles
              manuscript={manuscript || {}}
              onChange={handleManuscriptChange}
              errors={errors}
            />
          )}
          {step === 3 && (
            <StepMetadata
              manuscript={manuscript || {}}
              onChange={handleManuscriptChange}
              errors={errors}
            />
          )}
          {step === 4 && (
            <StepReview manuscript={manuscript || {}} />
          )}
          {step === 5 && (
            <StepSubmit
              manuscript={manuscript || {}}
              declarations={declarations}
              onDeclarationChange={setDeclarations}
              onSubmit={handleSubmit}
              submitting={submitting}
              errors={errors}
            />
          )}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div style={styles.navButtons}>
        <Button variant="ghost" onClick={handlePrev} disabled={step === 0}>
          <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
          Previous
        </Button>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saving && (
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
              Saving...
            </span>
          )}
          <Button variant="secondary" onClick={handleSave}>
            <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
            Save Draft
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={handleNext}>
              Next Step
              <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }}></i>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}