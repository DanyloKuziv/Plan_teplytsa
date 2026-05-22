import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

const typeStyles = {
  success: { border: 'border-accent',   icon: '✔', iconColor: 'text-accent' },
  error:   { border: 'border-danger',   icon: '✖', iconColor: 'text-danger' },
  warning: { border: 'border-warn',     icon: '⚠', iconColor: 'text-warn' },
  info:    { border: 'border-blue-400', icon: 'ℹ', iconColor: 'text-blue-400' },
}

function Toast({ id, message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(() => onClose(id), 4000)
    return () => clearTimeout(t)
  }, [id, onClose])

  const s = typeStyles[type] || typeStyles.info

  return (
    <div
      className={`flex items-start gap-3 min-w-[280px] max-w-sm bg-card border border-border border-l-4 ${s.border} shadow-2xl rounded-xl p-4 toast-enter`}
      role="alert"
    >
      <span className={`mt-0.5 text-base leading-none font-bold ${s.iconColor}`}>{s.icon}</span>
      <p className="flex-1 text-sm text-txt leading-snug">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="ml-1 text-muted hover:text-txt text-xl leading-none transition-colors"
        aria-label="Закрити"
      >
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
