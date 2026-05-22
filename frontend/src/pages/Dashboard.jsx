import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import GreenhouseCard from '../components/GreenhouseCard.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Tooltip from '../components/Tooltip.jsx'
import { getAll as getGreenhouses } from '../api/greenhouses.js'
import { getByGreenhouse as getPlansByGh } from '../api/planting_plans.js'
import { getAll as getFarmerPlants } from '../api/farmerPlants.js'
import { get as getMarketPrices } from '../api/market_prices.js'
import { getByGreenhouse as getAlerts } from '../api/alerts.js'
import { get as getNews } from '../api/news.js'
import { getFinancialSummary } from '../api/financial.js'
import { formatCurrency, formatDate } from '../utils/format.js'
import { useToast } from '../context/ToastContext.jsx'

const alertIcon = { high_temperature: '🌡️', high_co2: '🌫️', low_humidity: '💧', system: '⚙️' }

const categoryBadge = (cat) => ({
  weather: 'badge bg-blue-500/15 text-blue-300',
  market:  'badge badge-accent',
  tips:    'badge bg-warn/15 text-warn',
  disease: 'badge badge-danger',
  general: 'badge badge-muted',
}[cat] || 'badge badge-muted')

function CountUp({ value, loading }) {
  const [display, setDisplay] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    if (loading) return
    const target = Number(value) || 0
    const duration = 600
    const start = Date.now()
    const startVal = 0
    function tick() {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [value, loading])

  if (loading) return <span>—</span>
  return <span className="count-up">{display}</span>
}

