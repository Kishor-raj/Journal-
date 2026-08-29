import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const QUICK_LINKS = [
  {
    icon: 'fa-plus-circle', iconColor: '#2E6B9E', iconBg: '#EBF4FB',
    title: 'How to Submit',
    desc: 'Step-by-step guide through the 6-step submission wizard',
    to: '/author/submit/new',
  },
  {
    icon: 'fa-rotate', iconColor: '#C48B1E', iconBg: '#FEF7E8',
    title: 'How to Revise',
    desc: 'Respond to revision requests with a cover letter and updated files',
    to: '/author/revisions',
  },
  {
    icon: 'fa-route', iconColor: '#7C3AED', iconBg: '#F3E8FF',
    title: 'Manuscript Lifecycle',
    desc: 'Understand the stages: Submit → Screen → Review → Decision → Revision',
    modal: 'lifecycle',
  },
  {
    icon: 'fa-users', iconColor: '#2B7A4B', iconBg: '#E8F5EC',
    title: 'Co-Author Access',
    desc: 'How linked co-authors can view manuscript status and files',
    modal: 'coauthor',
  },
  {
    icon: 'fa-file-lines', iconColor: '#2E6B9E', iconBg: '#EBF4FB',
    title: 'My Manuscripts',
    desc: 'View, track, and manage all your submitted and draft manuscripts',
    to: '/author/manuscripts',
  },
  {
    icon: 'fa-ban', iconColor: '#B83333', iconBg: '#FCECEC',
    title: 'Withdrawal Policy',
    desc: 'When and how to withdraw a manuscript from the review process',
    to: '/author/withdrawals',
  },
]

const FAQ = [
  {
    q: 'How long does the review process take?',
    a: 'Initial editorial assessment takes 5–10 business days. Full peer review typically takes 4–8 weeks depending on reviewer availability. You will receive email notifications at each stage.',
  },
  {
    q: 'Can I update my manuscript after submission?',
    a: 'Once submitted, manuscripts cannot be edited. If you need to make corrections before review begins, contact the editorial office. After a revision request, you can upload a revised version through the Revisions page.',
  },
  {
    q: 'How do I add a co-author?',
    a: 'Co-authors can be added during Step 2 of the submission wizard (Authors). After submission, contact the editorial office to make changes to the author list.',
  },
  {
    q: 'What file formats are accepted?',
    a: 'Manuscripts must be submitted as Microsoft Word (.docx) or LaTeX (.zip). Figures should be submitted as separate high-resolution files (TIFF, EPS, or PDF, minimum 300 dpi).',
  },
  {
    q: 'What happens after my manuscript is accepted?',
    a: 'You will receive an acceptance notification with instructions for the production stage. This includes proof review, copyright agreement signing, and scheduling for publication.',
  },
  {
    q: 'How do I withdraw a manuscript?',
    a: 'Go to the Withdrawals page from the sidebar. Note that withdrawing a manuscript under active review will cancel all reviewer assignments and notify the editor.',
  },
]

const LIFECYCLE_STEPS = [
  { icon: 'fa-paper-plane',    color: '#2E6B9E', bg: '#EBF4FB', label: 'Submitted',  desc: 'Manuscript received and assigned a submission number.' },
  { icon: 'fa-clipboard-check',color: '#7C3AED', bg: '#F3E8FF', label: 'Screening',  desc: 'Moderator checks formatting, scope, and ethics compliance.' },
  { icon: 'fa-magnifying-glass',color: '#C48B1E', bg: '#FEF7E8', label: 'Peer Review',desc: 'Assigned to 2–3 independent reviewers for double-blind review.' },
  { icon: 'fa-gavel',           color: '#1B2A4A', bg: '#E8ECF5', label: 'Decision',   desc: 'Editor issues Accept, Minor Revision, Major Revision, or Reject.' },
  { icon: 'fa-rotate',          color: '#C48B1E', bg: '#FEF7E8', label: 'Revision',   desc: 'Author responds to reviewer comments and resubmits.' },
  { icon: 'fa-circle-check',    color: '#2B7A4B', bg: '#E8F5EC', label: 'Accepted',   desc: 'Manuscript enters production for typesetting and publication.' },
]

const CONTACT_INFO = [
  { icon: 'fa-envelope',  label: 'General Inquiries', value: 'editorial@asgardpublications.com' },
  { icon: 'fa-headset',   label: 'Technical Support',  value: 'support@asgardpublications.com' },
  { icon: 'fa-clock',     label: 'Response Time',      value: '1–3 business days' },
  { icon: 'fa-calendar',  label: 'Office Hours',       value: 'Mon–Fri, 09:00–17:00 GMT' },
]

