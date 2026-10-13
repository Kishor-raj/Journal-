import { useState } from 'react'

const NAV_LINKS = [
  { id: 'about-us', title: 'About Us' },
  { id: 'vision', title: 'Our Vision' },
  { id: 'mission', title: 'Our Mission' },
  { id: 'objectives', title: 'Our Objectives' },
  { id: 'core-values', title: 'Core Values' },
  { id: 'why-choose-us', title: 'Why Choose Us' },
  { id: 'commitment', title: 'Our Commitment' },
]

const ABOUT_PARAGRAPHS = [
  'Asgard Research Publication is an international scholarly publishing platform committed to advancing knowledge through the publication of high-quality, peer-reviewed research. We provide a trusted forum for researchers, academicians, scientists, industry professionals, and students to share innovative ideas and original research with the global academic community.',
  'Our publishing process is founded on academic excellence, ethical standards, transparency, and rigorous peer review. We strive to ensure that every published article contributes meaningfully to the advancement of science, technology, engineering, management, and the humanities.',
]

const MISSION_ITEMS = [
  'Publish high-quality, original, and impactful research.',
  'Maintain a fair, transparent, and timely peer-review process.',
  'Support researchers with professional editorial services.',
  'Uphold international publication ethics and best practices.',
  'Increase the visibility and accessibility of scholarly research worldwide.',
]

const OBJECTIVES_ITEMS = [
  'Encourage multidisciplinary and interdisciplinary research.',
  'Provide an accessible platform for researchers at all career stages.',
  'Foster collaboration between academia, industry, and society.',
  'Promote open access to scientific knowledge.',
  'Support continuous learning and innovation.',
]

const CORE_VALUES = [
  { name: 'Academic Excellence', desc: 'Commitment to publishing high-quality scholarly work.' },
  { name: 'Integrity', desc: 'Adherence to ethical publishing standards.' },
  { name: 'Transparency', desc: 'Fair and unbiased editorial and review processes.' },
  { name: 'Innovation', desc: 'Encouraging novel ideas and cutting-edge research.' },
  { name: 'Collaboration', desc: 'Building strong partnerships within the global research community.' },
  { name: 'Quality', desc: 'Maintaining international publishing standards.' },
]

const WHY_CHOOSE_ITEMS = [
  'Rigorous Peer Review Process',
  'International Editorial Board',
  'Rapid and Transparent Publication Workflow',
  'Open Access Publishing',
  'DOI Integration (where applicable)',
  'Plagiarism Screening',
  'Author-Centric Editorial Support',
  'Global Research Visibility',
]

function SectionCard({ id, title, subtitle, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <article
      id={id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        borderTop: '3px solid #C4A24C',
        padding: 'clamp(24px, 3vw, 32px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 6px 20px rgba(11, 27, 58, 0.06)' : 'none',
        scrollMarginTop: '140px',
      }}
    >
      <div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600,
          fontSize: 'clamp(22px, 2.4vw, 28px)',
          color: '#0B1B3A',
          margin: '0 0 6px',
        }}>
          {title}
        </h2>
        <div style={{ width: '44px', height: '2px', background: '#C4A24C', marginBottom: '18px' }} />
        {subtitle && (
          <h3 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: 'clamp(17px, 1.8vw, 20px)',
            color: '#7E6116',
            margin: '0 0 14px',
          }}>
            {subtitle}
          </h3>
        )}
        {children}
      </div>
    </article>
  )
}

