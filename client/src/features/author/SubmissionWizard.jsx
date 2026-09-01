import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import FormField from '../../shared/components/FormField'
import Button from '../../shared/components/Button'
import FileUpload from '../../shared/components/FileUpload'
import './AuthorDashboard.css'
import {
  createDraft,
  getManuscript,
  updateManuscript,
  addAuthor,
  submitManuscript,
  requestSignature,
  confirmUpload,
} from './services/manuscriptService'

const STEPS = [
    { key: 'metadata', label: 'Metadata' },
  { key: 'authors', label: 'Authors' },
  { key: 'files', label: 'Files' },
  { key: 'review', label: 'Review' },
  { key: 'submit', label: 'Declarations' },
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

const styles = {
  page: {
    fontFamily: 'var(--font-body)',
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '40px',
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    top: '18px',
    left: '0',
    right: '0',
    height: '3px',
    background: 'var(--color-rule-grey)',
    zIndex: 0,
  },
  progressFill: {
    position: 'absolute',
    top: '18px',
    left: '0',
    height: '3px',
    background: 'var(--color-success)',
    zIndex: 1,
    transition: 'width 0.3s ease',
  },
  stepDot: (isActive, isCompleted) => ({
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--text-sm)',
    fontWeight: 700,
    fontFamily: 'var(--font-body)',
    position: 'relative',
    zIndex: 2,
    background: isCompleted
      ? 'var(--color-success)'
      : isActive
        ? 'var(--color-citation-gold)'
        : 'var(--color-surface)',
    color: isCompleted
      ? 'var(--color-surface)'
      : isActive
        ? 'var(--color-ink-navy)'
        : 'var(--color-text-muted)',
    border: isCompleted
      ? '2px solid var(--color-success)'
      : isActive
        ? '2px solid var(--color-citation-gold)'
        : '2px solid var(--color-rule-grey)',
    cursor: isCompleted ? 'pointer' : 'default',
  }),
  stepLabel: (isActive) => ({
    fontSize: 'var(--text-xs)',
    color: isActive ? 'var(--color-citation-gold-dark)' : 'var(--color-text-muted)',
    fontWeight: isActive ? 600 : 400,
    marginTop: '8px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  }),
  stepContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--color-ink-navy)',
    marginBottom: '24px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    border: 'none',
    borderRadius: '0 0 5px 5px',
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-ink-black)',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    border: 'none',
    borderRadius: '0 0 5px 5px',
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-ink-black)',
    resize: 'vertical',
    minHeight: '120px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    border: 'none',
    borderRadius: '0 0 5px 5px',
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-ink-black)',
    boxSizing: 'border-box',
    appearance: 'none',
    cursor: 'pointer',
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: '1px solid var(--color-rule-grey)',
  },
  authorCard: {
    background: 'var(--color-vellum)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '12px',
  },
  authorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  authorName: {
    fontWeight: 600,
    color: 'var(--color-ink-navy)',
    fontSize: 'var(--text-base)',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    padding: '4px 8px',
  },
  dragHandle: {
    cursor: 'grab',
    color: 'var(--color-text-muted)',
    marginRight: '12px',
    fontSize: 'var(--text-lg)',
    userSelect: 'none',
  },
  tagInput: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 12px',
    minHeight: '40px',
    alignItems: 'center',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'var(--color-citation-gold)',
    color: 'var(--color-ink-navy)',
    borderRadius: '9999px',
    padding: '3px 10px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: 'var(--color-ink-navy)',
    cursor: 'pointer',
    padding: 0,
    marginLeft: '2px',
    fontSize: 'var(--text-sm)',
    fontWeight: 700,
  },
  tagInputField: {
    border: 'none',
    outline: 'none',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    flex: 1,
    minWidth: '120px',
    background: 'transparent',
    color: 'var(--color-ink-black)',
  },
  reviewSection: {
    marginBottom: '24px',
  },
  reviewLabel: {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '6px',
  },
  reviewValue: {
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.6,
  },
  checkbox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '20px',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    accentColor: 'var(--color-citation-gold)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: 'var(--text-base)',
    color: 'var(--color-ink-black)',
    lineHeight: 1.5,
    cursor: 'pointer',
  },
  errorBanner: {
    background: '#FDEDEC',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    marginBottom: '20px',
    color: 'var(--color-danger)',
    fontSize: 'var(--text-sm)',
  },
  emptyList: {
    padding: '32px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
    border: '1px dashed var(--color-rule-grey)',
    borderRadius: 'var(--radius-md)',
  },
  correspondingDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--color-citation-gold)',
    marginRight: '6px',
  },
}