/* ─── QuickCard ─────────────────────────────────────────────────────────────── */
function QuickCard({ item, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? item.iconColor : '#E2E4E8'}`,
        borderRadius: '8px',
        padding: '28px 24px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'border-color 150ms, box-shadow 150ms',
        boxShadow: hovered ? '0 2px 8px rgba(27,42,74,0.08)' : 'none',
      }}
    >
      <div style={{
        width: '52px', height: '52px', borderRadius: '12px',
        background: item.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <i className={`fas ${item.icon}`} style={{ fontSize: '22px', color: item.iconColor }} />
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E', marginBottom: '6px' }}>{item.title}</div>
      <div style={{ fontSize: '13px', color: '#8B8F9A', lineHeight: 1.5 }}>{item.desc}</div>
    </div>
  )
}

/* ─── FAQItem ────────────────────────────────────────────────────────────────── */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E2E4E8' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', padding: '16px 20px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', lineHeight: 1.4 }}>{q}</span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '12px', color: '#8B8F9A', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '0 20px 16px', fontSize: '13px', color: '#5A5E6B', lineHeight: 1.65 }}>
          {a}
        </div>
      )}
    </div>
  )
}

/* ─── InfoModal ──────────────────────────────────────────────────────────────── */
function InfoModal({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(27,42,74,0.25)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E2E4E8' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A2E', fontFamily: "'Playfair Display', serif" }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B8F9A', fontSize: '18px', padding: '2px', display: 'flex' }}>
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div style={{ padding: '22px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function AuthorHelp() {
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)

  function handleCard(item) {
    if (item.to) navigate(item.to)
    else if (item.modal) setModal(item.modal)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '900px', margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' }}>
          Help &amp; Resources
        </h1>
        <p style={{ fontSize: '14px', color: '#8B8F9A', margin: 0 }}>
          Guides for submitting, revising, and managing your manuscripts
        </p>
      </div>

      {/* Quick-links grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        {QUICK_LINKS.map(item => (
          <QuickCard key={item.title} item={item} onClick={() => handleCard(item)} />
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#1A1A2E', marginBottom: '16px' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden' }}>
          {FAQ.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
        </div>
      </div>

      {/* Contact */}
      <div style={{ background: '#fff', border: '1px solid #E2E4E8', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E4E8' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A2E' }}>Contact Editorial Office</span>
        </div>
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {CONTACT_INFO.map(c => (
            <div key={c.label} style={{ padding: '14px 16px', background: '#F4F5F7', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <i className={`fas ${c.icon}`} style={{ fontSize: '12px', color: '#1B2A4A' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1A1A2E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#5A5E6B' }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifecycle modal */}
      {modal === 'lifecycle' && (
        <InfoModal title="Manuscript Lifecycle" onClose={() => setModal(null)}>
          <p style={{ fontSize: '13px', color: '#5A5E6B', marginBottom: '24px', lineHeight: 1.6 }}>
            Every manuscript goes through a structured editorial workflow. Here's what to expect at each stage.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {LIFECYCLE_STEPS.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: step.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${step.icon}`} style={{ fontSize: '14px', color: step.color }} />
                  </div>
                  {i < LIFECYCLE_STEPS.length - 1 && (
                    <div style={{ width: '2px', height: '22px', background: '#E2E4E8' }} />
                  )}
                </div>
                <div style={{ paddingTop: '7px', paddingBottom: i < LIFECYCLE_STEPS.length - 1 ? '0' : '0' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A2E', marginBottom: '2px' }}>{step.label}</div>
                  <div style={{ fontSize: '13px', color: '#5A5E6B', lineHeight: 1.5, marginBottom: '8px' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </InfoModal>
      )}

      {/* Co-author modal */}
      {modal === 'coauthor' && (
        <InfoModal title="Co-Author Access" onClose={() => setModal(null)}>
          <div style={{ fontSize: '13px', color: '#5A5E6B', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>Co-authors added during submission can:</p>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li>View the manuscript detail page and current status</li>
              <li>Download all uploaded manuscript files</li>
              <li>Receive email notifications for status changes</li>
            </ul>
            <p>Co-authors <strong>cannot</strong>:</p>
            <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <li>Edit or resubmit the manuscript (only the submitting author can)</li>
              <li>Respond to revision requests</li>
              <li>Withdraw the manuscript</li>
            </ul>
            <p>To add or remove co-authors after submission, contact the editorial office.</p>
          </div>
        </InfoModal>
      )}
    </div>
  )
}
