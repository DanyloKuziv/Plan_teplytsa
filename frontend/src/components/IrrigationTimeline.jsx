import React, { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { formatPhase, phaseColor } from '../utils/format.js'
import EmptyState from './EmptyState.jsx'

const PHASE_COLORS = {
  germination: '#eab308',
  seedling:    '#84cc16',
  vegetative:  '#10b981',
  flowering:   '#ec4899',
  fruiting:    '#f97316',
  ripening:    '#ef4444',
  harvest:     '#22c55e',
  dormancy:    '#94a3b8'
}

function getISOWeek(dateStr) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function weekLabel(weekKey) {
  const [year, wPart] = weekKey.split('-W')
  const week = parseInt(wPart)
  const jan1 = new Date(parseInt(year), 0, 1)
  const dayOfWeek = jan1.getDay() || 7
  const startOfWeek = new Date(jan1)
  startOfWeek.setDate(jan1.getDate() + (week - 1) * 7 - (dayOfWeek - 1))
  const d = startOfWeek.getDate()
  const m = startOfWeek.getMonth() + 1
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}

export default function IrrigationTimeline({ schedules = [] }) {
  const chartData = useMemo(() => {
    if (!schedules || schedules.length === 0) return []
    const weekMap = {}
    for (const s of schedules) {
      const wk = getISOWeek(s.scheduled_date)
      if (!weekMap[wk]) {
        weekMap[wk] = { week: wk, label: weekLabel(wk), volume: 0, phase: s.growth_phase }
      }
      weekMap[wk].volume += s.volume_liters || 0
    }
    return Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week))
  }, [schedules])

  if (!schedules || schedules.length === 0) {
    return <EmptyState icon="🌧️" title="Немає даних поливу" description="Графік зрошення з'явиться після генерації плану." />
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
      <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Графік поливу (по тижнях)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" Л" />
          <Tooltip
            formatter={(value) => [`${value.toFixed(1)} л`, 'Об\'єм']}
            labelFormatter={(label) => `Тиждень від ${label}`}
          />
          <Bar dataKey="volume" name="Об'єм (л)" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={PHASE_COLORS[entry.phase] || '#10b981'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(PHASE_COLORS).map(([phase, color]) => {
          const hasPhase = chartData.some(d => d.phase === phase)
          if (!hasPhase) return null
          return (
            <span key={phase} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
              {formatPhase(phase)}
            </span>
          )
        })}
      </div>
    </div>
  )
}
