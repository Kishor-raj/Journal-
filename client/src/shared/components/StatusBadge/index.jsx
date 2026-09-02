import React from 'react';
import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from '../../utils/constants';

function formatLabel(str) {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status }) {
  if (!status) return null;
  const colors = STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '0.8125rem',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1.4,
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {formatLabel(status)}
    </span>
  );
}