function NavPill({ id, title }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={`#${id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '12px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 600,
        padding: '7px 14px',
        borderRadius: '2px',
        background: hovered ? '#C4A24C' : 'rgba(196, 162, 76, 0.1)',
        color: hovered ? '#071228' : '#0B1B3A',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        border: '1px solid rgba(196, 162, 76, 0.25)',
      }}
    >
      {title}
    </a>
  )
}

export default function About() {
  return (
    <>
      {/* Page hero */}
      <div style={{
        background: '#0B1B3A',
        backgroundImage: 'repeating-linear-gradient(135deg, rgba(196,162,76,0.07) 0 2px, transparent 2px 10px)',
        color: '#FFFFFF',
        minHeight: 'auto',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '2px solid #C4A24C',
      }}>
        <div style={{ width: '100%', maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(28px, 3.5vw, 42px) var(--layout-pad)' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '16px' }}>
            Asgard Research Publication
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            About Us
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Publishing Knowledge, Inspiring Innovation, Empowering Researchers
          </p>
        </div>
      </div>

      {/* Horizontal Jump Navigation Bar */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E6E1D6',
        position: 'sticky',
        top: '88px',
        zIndex: 40,
        boxShadow: '0 2px 8px rgba(11, 27, 58, 0.03)',
      }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '12px var(--layout-pad)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          <span style={{
            fontFamily: 'Jost, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#8C94A6',
            marginRight: '6px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}>
            On this page:
          </span>
          {NAV_LINKS.map(link => (
            <NavPill key={link.id} id={link.id} title={link.title} />
          ))}
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(32px, 4.5vw, 56px) var(--layout-pad) clamp(64px, 8vw, 96px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '36px',
      }}>
        {/* Full-width Welcome / About Us Card */}
        <SectionCard id="about-us" title="About Us" subtitle="Welcome to Asgard Research Publication">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '20px' }}>
            {ABOUT_PARAGRAPHS.map((p, idx) => (
              <p key={idx} style={{ fontSize: 'clamp(15.5px, 1.4vw, 17px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
                {p}
              </p>
            ))}
          </div>
        </SectionCard>

        {/* Row 1: Vision & Mission (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="vision" title="Our Vision">
            <p style={{ fontSize: 'clamp(16px, 1.45vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 20px' }}>
              To become a globally recognized academic publisher that promotes innovation, research excellence, and the open exchange of knowledge across disciplines.
            </p>
            <div style={{
              padding: '16px 20px',
              background: 'rgba(196,162,76,0.08)',
              borderLeft: '3px solid #C4A24C',
              borderRadius: '0 4px 4px 0',
              fontStyle: 'italic',
              color: '#0B1B3A',
              fontSize: '15px',
              lineHeight: 1.6,
            }}>
              Advancing the boundaries of global research through integrity, accessibility, and scientific rigor.
            </div>
          </SectionCard>

          <SectionCard id="mission" title="Our Mission">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
              {MISSION_ITEMS.map((item, idx) => (
                <li key={idx} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '10px', alignItems: 'start', fontSize: '15.5px', lineHeight: 1.65, color: '#3A4157' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '18px', lineHeight: 1 }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {/* Row 2: Objectives & Core Values (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="objectives" title="Our Objectives">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
              {OBJECTIVES_ITEMS.map((item, idx) => (
                <li key={idx} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '10px', alignItems: 'start', fontSize: '15.5px', lineHeight: 1.65, color: '#3A4157' }}>
                  <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '18px', lineHeight: 1 }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="core-values" title="Our Core Values">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
              {CORE_VALUES.map((v, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    background: '#F8F9FB',
                    border: '1px solid #EAECEF',
                    borderLeft: '3px solid #C4A24C',
                    borderRadius: '0 3px 3px 0',
                  }}
                >
                  <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '14.5px', marginBottom: '3px' }}>{v.name}</strong>
                  <span style={{ color: '#555E75', fontSize: '13px', lineHeight: 1.5 }}>{v.desc}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Row 3: Why Choose Us & Our Commitment (2 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
          gap: '32px',
          alignItems: 'stretch',
        }}>
          <SectionCard id="why-choose-us" title="Why Choose Asgard Research Publication?">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
              {WHY_CHOOSE_ITEMS.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', lineHeight: 1.5, color: '#3A4157' }}>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#C4A24C',
                    color: '#0B1B3A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="commitment" title="Our Commitment">
            <p style={{ fontSize: 'clamp(15.5px, 1.4vw, 17px)', lineHeight: 1.78, color: '#3A4157', margin: '0 0 20px' }}>
              At Asgard Research Publication, we are committed to creating a professional, ethical, and inclusive publishing environment. We believe that quality research has the power to solve real-world challenges and inspire future innovations. Our goal is to help authors disseminate their work to a global audience while maintaining the highest standards of academic publishing.
            </p>
            <div style={{
              padding: '16px 20px',
              background: 'rgba(196,162,76,0.08)',
              borderLeft: '3px solid #C4A24C',
              borderRadius: '0 4px 4px 0',
              fontStyle: 'italic',
              fontWeight: 600,
              color: '#0B1B3A',
              fontSize: 'clamp(14.5px, 1.3vw, 16px)',
              lineHeight: 1.6,
            }}>
              Asgard Research Publication – Publishing Knowledge, Inspiring Innovation, Empowering Researchers.
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  )
}

