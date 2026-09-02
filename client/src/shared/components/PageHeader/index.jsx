import React from 'react';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-4)',
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-ink-navy)',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div style={{ color: 'var(--color-ink-black)', opacity: 0.65, fontSize: 'var(--text-sm)', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
