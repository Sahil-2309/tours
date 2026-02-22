import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
          {toasts.map((t) => (
            <ToastItem key={t.id} {...t} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ id, message, type, onClose }) => {
  const config = {
    success: {
      bg: 'bg-emerald-900/95 border-emerald-600',
      icon: '✓',
      accent: 'text-emerald-300',
    },
    error: {
      bg: 'bg-red-950/95 border-red-600',
      icon: '✕',
      accent: 'text-red-300',
    },
    info: {
      bg: 'bg-slate-800/95 border-cyan-600',
      icon: 'ℹ',
      accent: 'text-cyan-300',
    },
    warning: {
      bg: 'bg-amber-950/95 border-amber-600',
      icon: '⚠',
      accent: 'text-amber-300',
    },
  }[type] || config.info;

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-sm animate-fade ${config.bg}`}
    >
      <span className={`text-lg font-bold ${config.accent}`}>{config.icon}</span>
      <p className="text-slate-100 font-medium flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-slate-200 p-1 -mr-1 transition-colors"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
};
