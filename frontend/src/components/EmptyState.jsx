import React from 'react'

const SVG_ILLUSTRATIONS = {
  greenhouse: (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <ellipse cx="60" cy="75" rx="45" ry="5" fill="#1a1f2e"/>
      <path d="M20 70 C20 45 35 30 60 30 C85 30 100 45 100 70" fill="#222736" stroke="#2a3040" strokeWidth="2"/>
      <path d="M20 70h80" stroke="#2a3040" strokeWidth="2"/>
      <rect x="50" y="50" width="20" height="20" rx="2" fill="#1a1f2e" stroke="#00d4aa" strokeWidth="1.5"/>
      <path d="M30 70V52M90 70V52" stroke="#2a3040" strokeWidth="1.5"/>
      <path d="M60 30V15" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/>
      <circle cx="60" cy="12" r="4" fill="#00d4aa22" stroke="#00d4aa" strokeWidth="1.5"/>
      <path d="M40 62c3-8 7-10 10-6M70 62c3-8 7-10 10-6" stroke="#00d4aa" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  plans: (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <rect x="25" y="10" width="70" height="60" rx="4" fill="#222736" stroke="#2a3040" strokeWidth="2"/>
      <rect x="25" y="10" width="70" height="14" rx="4" fill="#1a1f2e" stroke="#2a3040" strokeWidth="2"/>
      <path d="M35 22h50M35 35h30M35 45h20M35 55h35" stroke="#2a3040" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="85" cy="55" r="12" fill="#00d4aa22" stroke="#00d4aa" strokeWidth="1.5"/>
      <path d="M80 55l3 3 6-6" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  data: (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <rect x="15" y="60" width="90" height="3" rx="1.5" fill="#2a3040"/>
      <rect x="25" y="40" width="12" height="20" rx="2" fill="#222736" stroke="#2a3040" strokeWidth="1.5"/>
      <rect x="44" y="30" width="12" height="30" rx="2" fill="#222736" stroke="#2a3040" strokeWidth="1.5"/>
      <rect x="63" y="50" width="12" height="10" rx="2" fill="#222736" stroke="#2a3040" strokeWidth="1.5"/>
      <rect x="82" y="20" width="12" height="40" rx="2" fill="#222736" stroke="#00d4aa" strokeWidth="1.5"/>
      <path d="M25 38 C35 25 50 45 65 28 C75 18 85 20 95 15" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  ),
  alerts: (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <circle cx="60" cy="40" r="28" fill="#222736" stroke="#2a3040" strokeWidth="2"/>
      <path d="M49 55l11-30 11 30" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M52 47h16" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="60" cy="55" r="1.5" fill="#00d4aa"/>
    </svg>
  ),
  empty: (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
      <ellipse cx="60" cy="72" rx="30" ry="4" fill="#1a1f2e"/>
      <rect x="30" y="20" width="60" height="50" rx="6" fill="#222736" stroke="#2a3040" strokeWidth="2"/>
      <path d="M45 40 Q60 55 75 40" stroke="#2a3040" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="48" cy="33" r="3" fill="#2a3040"/>
      <circle cx="72" cy="33" r="3" fill="#2a3040"/>
    </svg>
  ),
}

const typeMap = {
  '🏡': 'greenhouse',
  '📋': 'plans',
  '📈': 'data',
  '💹': 'data',
  '✅': 'alerts',
  '📰': 'data',
}

export default function EmptyState({ icon = '📭', title, description, actionLabel, onAction, illustrationType }) {
  const svgKey = illustrationType || typeMap[icon] || 'empty'
  const illustration = SVG_ILLUSTRATIONS[svgKey]

  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="mb-5 opacity-70 select-none">
        {illustration}
      </div>
      {title && (
        <h3 className="text-base font-semibold text-txt mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-muted max-w-xs mb-6 leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-accent px-6 py-2.5 shadow-glow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
