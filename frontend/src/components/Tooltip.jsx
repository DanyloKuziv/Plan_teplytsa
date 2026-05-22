import React, { useState, useRef } from 'react'

export default function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children || (
        <button
          type="button"
          tabIndex={0}
          className="w-4 h-4 rounded-full bg-border text-muted text-[10px] font-bold flex items-center justify-center hover:bg-accent/20 hover:text-accent transition-colors ml-1 flex-shrink-0"
          aria-label={text}
        >
          ?
        </button>
      )}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-card border border-border text-xs text-txt rounded-lg shadow-card pointer-events-none whitespace-pre-wrap max-w-[220px] text-center animate-fadeIn">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </span>
      )}
    </span>
  )
}
