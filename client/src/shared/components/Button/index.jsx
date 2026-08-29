import React from 'react';

const sizes = {
  sm: { padding: '6px 12px', fontSize: '0.875rem', borderRadius: '4px' },
  md: { padding: '10px 20px', fontSize: '1rem', borderRadius: '6px' },
  lg: { padding: '14px 28px', fontSize: '1.125rem', borderRadius: '8px' },
};

const variants = {
  primary: {
    background: 'var(--color-citation-gold)',
    color: 'var(--color-ink-navy)',
    border: '2px solid var(--color-citation-gold)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-ink-navy)',
    border: '2px solid var(--color-rule-grey)',
  },
  danger: {
    background: 'var(--color-danger)',
    color: 'var(--color-surface)',
    border: '2px solid var(--color-danger)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-ink-navy)',
    border: '2px solid transparent',
  },
};

const hoverVariants = {
  primary: { background: 'var(--color-citation-gold-dark)', borderColor: 'var(--color-citation-gold-dark)' },
  secondary: { background: 'rgba(13, 27, 62, 0.06)' },
  danger: { background: '#a52d20', borderColor: '#a52d20' },
  ghost: { background: 'rgba(13, 27, 62, 0.06)' },
};

const spinnerKeyframes = `
@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
`;

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '1em',
        height: '1em',
        border: '2px solid currentColor',
        borderRightColor: 'transparent',
        borderRadius: '50%',
        animation: 'btn-spin 0.6s linear infinite',
        marginRight: '8px',
        verticalAlign: 'middle',
      }}
    />
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick,
  className,
  type = 'button',
  style: styleProp,
  ...rest
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const isDisabled = disabled || loading;
  const base = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const hv = hoverVariants[variant] || hoverVariants.primary;

  const computedBg = isDisabled
    ? 'var(--color-rule-grey)'
    : isHovered
    ? hv.background || v.background
    : v.background;

  const computedBorder = isDisabled
    ? 'var(--color-rule-grey)'
    : isHovered && hv.borderColor
    ? hv.borderColor
    : v.border;

  const computedColor = isDisabled ? '#888' : v.color;

  const focusRing = isFocused
    ? { outline: '3px solid rgba(201, 162, 39, 0.4)', outlineOffset: '2px' }
    : {};

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={className}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: isDisabled ? 0.6 : 1,
          background: computedBg,
          color: computedColor,
          border: computedBorder,
          ...base,
          ...focusRing,
          ...styleProp,
        }}
        {...rest}
      >
        {loading && <Spinner />}
        {children}
      </button>
    </>
  );
}
