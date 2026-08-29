import React from 'react';
import Button from '../Button';

export default function EmptyState({ icon, message, actionLabel, onAction }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        fontFamily: 'var(--font-body)',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: '16px',
            color: 'var(--color-text-muted)',
            fontSize: '3rem',
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          margin: 0,
          marginBottom: actionLabel ? '24px' : 0,
          fontSize: '1rem',
          color: 'var(--color-ink-navy)',
          maxWidth: '360px',
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
