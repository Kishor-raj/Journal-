import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldHalf, Gauge, Users, MailOpen, FileText, Inbox, MailCheck, BarChart2, Server,
  UserCircle, Feather, Route, RotateCw, Bell, HelpCircle, PenLine, UserCheck, Gavel,
  CheckCircle2, ClipboardCheck, Layers, BookOpen, Search, History, Menu, ChevronLeft, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* ═══════════════════════════════════════════════════════════════════════════
   NAV CONFIG  — mirrors the sidebar from each sample HTML file exactly
   ═══════════════════════════════════════════════════════════════════════════ */
const NAV = {
  /* ── ADMIN ── */
  admin: {
    portalLabel: 'Admin Portal',
    roleBadge: 'Administrator',
    roleIcon: ShieldHalf,
    badgeVariant: 'accent',
    sections: [
      {
        label: 'Overview',
        items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: Gauge }],
      },
      {
        label: 'Management',
        items: [
          { to: '/admin/users', label: 'Users', icon: Users },
          { to: '/admin/contact-inquiries', label: 'Contact Inquiries', icon: MailOpen },
        ],
      },
      {
        label: 'Logs',
        items: [
          { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
        ],
      },
      {
        label: 'Notifications',
        items: [
          { to: '/admin/notifications', label: 'History', icon: Inbox },
          { to: '/admin/email-templates', label: 'Email Templates', icon: MailCheck },
          { to: '/admin/email-stats', label: 'Delivery Stats', icon: BarChart2 },
          { to: '/admin/email-provider', label: 'Provider Status', icon: Server },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/profile', label: 'Profile', icon: UserCircle },
        ],
      },
    ],
  },

  /* ── AUTHOR ── */
  author: {
    portalLabel: 'Author Portal',
    roleBadge: 'Author',
    roleIcon: Feather,
    badgeVariant: 'success',
    sections: [
      {
        label: 'Submissions',
        items: [
          { to: '/author/dashboard',  label: 'Dashboard',          icon: Gauge },
          { to: '/author/manuscripts', label: 'My Manuscripts',    icon: FileText },
          { to: '/author/track',       label: 'Track Manuscript',  icon: Route },
          { to: '/author/revisions',   label: 'Revisions',         icon: RotateCw },
        ],
      },
      {
        label: 'Communication',
        items: [
          { to: '/author/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/profile',      label: 'Profile', icon: UserCircle },
          { to: '/author/help',  label: 'Help',    icon: HelpCircle },
        ],
      },
    ],
  },

  /* ── EDITOR ── */
  editor: {
    portalLabel: 'Editor Workspace',
    roleBadge: 'Editor',
    roleIcon: PenLine,
    badgeVariant: 'info',
    sections: [
      {
        label: 'Workflow',
        items: [
          { to: '/editor/dashboard',   label: 'Dashboard',           icon: Gauge },
          { to: '/editor/queue',       label: 'Manuscripts',         icon: FileText, match: ['/editor/queue', '/editor/manuscripts'] },
          { to: '/editor/reviewers',   label: 'Reviewer Management', icon: UserCheck },
          { to: '/editor/decisions',   label: 'Decisions',           icon: Gavel },
          { to: '/editor/accepted',    label: 'Accepted & Published', icon: CheckCircle2 },
        ],
      },
      {
        label: 'Communication',
        items: [
          { to: '/editor/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/profile', label: 'Profile', icon: UserCircle },
        ],
      },
    ],
  },

  /* ── MODERATOR ── */
  moderator: {
    portalLabel: 'Moderator Console',
    roleBadge: 'Moderator',
    roleIcon: ClipboardCheck,
    badgeVariant: 'accent',
    sections: [
      {
        label: 'Screening',
        items: [
          { to: '/moderator/dashboard', label: 'Dashboard',        icon: Gauge },
          { to: '/moderator/screening', label: 'Moderation Queue', icon: Layers, match: ['/moderator/screening'] },
          { to: '/moderator/rules',     label: 'Screening Rules',  icon: BookOpen },
        ],
      },
      {
        label: 'Communication',
        items: [
          { to: '/moderator/notifications', label: 'Notifications', icon: Bell },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/profile', label: 'Profile', icon: UserCircle },
        ],
      },
    ],
  },

  /* ── REVIEWER ── */
  reviewer: {
    portalLabel: 'Reviewer Portal',
    roleBadge: 'Reviewer',
    roleIcon: Search,
    badgeVariant: 'blue',
    sections: [
      {
        label: 'Reviews',
        items: [
          { to: '/reviewer/dashboard',   label: 'Dashboard',   icon: Gauge },
          { to: '/reviewer/invitations', label: 'Invitations', icon: MailOpen },
          { to: '/reviewer/assignments', label: 'My Reviews',  icon: ClipboardCheck, match: ['/reviewer/assignments'], exclude: ['/extension'] },
          { to: '/reviewer/extensions',  label: 'Extensions',  icon: History, match: ['/reviewer/extensions'], endsWith: ['/extension'] },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/profile', label: 'Profile', icon: UserCircle },
        ],
      },
    ],
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   BADGE COLOUR MAP
   ═══════════════════════════════════════════════════════════════════════════ */
const BADGE = {
  accent:  { bg: 'rgba(196,146,46,0.15)', border: 'rgba(196,146,46,0.3)',  color: '#D9A94A' },
  success: { bg: 'rgba(43,122,75,0.15)',  border: 'rgba(43,122,75,0.3)',   color: '#5EC487' },
  info:    { bg: 'rgba(46,107,158,0.15)', border: 'rgba(46,107,158,0.3)',  color: '#7CB9D4' },
  blue:    { bg: 'rgba(124,185,212,0.12)',border: 'rgba(124,185,212,0.25)',color: '#7CB9D4' },
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function initials(name) {
  if (!name) return '?'
  const clean = name.replace(/\bundefined\b/g, '').trim()
  if (!clean) return '?'
  const p = clean.split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV ITEM
   ═══════════════════════════════════════════════════════════════════════════ */
function isItemActive(pathname, item) {
  let active
  if (Array.isArray(item.match)) {
    active = item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  } else if (Array.isArray(item.endsWith)) {
    active = item.endsWith.some((s) => pathname.endsWith(s))
  } else {
    active = pathname === item.to
  }
  if (active && Array.isArray(item.exclude)) {
    active = !item.exclude.some((s) => pathname.endsWith(s))
  }
  return active
}

function NavItem({ item, collapsed }) {
  const [hovered, setHovered] = useState(false)
  const { pathname } = useLocation()

  const isActive = isItemActive(pathname, item)

  return (
    <NavLink
      to={item.to}
      viewTransition
      end
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        color: isActive ? '#FFFFFF' : hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 500,
        cursor: 'pointer',
        textDecoration: 'none',
        position: 'relative',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        marginBottom: '2px',
        background: isActive
          ? 'rgba(255,255,255,0.12)'
          : hovered
          ? 'rgba(255,255,255,0.08)'
          : 'transparent',
        transition: 'background 150ms ease, color 150ms ease',
        borderLeft: isActive ? '3px solid #C4922E' : '3px solid transparent',
        paddingLeft: '9px', // compensate for border
      }}
      title={collapsed ? item.label : undefined}
    >
      <item.icon size={16} style={{ width: '20px', minWidth: '20px', flexShrink: 0 }} />
      <span style={{
        opacity: collapsed ? 0 : 1,
        transition: 'opacity 150ms ease',
        overflow: 'hidden',
        pointerEvents: collapsed ? 'none' : 'auto',
      }}>
        {item.label}
      </span>
    </NavLink>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION LABEL
   ═══════════════════════════════════════════════════════════════════════════ */
function SectionLabel({ label, collapsed }) {
  return (
    <div style={{
      fontSize: '10px',
      fontWeight: 600,
      color: 'rgba(255,255,255,0.3)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      padding: collapsed ? '0' : '12px 8px 4px',
      height: collapsed ? '0' : 'auto',
      opacity: collapsed ? 0 : 1,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      transition: 'opacity 150ms ease, padding 150ms ease, height 150ms ease',
    }}>
      {label}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD LAYOUT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardLayout() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setCollapsed(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Predict role from URL if user is not loaded yet, to avoid sidebar flash
  const predictedRole = user?.role || location.pathname.split('/')[1]
  const cfg = NAV[predictedRole] ?? NAV[user?.role] ?? null
  const isCollapsed = !isMobile && collapsed

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebarWidth = isMobile ? 'min(86vw, 280px)' : (isCollapsed ? '64px' : '256px')

  /* ── SIDEBAR ──────────────────────────────────────────────────────────── */
  const Sidebar = (
    <aside style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      background: '#1B2A4A',
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      transition: 'width 250ms ease, min-width 250ms ease',
      overflow: 'hidden',
      flexShrink: 0,
      position: isMobile ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      zIndex: 200,
    }}>

      {/* Brand row */}
      <div style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        gap: '10px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          width: '32px', height: '32px', minWidth: '32px',
          background: '#C4922E',
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Playfair Display', serif",
          fontWeight: 800, fontSize: '16px',
          color: '#0F1A30',
          flexShrink: 0,
        }}>
          J
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', opacity: isCollapsed ? 0 : 1, transition: 'opacity 150ms ease', pointerEvents: isCollapsed ? 'none' : 'auto' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.2 }}>IJIDCR-ASGARD</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
            {cfg?.portalLabel ?? 'Dashboard'}
          </span>
        </div>
      </div>

      {/* Role badge */}
      {cfg && !isCollapsed && (
        <div style={{
          margin: '14px 14px 0',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '11px', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', gap: '6px',
          overflow: 'hidden', whiteSpace: 'nowrap',
          background: BADGE[cfg.badgeVariant].bg,
          border: `1px solid ${BADGE[cfg.badgeVariant].border}`,
          color: BADGE[cfg.badgeVariant].color,
        }}>
          <cfg.roleIcon size={12} />
          {cfg.roleBadge}
        </div>
      )}

      {/* Nav sections */}
      <nav style={{
        flex: 1,
        padding: '12px 8px',
        overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
      }}>
        {cfg?.sections.map(section => (
          <div key={section.label}>
            <SectionLabel label={section.label} collapsed={isCollapsed} />
            {section.items.map((item, idx) => (
              <NavItem key={`${item.to}-${item.label}-${idx}`} item={item} collapsed={isCollapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        {!isMobile && (
          <CollapseBtn collapsed={isCollapsed} onClick={() => setCollapsed(c => !c)} />
        )}
      </div>
    </aside>
  )

  /* ── MAIN AREA ────────────────────────────────────────────────────────── */
  return (
    <div className="dash-scope" style={{
      display: 'flex',
      height: '100dvh',
      overflow: 'hidden',
      background: '#F4F5F7',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 199 }}
        />
      )}

      {/* Sidebar — always visible on desktop, toggled on mobile */}
      {(!isMobile || mobileOpen) && Sidebar}

      {/* Content column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: '64px',
          background: '#1B2A4A',
          borderBottom: '2px solid #C4922E',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `0 ${isMobile ? '16px' : '24px'}`,
          flexShrink: 0,
          zIndex: 10,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: '18px', padding: '4px', display: 'flex' }}
                aria-label="Toggle menu"
              >
                <Menu size={20} />
              </button>
            )}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 500 }}>
              {cfg ? `${cfg.roleBadge} Portal` : 'Dashboard'}
            </span>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0 }}>
            {/* Bell */}
            <button 
              type="button" 
              className="bell-shake"
              aria-label="Notifications" 
              onClick={() => {
                if (predictedRole) {
                  const notifyPath = predictedRole === 'reviewer' ? '/reviewer/dashboard' : `/${predictedRole}/notifications`;
                  // We add viewTransition inside navigate for react-router v7 if we want smooth transition, but global viewTransition is often on links.
                  navigate(notifyPath, { viewTransition: true });
                }
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D9A94A', position: 'relative', padding: '4px', display: 'flex' }}
            >
              <Bell size={18} />
              <span style={{ width: '8px', height: '8px', background: '#F59E0B', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px', border: '1.5px solid #1B2A4A' }} />
            </button>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#C4922E', color: '#0F1A30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                {initials(user?.name)}
              </div>
              {!isMobile && (
                <div style={{ lineHeight: 1.25, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{user?.name ?? 'User'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', textTransform: 'capitalize' }}>{user?.role ?? ''}</div>
                </div>
              )}
            </div>

            {/* Logout */}
            <LogoutBtn onClick={handleLogout} />
          </div>
        </header>

        {/* Page outlet */}
        <main style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', viewTransitionName: 'dashboard-main' }}>
          {loading ? (
            <div style={{ height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(196,146,46,0.2)', borderTopColor: '#C4922E', animation: 'auth-spin 0.8s linear infinite' }} />
            </div>
          ) : !user ? (
            <Navigate to="/login" replace />
          ) : (
            <div style={{ animation: 'fade-in 0.3s ease-out' }}>
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Small reusable button components
   ───────────────────────────────────────────────────────────────────────────── */
function CollapseBtn({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '8px',
        border: 'none',
        background: hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
        color: hovered ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 150ms ease, color 150ms ease',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <ChevronLeft size={14} style={{ transition: 'transform 250ms ease', transform: collapsed ? 'rotate(180deg)' : 'none' }} />
      {!collapsed && <span>Collapse</span>}
    </button>
  )
}

function LogoutBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}`,
        padding: '5px 14px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '12px',
        color: hovered ? '#fff' : 'rgba(255,255,255,0.7)',
        transition: 'border-color 150ms ease, color 150ms ease',
      }}
    >
      <LogOut size={12} style={{ marginRight: '5px' }} />
      Logout
    </button>
  )
}
