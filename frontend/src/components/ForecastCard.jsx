import React from 'react'
import { formatCurrency, formatWeight } from '../utils/format.js'

function MetricTile({ icon, label, value, highlight }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-1 ${highlight || 'bg-hover'}`}>
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs text-muted mt-1">{label}</span>
      <span className="text-lg font-bold text-txt">{value}</span>
    </div>
  )
}

export default function ForecastCard({ forecast }) {
  if (!forecast) return null

  const {
    expected_yield_kg,
    revenue_uah,
    total_costs_uah,
    net_profit_uah,
    roi_percent,
    water_cost,
    fertilizer_cost,
    heating_cost,
    seed_cost,
  } = forecast

  // Each cost field is an object { cost_uah, ... } or a plain number (backward compat)
  const waterUah = water_cost?.cost_uah ?? water_cost ?? 0
  const fertUah  = fertilizer_cost?.cost_uah ?? fertilizer_cost ?? 0
  const heatUah  = heating_cost?.cost_uah ?? heating_cost ?? 0
  const seedUah  = seed_cost?.cost_uah ?? seed_cost ?? 0

  const profitPositive = (net_profit_uah || 0) >= 0
  const totalCosts = waterUah + fertUah + heatUah + seedUah

  function costPct(val) {
    if (!totalCosts) return 0
    return Math.round((val / totalCosts) * 100)
  }

  const waterPct = costPct(waterUah)
  const fertPct  = costPct(fertUah)
  const heatPct  = costPct(heatUah)
  const seedPct  = costPct(seedUah)

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-txt mb-4">Прогноз</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <MetricTile icon="🌾" label="Врожай" value={formatWeight(expected_yield_kg)} />
        <MetricTile icon="💰" label="Дохід" value={formatCurrency(revenue_uah)} />
        <MetricTile icon="📉" label="Витрати" value={formatCurrency(total_costs_uah)} />
        <MetricTile
          icon={profitPositive ? '📈' : '📉'}
          label="Прибуток"
          value={formatCurrency(net_profit_uah)}
          highlight={profitPositive ? 'bg-accent/10' : 'bg-danger/10'}
        />
        <MetricTile
          icon="🔄"
          label="ROI"
          value={roi_percent != null ? `${roi_percent.toFixed(1)}%` : '—'}
        />
      </div>

      <div>
        <p className="text-xs text-muted mb-2">Структура витрат</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-hover mb-3">
          {waterPct > 0 && <div className="bg-blue-400 h-full" style={{ width: `${waterPct}%` }} title={`Вода ${waterPct}%`} />}
          {fertPct  > 0 && <div className="bg-emerald-400 h-full" style={{ width: `${fertPct}%` }} title={`Добрива ${fertPct}%`} />}
          {heatPct  > 0 && <div className="bg-orange-400 h-full" style={{ width: `${heatPct}%` }} title={`Опалення ${heatPct}%`} />}
          {seedPct  > 0 && <div className="bg-purple-400 h-full" style={{ width: `${seedPct}%` }} title={`Насіння ${seedPct}%`} />}
        </div>

        <div className="space-y-1.5 text-xs">
          {waterUah > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 flex-shrink-0" />
                💧 Вода: {water_cost?.total_liters != null ? `${water_cost.total_liters} л` : '—'}
              </span>
              <span className="text-txt font-medium">{formatCurrency(waterUah)}</span>
            </div>
          )}
          {seedUah > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 flex-shrink-0" />
                🌱 Насіння: {seed_cost?.plants_count != null
                  ? `${seed_cost.plants_count} рослин${seed_cost.price_per_plant ? ` × ${seed_cost.price_per_plant} ₴` : ''}`
                  : '—'}
              </span>
              <span className="text-txt font-medium">{formatCurrency(seedUah)}</span>
            </div>
          )}
          {fertUah > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 flex-shrink-0" />
                🧪 Добрива: {fertilizer_cost?.total_grams != null ? `${fertilizer_cost.total_grams} г` : '—'}
              </span>
              <span className="text-txt font-medium">{formatCurrency(fertUah)}</span>
            </div>
          )}
          {heatUah > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 flex-shrink-0" />
                🔥 Опалення
              </span>
              <span className="text-txt font-medium">{formatCurrency(heatUah)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <span className="text-muted font-medium">Разом витрат</span>
            <span className="text-txt font-bold">{formatCurrency(total_costs_uah)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
