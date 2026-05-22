import React from 'react'
import { formatCurrency, formatWeight, formatNumber } from '../utils/format.js'
import EmptyState from './EmptyState.jsx'

function accuracyColor(score) {
  if (score >= 80) return { ring: 'stroke-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
  if (score >= 50) return { ring: 'stroke-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' }
  return { ring: 'stroke-red-500', text: 'text-red-600 dark:text-red-400' }
}

function CircleScore({ score }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score || 0))
  const offset = circ - (pct / 100) * circ
  const colors = accuracyColor(pct)

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          className={colors.ring}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="55" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200" fontSize="18" fontWeight="700">
          {pct.toFixed(0)}%
        </text>
      </svg>
      <span className={`text-sm font-medium mt-1 ${colors.text}`}>Точність прогнозу</span>
    </div>
  )
}

function deviationCell(val) {
  if (val === null || val === undefined) return <span className="text-slate-400">—</span>
  const isPos = val >= 0
  return (
    <span className={isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
      {isPos ? '+' : ''}{formatNumber(val)}
    </span>
  )
}

export default function AnalyticsBlock({ analytics }) {
  if (!analytics) return null

  if (!analytics.has_harvest_data) {
    return (
      <EmptyState
        icon="📊"
        title="Немає даних збору"
        description="Додайте записи врожаю для порівняння прогнозу з фактичними результатами."
      />
    )
  }

  const { forecast, actuals, deviation, accuracy_score } = analytics

  const rows = [
    {
      metric: 'Врожай (кг)',
      forecast: formatWeight(forecast?.expected_yield_kg),
      actual: formatWeight(actuals?.yield_kg),
      deviation: deviationCell(deviation?.yield_kg)
    },
    {
      metric: 'Дохід (грн)',
      forecast: formatCurrency(forecast?.revenue_uah),
      actual: formatCurrency(actuals?.revenue_uah),
      deviation: deviationCell(deviation?.revenue_uah)
    },
    {
      metric: 'Витрати (грн)',
      forecast: formatCurrency(forecast?.total_costs_uah),
      actual: formatCurrency(actuals?.total_costs_uah),
      deviation: deviationCell(deviation?.total_costs_uah)
    },
    {
      metric: 'Прибуток (грн)',
      forecast: formatCurrency(forecast?.net_profit_uah),
      actual: formatCurrency(actuals?.net_profit_uah),
      deviation: deviationCell(deviation?.net_profit_uah)
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <CircleScore score={accuracy_score} />
        <div className="flex-1 text-sm text-slate-500 dark:text-slate-400">
          <p>Оцінка точності розраховується як відповідність між прогнозом і фактичними показниками врожаю та прибутку.</p>
          {accuracy_score >= 80 && <p className="mt-1 text-emerald-600 dark:text-emerald-400 font-medium">Відмінна точність прогнозу!</p>}
          {accuracy_score >= 50 && accuracy_score < 80 && <p className="mt-1 text-yellow-600 dark:text-yellow-400 font-medium">Задовільна точність.</p>}
          {accuracy_score < 50 && <p className="mt-1 text-red-600 dark:text-red-400 font-medium">Низька точність. Перегляньте параметри.</p>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Метрика</th>
              <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Прогноз</th>
              <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Факт</th>
              <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Відхилення</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-3 text-slate-700 dark:text-slate-200 font-medium">{row.metric}</td>
                <td className="py-3 text-right text-slate-600 dark:text-slate-300">{row.forecast}</td>
                <td className="py-3 text-right text-slate-600 dark:text-slate-300">{row.actual}</td>
                <td className="py-3 text-right font-medium">{row.deviation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
