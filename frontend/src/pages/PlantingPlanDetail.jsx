import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import ForecastCard from '../components/ForecastCard.jsx'
import IrrigationTimeline from '../components/IrrigationTimeline.jsx'
import AnalyticsBlock from '../components/AnalyticsBlock.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getStatus, getForecast, getIrrigationSchedule, getAnalytics } from '../api/planting_plans.js'
import { formatDate, formatPhase, phaseColor } from '../utils/format.js'
import { useToast } from '../context/ToastContext.jsx'
import client from '../api/client.js'

const PLAN_TABS = ['Полив', 'Аналітика']

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Обробка…', cls: 'badge bg-warn/15 text-warn' },
    ready:   { label: 'Готово',   cls: 'badge badge-accent' },
    error:   { label: 'Помилка',  cls: 'badge badge-danger' }
  }
  const s = map[status] || { label: status, cls: 'badge badge-muted' }
  return (
    <span className={`inline-flex items-center gap-1.5 ${s.cls}`}>
      {status === 'pending' && <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />}
      {status === 'ready'   && <span className="w-2 h-2 rounded-full bg-accent" />}
      {status === 'error'   && <span className="w-2 h-2 rounded-full bg-danger" />}
      {s.label}
    </span>
  )
}

function ProgressBar({ progress }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-muted mb-1.5">
        <span>Обробка плану…</span>
        <span>{progress || 0}%</span>
      </div>
      <div className="h-2 bg-hover rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${progress || 0}%` }}
        />
      </div>
    </div>
  )
}

function FinancialMetric({ label, value, suffix, color }) {
  return (
    <div className="metric-card">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-txt'}`}>
        {value != null
          ? suffix
            ? `${typeof value === 'number' ? value.toLocaleString('uk-UA') : value} ${suffix}`
            : `${Number(value).toLocaleString('uk-UA')} ₴`
          : '—'}
      </p>
    </div>
  )
}

