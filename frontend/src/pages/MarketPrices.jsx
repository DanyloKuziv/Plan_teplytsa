import React, { useState, useCallback, useMemo } from 'react'
import Navbar from '../components/Navbar.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useApi } from '../hooks/useApi.js'
import { get as getPrices } from '../api/market_prices.js'
import { formatCurrency, formatDate } from '../utils/format.js'

function MiniSparkline({ values }) {
  if (!values || values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 60, h = 24, pad = 2
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const trend = values[values.length - 1] >= values[0]
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={points} fill="none" stroke={trend ? '#00d4aa' : '#ff4757'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PriceChange({ current, previous }) {
  if (!previous || previous === 0) return null
  const pct = ((current - previous) / previous * 100)
  const up = pct >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-accent' : 'text-danger'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export default function MarketPrices() {
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const fetchPrices = useCallback(() => getPrices(), [lastRefresh]) // eslint-disable-line
  const { data: prices, loading, refetch } = useApi(fetchPrices, [lastRefresh])

  function handleRefresh() {
    setLastRefresh(new Date())
    refetch()
  }

  const grouped = useMemo(() => {
    if (!prices) return []
    return [...prices].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
  }, [prices])

  // Group by plant+region for sparklines — latest 5 readings per pair
  const sparkMap = useMemo(() => {
    if (!prices) return {}
    const map = {}
    prices.forEach(p => {
      const key = `${p.plant_id}_${p.region}`
      if (!map[key]) map[key] = []
      map[key].push(p)
    })
    Object.keys(map).forEach(k => {
      map[k] = map[k].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    })
    return map
  }, [prices])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title">Ринкові ціни</h1>
            <p className="text-xs text-muted mt-1">Оновлено: {formatDate(lastRefresh.toISOString())}</p>
          </div>
          <button onClick={handleRefresh} className="btn-ghost flex items-center gap-2">
            <span className="text-base">🔄</span>
            Оновити
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton rows={8} variant="table-row" />
        ) : !grouped || grouped.length === 0 ? (
          <EmptyState icon="💹" title="Цінових даних немає" description="Спробуйте пізніше або оновіть сторінку." />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="table-th">Культура</th>
                    <th className="table-th">Регіон</th>
                    <th className="table-th text-right">Ціна</th>
                    <th className="table-th text-center">Тренд</th>
                    <th className="table-th text-right hidden sm:table-cell">Зміна</th>
                    <th className="table-th text-right hidden md:table-cell">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((p, i) => {
                    const spark = sparkMap[`${p.plant_id}_${p.region}`] || []
                    const sparkVals = spark.map(s => s.price_per_kg)
                    const prevPrice = sparkVals.length >= 2 ? sparkVals[sparkVals.length - 2] : null
                    return (
                      <tr key={i} className="table-row-hover">
                        <td className="table-td font-semibold text-txt">
                          {p.plant_name || `#${String(p.plant_id).slice(0, 8)}`}
                        </td>
                        <td className="table-td text-muted">{p.region || '—'}</td>
                        <td className="table-td text-right">
                          <span className="font-bold text-accent">{formatCurrency(p.price_per_kg)}</span>
                          <span className="text-muted text-xs">/кг</span>
                        </td>
                        <td className="table-td text-center">
                          <MiniSparkline values={sparkVals} />
                        </td>
                        <td className="table-td text-right hidden sm:table-cell">
                          <PriceChange current={p.price_per_kg} previous={prevPrice} />
                        </td>
                        <td className="table-td text-right text-muted hidden md:table-cell">
                          {formatDate(p.recorded_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border text-xs text-muted flex items-center justify-between">
              <span>Всього записів: {grouped.length}</span>
              <span>Ціни оновлюються щоденно о 06:00</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
