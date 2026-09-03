import { useState } from 'react'

const CONTACTS = [
  { k: 'Publication', v: 'Asgard Research Publication' },
  { k: 'Email', v: 'editor@asgardpublication.com', href: 'mailto:editor@asgardpublication.com' },
  { k: 'Support Email', v: 'support@asgardpublication.com', href: 'mailto:support@asgardpublication.com' },
  { k: 'Website', v: 'www.asgardpublication.com', href: 'https://www.asgardpublication.com' },
]

const OFFICE_HOURS = [
  { k: 'Monday - Friday', v: '09:00 AM - 05:30 PM' },
  { k: 'Saturday', v: '09:00 AM - 01:00 PM' },
  { k: 'Sunday & Public Holidays', v: 'Closed' },
]

const ADDRESS_LINES = [
  'Asgard Research Publication',
  'Editorial Office',
  'Office address details will be updated soon.',
]

const SUBJECTS = [
  'Manuscript Submission',
  'Editorial Inquiry',
  'Reviewer Inquiry',
  'Publication Ethics',
  'Technical Support',
  'General Inquiry',
]

const AUDIENCE_SECTIONS = [
  {
    title: 'For Authors',
    body: 'For questions related to manuscript submission, author guidelines, article status, revision process, or publication schedule, please contact the Editorial Office.',
  },
  {
    title: 'For Reviewers',
    body: 'For reviewer invitations, review deadlines, or reviewer account support, please contact the Editorial Team.',
  },
  {
    title: 'For Institutions',
    body: 'Universities, research organizations, libraries, and academic societies interested in collaboration or journal partnerships are welcome to contact us.',
  },
]

const SOCIALS = [
  'Facebook',
  'LinkedIn',
  'X (Twitter)',
  'YouTube',
]

function FieldLabel({ children }) {
  return (
    <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7288', marginBottom: '8px' }}>
      {children}
    </div>
  )
}

function StyledInput({ type = 'text', ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: `1px solid ${focused ? '#C4A24C' : '#E6E1D6'}`,
        background: focused ? '#FFFFFF' : '#FDFCF9',
        fontSize: '16px',
        color: '#1C2233',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      {...props}
    />
  )
}

function StyledSelect({ children, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: `1px solid ${focused ? '#C4A24C' : '#E6E1D6'}`,
        background: focused ? '#FFFFFF' : '#FDFCF9',
        fontSize: '16px',
        color: '#1C2233',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      {...props}
    >
      {children}
    </select>
  )
}

