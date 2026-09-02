import React from 'react';

export default function StatCard({ label, value, sublabel, icon, iconBg, iconColor, accentColor }) {
  const resolvedIconBg = iconBg || 'var(--dash-bg, #F4F5F7)';
  const resolvedIconColor = iconColor || 'var(--dash-text-muted, #8B8F9A)';

  return (
    <div
      style={{
        background: 'var(--dash-surface, #FFFFFF)',
        borderRadius: '12px',
        border: '1px solid var(--dash-surface-border, #E2E4E8)',
        borderTop: `3px solid ${accentColor || 'var(--dash-accent, #C4922E)'}`,
        padding: '24px',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--dash-text-muted, #8B8F9A)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              background: resolvedIconBg,
              color: resolvedIconColor,
            }}
          >
            <i className={icon} />
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--dash-text-primary, #1A1A2E)',
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--dash-text-muted, #8B8F9A)',
            marginTop: '4px',
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
