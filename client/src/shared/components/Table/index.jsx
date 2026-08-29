import React from 'react';

function SkeletonRow({ columns }) {
  return (
    <tr>
      {columns.map((col, i) => (
        <td key={col.key || i} style={{ padding: '12px 16px' }}>
          <div
            style={{
              height: '16px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #E6EAF3 25%, #F1F3F9 50%, #E6EAF3 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              width: `${60 + Math.random() * 40}%`,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

const shimmerKeyframes = `
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

export default function Table({
  columns = [],
  data = [],
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
}) {
  if (loading) {
    return (
      <>
        <style>{shimmerKeyframes}</style>
        <div style={wrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={thStyle}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((n) => (
                <SkeletonRow key={n} columns={columns} />
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={wrapperStyle}>
        <div style={emptyStyle}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={thStyle}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                ...trStyle,
                cursor: onRowClick ? 'pointer' : 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(13, 27, 62, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={tdStyle}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const wrapperStyle = {
  width: '100%',
  overflowX: 'auto',
  borderRadius: '8px',
  border: '1px solid var(--color-rule-grey)',
  background: 'var(--color-surface)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9375rem',
};

const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  fontWeight: 600,
  fontSize: '0.8125rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-ink-navy)',
  borderBottom: '1px solid var(--color-rule-grey)',
  background: 'var(--color-surface-sunken)',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-rule-grey)',
  color: 'var(--color-ink-black)',
  verticalAlign: 'middle',
};

const trStyle = {
  transition: 'background 0.12s ease',
};

const emptyStyle = {
  padding: '48px 24px',
  textAlign: 'center',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
};