function StyledTextarea({ ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: `1px solid ${focused ? '#C4A24C' : '#E6E1D6'}`,
        background: focused ? '#FFFFFF' : '#FDFCF9',
        fontSize: '16px',
        color: '#1C2233',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'Spectral, Georgia, serif',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      {...props}
    />
  )
}

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    institution: '',
    country: '',
    subject: '',
    category: SUBJECTS[0],
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [sendHovered, setSendHovered] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    // In a real implementation, POST to the API
    setSubmitted(true)
  }

  return (
    <>
      {/* Page hero */}
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        minHeight: '48vh',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ width: '100%', maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(56px, 8vw, 92px) var(--layout-pad) clamp(52px, 8vw, 88px)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '16px' }}>
            Asgard Research Publication
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Contact Us
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            We welcome inquiries from authors, reviewers, editors, researchers, institutions, and readers.
          </p>
        </div>
      </div>

      {/* Form + aside */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '48px 64px',
        alignItems: 'start',
      }}>
        {/* Contact form */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '42px 44px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(23px, 2.8vw, 30px)', color: '#0B1B3A', margin: '0 0 26px' }}>
            Contact Form
          </h2>
          <p style={{ fontSize: '16px', color: '#3A4157', lineHeight: 1.7, margin: '0 0 26px' }}>
            Please complete the form below, and our Editorial Office will respond as soon as possible.
          </p>

          {submitted ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: '#0B1B3A', marginBottom: '14px' }}>
                Inquiry submitted
              </div>
              <p style={{ fontSize: '16.5px', color: '#3A4157', lineHeight: 1.7 }}>
                Thank you for getting in touch. We aim to respond to all inquiries within 2-5 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0B1B3A', margin: '0 0 16px' }}>
                Personal Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '22px', marginBottom: '22px' }}>
                <div>
                  <FieldLabel>Full name</FieldLabel>
                  <StyledInput name="name" value={form.name} onChange={handleChange} required autoComplete="name" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <StyledInput type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" />
                </div>
                <div>
                  <FieldLabel>Institution / Organization</FieldLabel>
                  <StyledInput name="institution" value={form.institution} onChange={handleChange} autoComplete="organization" />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <StyledInput name="country" value={form.country} onChange={handleChange} autoComplete="country-name" />
                </div>
              </div>

              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0B1B3A', margin: '6px 0 16px' }}>
                Inquiry Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '22px', marginBottom: '22px' }}>
                <div>
                  <FieldLabel>Subject</FieldLabel>
                  <StyledInput name="subject" value={form.subject} onChange={handleChange} required />
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <StyledSelect name="category" value={form.category} onChange={handleChange}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </StyledSelect>
                </div>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <FieldLabel>Message</FieldLabel>
                <StyledTextarea name="message" rows={7} value={form.message} onChange={handleChange} required />
              </div>

              <button
                type="submit"
                onMouseEnter={() => setSendHovered(true)}
                onMouseLeave={() => setSendHovered(false)}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '14px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: sendHovered ? '#071228' : '#0B1B3A',
                  color: '#FFFFFF',
                  padding: '17px 36px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Submit inquiry
              </button>
            </form>
          )}
        </div>

        {/* Info aside */}
        <aside>
          {/* Office info */}
          <div style={{ background: '#0B1B3A', color: '#FFFFFF', padding: '34px 32px', marginBottom: '22px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '20px' }}>
              Editorial office
            </div>
            {CONTACTS.map(c => (
              <div key={c.k} style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.14)' }}>
                <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: '5px' }}>
                  {c.k}
                </div>
                {c.href ? (
                  <a href={c.href} style={{ fontSize: '16px', color: '#FFFFFF', textDecoration: 'none', overflowWrap: 'anywhere' }}>
                    {c.v}
                  </a>
                ) : (
                  <div style={{ fontSize: '16px' }}>{c.v}</div>
                )}
              </div>
            ))}
          </div>

          {/* Office address */}
          <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF', padding: '28px 30px', marginBottom: '22px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#0B1B3A', marginBottom: '10px' }}>
              Office Address
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.75, color: '#3A4157' }}>
              {ADDRESS_LINES.map(line => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>

          {/* Office hours */}
          <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF', padding: '28px 30px', marginBottom: '22px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#0B1B3A', marginBottom: '10px' }}>
              Office Hours
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {OFFICE_HOURS.map(item => (
                <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', fontSize: '15.5px', lineHeight: 1.5, color: '#3A4157' }}>
                  <strong style={{ color: '#0B1B3A' }}>{item.k}</strong>
                  <span style={{ textAlign: 'right' }}>{item.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Response time */}
          <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF', padding: '28px 30px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#0B1B3A', marginBottom: '10px' }}>
              Response Time
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.75, color: '#3A4157' }}>
              We aim to respond to all inquiries within <strong>2-5 business days</strong>.
            </div>
          </div>
        </aside>
      </div>

      {/* Additional contact guidance */}
      <div style={{ background: '#F8F9FB', borderTop: '1px solid #E6E1D6' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: 'clamp(40px, 6vw, 64px) var(--layout-pad)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '18px',
        }}>
          {AUDIENCE_SECTIONS.map(section => (
            <section key={section.title} style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', borderTop: '2px solid #C4A24C', padding: '24px 26px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '24px', color: '#0B1B3A', margin: '0 0 10px' }}>
                {section.title}
              </h2>
              <p style={{ fontSize: '15.5px', color: '#3A4157', lineHeight: 1.7, margin: 0 }}>
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </div>

      {/* Notice */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(34px, 5vw, 56px) var(--layout-pad) clamp(52px, 7vw, 78px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '28px 48px',
        alignItems: 'start',
      }}>
        <section>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(23px, 2.8vw, 30px)', color: '#0B1B3A', margin: '0 0 10px' }}>
            Follow Us
          </h2>
          <p style={{ fontSize: '16px', color: '#3A4157', lineHeight: 1.75, margin: '0 0 18px' }}>
            Stay connected with Asgard Research Publication through our official communication channels for announcements, calls for papers, and publication updates.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {SOCIALS.map(social => (
              <span key={social} style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0B1B3A', border: '1px solid #E6E1D6', background: '#FFFFFF', padding: '9px 12px' }}>
                {social}
              </span>
            ))}
          </div>
        </section>

        <section style={{ borderLeft: '3px solid #C4A24C', paddingLeft: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(23px, 2.8vw, 30px)', color: '#0B1B3A', margin: '0 0 10px' }}>
            Important Notice
          </h2>
          <p style={{ fontSize: '16px', color: '#3A4157', lineHeight: 1.75, margin: '0 0 18px' }}>
            Please use only the official communication channels listed on this page. Asgard Research Publication is not responsible for communications sent to unofficial email addresses or third-party websites.
          </p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#0B1B3A', lineHeight: 1.45, margin: 0 }}>
            Publishing Knowledge with Integrity, Excellence, and Global Impact.
          </p>
        </section>
      </div>
    </>
  )
}
