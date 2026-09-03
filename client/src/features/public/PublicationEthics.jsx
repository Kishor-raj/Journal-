import { useState } from 'react'
import { Link } from 'react-router-dom'

const ETHICAL_PRINCIPLES = [
  'Academic honesty and research integrity',
  'Fair, unbiased, and merit-based editorial decisions',
  'Transparent, rigorous Double-Blind peer review',
  'Strict confidentiality throughout the review and publication lifecycle',
  'Active prevention of plagiarism, data falsification, and research misconduct',
  'Responsible, open, and ethical publishing practices',
]

const AUTHOR_RESPONSIBILITIES = [
  {
    title: 'Originality & Plagiarism',
    desc: 'Authors must submit entirely original work, cite all relevant sources properly, and strictly avoid plagiarism, self-plagiarism, or duplicate submission.',
  },
  {
    title: 'Single Submission Policy',
    desc: 'Manuscripts must not be submitted concurrently to more than one journal or conference for consideration.',
  },
  {
    title: 'Authorship & Attribution',
    desc: 'Authorship is limited to those who made substantial intellectual contributions. All co-authors must review and approve the final manuscript before submission.',
  },
  {
    title: 'Data Integrity & Fabrication',
    desc: 'Authors must present truthful findings, preserve raw data for verification, and never engage in data fabrication, falsification, or image manipulation.',
  },
  {
    title: 'Conflicts of Interest & Funding',
    desc: 'Mandatory disclosure of any financial, commercial, or institutional conflicts, alongside explicit acknowledgement of all grant and funding sources.',
  },
]

const EDITOR_RESPONSIBILITIES = [
  {
    title: 'Impartial Decision-Making',
    desc: 'Editors evaluate manuscripts solely on intellectual and academic merit without regard to author nationality, gender, religion, or institutional affiliation.',
  },
  {
    title: 'Confidentiality & Integrity',
    desc: 'Editors safeguard the confidentiality of all submitted manuscripts and reviewer identities, ensuring unpublished data is never misappropriated.',
  },
  {
    title: 'Conflict Management & Remediation',
    desc: 'Editors recuse themselves from handling submissions where a conflict exists and take prompt editorial action when ethical concerns arise.',
  },
]

const REVIEWER_RESPONSIBILITIES = [
  {
    title: 'Objective & Constructive Review',
    desc: 'Reviewers provide evidence-based, constructive assessments and identify relevant published work that authors have not cited.',
  },
  {
    title: 'Confidentiality & Timeframe',
    desc: 'Treating manuscripts as privileged documents and completing reviews within agreed deadlines to uphold efficient scholarly communication.',
  },
  {
    title: 'Conflict Disclosure',
    desc: 'Declining review assignments when a financial, personal, or competitive conflict of interest exists or when lacking subject matter expertise.',
  },
]

const MISCONDUCT_TYPES = [
  'Fabrication and falsification of data or experimental results',
  'Plagiarism, verbatim copying, or paraphrasing without citation',
  'Citation manipulation and unethical coercive citation practices',
  'Fake, ghost, or gift authorship attribution',
  'Undisclosed conflicts of interest or concealed funding',
  'Manipulation or subversion of the double-blind peer review process',
]

function EthicsCard({ title, desc, borderAccent = '#0B1B3A' }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        borderTop: `3px solid ${borderAccent}`,
        padding: '28px 26px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 4px 14px rgba(11,27,58,0.06)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(20px, 2.2vw, 24px)', color: '#0B1B3A', margin: '0 0 10px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', margin: 0 }}>
          {desc}
        </p>
      </div>
    </div>
  )
}

