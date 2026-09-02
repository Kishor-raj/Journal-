import React from 'react';

function buildPageRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = buildPageRange(currentPage, totalPages);

  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    padding: '0 10px',
    border: '1px solid var(--color-rule-grey)',
    borderRadius: '6px',
    background: 'var(--color-surface)',
    color: 'var(--color-ink-navy)',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    userSelect: 'none',
  };

  const activeStyle = {
    background: 'var(--color-citation-gold)',
    color: 'var(--color-ink-navy)',
    borderColor: 'var(--color-citation-gold)',
    fontWeight: 600,
  };

  const disabledStyle = {
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'inherit',
      }}
      aria-label="Pagination"
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        style={{
          ...btnBase,
          ...(currentPage <= 1 ? disabledStyle : {}),
        }}
        aria-label="Previous page"
      >
        &#x2039;
      </button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--color-text-muted)' }}>
            &hellip;
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              ...btnBase,
              ...(page === currentPage ? activeStyle : {}),
            }}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        style={{
          ...btnBase,
          ...(currentPage >= totalPages ? disabledStyle : {}),
        }}
        aria-label="Next page"
      >
        &#x203A;
      </button>
    </nav>
  );
}
