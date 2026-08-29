import { useState } from 'react'

const CONTACTS = [
  { k: 'Email', v: 'editorial@asgardpublications.com' },
  { k: 'Telephone', v: '+44 (0)20 7946 0812' },
  { k: 'Address', v: 'Asgard Publications, 14 Bloomsbury Court, London WC1N 3AL' },
  { k: 'Office hours', v: 'Monday–Friday, 09:00–17:00 GMT' },
]

const SUBJECTS = [
  'Manuscript enquiry',
  'Review invitation',
  'Permissions & reprints',
  'General question',
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
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
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
            Editorial office
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Contact Us
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            We aim to respond within three business days
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
            Send a message
          </h2>

          {submitted ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: '#0B1B3A', marginBottom: '14px' }}>
                Message sent
              </div>
              <p style={{ fontSize: '16.5px', color: '#3A4157', lineHeight: 1.7 }}>
                Thank you for getting in touch. We will respond within three business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', marginBottom: '22px' }}>
                <div>
                  <FieldLabel>Full name</FieldLabel>
                  <StyledInput name="name" value={form.name} onChange={handleChange} required autoComplete="name" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <StyledInput type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" />
                </div>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <FieldLabel>Subject</FieldLabel>
                <StyledSelect name="subject" value={form.subject} onChange={handleChange}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </StyledSelect>
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
                  padding: '16px 34px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Send message
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
                <div style={{ fontSize: '16px' }}>{c.v}</div>
              </div>
            ))}
          </div>

          {/* Response times */}
          <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF', padding: '28px 30px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#0B1B3A', marginBottom: '10px' }}>
              Response times
            </div>
            <div style={{ fontSize: '16px', lineHeight: 1.75, color: '#3A4157' }}>
              General enquiries: 3 business days<br />
              Manuscript status: 5 business days<br />
              Permissions: 10 business days
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
