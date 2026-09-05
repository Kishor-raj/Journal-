import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Editorial Board', to: '/board' },
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
    const handleResize = () => setIsMobile(window.innerWidth < 1180)
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
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          maxWidth: 'var(--layout-max)',
          margin: '0 auto',
          padding: '9px clamp(16px, 3vw, 24px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px 24px',
          flexWrap: 'wrap',
          boxSizing: 'border-box',
          width: '100%',
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
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(196, 162, 76, 0.35)',
        boxShadow: '0 2px 10px rgba(196, 162, 76, 0.08), 0 1px 3px rgba(11, 27, 58, 0.04)',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          padding: '12px clamp(18px, 2.8vw, 44px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 'clamp(14px, 1.8vw, 30px)',
          flexWrap: 'nowrap',
          minHeight: '88px',
          boxSizing: 'border-box',
        }}>
          {/* Left section: Logo + Journal Title */}
          <div
            onClick={() => { navigate('/'); handleNavClick() }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(10px, 1vw, 14px)',
              cursor: 'pointer',
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <img
              src="/asgard-logo.jpg"
              alt="Asgard Publications"
              style={{ height: 'clamp(46px, 4.4vw, 60px)', width: 'auto', mixBlendMode: 'multiply', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: '5px', minWidth: 0 }}>
              <span style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(12px, 0.98vw, 14.5px)',
                fontWeight: 700,
                color: '#0B1B3A',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH
              </span>
              <span style={{
                fontFamily: 'Jost, sans-serif',
                fontSize: 'clamp(12px, 0.98vw, 14.5px)',
                fontWeight: 700,
                color: '#C4A24C',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                (IJIDCR)
              </span>
            </div>
          </div>

          {/* Right section: Desktop nav links + Gold Rounded Login button */}
          {!isMobile && (
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(2px, 0.4vw, 8px)',
              flexWrap: 'nowrap',
              justifyContent: 'flex-end',
              marginLeft: 'auto',
              flexShrink: 0,
            }}>
              {NAV_ITEMS.map(({ label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  style={({ isActive }) => ({
                    fontFamily: 'Jost, sans-serif',
                    fontSize: 'clamp(12px, 0.92vw, 14px)',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    color: isActive ? '#0B1B3A' : '#4B5468',
                    padding: '8px clamp(2px, 0.3vw, 5px)',
                    cursor: 'pointer',
                    borderBottom: isActive ? '2.5px solid #C4A24C' : '2.5px solid transparent',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'color 0.15s, border-bottom 0.15s',
                  })}
                >
                  {label}
                </NavLink>
              ))}
              <Link
                to="/login"
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: 'clamp(12px, 0.9vw, 13.5px)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: 'linear-gradient(180deg, #D4AF37 0%, #C4A24C 60%, #B38E2F 100%)',
                  padding: 'clamp(7px, 0.7vw, 9px) clamp(16px, 1.4vw, 24px)',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  flexShrink: 0,
                  marginLeft: 'clamp(4px, 0.5vw, 8px)',
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(196, 162, 76, 0.35)',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(196, 162, 76, 0.45)'
                  e.currentTarget.style.filter = 'brightness(1.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(196, 162, 76, 0.35)'
                  e.currentTarget.style.filter = 'none'
                }}
              >
                LOGIN
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
                gap: '8px',
                border: '1px solid rgba(196, 162, 76, 0.4)',
                padding: '9px 13px',
                cursor: 'pointer',
                background: '#FDFCF9',
                borderRadius: '6px',
                flexShrink: 0,
                marginLeft: 'auto',
              }}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <div style={{ display: 'grid', gap: '3px' }}>
                <div style={{ width: '18px', height: '2px', background: '#0B1B3A' }} />
                <div style={{ width: '18px', height: '2px', background: '#0B1B3A' }} />
                <div style={{ width: '18px', height: '2px', background: '#C4A24C' }} />
              </div>
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: '11.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0B1B3A', fontWeight: 600 }}>
                {menuOpen ? 'Close' : 'Menu'}
              </span>
            </button>
          )}
        </div>

        {/* Mobile drawer */}
        {isMobile && menuOpen && (
          <div style={{ borderTop: '1px solid #E6E1D6', background: '#FFFFFF', padding: '10px clamp(16px, 3vw, 24px) 22px', boxSizing: 'border-box', width: '100%' }}>
            {NAV_ITEMS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={handleNavClick}
                style={({ isActive }) => ({
                  display: 'block',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '15px',
                  letterSpacing: '0.04em',
                  color: isActive ? '#0B1B3A' : '#4B5468',
                  padding: '13px 4px 13px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #EFEBE1',
                  borderLeft: isActive ? '3px solid #C4A24C' : '2px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                })}
              >
                {label}
              </NavLink>
            ))}
            <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
              <Link
                to="/login"
                onClick={handleNavClick}
                style={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  background: 'linear-gradient(180deg, #D4AF37 0%, #C4A24C 60%, #B38E2F 100%)',
                  padding: '11px 24px',
                  borderRadius: '9999px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(196, 162, 76, 0.35)',
                }}
              >
                LOGIN
              </Link>
            </div>
          </div>
        )}

        {/* Gradient rule */}
        <div style={{ height: '2px', background: 'var(--gradient-rule)' }} />
      </header>

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
