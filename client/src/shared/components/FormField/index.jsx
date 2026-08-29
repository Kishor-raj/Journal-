import React from 'react';

export default function FormField({
  label,
  error,
  helperText,
  children,
  required = false,
}) {
  return (
    <div style={{ marginBottom: '20px', fontFamily: 'var(--font-body)' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-ink-navy)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div
        style={{
          border: error ? '1px solid var(--color-danger)' : '1px solid var(--color-rule-grey)',
          borderRadius: '6px',
          transition: 'border-color 0.15s ease',
        }}
      >
        {children}
      </div>
      {error && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '0.8125rem',
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      )}
      {!error && helperText && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}
