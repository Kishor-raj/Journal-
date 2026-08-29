import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

const typeStyles = {
  success: {
    background: 'var(--color-success)',
    color: 'var(--color-surface)',
    icon: '\u2713',
  },
  error: {
    background: 'var(--color-danger)',
    color: 'var(--color-surface)',
    icon: '\u2717',
  },
  info: {
    background: 'var(--color-ink-navy)',
    color: 'var(--color-surface)',
    icon: '\u2139',
  },
};

const toastAnimKeyframes = `
@keyframes toast-enter {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes toast-exit {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100%); }
}
`;

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);
    return () => clearTimeout(timerRef.current);
  }, [toast, onRemove]);

  const style = typeStyles[toast.type] || typeStyles.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '8px',
        background: style.background,
        color: style.color,
        fontFamily: 'var(--font-body)',
        fontSize: '0.9375rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(13, 27, 62, 0.15)',
        minWidth: '280px',
        maxWidth: '420px',
        animation: exiting ? 'toast-exit 0.3s ease forwards' : 'toast-enter 0.3s ease',
        cursor: 'pointer',
      }}
      onClick={() => {
        clearTimeout(timerRef.current);
        setExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{style.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <style>{toastAnimKeyframes}</style>
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
