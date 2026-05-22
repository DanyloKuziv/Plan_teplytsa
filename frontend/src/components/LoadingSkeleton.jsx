import React from 'react'

function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, #222736 25%, #2a3040 50%, #222736 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
      }}
    />
  )
}

export default function LoadingSkeleton({ rows = 3, className = '', variant = 'card' }) {
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Shimmer key={i} className="h-4" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    )
  }

  if (variant === 'table-row') {
    return (
      <div className={`${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3.5 border-b border-border">
            <Shimmer className="h-4 w-1/4" />
            <Shimmer className="h-4 w-1/4" />
            <Shimmer className="h-4 w-1/6" />
            <Shimmer className="h-4 w-1/5" />
          </div>
        ))}
      </div>
    )
  }

  // card variant (default)
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shimmer className="h-10 w-10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}
