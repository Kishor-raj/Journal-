import React, { useEffect, useRef, useCallback } from 'react';

const overlayKeyframes = `
@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes modal-slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      const timer = setTimeout(() => {
        if (panelRef.current) panelRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  const isConfirmation = variant === 'confirmation';

  return (
    <>
      <style>{overlayKeyframes}</style>
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(13, 27, 62, 0.55)',
          backdropFilter: 'blur(4px)',
          animation: 'modal-fade-in 0.2s ease',
          padding: '24px',
        }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-modal)',
            width: '100%',
            maxWidth: isConfirmation ? '440px' : '600px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            outline: 'none',
            animation: 'modal-slide-up 0.25s ease',
          }}
        >
          {title && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-rule-grey)',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--color-ink-navy)',
                }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--color-text-muted)',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink-black)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                &#x2715;
              </button>
            </div>
          )}
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
