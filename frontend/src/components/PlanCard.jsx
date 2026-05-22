import React from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatWeight, formatCurrency } from '../utils/format.js'

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Обробка', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
    ready:   { label: 'Готово',  cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
    error:   { label: 'Помилка', cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' }
  }
  const s = map[status] || { label: status, cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
  )
}

export default function PlanCard({ plan, forecast }) {
  const plantName = plan.plant_name || plan.farmer_plant?.plant?.name || 'Культура'
  const area = plan.area_m2 || plan.area

  return (
    <Link
      to={`/planting-plans/${plan.id}`}
      className="block bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🌱</span>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">{plantName}</h4>
          </div>
          {area && (
            <p className="text-xs text-slate-400 ml-7">{area} м²</p>
          )}
        </div>
        <StatusBadge status={plan.status} />
      </div>
      <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
        {plan.planted_at && (
          <span>🗓 {formatDate(plan.planted_at)}</span>
        )}
        {plan.expected_harvest_at && (
          <span>🏁 {formatDate(plan.expected_harvest_at)}</span>
        )}
      </div>
      {forecast && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-4 text-xs">
          {forecast.expected_yield_kg != null && (
            <span className="text-emerald-600 dark:text-emerald-400">
              🌾 {formatWeight(forecast.expected_yield_kg)}
            </span>
          )}
          {forecast.net_profit_uah != null && (
            <span className={forecast.net_profit_uah >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
              💰 {formatCurrency(forecast.net_profit_uah)}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
