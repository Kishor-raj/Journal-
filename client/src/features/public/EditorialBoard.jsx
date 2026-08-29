import { useState } from 'react'

const BOARD = [
  { role: 'Deputy Editor', name: 'Prof. James Nakamura', inst: 'Columbia University', field: 'Comparative Politics' },
  { role: 'Associate Editor', name: 'Dr. Sofia Reyes', inst: 'Universidad de Buenos Aires', field: 'Sociology' },
  { role: 'Associate Editor', name: 'Prof. David Chen', inst: 'National University of Singapore', field: 'Economics' },
  { role: 'Section Editor', name: 'Dr. Amara Osei', inst: 'University of Ghana', field: 'Anthropology' },
  { role: 'Section Editor', name: 'Prof. Helena Kowalski', inst: 'University of Warsaw', field: 'Philosophy' },
  { role: 'Section Editor', name: 'Dr. Marcus Singh', inst: 'University of Toronto', field: 'Education' },
  { role: 'Book Review Editor', name: 'Prof. Ingrid Larsen', inst: 'University of Oslo', field: 'History' },
  { role: 'Managing Editor', name: 'Dr. Raj Patel', inst: 'London School of Economics', field: 'Research Methods' },
  { role: 'Statistical Editor', name: 'Dr. Yuki Tanaka', inst: 'Kyoto University', field: 'Quantitative Methods' },
]

function BoardCard({ role, name, inst, field }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${hovered ? '#C4A24C' : '#E6E1D6'}`,
        padding: '28px 26px',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '10.5px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '12px' }}>
        {role}
      </div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(20px, 2.1vw, 23px)', color: '#0B1B3A', margin: '0 0 8px' }}>
        {name}
      </h3>
      <div style={{ fontSize: '15px', color: '#3A4157', marginBottom: '4px' }}>{inst}</div>
      <div style={{ fontSize: '14.5px', color: '#6B7288', fontStyle: 'italic' }}>{field}</div>
    </div>
  )
}

export default function EditorialBoard() {
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
            Governance
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(30px, 5.4vw, 52px)', margin: '0 0 14px' }}>
            Editorial Board
          </h1>
          <p style={{ fontSize: 'clamp(15.5px, 1.6vw, 18px)', color: '#C3CBDC', margin: 0 }}>
            The scholars guiding our editorial process
          </p>
        </div>
      </div>

      {/* Board body */}
      <div style={{ maxWidth: 'var(--layout-max)', margin: '0 auto', padding: 'clamp(40px, 6vw, 72px) var(--layout-pad) clamp(56px, 8vw, 90px)' }}>
        <p style={{ fontSize: 'clamp(16px, 1.6vw, 18px)', lineHeight: 1.8, color: '#3A4157', maxWidth: '760px', margin: '0 0 48px' }}>
          Our editorial board comprises distinguished scholars from leading institutions worldwide. Their expertise and commitment to academic excellence ensure the quality and integrity of every article we publish.
        </p>

        {/* Editor-in-Chief spotlight */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E6E1D6',
          borderTop: '3px solid #C4A24C',
          padding: '40px',
          display: 'grid',
          gridTemplateColumns: '132px minmax(0, 1fr)',
          gap: '28px 36px',
          marginBottom: '44px',
        }}>
          <div style={{
            aspectRatio: '1',
            backgroundImage: 'repeating-linear-gradient(135deg, rgba(11,27,58,0.07) 0 2px, transparent 2px 9px)',
            border: '1px solid #E6E1D6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '9.5px',
            letterSpacing: '0.08em',
            color: '#6B7288',
            textAlign: 'center',
            padding: '8px',
          }}>
            PORTRAIT
          </div>
          <div>
            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9A7B23', marginBottom: '10px' }}>
              Editor-in-Chief
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 'clamp(25px, 3.2vw, 34px)', color: '#0B1B3A', margin: '0 0 8px' }}>
              Dr. Eleanor Whitfield
            </h2>
            <div style={{ fontSize: '16px', color: '#3A4157', marginBottom: '18px' }}>
              University of Cambridge · Political Theory
            </div>
            <p style={{ fontSize: '16.5px', lineHeight: 1.75, color: '#3A4157', margin: 0, maxWidth: '660px' }}>
              Dr. Whitfield has led the journal since 2019, overseeing a doubling of annual submissions while shortening median time to first decision. Her research examines democratic legitimacy in plural societies.
            </p>
          </div>
        </div>

        {/* Board grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
          {BOARD.map(b => <BoardCard key={b.name} {...b} />)}
        </div>
      </div>
    </>
  )
}
