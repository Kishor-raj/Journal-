import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Board', to: '/board' },
  { label: 'Guidelines', to: '/guidelines' },
  { label: 'Current Issue', to: '/current-issue' },
  { label: 'Archives', to: '/archives' },
  { label: 'Ethics', to: '/ethics' },
  { label: 'Contact', to: '/contact' },
]

const FOOTER_COLS = [
  {
    title: 'Journal',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Editorial board', to: '/board' },
      { label: 'Publication ethics', to: '/ethics' },
      { label: 'Open access policy', to: '/about' },
    ],
  },
  {
    title: 'Authors',
    links: [
      { label: 'Submission guidelines', to: '/guidelines' },
      { label: 'Manuscript template', to: '/guidelines' },
      { label: 'Author portal', to: '/login' },
      { label: 'Copyright & licensing', to: '/guidelines' },
    ],
  },
  {
    title: 'Browse',
    links: [
      { label: 'Current issue', to: '/current-issue' },
      { label: 'Archives', to: '/archives' },
      { label: 'Special issues', to: '/archives' },
      { label: 'Most cited', to: '/archives' },
    ],
  },
]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 940)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close menu on navigation
  const handleNavClick = () => setMenuOpen(false)

  return (
    <div className="public-layout">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{
        background: '#071228',
        color: '#C9CEDC',
        fontFamily: 'Jost, sans-serif',
        fontSize: '12.5px',
        letterSpacing: '0.04em',
      }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '9px var(--layout-pad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px 24px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '6px 26px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>ISSN 2977-4418 (Online)</span>
            {!isMobile && <span style={{ opacity: 0.35 }}>|</span>}
            {!isMobile && <span>Peer-reviewed &amp; Open Access</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px 26px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>editorial@asgardpublications.com</span>
            {!isMobile && <span style={{ color: '#C4A24C' }}>Indexed in 14 databases</span>}
          </div>
        </div>
      </div>

      {/* ── Sticky nav ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#FFFFFF',
        borderBottom: '1px solid #E6E1D6',
        boxShadow: '0 1px 0 rgba(11,27,58,0.03)',
      }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '14px var(--layout-pad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px 32px',
          flexWrap: 'wrap',
          minHeight: '92px',
        }}>
          {/* Logo */}
          <div
            onClick={() => { navigate('/'); handleNavClick() }}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
          >
            <img
              src="/asgard-logo.jpg"
              alt="Asgard Publications"
              style={{ height: 'clamp(40px, 8.5vw, 62px)', width: 'auto', mixBlendMode: 'multiply' }}
            />
          </div>

          {/* Desktop nav */}
          {!isMobile && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {NAV_ITEMS.map(({ label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  style={({ isActive }) => ({
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '13.5px',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    color: isActive ? '#0B1B3A' : '#4B5468',
                    padding: '10px 10px',
                    cursor: 'pointer',
                    borderBottom: isActive ? '2px solid #C4A24C' : '2px solid transparent',
                    fontWeight: isActive ? 500 : 400,
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  })}
                >
                  {label}
                </NavLink>
              ))}
              <div style={{ width: '1px', height: '26px', background: '#E6E1D6', margin: '0 12px' }} />
              <Link
                to="/login"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#0B1B3A',
                  padding: '10px 16px',
                  border: '1px solid #0B1B3A',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0B1B3A'; e.currentTarget.style.color = '#FFFFFF' }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#0B1B3A' }}
              >
                Login
              </Link>
            </nav>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid #E6E1D6',
                padding: '11px 14px',
                cursor: 'pointer',
                background: '#FDFCF9',
              }}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ width: '20px', height: '2px', background: '#0B1B3A' }} />
                <div style={{ width: '20px', height: '2px', background: '#0B1B3A' }} />
                <div style={{ width: '20px', height: '2px', background: '#C4A24C' }} />
              </div>
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0B1B3A' }}>
                {menuOpen ? 'Close' : 'Menu'}
              </span>
            </button>
          )}
        </div>

        {/* Mobile drawer */}
        {isMobile && menuOpen && (
          <div style={{ borderTop: '1px solid #E6E1D6', background: '#FFFFFF', padding: '10px var(--layout-pad) 22px' }}>
            {NAV_ITEMS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={handleNavClick}
                style={({ isActive }) => ({
                  display: 'block',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '16px',
                  letterSpacing: '0.04em',
                  color: isActive ? '#0B1B3A' : '#4B5468',
                  padding: '15px 4px 15px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #EFEBE1',
                  borderLeft: isActive ? '2px solid #C4A24C' : '2px solid transparent',
                  fontWeight: isActive ? 500 : 400,
                  textDecoration: 'none',
                })}
              >
                {label}
              </NavLink>
            ))}
            <div style={{ display: 'grid', gap: '10px', marginTop: '18px' }}>
              <Link
                to="/login"
                onClick={handleNavClick}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13.5px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#0B1B3A',
                  padding: '15px',
                  border: '1px solid #0B1B3A',
                  textAlign: 'center',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                Login
              </Link>
            </div>
          </div>
        )}

        {/* Gradient rule */}
        <div style={{ height: '2px', background: 'var(--gradient-rule)' }} />
      </div>

      {/* ── Page content ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#071228', color: '#C3CBDC' }}>
        {/* Gradient rule */}
        <div style={{ height: '2px', background: 'var(--gradient-rule)' }} />

        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: 'clamp(44px, 6vw, 62px) var(--layout-pad) 30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '40px 48px',
        }}>
          {/* Brand blurb */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(23px, 2.8vw, 30px)', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.06em' }}>
              ASGARD
            </div>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#C4A24C', marginBottom: '20px' }}>
              Publications
            </div>
            <p style={{ fontSize: '15.5px', lineHeight: 1.75, color: '#96A0B8', margin: 0, maxWidth: '300px' }}>
              An independent academic publisher committed to open, rigorous, and globally accessible scholarship.
            </p>
          </div>

          {/* Footer link columns */}
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#FFFFFF', marginBottom: '18px' }}>
                {col.title}
              </div>
              <div style={{ display: 'grid', gap: '11px' }}>
                {col.links.map(link => (
                  <Link
                    key={link.label}
                    to={link.to}
                    style={{ fontSize: '15.5px', color: '#96A0B8', cursor: 'pointer', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#E3CB86' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#96A0B8' }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Copyright bar */}
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '24px var(--layout-pad) 40px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '24px',
          fontFamily: 'Jost, sans-serif',
          fontSize: '12.5px',
          color: '#6E7897',
          letterSpacing: '0.03em',
          flexWrap: 'wrap',
        }}>
          <span>© 2026 Asgard Publications. All rights reserved.</span>
          <span>Content licensed under CC BY 4.0 · ISSN 2977-4418</span>
        </div>
      </footer>
    </div>
  )
}
