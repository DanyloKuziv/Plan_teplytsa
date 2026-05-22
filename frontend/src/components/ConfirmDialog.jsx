import React from 'react'

export default function ConfirmDialog({ title, message, itemName, onConfirm, onCancel, confirmLabel = 'Видалити', danger = true }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-modalIn">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-danger/15' : 'bg-warn/15'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={danger ? '#ff4757' : '#ffa502'} strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-txt">{title}</h3>
              {itemName && (
                <p className="text-sm font-medium text-danger mt-0.5">«{itemName}»</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 btn-ghost py-2.5"
            >
              Скасувати
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 font-semibold rounded-lg transition-all duration-150 text-sm active:scale-[0.97] ${
                danger
                  ? 'bg-danger hover:bg-danger/80 text-white shadow-glow-danger'
                  : 'bg-warn hover:bg-warn/80 text-bg'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