export default function PlantingPlanDetail() {
  const { id } = useParams()
  const { addToast } = useToast()
  const [status, setStatus] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [irrigation, setIrrigation] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Полив')

  useEffect(() => {
    async function fetchPlan() {
      try {
        const { data } = await client.get(`/planting-plans/${id}`)
        setPlan(data)
      } catch {}
    }
    fetchPlan()
  }, [id])

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getStatus(id)
      setStatus(s)
      return s
    } catch {
      return null
    }
  }, [id])

  useEffect(() => {
    let timer = null
    setLoading(true)

    async function poll() {
      const s = await fetchStatus()
      if (!s) { setLoading(false); return }

      if (s.status === 'ready') {
        setLoading(false)
        try {
          const [f, irr, a] = await Promise.all([
            getForecast(id).catch(() => null),
            getIrrigationSchedule(id).catch(() => []),
            getAnalytics(id).catch(() => null)
          ])
          setForecast(f)
          setIrrigation(Array.isArray(irr) ? irr : [])
          setAnalytics(a)
        } catch {}
      } else if (s.status === 'pending') {
        setLoading(false)
        timer = setTimeout(poll, 3000)
      } else {
        setLoading(false)
      }
    }

    poll()
    return () => { if (timer) clearTimeout(timer) }
  }, [id, fetchStatus])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <LoadingSkeleton rows={4} />
        </main>
      </div>
    )
  }

  const isPending = status?.status === 'pending'
  const isReady   = status?.status === 'ready'
  const isError   = status?.status === 'error'

  const fertSchedules = plan?.fertilizer_schedules || []

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/greenhouses" className="text-sm text-muted hover:text-accent transition-colors">
            ← Назад
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="page-title">План посадки</h1>
              {status && <StatusBadge status={status.status} />}
            </div>
            {plan && (
              <p className="text-sm text-muted mt-1">
                {plan.plant_name || plan.farmer_plant?.plant?.name || ''}
                {plan.area ? ` · ${plan.area} м²` : ''}
                {plan.planted_at ? ` · Посаджено ${formatDate(plan.planted_at)}` : ''}
              </p>
            )}
          </div>
        </div>

        {isPending && (
          <div className="card p-6">
            <p className="text-txt text-sm">Обчислення плану. Зачекайте…</p>
            <ProgressBar progress={status?.progress} />
          </div>
        )}

        {isError && (
          <EmptyState icon="❌" title="Помилка генерації плану" description="Перевірте параметри і спробуйте знову." />
        )}

        {isReady && (
          <>
            {forecast && (
              <div>
                <ForecastCard forecast={forecast} />
              </div>
            )}

            {/* Growing conditions at plan creation */}
            {plan && (plan.irrigation_coverage != null || plan.heating_coverage != null) && (() => {
              const irrigCov = plan.irrigation_coverage ?? 100
              const heatCov  = plan.heating_coverage  ?? 100
              const irrigSt  = irrigCov >= 100 ? 'ok' : irrigCov >= 60 ? 'warn' : 'bad'
              const heatSt   = heatCov  >= 100 ? 'ok' : heatCov  >= 70 ? 'warn' : 'bad'
              const colors   = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444' }
              const irrigPen = irrigCov < 80
              const heatPen  = heatCov  < 70
              return (
                <div className="card p-5">
                  <h3 className="font-semibold text-txt text-sm mb-4">🏗 Умови вирощування на момент створення плану</h3>
                  <div className="space-y-3">
                    {/* Irrigation */}
                    <div className="flex items-center gap-3">
                      <span className="text-base">💧</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted">Покриття поливу</span>
                          <span className="font-bold" style={{ color: colors[irrigSt] }}>
                            {irrigCov.toFixed(0)}%
                            {irrigSt === 'ok' ? ' ✓' : irrigSt === 'warn' ? ' ⚠' : ' ✗'}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-hover">
                          <div className="h-full rounded-full transition-all" style={{ width: `${irrigCov}%`, background: colors[irrigSt] }} />
                        </div>
                        {irrigPen && (
                          <p className="text-[11px] text-warn mt-1">Застосовано знижку врожаю: −15%</p>
                        )}
                      </div>
                    </div>
                    {/* Heating */}
                    <div className="flex items-center gap-3">
                      <span className="text-base">🔥</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted">Покриття опалення</span>
                          <span className="font-bold" style={{ color: colors[heatSt] }}>
                            {heatCov.toFixed(0)}%
                            {heatSt === 'ok' ? ' ✓' : heatSt === 'warn' ? ' ⚠' : ' ✗'}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-hover">
                          <div className="h-full rounded-full transition-all" style={{ width: `${heatCov}%`, background: colors[heatSt] }} />
                        </div>
                        {heatPen && (
                          <p className="text-[11px] text-danger mt-1">Застосовано знижку врожаю: −10%</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {(irrigPen || heatPen) && (
                    <p className="text-[11px] text-muted mt-3 pt-3 border-t border-border">
                      Прогноз врожаю скориговано з урахуванням умов вирощування.
                      Покращіть оснащення теплиці для збільшення врожайності.
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Financial forecast */}
            {forecast && (forecast.expected_yield_kg != null || forecast.revenue_uah != null || forecast.net_profit_uah != null) && (
              <div>
                <h2 className="section-title mb-3">Фінансовий прогноз</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FinancialMetric
                    label="Очікуваний врожай"
                    value={forecast.expected_yield_kg != null ? Number(forecast.expected_yield_kg).toFixed(1) : null}
                    suffix="кг"
                    color="text-accent"
                  />
                  <FinancialMetric
                    label="Очікуваний дохід"
                    value={forecast.revenue_uah}
                    color="text-accent"
                  />
                  <FinancialMetric
                    label="Очікуваний прибуток"
                    value={forecast.net_profit_uah}
                    color={(forecast.net_profit_uah ?? 0) >= 0 ? 'text-accent' : 'text-danger'}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-1 bg-hover p-1 rounded-xl">
              {PLAN_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    activeTab === tab ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Полив' && (
              <div className="space-y-5">
                <IrrigationTimeline schedules={irrigation} />
                {irrigation.length > 0 && (
                  <div className="card p-5">
                    <h3 className="font-medium text-txt text-sm mb-3">Зведення по поливу</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="metric-card">
                        <p className="text-xs text-muted">Всього записів</p>
                        <p className="text-2xl font-bold text-txt">{irrigation.length}</p>
                      </div>
                      <div className="metric-card">
                        <p className="text-xs text-muted">Загальний об'єм</p>
                        <p className="text-2xl font-bold text-txt">
                          {irrigation.reduce((sum, s) => sum + (s.volume_liters || 0), 0).toFixed(0)} л
                        </p>
                      </div>
                      <div className="metric-card">
                        <p className="text-xs text-muted">Середньо / день</p>
                        <p className="text-2xl font-bold text-txt">
                          {(irrigation.reduce((s, r) => s + (r.volume_liters || 0), 0) / Math.max(irrigation.length, 1)).toFixed(1)} л
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="table-th">Дата</th>
                            <th className="table-th text-right">Об'єм (л)</th>
                            <th className="table-th text-right">Фаза</th>
                          </tr>
                        </thead>
                        <tbody>
                          {irrigation.slice(0, 10).map((s, i) => (
                            <tr key={i} className="table-row-hover">
                              <td className="table-td text-muted">{formatDate(s.scheduled_date)}</td>
                              <td className="table-td text-right text-txt">{s.volume_liters?.toFixed(1)}</td>
                              <td className="table-td text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${phaseColor(s.growth_phase)}`}>
                                  {formatPhase(s.growth_phase)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {irrigation.length > 10 && (
                        <p className="text-center text-xs text-muted mt-2">+ {irrigation.length - 10} більше записів</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Аналітика' && (
              <div className="card p-6">
                <h3 className="font-semibold text-txt mb-5">Аналітика плану</h3>
                <AnalyticsBlock analytics={analytics} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
