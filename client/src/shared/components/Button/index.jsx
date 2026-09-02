import React from 'react';

const sizes = {
  sm: { padding: '6px 12px', fontSize: '0.8125rem', borderRadius: '6px' },
  md: { padding: '9px 18px', fontSize: '0.875rem', borderRadius: '8px' },
  lg: { padding: '12px 28px', fontSize: '0.9375rem', borderRadius: '8px' },
};

const variants = {
  primary: {
    background: 'var(--dash-primary)',
    color: 'var(--color-surface)',
    border: '1px solid var(--dash-primary)',
    shadow: 'none',
    hoverShadow: 'var(--dash-shadow-md)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-ink-body)',
    border: '1px solid var(--color-rule-grey)',
    shadow: 'none',
    hoverShadow: 'none',
  },
  danger: {
    background: 'var(--color-danger)',
    color: 'var(--color-surface)',
    border: '1px solid var(--color-danger)',
    shadow: 'none',
    hoverShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-ink-muted)',
    border: '1px solid transparent',
    shadow: 'none',
    hoverShadow: 'none',
  },
};

const hoverVariants = {
  primary: { background: 'var(--dash-primary-light)', borderColor: 'var(--dash-primary-light)' },
  secondary: { background: 'var(--dash-surface-hover)', borderColor: 'var(--color-ink-muted)' },
  danger: { background: '#a52d20', borderColor: '#a52d20' },
  ghost: { background: 'var(--dash-bg)', color: 'var(--color-ink-body)' },
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
    ? 'var(--color-rule-light)'
    : isHovered
    ? hv.background || v.background
    : v.background;

  const computedBorder = isDisabled
    ? 'var(--color-rule-grey)'
    : isHovered && hv.borderColor
    ? hv.borderColor
    : v.border;

  const computedColor = isDisabled ? 'var(--color-ink-muted)' : isHovered ? (hv.color || v.color) : v.color;

  const computedShadow = isHovered ? (hv.hoverShadow || v.hoverShadow) : v.shadow;

  const focusRing = isFocused
    ? { outline: '3px solid rgba(27, 42, 74, 0.15)', outlineOffset: '2px' }
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
          fontFamily: 'inherit',
          fontWeight: 600,
          lineHeight: 1.3,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease, box-shadow 0.2s ease',
          opacity: isDisabled ? 0.6 : 1,
          background: computedBg,
          color: computedColor,
          border: computedBorder,
          boxShadow: computedShadow,
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