const inputStyle = { ...styles.input }
const textareaStyle = { ...styles.textarea }
const selectStyle = { ...styles.select }

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
    <FormField label="Keywords" helperText="Press Enter or comma to add a keyword">
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
          placeholder={value.length === 0 ? 'Type and press Enter...' : ''}
          style={styles.tagInputField}
        />
      </div>
    </FormField>
  )
}

function StepMetadata({ manuscript, onChange, errors }) {
  const handleChange = (field, value) => {
    onChange({ ...manuscript, [field]: value })
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Manuscript Metadata</h2>
      <FormField label="Title" required error={errors.title}>
        <input
          type="text"
          value={manuscript.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter manuscript title"
          style={inputStyle}
        />
      </FormField>
      <FormField label="Abstract" required error={errors.abstract}>
        <textarea
          value={manuscript.abstract || ''}
          onChange={(e) => handleChange('abstract', e.target.value)}
          placeholder="Provide a brief summary of the manuscript"
          style={textareaStyle}
        />
      </FormField>
      <KeywordInput
        value={manuscript.keywords || []}
        onChange={(kw) => handleChange('keywords', kw)}
      />
      <FormField label="Category" required error={errors.category}>
        <select
          value={manuscript.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          style={selectStyle}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </FormField>
    </div>
  )
}

function StepAuthors({ manuscript, onChange }) {
  const { user } = useAuth()
  const authors = manuscript.authors || []
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Co-authors are all authors except the primary (logged-in user)
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

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (dragIndex === dropIndex) return
    const updated = [...coAuthors]
    const [dragged] = updated.splice(dragIndex, 1)
    updated.splice(dropIndex, 0, dragged)
    // Keep primary author record in the full list if present
    const primaryInList = authors.find(
      (a) => a.email?.toLowerCase() === user?.email?.toLowerCase()
    )
    onChange({ ...manuscript, authors: primaryInList ? [primaryInList, ...updated] : updated })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Authors</h2>

      {/* Primary Author — read-only */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Primary Author (You)
        </div>
        <div style={{ ...styles.authorCard, border: '1px solid var(--color-citation-gold)', background: 'rgba(196,146,46,0.06)' }}>
          <div style={styles.authorHeader}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={styles.authorName}>
                <span style={styles.correspondingDot} />
                {user?.display_name || user?.name || user?.email}
              </span>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-citation-gold)', fontWeight: 600, background: 'rgba(196,146,46,0.12)', padding: '3px 10px', borderRadius: '9999px' }}>
              Primary &amp; Corresponding
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{user?.email}</div>
        </div>
      </div>

      {/* Co-Author input */}
      <FormField label="Add Co-Author by Email">
        <div style={{ display: 'flex', gap: '8px', padding: '10px 14px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAuthor())}
            placeholder="colleague@university.edu"
            style={{ ...styles.tagInputField, flex: 1 }}
          />
          <Button variant="secondary" size="sm" onClick={handleAddAuthor} loading={adding}>
            Add
          </Button>
        </div>
        {emailError && (
          <div style={{ padding: '0 14px 10px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{emailError}</div>
        )}
      </FormField>

      {coAuthors.length === 0 ? (
        <div style={styles.emptyList}>
          No co-authors added yet. Add co-authors or proceed to the next step.
        </div>
      ) : (
        coAuthors.map((author, index) => (
          <div
            key={author.id}
            style={styles.authorCard}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragOver={handleDragOver}
          >
            <div style={styles.authorHeader}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={styles.dragHandle}>⠿</span>
                <span style={styles.authorName}>
                  {author.is_corresponding && <span style={styles.correspondingDot} />}
                  {author.name || author.email}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!author.is_corresponding && (
                  <button
                    style={{ ...styles.removeBtn, color: 'var(--color-citation-gold)' }}
                    onClick={() => handleSetCorresponding(author.id)}
                    type="button"
                  >
                    Set Corresponding
                  </button>
                )}
                <button
                  style={styles.removeBtn}
                  onClick={() => handleRemoveAuthor(author.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
            <FormField label="Contribution Role">
              <select
                value={author.contribution_role || ''}
                onChange={(e) => handleUpdateAuthor(author.id, 'contribution_role', e.target.value)}
                style={selectStyle}
              >
                <option value="">Select role</option>
                {CONTRIBUTION_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </FormField>
          </div>
        ))
      )}
    </div>
  )
}


function StepFiles({ manuscript, onChange, errors }) {
  const [uploading, setUploading] = useState(null)

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
      setUploading(null)
    } finally {
      setUploading(null)
    }
  }

  const mainFile = (manuscript.files || []).find((f) => f.file_type === 'main_manuscript')
  const coverFile = (manuscript.files || []).find((f) => f.file_type === 'cover_letter')
  const suppFiles = (manuscript.files || []).filter((f) => f.file_type === 'supplementary')

  return (
    <div>
      <h2 style={styles.sectionTitle}>File Upload</h2>

      <FormField label="Main Manuscript" required error={errors.main_manuscript} helperText="PDF format preferred">
        {mainFile ? (
          <div style={styles.fileItem}>
            <span style={styles.fileName}>{mainFile.original_name}</span>
            <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Uploaded ✓</span>
          </div>
        ) : (
          <FileUpload
            accept=".pdf,.doc,.docx"
            onFileSelect={(f) => handleFileSelect(f, 'main_manuscript')}
            label="Drag & drop your manuscript, or click to browse"
          />
        )}
      </FormField>

      <FormField label="Cover Letter" helperText="Optional">
        {coverFile ? (
          <div style={styles.fileItem}>
            <span style={styles.fileName}>{coverFile.original_name}</span>
            <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Uploaded ✓</span>
          </div>
        ) : (
          <FileUpload
            accept=".pdf,.doc,.docx,.txt"
            onFileSelect={(f) => handleFileSelect(f, 'cover_letter')}
            label="Drag & drop your cover letter, or click to browse"
          />
        )}
      </FormField>

      <FormField label="Supplementary Files" helperText="Optional — add figures, tables, data sets, etc.">
        {suppFiles.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {suppFiles.map((f, i) => (
              <div key={i} style={styles.fileItem}>
                <span style={styles.fileName}>{f.original_name}</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Uploaded ✓</span>
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
          label="Drag & drop supplementary files, or click to browse"
        />
      </FormField>
    </div>
  )
}

function StepReview({ manuscript }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Review Submission</h2>

      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Title</div>
        <div style={styles.reviewValue}>{manuscript.title || '—'}</div>
      </div>

      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Category</div>
        <div style={styles.reviewValue}>{manuscript.category || '—'}</div>
      </div>

      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Abstract</div>
        <div style={styles.reviewValue}>{manuscript.abstract || '—'}</div>
      </div>

      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Keywords</div>
        <div style={styles.reviewValue}>
          {(manuscript.keywords || []).length > 0
            ? manuscript.keywords.join(', ')
            : '—'}
        </div>
      </div>

      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Authors</div>
        {(manuscript.authors || []).length > 0 ? (
          manuscript.authors.map((a, i) => (
            <div key={a.id || i} style={{ marginBottom: '6px', ...styles.reviewValue }}>
              {a.name || a.email}
              {a.is_corresponding && (
                <span style={{ color: 'var(--color-citation-gold)', marginLeft: '8px', fontSize: 'var(--text-sm)' }}>
                  (Corresponding)
                </span>
              )}
              {a.contribution_role && (
                <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px', fontSize: 'var(--text-sm)' }}>
                  — {a.contribution_role}
                </span>
              )}
            </div>
          ))
        ) : (
          <div style={styles.reviewValue}>No co-authors</div>
        )}
      </div>

      <div style={styles.reviewSection}>
        <div style={styles.reviewLabel}>Files</div>
        {(manuscript.files || []).length > 0 ? (
          manuscript.files.map((f, i) => (
            <div key={i} style={{ marginBottom: '4px', ...styles.reviewValue }}>
              {f.original_name}
              <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px', fontSize: 'var(--text-sm)' }}>
                ({f.file_type?.replace(/_/g, ' ')})
              </span>
            </div>
          ))
        ) : (
          <div style={styles.reviewValue}>No files uploaded</div>
        )}
      </div>
    </div>
  )
}

function StepDeclarations({ declarations, onChange, errors }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Declarations</h2>
      {errors.declarations && (
        <div style={styles.errorBanner}>{errors.declarations}</div>
      )}

      <label style={styles.checkbox}>
        <input
          type="checkbox"
          style={styles.checkboxInput}
          checked={declarations.originality || false}
          onChange={(e) => onChange({ ...declarations, originality: e.target.checked })}
        />
        <span style={styles.checkboxLabel}>
          I confirm that this manuscript is original, has not been published elsewhere,
          and is not currently under consideration by another journal.
        </span>
      </label>

      <label style={styles.checkbox}>
        <input
          type="checkbox"
          style={styles.checkboxInput}
          checked={declarations.ethics || false}
          onChange={(e) => onChange({ ...declarations, ethics: e.target.checked })}
        />
        <span style={styles.checkboxLabel}>
          I confirm that all research involving human subjects or animals was conducted
          in accordance with relevant ethical guidelines and has received appropriate
          institutional approval where required.
        </span>
      </label>

      <label style={styles.checkbox}>
        <input
          type="checkbox"
          style={styles.checkboxInput}
          checked={declarations.conflicts || false}
          onChange={(e) => onChange({ ...declarations, conflicts: e.target.checked })}
        />
        <span style={styles.checkboxLabel}>
          I confirm that all authors have disclosed any potential conflicts of interest,
          and there are no financial or personal relationships that could inappropriately
          influence this work.
        </span>
      </label>

      <label style={styles.checkbox}>
        <input
          type="checkbox"
          style={styles.checkboxInput}
          checked={declarations.authorship || false}
          onChange={(e) => onChange({ ...declarations, authorship: e.target.checked })}
        />
        <span style={styles.checkboxLabel}>
          I confirm that all listed authors have contributed significantly to this work
          and have approved the final version of the manuscript.
        </span>
      </label>
    </div>
  )
}

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
      }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timeout)
  }, [manuscript?.id, step, manuscript?.title, manuscript?.abstract, manuscript?.keywords, manuscript?.category])

  const validateStep = useCallback(() => {
    const newErrors = {}
    if (step === 0) {
      if (!manuscript?.title?.trim()) newErrors.title = 'Title is required'
      if (!manuscript?.abstract?.trim()) newErrors.abstract = 'Abstract is required'
      if (!manuscript?.category) newErrors.category = 'Category is required'
    }
    if (step === 2) {
      const hasMain = (manuscript?.files || []).some((f) => f.file_type === 'main_manuscript')
      if (!hasMain) newErrors.main_manuscript = 'Main manuscript file is required'
    }
    if (step === 4) {
      const allChecked = declarations.originality && declarations.ethics && declarations.conflicts && declarations.authorship
      if (!allChecked) newErrors.declarations = 'All declarations must be confirmed before submitting'
      if (!manuscript?.authors || manuscript.authors.length === 0) {
        newErrors.submit = 'Manuscript must have at least one author'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, manuscript, declarations])

  const handleSave = async () => {
    if (!manuscript?.id) return
    setSaving(true)
    try {
      await updateManuscript(manuscript.id, {
        title: manuscript.title || '',
        abstract: manuscript.abstract || '',
        keywords: manuscript.keywords || '',
        category: manuscript.category || '',
      })
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    if (!validateStep()) return
    if (manuscript?.id) {
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
    <div className="content-area">
      <div className="page active" id="page-new-submission">
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">New Submission</h1>
              <p className="page-subtitle">Submit a new manuscript for peer review — progress is saved automatically</p>
            </div>
          </div>
        </div>

        <div className="wizard-progress" id="wizardProgress">
          {STEPS.map((s, i) => (
            <div key={s.key} className="wizard-step" onClick={() => handleStepClick(i)} style={{ cursor: i <= step ? 'pointer' : 'default' }}>
              <div className={`wizard-num ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? <i className="fas fa-check"></i> : i + 1}
              </div>
              <div className={`wizard-step-label ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`wizard-line ${i < step ? 'done' : ''}`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-body wizard-content" id="wizardContent">
            {step === 0 && (
              <StepMetadata manuscript={manuscript || {}} onChange={handleManuscriptChange} errors={errors} />
            )}
            {step === 1 && (
              <StepAuthors manuscript={manuscript || {}} onChange={handleManuscriptChange} />
            )}
            {step === 2 && (
              <StepFiles manuscript={manuscript || {}} onChange={handleManuscriptChange} errors={errors} />
            )}
            {step === 3 && (
              <StepReview manuscript={manuscript || {}} />
            )}
            {step === 4 && (
              <StepDeclarations declarations={declarations} onChange={setDeclarations} errors={errors} />
            )}
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-md)'}} id="wizardNav">
          <button className="btn btn-secondary" id="wizPrev" disabled={step === 0} onClick={handlePrev}>
            <i className="fas fa-arrow-left"></i> Previous
          </button>
          
          <div style={{display: 'flex', gap: '8px'}}>
            {errors.submit && (
              <span style={{color: 'var(--danger)', alignSelf: 'center', marginRight: '10px'}}>{errors.submit}</span>
            )}
            <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
              <i className="fas fa-save"></i> {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" id="wizNext" onClick={handleNext}>
                Next Step <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button className="btn btn-primary" id="wizNext" onClick={handleSubmit} disabled={submitting}>
                <i className="fas fa-paper-plane"></i> {submitting ? 'Submitting...' : 'Submit Manuscript'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}