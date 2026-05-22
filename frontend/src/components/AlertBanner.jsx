import React, { useState } from 'react'
import { formatDate } from '../utils/format.js'

const alertIcon = (type) => {
  if (type === 'high_temperature') return '🌡️'
  if (type === 'high_co2')        return '🌫️'
  if (type === 'low_humidity')    return '💧'
  return '⚠️'
}

export default function AlertBanner({ alerts = [] }) {
  const [expanded, setExpanded] = useState(false)

  if (!alerts || alerts.length === 0) return null

  const visible = expanded ? alerts : alerts.slice(0, 2)
  const extra = alerts.length - 2

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-red-500 text-xl leading-none">🚨</span>
        <span className="font-semibold text-red-700 dark:text-red-300 text-sm">Активні алерти</span>
      </div>
      <ul className="space-y-1.5">
        {visible.map((alert, i) => (
          <li key={alert.id || i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <span className="text-base leading-snug">{alertIcon(alert.type)}</span>
            <span className="flex-1">{alert.message}</span>
            <span className="text-xs text-red-400 dark:text-red-500 whitespace-nowrap">{formatDate(alert.created_at)}</span>
          </li>
        ))}
      </ul>
      {!expanded && extra > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          + {extra} більше
        </button>
      )}
      {expanded && alerts.length > 2 && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          Сховати
        </button>
      )}
    </div>
  )
}