function ForecastBigCards({ summary }) {
  const roi = summary?.roi_percent ?? 0
  const cards = [
    {
      icon: '🌾',
      label: 'Очікуваний врожай',
      value: `${(summary?.total_yield_kg ?? 0).toFixed(1)} кг`,
      sub: `${(summary?.total_area_m2 ?? 0).toFixed(1)} м² × ${summary?.plans_count ?? 0} план(ів)`,
      color: 'border-accent/30 bg-accent/5',
      valueColor: 'text-accent',
      tooltip: 'Сума очікуваних врожаїв по всіх активних планах посадки (plan.area × yield_per_m2)',
    },
    {
      icon: '💰',
      label: 'Дохід',
      value: formatCurrency(summary?.total_revenue_uah ?? 0),
      sub: `Врожай × ціна продажу`,
      color: 'border-blue-500/30 bg-blue-500/5',
      valueColor: 'text-blue-400',
      tooltip: 'Дохід = очікуваний_врожай × ціна_продажу (грн/кг) по кожному плану',
    },
    {
      icon: '📉',
      label: 'Витрати',
      value: formatCurrency(summary?.costs?.total ?? 0),
      sub: `Вода + добрива + опалення`,
      color: 'border-danger/30 bg-danger/5',
      valueColor: 'text-danger',
      tooltip: `💧 Вода: ${formatCurrency(summary?.costs?.water ?? 0)}\n🌱 Насіння: ${formatCurrency(summary?.costs?.seeds ?? 0)}\n🧪 Добрива: ${formatCurrency(summary?.costs?.fertilizers ?? 0)}\n🔥 Опалення: ${formatCurrency(summary?.costs?.heating ?? 0)}`,
    },
    {
      icon: '📈',
      label: 'ROI',
      value: `${roi.toFixed(0)}%`,
      sub: `Прибуток: ${formatCurrency(summary?.net_profit_uah ?? 0)}`,
      color: roi >= 0 ? 'border-warn/30 bg-warn/5' : 'border-danger/30 bg-danger/5',
      valueColor: roi >= 0 ? 'text-warn' : 'text-danger',
      tooltip: 'ROI = (Дохід − Витрати) / Витрати × 100%. Розраховується лише по активних планах зі статусом ready.',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`forecast-card border ${c.color}`}>
          <div className="flex items-center justify-between">
            <span className="text-xl">{c.icon}</span>
            <Tooltip text={c.tooltip} />
          </div>
          <div className={`text-2xl font-bold ${c.valueColor} mt-1`}>{c.value}</div>
          <div className="text-xs text-muted">{c.label}</div>
          <div className="text-xs text-muted/60 mt-0.5">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [greenhouses, setGreenhouses] = useState([])
  const [planCounts, setPlanCounts] = useState({})
  const [allPlans, setAllPlans] = useState([])
  const [activePlantings, setActivePlantings] = useState([])
  const [prices, setPrices] = useState([])
  const [alerts, setAlerts] = useState([])
  const [news, setNews] = useState([])
  const [financialSummary, setFinancialSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [ghs, pricesData, newsData, summary] = await Promise.all([
          getGreenhouses(),
          getMarketPrices().catch(() => []),
          getNews(null, 6).catch(() => []),
          getFinancialSummary().catch(() => null),
        ])
        if (!cancelled) setFinancialSummary(summary)
        if (cancelled) return
        setGreenhouses(ghs)
        setPrices(
          Array.isArray(pricesData)
            ? pricesData.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)).slice(0, 6)
            : []
        )
        setNews(Array.isArray(newsData) ? newsData.slice(0, 6) : [])

        const counts = {}
        let plans = []
        await Promise.all(
          ghs.map(async (gh) => {
            try {
              const p = await getPlansByGh(gh.id)
              const arr = Array.isArray(p) ? p : []
              counts[gh.id] = arr.length
              plans = plans.concat(arr.map(x => ({ ...x, _ghName: gh.name })))
            } catch { counts[gh.id] = 0 }
          })
        )
        if (!cancelled) { setPlanCounts(counts); setAllPlans(plans) }

        let farmerPlantsMap = {}
        try {
          const fps = await getFarmerPlants()
          if (Array.isArray(fps)) fps.forEach(fp => { farmerPlantsMap[fp.id] = fp })
        } catch {}

        const today = new Date()
        const plantings = plans
          .filter(p => p.status === 'ready' && p.planted_at)
          .map(p => {
            const fp = farmerPlantsMap[p.farmer_plant_id] || {}
            const plantName = fp.plant?.name || fp.plant_name || p.plant_name || 'Культура'
            const growDays = fp.plant?.grow_days || p.grow_days || 90
            const plantedAt = new Date(p.planted_at)
            const daysPassed = Math.max(0, Math.floor((today - plantedAt) / 86400000))
            const daysRemaining = Math.max(0, growDays - daysPassed)
            const progress = Math.min(100, Math.round((daysPassed / growDays) * 100))
            return { id: p.id, plantName, ghName: p._ghName, growDays, daysPassed, daysRemaining, progress }
          })
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .slice(0, 8)

        if (!cancelled) setActivePlantings(plantings)

        let allAlerts = []
        await Promise.all(
          ghs.map(async (gh) => {
            try {
              const a = await getAlerts(gh.id, true)
              if (Array.isArray(a)) allAlerts = allAlerts.concat(a)
            } catch {}
          })
        )
        if (!cancelled) setAlerts(allAlerts.slice(0, 5))
      } catch {
        if (!cancelled) addToast('Помилка завантаження даних', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const totalPlans = Object.values(planCounts).reduce((s, v) => s + v, 0)

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Панель керування</h1>
            <p className="text-sm text-muted mt-1">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Теплиці',        value: greenhouses.length, icon: '🏡', color: 'text-accent' },
            { label: 'Плани посадки',  value: totalPlans,          icon: '📋', color: 'text-blue-400' },
            { label: 'Алерти',         value: alerts.length,       icon: '🔔', color: 'text-danger' },
            { label: 'Цін у базі',     value: prices.length,       icon: '📈', color: 'text-warn' },
          ].map(stat => (
            <div key={stat.label} className="metric-card">
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs font-medium">{stat.label}</span>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>
                <CountUp value={stat.value} loading={loading} />
              </div>
            </div>
          ))}
        </div>

        {/* Financial forecast */}
        {!loading && (financialSummary || greenhouses.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="section-title">Фінансовий прогноз</h2>
              <Tooltip text="Реальні розрахунки по активних планах посадки: врожай, дохід, витрати (вода+добрива+опалення)" />
              {financialSummary && financialSummary.plans_count === 0 && (
                <span className="text-xs text-muted ml-2">(немає активних планів)</span>
              )}
            </div>
            <ForecastBigCards summary={financialSummary} />
          </section>
        )}

        {/* Greenhouses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Мої теплиці</h2>
            <button onClick={() => navigate('/greenhouses')} className="text-sm text-accent hover:text-accent-light transition-colors">
              Всі теплиці →
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LoadingSkeleton rows={3} />
            </div>
          ) : greenhouses.length === 0 ? (
            <EmptyState
              icon="🏡"
              title="Немає теплиць"
              description="Додайте першу теплицю, щоб розпочати планування врожаю та відслідковувати фінансові показники."
              actionLabel="Додати теплицю"
              onAction={() => navigate('/greenhouses')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {greenhouses.slice(0, 6).map(gh => (
                <GreenhouseCard key={gh.id} greenhouse={gh} planCount={planCounts[gh.id] || 0} />
              ))}
            </div>
          )}
        </section>

        {/* Active plantings */}
        {(loading || activePlantings.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="section-title">Активні посадки</h2>
              <Tooltip text="Плани зі статусом «ready» та датою посадки" />
            </div>
            {loading ? (
              <LoadingSkeleton rows={3} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePlantings.map(p => (
                  <Link key={p.id} to={`/planting-plans/${p.id}`} className="card-hover p-4 block animate-fadeIn">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-txt text-sm">{p.plantName}</p>
                        <p className="text-xs text-muted mt-0.5">{p.ghName}</p>
                      </div>
                      {p.daysRemaining <= 7 && (
                        <span className="badge bg-warn/15 text-warn text-xs whitespace-nowrap">Скоро збір!</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-hover rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted">
                      <span>{p.progress}% завершено</span>
                      <span>{p.daysRemaining > 0 ? `${p.daysRemaining} дн. залишилось` : 'Готово до збору'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Market prices + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Ринкові ціни</h2>
              <button onClick={() => navigate('/market-prices')} className="text-xs text-accent hover:text-accent-light transition-colors">Докладніше →</button>
            </div>
            {loading ? <LoadingSkeleton rows={4} variant="table-row" /> :
             prices.length === 0 ? <EmptyState icon="💹" title="Немає цінових даних" /> : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="table-th">Культура</th>
                      <th className="table-th">Регіон</th>
                      <th className="table-th text-right">Ціна</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p, i) => (
                      <tr key={i} className="table-row-hover">
                        <td className="table-td font-medium">{p.plant_name || `#${p.plant_id?.slice(0,8)}`}</td>
                        <td className="table-td text-muted">{p.region || '—'}</td>
                        <td className="table-td text-right font-semibold text-accent">{formatCurrency(p.price_per_kg)}/кг</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="section-title mb-4">Непрочитані алерти</h2>
            {loading ? <LoadingSkeleton rows={3} /> :
             alerts.length === 0 ? (
              <EmptyState icon="✅" title="Алертів немає" description="Усі сповіщення прочитані." />
            ) : (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={a.id || i} className="card p-4 border-l-2 border-l-danger animate-fadeIn">
                    <div className="flex items-start gap-3">
                      <span className="text-xl leading-none">{alertIcon[a.type] || '⚠️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-txt">{a.message}</p>
                        <p className="text-xs text-muted mt-0.5">{formatDate(a.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* News */}
        <section>
          <h2 className="section-title mb-4">Новини</h2>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LoadingSkeleton rows={3} />
            </div>
          ) : news.length === 0 ? (
            <EmptyState icon="📰" title="Немає новин" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.map((item, i) => (
                <div key={item.id || i} className="card-hover p-5 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3">
                    {item.category && (
                      <span className={categoryBadge(item.category)}>{item.category}</span>
                    )}
                    <span className="text-xs text-muted ml-auto">{formatDate(item.published_at || item.created_at)}</span>
                  </div>
                  <h4 className="font-medium text-txt text-sm leading-snug mb-2 line-clamp-2">{item.title}</h4>
                  {item.summary && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">{item.summary}</p>
                  )}
                  {item.source && (
                    <p className="text-xs text-muted mt-2 pt-2 border-t border-border">{item.source}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-card border-t border-border pb-safe z-30">
        <div className="grid grid-cols-4">
          {[
            { to: '/dashboard',     icon: '▦',  label: 'Панель' },
            { to: '/greenhouses',   icon: '🌿', label: 'Теплиці' },
            { to: '/market-prices', icon: '📈', label: 'Ринок' },
            { to: '#alerts',        icon: '🔔', label: 'Алерти', badge: alerts.length },
          ].map(item => (
            <button
              key={item.to}
              onClick={() => item.to !== '#alerts' ? navigate(item.to) : navigate('/greenhouses')}
              className="flex flex-col items-center justify-center gap-1 py-3 text-muted hover:text-accent transition-colors min-h-[56px] relative"
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-2 right-[calc(50%-12px)] min-w-[14px] h-3.5 bg-danger text-white text-[8px] rounded-full flex items-center justify-center px-0.5 font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  )
}
