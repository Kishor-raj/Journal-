import { useState } from 'react'

const SECTIONS = [
  {
    title: 'Mission',
    p1: 'The Journal of Contemporary Research is dedicated to publishing high-quality, peer-reviewed scholarship that advances knowledge across the humanities, social sciences, and interdisciplinary fields.',
    p2: 'Our mission is to provide a platform for researchers, scholars, and practitioners to share original findings, theoretical contributions, and critical perspectives with a global academic audience.',
  },
  {
    title: 'Scope',
    p1: 'We welcome submissions spanning political science, sociology, anthropology, history, philosophy, economics, education, and interdisciplinary studies.',
    p2: 'We particularly encourage work that bridges disciplinary boundaries or applies innovative methodologies to established fields of inquiry.',
  },
  {
    title: 'Publication frequency',
    p1: 'The journal is published quarterly, with issues released in March, June, September, and December.',
    p2: 'Special issues and supplement volumes may be published periodically on topics of significant scholarly interest.',
  },
  {
    title: 'Open access',
    p1: 'All published articles are freely available to readers worldwide without subscription barriers, and we charge no article processing fees.',
    p2: 'Authors retain copyright to their work under Creative Commons licensing terms.',
  },
  {
    title: 'Indexing & abstracting',
    p1: 'The journal is indexed in fourteen major academic databases and abstracting services.',
    p2: 'We maintain rigorous metadata standards to ensure discoverability and long-term preservation of published scholarship.',
  },
  {
    title: 'Preservation',
    p1: 'Every article is assigned a DOI and deposited with a distributed digital preservation network.',
    p2: "This guarantees permanent access to the scholarly record independent of the journal's own infrastructure.",
  },
]

function SidebarItem({ title, active }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={`#${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        fontSize: '15.5px',
        color: active || hovered ? '#0B1B3A' : '#3A4157',
        padding: '8px 0',
        borderLeft: `2px solid ${active || hovered ? '#C4A24C' : 'transparent'}`,
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
            Asgard Publications
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            About the Journal
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Our mission, scope, and commitment to scholarly excellence
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
            <SidebarItem key={s.title} title={s.title} />
          ))}
        </aside>

        {/* Main content */}
        <div style={{ maxWidth: '760px' }}>
          {SECTIONS.map(s => (
            <section
              key={s.title}
              id={s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
              style={{ marginBottom: '52px' }}
            >
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#0B1B3A', margin: '0 0 6px' }}>
                {s.title}
              </h2>
              <div style={{ width: '56px', height: '2px', background: '#C4A24C', marginBottom: '20px' }} />
              <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: '0 0 16px' }}>
                {s.p1}
              </p>
              <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.8, color: '#3A4157', margin: 0 }}>
                {s.p2}
              </p>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
