import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

/* ─── Static data ──────────────────────────────────────────────────────── */
const METRICS = [
  { value: '12', label: 'Volumes published' },
  { value: '8–12', label: 'Weeks to first decision' },
  { value: '18%', label: 'Acceptance rate' },
  { value: '64', label: 'Countries represented' },
]

const FACTS = [
  { k: 'Frequency', v: 'Quarterly' },
  { k: 'Review model', v: 'Double-blind' },
  { k: 'Access', v: 'Fully open' },
  { k: 'Licence', v: 'CC BY 4.0' },
  { k: 'APC', v: 'None' },
  { k: 'Founded', v: '2015' },
]

const FEATURED = [
  {
    tag: 'Political theory',
    title: 'Democratic Institutions and Public Trust in the Digital Age',
    authors: 'Dr. Eleanor Whitfield, Prof. James Nakamura',
    meta: 'Vol. 12, No. 1 · pp. 1–24',
  },
  {
    tag: 'Sociology',
    title: 'Urban Migration Patterns in Sub-Saharan Africa',
    authors: 'Dr. Amara Osei',
    meta: 'Vol. 12, No. 1 · pp. 25–48',
  },
  {
    tag: 'Philosophy of education',
    title: 'Philosophical Foundations of Contemporary Education Reform',
    authors: 'Prof. Helena Kowalski, Dr. Marcus Singh',
    meta: 'Vol. 12, No. 1 · pp. 49–72',
  },
  {
    tag: 'Digital Governance',
    title: 'Deliberative Governance and Policy Transparency in Digital Platforms',
    authors: 'Dr. Arthur Pendelton, Dr. Sofia Al-Mansoor',
    meta: 'Vol. 12, No. 1 · pp. 73–96',
  },
  {
    tag: 'Environmental sociology',
    title: 'Socioeconomic Resilience and Climate Adaptation in Coastal Regions',
    authors: 'Dr. K. S. Raman, Dr. Elena Rostova',
    meta: 'Vol. 12, No. 1 · pp. 97–120',
  },
  {
    tag: 'Ethics & Epistemology',
    title: 'Ethical Frameworks and AI Integration in Scholarly Research',
    authors: 'Prof. David C. Vance, Dr. Fatima Zahra',
    meta: 'Vol. 12, No. 1 · pp. 121–146',
  },
]

const INDEXES = ['Scopus', 'Web of Science', 'DOAJ', 'ERIC', 'JSTOR']

