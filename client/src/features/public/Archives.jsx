import { useState } from 'react'

const VOLUMES = [
  { title: 'Volume 12 (2026)', count: '1 issue · 8 articles (current)', issues: ['Issue 1'] },
  { title: 'Volume 11 (2025)', count: '4 issues · 31 articles', issues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4'] },
  { title: 'Volume 10 (2024)', count: '4 issues · 29 articles', issues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4'] },
  { title: 'Volume 9 (2023)', count: '4 issues · 28 articles', issues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4'] },
  { title: 'Volume 8 (2022)', count: '4 issues · 26 articles', issues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4'] },
  { title: 'Volume 7 (2021)', count: '4 issues · 24 articles', issues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4'] },
]

function VolumeRow({ title, count, issues }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        padding: '26px 30px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '18px 32px',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s',
      }}
    >
      <div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(22px, 2.4vw, 26px)', color: '#0B1B3A', margin: '0 0 4px' }}>
          {title}
        </h3>
        <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '12.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7288' }}>
          {count}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {issues.map(iss => (
          <IssueButton key={iss}>{iss}</IssueButton>
        ))}
      </div>
    </div>
  )
}

function IssueButton({ children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '13px',
        letterSpacing: '0.04em',
        color: hovered ? '#9A7B23' : '#0B1B3A',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        padding: '10px 20px',
        cursor: 'pointer',
        background: hovered ? '#FFFFFF' : '#FDFCF9',
        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export default function Archives() {
  const [query, setQuery] = useState('')

  const filtered = VOLUMES.filter(v =>
    !query || v.title.toLowerCase().includes(query.toLowerCase())
  )

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
            2015 — 2026
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Archives
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            Browse past volumes and issues
          </p>
        </div>
      </div>

      {/* Search + volumes */}
      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '44px', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search titles, authors, keywords"
            style={{
              flex: 1,
              minWidth: '280px',
              padding: '15px 18px',
              border: '1px solid #E6E1D6',
              background: '#FFFFFF',
              fontSize: '16px',
              color: '#1C2233',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#C4A24C' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E6E1D6' }}
          />
          <SearchButton onClick={() => {/* could hook up full search */}}>
            Search
          </SearchButton>
        </div>

        {/* Volume list */}
        <div style={{ display: 'grid', gap: '18px' }}>
          {filtered.map(v => <VolumeRow key={v.title} {...v} />)}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7288', fontStyle: 'italic', fontSize: '16px' }}>
              No results found for "{query}"
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SearchButton({ children, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: 'Jost, sans-serif',
        fontSize: '13.5px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: hovered ? '#071228' : '#0B1B3A',
        color: '#FFFFFF',
        padding: '15px 30px',
        cursor: 'pointer',
        border: 'none',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}
