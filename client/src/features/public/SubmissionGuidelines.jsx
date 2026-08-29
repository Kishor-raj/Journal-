import { useState } from 'react'
import { Link } from 'react-router-dom'

const STEPS = [
  { n: '01', title: 'Prepare', desc: 'Format your manuscript to the specifications below and anonymise it for review.' },
  { n: '02', title: 'Submit', desc: 'Upload through the author portal with abstract, keywords, and cover letter.' },
  { n: '03', title: 'Review', desc: 'Two independent reviewers assess the work under double-blind conditions.' },
  { n: '04', title: 'Publish', desc: 'Accepted articles are copy-edited, assigned a DOI, and published open access.' },
]

const REQS = [
  'Original work not published previously or under consideration elsewhere',
  'Abstract of 250–300 words with 4–6 indexing keywords',
  'Maximum 10,000 words excluding references',
  'APA 7th edition citation style throughout',
  'All author identifiers removed from the review copy',
]

const FORMATTING = [
  { k: 'File format', v: 'Microsoft Word (.docx) or LaTeX' },
  { k: 'Typeface', v: '12-point Times New Roman or similar serif' },
  { k: 'Spacing', v: 'Double-spaced, including references and footnotes' },
  { k: 'Margins', v: '1 inch (2.54 cm) on all sides' },
  { k: 'Page numbers', v: 'Consecutive, bottom centre' },
  { k: 'Figures & tables', v: 'Numbered consecutively, inline or at end' },
]

const DOWNLOADS = [
  { name: 'Manuscript template', ext: 'DOCX' },
  { name: 'LaTeX class file', ext: 'ZIP' },
  { name: 'Author checklist', ext: 'PDF' },
  { name: 'Copyright agreement', ext: 'PDF' },
]

function DownloadRow({ name, ext }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '13px 0',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        fontSize: '15.5px',
        cursor: 'pointer',
        color: hovered ? '#E3CB86' : '#FFFFFF',
        transition: 'color 0.15s',
      }}
    >
      <span>{name}</span>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>{ext}</span>
    </div>
  )
}

export default function SubmissionGuidelines() {
  const [submitHovered, setSubmitHovered] = useState(false)

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
            For authors
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Submission Guidelines
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Instructions for authors preparing manuscripts
          </p>
        </div>
      </div>

      {/* Steps bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E1D6' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '0 var(--layout-pad)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
        }}>
          {STEPS.map(st => (
            <div key={st.n} style={{ padding: '34px 26px', borderLeft: '1px solid #E6E1D6' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(25px, 3.2vw, 34px)', color: '#C4A24C', lineHeight: 1, marginBottom: '12px' }}>
                {st.n}
              </div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0B1B3A', marginBottom: '8px' }}>
                {st.title}
              </div>
              <div style={{ fontSize: '15px', color: '#6B7288', lineHeight: 1.6 }}>{st.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content + aside */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '48px 64px',
        alignItems: 'start',
      }}>
        {/* Content */}
        <div style={{ maxWidth: '760px' }}>
          {/* General requirements */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              General requirements
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 20px' }}>
              All submissions must be original work that has not been published previously and is not under consideration elsewhere. Manuscripts should be written in clear, concise academic English and conform to the journal's formatting standards.
            </p>
            <div style={{ display: 'grid', gap: '12px' }}>
              {REQS.map(r => (
                <div key={r} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '14px', alignItems: 'start', fontSize: '16.5px', color: '#3A4157', lineHeight: 1.6 }}>
                  <div style={{ width: '6px', height: '6px', background: '#C4A24C', marginTop: '10px' }} />
                  <div>{r}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Formatting specifications */}
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              Formatting specifications
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ border: '1px solid #E6E1D6', background: '#FFFFFF' }}>
              {FORMATTING.map(f => (
                <div key={f.k} style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 200px) minmax(0, 1fr)', gap: '12px 20px', padding: '16px 24px', borderBottom: '1px solid #EFEBE1', fontSize: '16px' }}>
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7288', paddingTop: '3px' }}>
                    {f.k}
                  </div>
                  <div style={{ color: '#1C2233' }}>{f.v}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Peer review process */}
          <section style={{ marginBottom: '44px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              Peer review process
            </h2>
            <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 16px' }}>
              All submissions undergo double-blind peer review. Each manuscript is evaluated by at least two independent reviewers with relevant expertise; the editorial team makes final decisions based on reviewer recommendations and scholarly merit.
            </p>
            <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
              Authors can expect an initial editorial decision within 8–12 weeks. Revised manuscripts should be returned within 30 days of receiving reviewer comments.
            </p>
          </section>

          {/* Note */}
          <div style={{ borderLeft: '3px solid #C4A24C', background: '#FFFFFF', padding: '24px 28px', fontSize: '16.5px', lineHeight: 1.7, color: '#3A4157' }}>
            <strong style={{ color: '#0B1B3A' }}>Note:</strong> For questions about submissions, or to discuss the suitability of a manuscript before submission, contact the editorial office through the{' '}
            <Link to="/contact" style={{ color: '#0B1B3A', borderBottom: '1px solid #C4A24C', textDecoration: 'none' }}>contact page</Link>.
          </div>
        </div>

        {/* Downloads aside */}
        <aside style={{ position: 'sticky', top: '116px', background: '#0B1B3A', color: '#FFFFFF', padding: '32px 30px' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '18px' }}>
            Author downloads
          </div>
          {DOWNLOADS.map(d => <DownloadRow key={d.name} {...d} />)}
          <Link
            to="/login"
            onMouseEnter={e => { e.currentTarget.style.background = '#E3CB86' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#C4A24C' }}
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '13.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: '#C4A24C',
              color: '#071228',
              padding: '14px',
              textAlign: 'center',
              marginTop: '26px',
              cursor: 'pointer',
              display: 'block',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            Start submission
          </Link>
        </aside>
      </div>
    </>
  )
}