/* ─── Book3D custom element wrapper ───────────────────────────────────── */
function Book3D() {
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (scriptLoaded.current) return
    if (document.querySelector('script[data-book3d]')) {
      scriptLoaded.current = true
      return
    }
    const s = document.createElement('script')
    s.src = '/book-3d.js'
    s.dataset.book3d = '1'
    document.head.appendChild(s)
    scriptLoaded.current = true
  }, [])

  return (
    <div style={{ width: '96%', margin: '0 auto', padding: '12px', transform: 'translateX(3%)' }}>
      <div style={{
        aspectRatio: '3 / 4',
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* book-3d is a custom element registered by book-3d.js */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <book-3d
          front="/cover-front.jpeg"
          back="/cover-back.jpeg"
          speed="0.45"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  )
}

/* ─── Featured articles vertical scroller ──────────────────────────────── */
function FeaturedVerticalScroller({ articles }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(false)

  // Auto-scroll vertically one by one every 4.2 seconds
  useEffect(() => {
    if (isPaused || hoveredCard) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length)
    }, 4200)
    return () => clearInterval(interval)
  }, [isPaused, hoveredCard, articles.length])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % articles.length)
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '28px',
        alignItems: 'stretch',
      }}
    >
      {/* Main vertical slider viewport */}
      <div
        style={{
          border: '1px solid #E6E1D6',
          background: '#FDFCF9',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '36px 32px 30px',
          boxShadow: '0 4px 20px rgba(11, 27, 58, 0.04)',
        }}
        onMouseEnter={() => setHoveredCard(true)}
        onMouseLeave={() => setHoveredCard(false)}
      >
        {/* Slide viewport */}
        <div style={{ position: 'relative', minHeight: '170px', overflow: 'hidden' }}>
          {articles.map((item, idx) => {
            const isCurrent = idx === currentIndex
            const offset = (idx - currentIndex) * 100
            return (
              <div
                key={item.title}
                style={{
                  position: idx === 0 ? 'relative' : 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  opacity: isCurrent ? 1 : 0,
                  transform: `translateY(${offset}%)`,
                  transition: 'transform 0.55s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.45s ease',
                  pointerEvents: isCurrent ? 'auto' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#9A7B23',
                    fontWeight: 600,
                    background: '#F5EFE1',
                    padding: '3px 9px',
                    borderRadius: '2px',
                  }}>
                    {item.tag}
                  </span>
                  <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', color: '#8C94A6', letterSpacing: '0.05em' }}>
                    Article {idx + 1} of {articles.length}
                  </span>
                </div>

                <Link
                  to="/current-issue"
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <h3 style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: 'clamp(22px, 2.6vw, 28px)',
                    lineHeight: 1.25,
                    margin: 0,
                    color: '#0B1B3A',
                    transition: 'color 0.2s',
                  }}>
                    {item.title}
                  </h3>
                </Link>

                <div style={{ fontSize: '15px', color: '#3A4157', fontStyle: 'italic' }}>
                  {item.authors}
                </div>
              </div>
            )
          })}
        </div>

        {/* Card Footer & Meta */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #EFEBE1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12.5px', color: '#6B7288', letterSpacing: '0.03em' }}>
            {articles[currentIndex]?.meta}
          </div>
          <Link
            to="/current-issue"
            style={{
              fontFamily: 'Jost, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9A7B23',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Read article <span>→</span>
          </Link>
        </div>
      </div>

      {/* Vertical list / Up-to-Bottom selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7288' }}>
            Scroll Articles ({currentIndex + 1}/{articles.length})
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={handlePrev}
              title="Previous Article"
              aria-label="Previous article"
              style={{
                width: '32px',
                height: '32px',
                border: '1px solid #E6E1D6',
                background: '#FFFFFF',
                color: '#0B1B3A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                transition: 'all 0.15s',
              }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Next Article"
              aria-label="Next article"
              style={{
                width: '32px',
                height: '32px',
                border: '1px solid #E6E1D6',
                background: '#FFFFFF',
                color: '#0B1B3A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                transition: 'all 0.15s',
              }}
            >
              ▼
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
          {articles.map((item, idx) => {
            const isSelected = idx === currentIndex
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${isSelected ? '#C4A24C' : '#E6E1D6'}`,
                  background: isSelected ? '#FAF7EE' : '#FFFFFF',
                  padding: '11px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 2px 8px rgba(196, 162, 76, 0.15)' : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '17px',
                    fontWeight: 600,
                    color: isSelected ? '#9A7B23' : '#8C94A6',
                    minWidth: '24px',
                  }}
                >
                  0{idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: isSelected ? '#9A7B23' : '#8C94A6', marginBottom: '1px' }}>
                    {item.tag}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: '14.5px',
                      color: isSelected ? '#0B1B3A' : '#475569',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </div>
                </div>
                {isSelected && (
                  <div style={{ width: '4px', height: '20px', background: '#C4A24C', borderRadius: '2px' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ background: '#0B1B3A', color: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '0 var(--layout-pad)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          minHeight: 'calc(100vh - 148px)',
          alignItems: 'center',
          gap: 'clamp(32px, 4vw, 64px)',
        }}>
          <div style={{ padding: 'clamp(44px, 7vw, 76px) 0' }}>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12.5px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '26px' }}>
              Asgard Publications · Volume 12, Number 1
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(34px, 6.4vw, 66px)', lineHeight: 1.04, margin: '0 0 26px', letterSpacing: '-0.01em' }}>
              Journal of Contemporary Research
            </h1>
            <div style={{ width: '92px', height: '2px', background: '#C4A24C', marginBottom: '26px' }} />
            <p style={{ fontSize: 'clamp(16.5px, 1.6vw, 19px)', lineHeight: 1.65, color: '#C3CBDC', maxWidth: '560px', margin: '0 0 38px' }}>
              Advancing scholarly discourse through rigorous double-blind peer review in the humanities, social sciences, and interdisciplinary studies.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <HoverLink to="/guidelines" bg="#C4A24C" hoverBg="#E3CB86" textColor="#071228" style={{ padding: '16px 32px' }}>
                Submit a manuscript
              </HoverLink>
              <OutlineLink to="/current-issue" style={{ padding: '16px 32px' }}>
                Read current issue
              </OutlineLink>
            </div>
          </div>

          <div style={{ padding: 'clamp(0px, 3vw, 60px) 0 clamp(44px, 6vw, 60px)' }}>
            <Book3D />
          </div>
        </div>
      </section>

      {/* ── Metrics bar ─────────────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF', borderBottom: '1px solid #E6E1D6' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '0 var(--layout-pad)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
        }}>
          {METRICS.map(m => (
            <div key={m.label} style={{ padding: '34px 28px', borderLeft: '1px solid #E6E1D6', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(27px, 3.8vw, 40px)', fontWeight: 600, color: '#0B1B3A', lineHeight: 1 }}>
                {m.value}
              </div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6B7288', marginTop: '10px' }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scope & facts ───────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 'var(--layout-max)',
        margin: '0 auto',
        padding: 'clamp(48px, 7vw, 84px) var(--layout-pad)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '48px 72px',
      }}>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '14px' }}>
            Scope &amp; Mission
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(27px, 3.8vw, 40px)', lineHeight: 1.15, margin: '0 0 22px', color: '#0B1B3A' }}>
            Scholarship that crosses disciplinary boundaries
          </h2>
          <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.78, color: '#3A4157', margin: '0 0 18px' }}>
            We publish original research articles, review essays, and critical commentaries that advance understanding in their respective fields. Our editorial process holds the highest standards of academic integrity while providing constructive, timely feedback to authors.
          </p>
          <p style={{ fontSize: 'clamp(16px, 1.5vw, 17.5px)', lineHeight: 1.78, color: '#3A4157', margin: '0 0 30px' }}>
            Submissions are welcome across political science, sociology, anthropology, history, philosophy, economics, and education — with particular encouragement for work that bridges fields or applies innovative methodology.
          </p>
          <TextLink to="/about">More about the journal</TextLink>
        </div>

        <aside style={{ background: '#FFFFFF', border: '1px solid #E6E1D6', padding: '34px 32px' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0B1B3A', paddingBottom: '16px', borderBottom: '2px solid #C4A24C' }}>
            At a glance
          </div>
          {FACTS.map(f => (
            <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', padding: '14px 0', borderBottom: '1px solid #EFEBE1', fontSize: '15px' }}>
              <span style={{ color: '#6B7288' }}>{f.k}</span>
              <span style={{ color: '#0B1B3A', textAlign: 'right', fontWeight: 600 }}>{f.v}</span>
            </div>
          ))}
        </aside>
      </section>

      {/* ── Featured articles ────────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #E6E1D6', borderBottom: '1px solid #E6E1D6' }}>
        <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(48px, 7vw, 80px) var(--layout-pad)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', marginBottom: '40px' }}>
            <div>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '12px' }}>
                Latest research
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(26px, 3.6vw, 38px)', margin: 0, color: '#0B1B3A' }}>
                Featured articles
              </h2>
            </div>
            <TextLink to="/current-issue" style={{ whiteSpace: 'nowrap' }}>View all</TextLink>
          </div>
          <FeaturedVerticalScroller articles={FEATURED} />
        </div>
      </section>

      {/* ── Call for papers ──────────────────────────────────────────────── */}
      <section style={{ background: '#0B1B3A', color: '#FFFFFF' }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: 'clamp(44px, 6vw, 66px) var(--layout-pad)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '28px 48px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '14px' }}>
              Call for papers
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(25px, 3.4vw, 36px)', margin: '0 0 12px' }}>
              Special issue: Democracy and the Digital Public Sphere
            </h2>
            <p style={{ fontSize: '17px', color: '#C3CBDC', margin: 0, lineHeight: 1.6 }}>
              Abstracts due 30 November 2026 · Full manuscripts due 28 February 2027
            </p>
          </div>
          <HoverLink to="/guidelines" bg="#C4A24C" hoverBg="#E3CB86" textColor="#071228" style={{ padding: '17px 34px', whiteSpace: 'nowrap' }}>
            Read guidelines
          </HoverLink>
        </div>
      </section>

      {/* ── Indexes ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 62px) var(--layout-pad)' }}>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6B7288', textAlign: 'center', marginBottom: '28px' }}>
          Indexed &amp; abstracted in
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '20px' }}>
          {INDEXES.map(ix => (
            <div key={ix} style={{
              height: '74px',
              border: '1px solid #E6E1D6',
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(11,27,58,0.05) 0 2px, transparent 2px 9px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: '#6B7288',
              textTransform: 'uppercase',
            }}>
              {ix}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/* ─── Shared micro-components ──────────────────────────────────────────── */
function HoverLink({ to, bg, hoverBg, textColor, children, style = {} }) {
  const [h, setH] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '14px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: h ? hoverBg : bg,
        color: textColor,
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'background 0.15s',
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </Link>
  )
}

function OutlineLink({ to, children, style = {} }) {
  const [h, setH] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '14px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        border: `1px solid ${h ? '#C4A24C' : 'rgba(255,255,255,0.35)'}`,
        color: h ? '#E3CB86' : '#FFFFFF',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'border-color 0.15s, color 0.15s',
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </Link>
  )
}

function TextLink({ to, children, style = {} }) {
  const [h, setH] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '13.5px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: h ? '#9A7B23' : '#0B1B3A',
        borderBottom: '1px solid #C4A24C',
        display: 'inline-block',
        paddingBottom: '4px',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'color 0.15s',
        ...style,
      }}
    >
      {children}
    </Link>
  )
}
