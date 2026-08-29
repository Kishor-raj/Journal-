import React from 'react';

const ACCENT_COLORS = {
  gold: 'var(--color-citation-gold)',
  blue: '#1565C0',
  amber: 'var(--color-warning)',
  green: 'var(--color-success)',
  purple: '#7C3AED',
  red: 'var(--color-danger)',
};

export default function StatCard({ label, value, sublabel, accent = 'gold' }) {
  const borderColor = ACCENT_COLORS[accent] || accent || ACCENT_COLORS.gold;

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-elevated)',
        borderTop: `3px solid ${borderColor}`,
        padding: '18px 20px',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-ink-black)',
          opacity: 0.6,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--color-ink-navy)',
          marginTop: '6px',
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-black)', opacity: 0.6, marginTop: '4px' }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
