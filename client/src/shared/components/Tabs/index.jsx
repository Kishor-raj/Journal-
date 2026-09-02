import React from 'react';

export default function Tabs({ tabs = [], activeKey, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid var(--color-rule-grey)',
        marginBottom: 'var(--space-4)',
        overflowX: 'auto',
        fontFamily: 'inherit',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderBottom: isActive ? '2px solid var(--color-citation-gold)' : '2px solid transparent',
              marginBottom: '-2px',
              color: isActive ? 'var(--color-citation-gold-dark)' : 'var(--color-ink-black)',
              opacity: isActive ? 1 : 0.65,
            }}
          >
            {tab.label}
          </div>
        );
      })}
    </div>
  );
}
