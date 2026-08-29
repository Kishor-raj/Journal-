import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getManuscript, submitCheck } from '../../services/moderationService'
import { getFileAccess } from '../../services/fileService'

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKLIST DEFINITION  (mirrors moderator.html)
   ═══════════════════════════════════════════════════════════════════════════ */
const SECTIONS = [
  {
    id: 'scope',
    icon: 'fa-bullseye',
    title: '1. Scope Assessment',
    type: 'radio',   // radio: pass / fail / clarify
    notePlaceholder: 'Add a note about the scope assessment (e.g., which areas of scope are relevant, any borderline aspects)...',
  },
  {
    id: 'completeness',
    icon: 'fa-list-check',
    title: '2. Completeness Check',
    type: 'checks',
    items: [
      'Title page with all author details, affiliations, and corresponding author',
      'Abstract (structured, within word limit)',
      'Keywords (3–6 provided)',
      'References formatted according to journal style',
      'All required supplementary files and figures included',
    ],
    notePlaceholder: 'Note any missing components not listed above...',
  },
  {
    id: 'formatting',
    icon: 'fa-text-height',
    title: '3. Formatting Check',
    type: 'checks',
    items: [
      'Manuscript follows journal template (margins, font, spacing, headings)',
      'Figures and tables are numbered, captioned, and referenced in text',
      'File format is correct (PDF, acceptable resolution for images)',
      'Word count within allowed range for article type',
    ],
    notePlaceholder: 'Note any formatting issues with specific page/section references...',
  },
  {
    id: 'ethics',
    icon: 'fa-scale-balanced',
    title: '4. Publication Ethics',
    type: 'checks',
    items: [
      'Conflict of interest declaration provided (all authors)',
      'Ethics approval statement included (for human/animal studies)',
      'Funding information and acknowledgements declared',
    ],
    notePlaceholder: 'Note any ethics concerns, missing declarations, or suspicious content...',
    noteWarning: 'Any ethics concerns must be documented here, even if the manuscript is approved.',
  },
  {
    id: 'plagiarism',
    icon: 'fa-fingerprint',
    title: '5. Plagiarism Check',
    type: 'plagiarism',
    items: [
      'Similarity score is within acceptable threshold (typically <20%)',
      'No evidence of self-plagiarism from authors\u2019 prior work',
    ],
    notePlaceholder: 'Notes on matched sources, patterns of concern, or reviewer-facing observations...',
  },
  {
    id: 'anonymization',
    icon: 'fa-user-secret',
    title: '6. Anonymization (Double-Blind)',
    type: 'checks',
    items: [
      'Author names, affiliations, and contact details removed from manuscript body',
      'Self-identifying references removed or anonymized (e.g., "Author, 2024")',
      'File metadata (PDF properties, author tags) does not contain identifying information',
    ],
    notePlaceholder: 'List any identifying information found and its location in the manuscript...',
    noteWarning: 'Any identifying information found must be listed. Return the manuscript for correction.',
    infoBanner: 'This journal uses double-blind review. Verify that no identifying information is present in the manuscript file, metadata, or supplementary materials.',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   INITIAL FORM STATE
   ═══════════════════════════════════════════════════════════════════════════ */
function buildInitialState() {
  const state = { plagiarism_score: '', plagiarism_report: '' }
  SECTIONS.forEach(s => {
    if (s.type === 'radio') {
      state[`${s.id}_radio`] = ''  // 'pass' | 'fail' | 'clarify'
    }
    if (s.type === 'checks' || s.type === 'plagiarism') {
      s.items?.forEach((_, i) => { state[`${s.id}_check_${i}`] = false })
    }
    state[`${s.id}_note`] = ''
  })
  return state
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS CALCULATION
   ═══════════════════════════════════════════════════════════════════════════ */
function calcProgress(form) {
  let done = 0, total = 0
  SECTIONS.forEach(s => {
    if (s.type === 'radio') {
      total += 1
      if (form[`${s.id}_radio`]) done += 1
    } else {
      s.items?.forEach((_, i) => {
        total += 1
        if (form[`${s.id}_check_${i}`]) done += 1
      })
    }
  })
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS RING SVG
   ═══════════════════════════════════════════════════════════════════════════ */
function ProgressRing({ pct }) {
  const r = 22, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct === 100 ? '#2B7A4B' : pct >= 50 ? '#C48B1E' : '#2E6B9E'
  return (
    <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="#E2E4E8" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }} />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLAPSIBLE SECTION
   ═══════════════════════════════════════════════════════════════════════════ */
function ChecklistSection({ section, form, update }) {
  const [open, setOpen] = useState(true)

  // Badge: how many items checked / radio selected
  const badge = useMemo(() => {
    if (section.type === 'radio') {
      return form[`${section.id}_radio`] ? 'Complete' : 'Incomplete'
    }
    const total = section.items?.length ?? 0
    const done = section.items?.filter((_, i) => form[`${section.id}_check_${i}`]).length ?? 0
    return `${done}/${total}`
  }, [form, section])

  const isComplete = section.type === 'radio'
    ? !!form[`${section.id}_radio`]
    : section.items?.every((_, i) => form[`${section.id}_check_${i}`])

  const badgeStyle = isComplete
    ? { bg: '#E8F5EC', color: '#2B7A4B' }
    : { bg: '#F4F5F7', color: '#8B8F9A' }

  return (
    <div style={{ border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer', background: open ? '#fff' : '#FAFAFA', userSelect: 'none' }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`fas ${section.icon}`} style={{ fontSize: '13px', color: '#1B2A4A', width: '16px', textAlign: 'center' }} />
          {section.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: badgeStyle.bg, color: badgeStyle.color }}>
            {badge}
          </span>
          <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '11px', color: '#8B8F9A', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #F4F5F7', background: '#fff' }}>

          {/* Info banner (anonymization) */}
          {section.infoBanner && (
            <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '6px', background: '#EBF4FB', border: '1px solid #A8CCE8', fontSize: '13px', color: '#2E6B9E', margin: '14px 0 10px' }}>
              <i className="fas fa-info-circle" style={{ marginTop: '1px', flexShrink: 0 }} />
              <span>{section.infoBanner}</span>
            </div>
          )}

          {/* Radio buttons (scope) */}
          {section.type === 'radio' && (
            <div style={{ margin: '14px 0 10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#5A5E6B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Does this manuscript fall within the journal's scope?
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { val: 'pass',    label: 'Pass',               icon: 'fa-check',    bg: '#E8F5EC', color: '#2B7A4B', border: '#2B7A4B' },
                  { val: 'fail',    label: 'Fail',               icon: 'fa-xmark',    bg: '#FCECEC', color: '#B83333', border: '#B83333' },
                  { val: 'clarify', label: 'Needs Clarification', icon: 'fa-question', bg: '#FEF7E8', color: '#C48B1E', border: '#C48B1E' },
                ].map(opt => {
                  const sel = form[`${section.id}_radio`] === opt.val
                  return (
                    <label key={opt.val} onClick={() => update(`${section.id}_radio`, opt.val)}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '6px', border: `1px solid ${sel ? opt.border : '#E2E4E8'}`, background: sel ? opt.bg : '#FAFAFA', color: sel ? opt.color : '#5A5E6B', cursor: 'pointer', fontSize: '13px', fontWeight: sel ? 600 : 400, transition: 'all 150ms' }}>
                      <i className={`fas ${opt.icon}`} style={{ fontSize: '11px' }} />
                      {opt.label}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Plagiarism score + report fields */}
          {section.type === 'plagiarism' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 0 10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#5A5E6B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Similarity Score (%)
                </label>
                <input
                  type="number" min="0" max="100"
                  placeholder="e.g. 12"
                  value={form.plagiarism_score}
                  onChange={e => update('plagiarism_score', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = '#C4922E' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E4E8' }}
                />
                <div style={{ fontSize: '11px', color: '#8B8F9A', marginTop: '4px' }}>From Turnitin, iThenticate, or equivalent tool</div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#5A5E6B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Report Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turnitin Report ID or file name"
                  value={form.plagiarism_report}
                  onChange={e => update('plagiarism_report', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = '#C4922E' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E4E8' }}
                />
              </div>
            </div>
          )}

          {/* Checkboxes */}
          {(section.type === 'checks' || section.type === 'plagiarism') && section.items?.map((item, i) => (
            <label key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #F4F5F7', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!form[`${section.id}_check_${i}`]}
                onChange={e => update(`${section.id}_check_${i}`, e.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0, accentColor: '#1B2A4A', width: '15px', height: '15px' }}
              />
              <span style={{ fontSize: '13px', color: '#1A1A2E', lineHeight: 1.5 }}>{item}</span>
            </label>
          ))}

          {/* Per-section note textarea */}
          <div style={{ marginTop: '12px' }}>
            {section.noteWarning && (
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#C48B1E', marginBottom: '6px', alignItems: 'flex-start' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>{section.noteWarning}</span>
              </div>
            )}
            <textarea
              value={form[`${section.id}_note`]}
              onChange={e => update(`${section.id}_note`, e.target.value)}
              placeholder={section.notePlaceholder}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px',
                border: `1px solid ${section.noteWarning ? '#F0DCA0' : '#E2E4E8'}`,
                background: section.noteWarning ? '#FEF7E8' : '#FAFAFA',
                borderRadius: '6px', fontSize: '13px',
                fontFamily: "'DM Sans', sans-serif",
                resize: 'vertical', outline: 'none', color: '#1A1A2E',
              }}
              onFocus={e => { e.target.style.borderColor = '#C4922E' }}
              onBlur={e => { e.target.style.borderColor = section.noteWarning ? '#F0DCA0' : '#E2E4E8' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DECISION MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function DecisionModal({ type, onClose, onConfirm, submitting }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes]   = useState('')

  const cfg = {
    approve: {
      title: 'Approve Manuscript',
      icon: 'fa-circle-check',
      color: '#2B7A4B',
      banner: { bg: '#E8F5EC', border: '#B8DCC8', color: '#2B7A4B', icon: 'fa-circle-check', text: 'Approving this manuscript will forward it to an editor for peer review assignment. The author will be notified that their submission has passed initial screening.' },
      confirmLabel: 'Confirm Approval',
      confirmBg: '#2B7A4B',
    },
    return: {
      title: 'Return to Author',
      icon: 'fa-rotate-left',
      color: '#C48B1E',
      banner: { bg: '#FEF7E8', border: '#F0DCA0', color: '#C48B1E', icon: 'fa-rotate-left', text: 'The manuscript will be returned to the author with your instructions. The author can resubmit after making corrections.' },
      confirmLabel: 'Return to Author',
      confirmBg: '#C48B1E',
      needsReason: true,
      reasons: ['Incomplete manuscript components', 'Formatting issues', 'Missing ethics declarations', 'Anonymization not complete', 'Other'],
    },
    reject: {
      title: 'Reject Manuscript',
      icon: 'fa-circle-xmark',
      color: '#B83333',
      banner: { bg: '#FCECEC', border: '#E8B8B8', color: '#B83333', icon: 'fa-triangle-exclamation', text: 'Rejecting this manuscript will desk-reject it without peer review. This action cannot be easily undone. The author will be notified with your explanation.' },
      confirmLabel: 'Reject Manuscript',
      confirmBg: '#B83333',
      needsReason: true,
      reasons: ['Out of scope', 'Does not meet minimum quality standards', 'Serious ethics concerns', 'Duplicate submission', 'Other'],
    },
  }[type]

  if (!cfg) return null

  const canConfirm = !cfg.needsReason || (reason && notes.trim())

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(27,42,74,0.25)', overflow: 'hidden' }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E4E8' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Playfair Display', serif" }}>
            <i className={`fas ${cfg.icon}`} style={{ color: cfg.color }} />{cfg.title}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8F9A', fontSize: '18px', padding: '2px', display: 'flex' }}>
            <i className="fas fa-xmark" />
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Banner */}
          <div style={{ display: 'flex', gap: '10px', padding: '13px 16px', borderRadius: '6px', background: cfg.banner.bg, border: `1px solid ${cfg.banner.border}`, fontSize: '13px', color: cfg.banner.color, lineHeight: 1.55 }}>
            <i className={`fas ${cfg.banner.icon}`} style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>{cfg.banner.text}</span>
          </div>

          {/* Reason select (return/reject) */}
          {cfg.needsReason && (
            <>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#5A5E6B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Reason <span style={{ color: '#B83333' }}>*</span>
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', outline: 'none', background: '#FAFAFA' }}
                >
                  <option value="">Select reason...</option>
                  {cfg.reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#5A5E6B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                  Notes to Author <span style={{ color: '#B83333' }}>*</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Explain clearly what needs to be corrected or why the manuscript is being rejected..."
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E4E8', borderRadius: '6px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', outline: 'none', color: '#1A1A2E' }}
                  onFocus={e => { e.target.style.borderColor = '#C4922E' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E4E8' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Modal footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px', borderTop: '1px solid #E2E4E8' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', border: '1px solid #E2E4E8', borderRadius: '6px', background: '#fff', color: '#5A5E6B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Cancel
          </button>
          <ConfirmBtn
            disabled={!canConfirm || submitting}
            submitting={submitting}
            bg={cfg.confirmBg}
            icon={cfg.icon}
            label={cfg.confirmLabel}
            onClick={() => onConfirm({ reason, notes_to_author: notes })}
          />
        </div>
      </div>
    </div>
  )
}

function ConfirmBtn({ disabled, submitting, bg, icon, label, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: '8px 18px', border: 'none', borderRadius: '6px',
        background: disabled ? '#E2E4E8' : (h ? `${bg}dd` : bg),
        color: disabled ? '#8B8F9A' : '#fff',
        fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'background 150ms',
      }}
    >
      <i className={`fas ${submitting ? 'fa-spinner fa-spin' : icon}`} style={{ fontSize: '12px' }} />
      {label}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ChecklistForm() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [manuscript, setManuscript] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fileError, setFileError]   = useState('')
  const [modal, setModal]           = useState(null)  // 'approve' | 'return' | 'reject'
  const [form, setForm]             = useState(buildInitialState)

  useEffect(() => {
    getManuscript(id)
      .then(setManuscript)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const { done, total, pct } = useMemo(() => calcProgress(form), [form])
  const allComplete = done === total && total > 0

  async function openFile(fileId, type) {
    try {
      const access = await getFileAccess(fileId)
      window.open(access[type], '_blank', 'noopener,noreferrer')
    } catch {
      setFileError('This file is currently unavailable.')
    }
  }

  async function handleDecision(type, extra = {}) {
    setSubmitting(true)
    try {
      // Build checklist object for API
      const checklist = {}
      SECTIONS.forEach(s => {
        if (s.type === 'radio') {
          checklist[s.id] = form[`${s.id}_radio`]
        } else {
          checklist[s.id] = s.items?.map((_, i) => form[`${s.id}_check_${i}`]) ?? []
        }
        checklist[`${s.id}_note`] = form[`${s.id}_note`]
      })

      await submitCheck(id, {
        checklist,
        plagiarism_score:   form.plagiarism_score ? Number(form.plagiarism_score) : null,
        plagiarism_report:  form.plagiarism_report || null,
        ethics_check_status: form.ethics_radio || 'pending',
        files_valid: true,
        decision: type === 'approve' ? 'proceed' : type,
        notes: Object.entries(checklist).filter(([k]) => k.endsWith('_note')).map(([, v]) => v).filter(Boolean).join('\n---\n') || null,
        notes_to_author: extra.notes_to_author || null,
      })
      navigate('/moderator/screening')
    } catch {
      setSubmitting(false)
    }
  }

  /* ── Loading / not found ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', color: '#8B8F9A' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px', display: 'block' }} />
        Loading manuscript…
      </div>
    )
  }

  if (!manuscript) {
    return (
      <div style={{ padding: '40px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ padding: '20px', background: '#FCECEC', border: '1px solid #E8B8B8', borderRadius: '8px', color: '#B83333', fontSize: '14px' }}>
          <i className="fas fa-triangle-exclamation" style={{ marginRight: '8px' }} />
          Manuscript not found or not available for screening.
        </div>
      </div>
    )
  }

  const author = manuscript.authors?.[0]
  const firstAuthor = author
    ? [author.first_name, author.last_name].filter(Boolean).join(' ').trim() || '—'
    : '—'
  const submittedAt = manuscript.submitted_at
    ? new Date(manuscript.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div style={{ padding: '24px 40px 100px', maxWidth: '960px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Back + header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/moderator/screening')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5E6B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0, marginBottom: '14px', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1B2A4A' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5A5E6B' }}
        >
          <i className="fas fa-arrow-left" style={{ fontSize: '12px' }} /> Back to Queue
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
                {manuscript.submission_number || 'Screening'}
              </h1>
              <StatusBadgeInline status={manuscript.current_status} />
            </div>
            <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>{manuscript.title || 'Untitled'}</p>
          </div>
          {manuscript.files?.length > 0 && (
            <DownloadBtn onClick={() => openFile(manuscript.files[0].id, 'download_url')} />
          )}
        </div>
      </div>

      {/* ── Manuscript info bar ────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', padding: '14px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', fontSize: '13px' }}>
          {[
            { label: 'Author',       value: firstAuthor },
            { label: 'Article Type', value: manuscript.article_type ?? manuscript.category_name ?? '—' },
            { label: 'Submitted',    value: submittedAt },
            { label: 'Journal',      value: manuscript.journal_name ?? '—' },
            { label: 'Files',        value: manuscript.files?.length ? `${manuscript.files.length} file${manuscript.files.length > 1 ? 's' : ''}` : 'None' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#8B8F9A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{f.label}</div>
              <div style={{ fontWeight: 600, color: '#1A1A2E' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Files ──────────────────────────────────────────────────────── */}
      {manuscript.files?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E4E8', fontSize: '13px', fontWeight: 700, color: '#1A1A2E' }}>
            Submitted Files
          </div>
          {fileError && (
            <div style={{ padding: '10px 18px', background: '#FCECEC', fontSize: '13px', color: '#B83333' }}>
              <i className="fas fa-triangle-exclamation" style={{ marginRight: '6px' }} />{fileError}
            </div>
          )}
          {manuscript.files.map(file => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 18px', borderBottom: '1px solid #F4F5F7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1A1A2E', minWidth: 0 }}>
                <i className="fas fa-file-pdf" style={{ color: '#B83333', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.original_filename || file.file_type || 'File'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <SmallBtn onClick={() => openFile(file.id, 'view_url')} icon="fa-eye">View</SmallBtn>
                <SmallBtn onClick={() => openFile(file.id, 'download_url')} icon="fa-download" primary>Download</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Progress ring ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProgressRing pct={pct} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#1A1A2E' }}>
            {pct}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A2E', marginBottom: '2px' }}>Screening Progress</div>
          <div style={{ fontSize: '12px', color: '#8B8F9A' }}>
            {done} of {total} items completed{allComplete ? ' — Ready for decision' : ' — Continue screening below'}
          </div>
        </div>
      </div>

      {/* ── 6 Checklist sections ───────────────────────────────────────── */}
      {SECTIONS.map(section => (
        <ChecklistSection key={section.id} section={section} form={form} update={update} />
      ))}

      {/* ── Sticky decision bar ────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '2px solid #E2E4E8',
        padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        zIndex: 100, flexWrap: 'wrap',
        boxShadow: '0 -4px 20px rgba(27,42,74,0.08)',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: allComplete ? '#2B7A4B' : '#8B8F9A' }}>
          <i className={`fas ${allComplete ? 'fa-circle-check' : 'fa-circle-half-stroke'}`} style={{ marginRight: '6px' }} />
          {allComplete
            ? 'All checks complete — you may now submit a decision'
            : `${total - done} checklist item${total - done !== 1 ? 's' : ''} remaining`}
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <DecisionBarBtn
            disabled={!allComplete}
            bg="#2B7A4B" hoverBg="#246540"
            icon="fa-circle-check"
            label="Approve"
            onClick={() => setModal('approve')}
          />
          <DecisionBarBtn
            disabled={!allComplete}
            bg="#C48B1E" hoverBg="#A97618"
            icon="fa-rotate-left"
            label="Return to Author"
            onClick={() => setModal('return')}
          />
          <DecisionBarBtn
            disabled={!allComplete}
            bg="#B83333" hoverBg="#9A2B2B"
            icon="fa-circle-xmark"
            label="Reject"
            onClick={() => setModal('reject')}
          />
        </div>
      </div>

      {/* ── Decision modal ─────────────────────────────────────────────── */}
      {modal && (
        <DecisionModal
          type={modal}
          submitting={submitting}
          onClose={() => !submitting && setModal(null)}
          onConfirm={(extra) => handleDecision(modal, extra)}
        />
      )}
    </div>
  )
}

/* ─── Small helpers ──────────────────────────────────────────────────────── */
function StatusBadgeInline({ status }) {
  const map = {
    submitted:        { label: 'New',         bg: '#EBF4FB', color: '#2E6B9E' },
    under_moderation: { label: 'In Progress', bg: '#FEF7E8', color: '#C48B1E' },
  }
  const s = map[status] ?? { label: status?.replace(/_/g, ' ') ?? '', bg: '#F4F5F7', color: '#5A5E6B' }
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: s.bg, color: s.color }}>
      <i className="fas fa-circle" style={{ fontSize: '7px', marginRight: '5px' }} />{s.label}
    </span>
  )
}

function SmallBtn({ onClick, icon, children, primary }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: '5px 10px', borderRadius: '5px', border: `1px solid ${primary ? 'transparent' : '#E2E4E8'}`, background: primary ? (h ? '#2A3F6B' : '#1B2A4A') : (h ? '#F4F5F7' : '#fff'), color: primary ? '#fff' : '#5A5E6B', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'DM Sans', sans-serif", transition: 'background 150ms' }}>
      <i className={`fas ${icon}`} style={{ fontSize: '11px' }} />{children}
    </button>
  )
}

function DownloadBtn({ onClick }) {
  const [h, setH] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #E2E4E8', background: h ? '#F4F5F7' : '#fff', color: '#5A5E6B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', fontFamily: "'DM Sans', sans-serif", transition: 'background 150ms', whiteSpace: 'nowrap' }}>
      <i className="fas fa-download" style={{ fontSize: '12px' }} />Download Files
    </button>
  )
}

function DecisionBarBtn({ disabled, bg, hoverBg, icon, label, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: '9px 16px', borderRadius: '6px', border: 'none',
        background: disabled ? '#E2E4E8' : (h ? hoverBg : bg),
        color: disabled ? '#8B8F9A' : '#fff',
        fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '7px',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 150ms',
      }}
    >
      <i className={`fas ${icon}`} style={{ fontSize: '12px' }} />{label}
    </button>
  )
}