export default function PublicationEthics() {
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
            Publication Ethics &amp; Malpractice Statement
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Publication Ethics
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Standards of integrity, transparency, and ethical publishing for authors, reviewers, and editors
          </p>
        </div>
      </div>

      {/* Main body */}
      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        
        {/* Intro */}
        <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '820px', margin: '0 0 44px' }}>
          <strong>Asgard Research Publication</strong> is committed to maintaining the highest standards of academic integrity, transparency, and ethical publishing. Authors, editors, reviewers, and publishers are expected to follow internationally recognized principles of research and publication ethics throughout the entire publication process.
        </p>

        {/* Core Principles */}
        <div style={{ marginBottom: '52px', background: '#F8F9FB', border: '1px solid #EAECEF', borderLeft: '4px solid #C4A24C', padding: 'clamp(24px, 4vw, 36px)', borderRadius: '0 4px 4px 0' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 14px' }}>
            Our Core Ethical Principles
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '12px 24px' }}>
            {ETHICAL_PRINCIPLES.map((pr, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '15px', lineHeight: 1.65, color: '#3A4157' }}>
                <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>✓</span>
                <span>{pr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Author Responsibilities */}
        <section style={{ marginBottom: '52px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 30px)', color: '#0B1B3A', margin: '0 0 6px' }}>
            Responsibilities of Authors
          </h2>
          <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '22px' }}>
            {AUTHOR_RESPONSIBILITIES.map(a => <EthicsCard key={a.title} {...a} borderAccent="#0B1B3A" />)}
          </div>
        </section>

        {/* Editor & Reviewer Responsibilities */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '40px', marginBottom: '52px' }}>
          
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              Responsibilities of Editors
            </h2>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gap: '18px' }}>
              {EDITOR_RESPONSIBILITIES.map(e => <EthicsCard key={e.title} {...e} borderAccent="#C4A24C" />)}
            </div>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.6vw, 28px)', color: '#0B1B3A', margin: '0 0 6px' }}>
              Responsibilities of Reviewers
            </h2>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
            <div style={{ display: 'grid', gap: '18px' }}>
              {REVIEWER_RESPONSIBILITIES.map(r => <EthicsCard key={r.title} {...r} borderAccent="#9A7B23" />)}
            </div>
          </div>

        </div>

        {/* Research Misconduct & Corrections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '32px', marginBottom: '52px' }}>
          
          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '30px 28px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Research Misconduct Policy
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', marginBottom: '14px' }}>
              The following practices constitute serious research misconduct and will trigger formal editorial inquiry:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {MISCONDUCT_TYPES.map((m, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', fontSize: '14.5px', color: '#3A4157', lineHeight: 1.6 }}>
                  <span style={{ color: '#B83333', fontWeight: 700 }}>✕</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '30px 28px' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '22px', color: '#0B1B3A', margin: '0 0 8px' }}>
              Corrections &amp; Retractions
            </h3>
            <div style={{ width: '40px', height: '2px', background: '#C4A24C', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#3A4157', marginBottom: '12px' }}>
              If significant errors, fraudulent data, or ethical violations are identified post-publication, the journal acts in alignment with COPE guidelines to:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0' }}>
              <li style={{ marginBottom: '6px', fontSize: '14.5px', color: '#3A4157' }}>• <strong>Erratum / Corrigendum:</strong> Publish formal corrections for honest errors.</li>
              <li style={{ marginBottom: '6px', fontSize: '14.5px', color: '#3A4157' }}>• <strong>Expression of Concern:</strong> Issue notices during ongoing investigations.</li>
              <li style={{ fontSize: '14.5px', color: '#3A4157' }}>• <strong>Retraction:</strong> Retract invalid or unethical articles transparently.</li>
            </ul>
            <p style={{ fontSize: '14.5px', color: '#6B7288', lineHeight: 1.6, margin: 0 }}>
              All retraction notices are permanently linked to the digital version of the manuscript.
            </p>
          </div>

        </div>

        {/* Complaints and Appeals CTA */}
        <div style={{
          background: '#0B1B3A',
          color: '#FFFFFF',
          padding: 'clamp(32px, 5vw, 44px)',
          borderRadius: '4px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px 40px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '8px' }}>
              Ethics Inquiries &amp; Appeals
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.5vw, 28px)', margin: '0 0 10px' }}>
              Complaints &amp; Ethics Oversight
            </h3>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: '#C3CBDC', margin: 0 }}>
              Authors who wish to appeal an editorial decision or report ethical concerns may contact the Editorial Office. All complaints are investigated confidentially and impartially.
            </p>
          </div>
          <Link
            to="/contact"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '13.5px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: '#C4A24C',
              color: '#071228',
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: '2px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E3CB86'}
            onMouseLeave={e => e.currentTarget.style.background = '#C4A24C'}
          >
            Contact Ethics Officer →
          </Link>
        </div>

      </div>
    </>
  )
}
