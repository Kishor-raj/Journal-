import { useState } from 'react'

const SECTIONS = [
  {
    id: 'about-us',
    title: 'About Us',
    subtitle: 'Welcome to Asgard Research Publication',
    paragraphs: [
      'Asgard Research Publication is an international scholarly publishing platform committed to advancing knowledge through the publication of high-quality, peer-reviewed research. We provide a trusted forum for researchers, academicians, scientists, industry professionals, and students to share innovative ideas and original research with the global academic community.',
      'Our publishing process is founded on academic excellence, ethical standards, transparency, and rigorous peer review. We strive to ensure that every published article contributes meaningfully to the advancement of science, technology, engineering, management, and the humanities.',
    ],
  },
  {
    id: 'vision',
    title: 'Our Vision',
    paragraphs: [
      'To become a globally recognized academic publisher that promotes innovation, research excellence, and the open exchange of knowledge across disciplines.',
    ],
  },
  {
    id: 'mission',
    title: 'Our Mission',
    items: [
      'Publish high-quality, original, and impactful research.',
      'Maintain a fair, transparent, and timely peer-review process.',
      'Support researchers with professional editorial services.',
      'Uphold international publication ethics and best practices.',
      'Increase the visibility and accessibility of scholarly research worldwide.',
    ],
  },
  {
    id: 'objectives',
    title: 'Our Objectives',
    items: [
      'Encourage multidisciplinary and interdisciplinary research.',
      'Provide an accessible platform for researchers at all career stages.',
      'Foster collaboration between academia, industry, and society.',
      'Promote open access to scientific knowledge.',
      'Support continuous learning and innovation.',
    ],
  },
  {
    id: 'core-values',
    title: 'Our Core Values',
    values: [
      { name: 'Academic Excellence', desc: 'Commitment to publishing high-quality scholarly work.' },
      { name: 'Integrity', desc: 'Adherence to ethical publishing standards.' },
      { name: 'Transparency', desc: 'Fair and unbiased editorial and review processes.' },
      { name: 'Innovation', desc: 'Encouraging novel ideas and cutting-edge research.' },
      { name: 'Collaboration', desc: 'Building strong partnerships within the global research community.' },
      { name: 'Quality', desc: 'Maintaining international publishing standards.' },
    ],
  },
  {
    id: 'why-choose-us',
    title: 'Why Choose Asgard Research Publication?',
    items: [
      'Rigorous Peer Review Process',
      'International Editorial Board',
      'Rapid and Transparent Publication Workflow',
      'Open Access Publishing',
      'DOI Integration (where applicable)',
      'Plagiarism Screening',
      'Author-Centric Editorial Support',
      'Global Research Visibility',
    ],
  },
  {
    id: 'commitment',
    title: 'Our Commitment',
    paragraphs: [
      'At Asgard Research Publication, we are committed to creating a professional, ethical, and inclusive publishing environment. We believe that quality research has the power to solve real-world challenges and inspire future innovations. Our goal is to help authors disseminate their work to a global audience while maintaining the highest standards of academic publishing.',
    ],
    tagline: 'Asgard Research Publication – Publishing Knowledge, Inspiring Innovation, Empowering Researchers.',
  },
]

function SidebarItem({ id, title }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={`#${id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        fontSize: '15px',
        color: hovered ? '#0B1B3A' : '#3A4157',
        padding: '8px 0',
        borderLeft: `2px solid ${hovered ? '#C4A24C' : 'transparent'}`,
        paddingLeft: '12px',
        textDecoration: 'none',
        transition: 'color 0.15s, border-color 0.15s',
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
            About Us
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Publishing Knowledge, Inspiring Innovation, Empowering Researchers
          </p>
        </div>
      </div>

      {/* Sidebar + content */}
      <div style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '48px 72px',
        alignItems: 'start',
      }}>
        {/* Sticky ToC sidebar */}
        <aside style={{ position: 'sticky', top: '116px', alignSelf: 'start' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B7288', paddingBottom: '14px', borderBottom: '1px solid #E6E1D6', marginBottom: '14px' }}>
            On this page
          </div>
          {SECTIONS.map(s => (
            <SidebarItem key={s.id} id={s.id} title={s.title} />
          ))}
        </aside>

        {/* Main content */}
        <div style={{ maxWidth: '760px' }}>
          {SECTIONS.map(s => (
            <section
              key={s.id}
              id={s.id}
              style={{ marginBottom: '52px' }}
            >
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 6px' }}>
                {s.title}
              </h2>
              <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />

              {s.subtitle && (
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(19px, 2vw, 22px)', color: '#0B1B3A', margin: '0 0 14px' }}>
                  {s.subtitle}
                </h3>
              )}

              {s.paragraphs?.map((p, idx) => (
                <p key={idx} style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 16px' }}>
                  {p}
                </p>
              ))}

              {s.items && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                  {s.items.map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px', fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.7, color: '#3A4157' }}>
                      <span style={{ color: '#C4A24C', fontWeight: 700, fontSize: '20px', lineHeight: 1 }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {s.values && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '14px', margin: '0 0 16px' }}>
                  {s.values.map((v, idx) => (
                    <div key={idx} style={{ padding: '16px 18px', background: '#F8F9FB', borderLeft: '3px solid #C4A24C', borderRadius: '0 4px 4px 0', border: '1px solid #EAECEF', borderLeftWidth: '3px', borderLeftColor: '#C4A24C' }}>
                      <strong style={{ display: 'block', color: '#0B1B3A', fontSize: '16px', marginBottom: '4px' }}>{v.name}</strong>
                      <span style={{ color: '#555E75', fontSize: '14.5px', lineHeight: 1.6 }}>{v.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {s.tagline && (
                <div style={{ padding: '18px 22px', background: 'rgba(196,162,76,0.08)', borderLeft: '3px solid #C4A24C', borderRadius: '0 4px 4px 0', marginTop: '20px', fontStyle: 'italic', fontWeight: 500, color: '#0B1B3A', fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.6 }}>
                  {s.tagline}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
