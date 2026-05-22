import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Navbar from '../components/Navbar.jsx'
import AlertBanner from '../components/AlertBanner.jsx'
import SensorWidget from '../components/SensorWidget.jsx'
import GreenhousePlanner from '../components/GreenhousePlanner.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'
import { getById } from '../api/greenhouses.js'
import { getByGreenhouse as getZones, create as createZone, remove as removeZone } from '../api/zones.js'
import { getByGreenhouse as getAlerts, markAllRead, markRead } from '../api/alerts.js'
import { getLatest as getSensorLatest, getHistory as getSensorHistory } from '../api/sensor_logs.js'
import { formatDate } from '../utils/format.js'
import { useToast } from '../context/ToastContext.jsx'

const TABS = ['Планувальник', 'Зони', 'Сенсори', 'Алерти']
const alertIcon = { high_temperature: '🌡️', high_co2: '🌫️', low_humidity: '💧', system: '⚙️' }

const EMPTY_ZONE = { name: '', area: '', row_count: '', notes: '' }

function ZoneForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState(EMPTY_ZONE)
  function set(k) { return (e) => setForm(p => ({ ...p, [k]: e.target.value })) }
  function handleSubmit(e) {
    e.preventDefault()
    onSave({ ...form, area: parseFloat(form.area), row_count: form.row_count ? parseInt(form.row_count) : undefined })
  }
  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3 animate-slideUp">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Назва *</label>
          <input type="text" value={form.name} onChange={set('name')} required className="input" placeholder="Зона A" />
        </div>
        <div>
          <label className="label">Площа (м²) *</label>
          <input type="number" value={form.area} onChange={set('area')} required min="0" step="0.1" className="input" placeholder="20" />
        </div>
        <div>
          <label className="label">Кількість рядів</label>
          <input type="number" value={form.row_count} onChange={set('row_count')} min="0" className="input" placeholder="5" />
        </div>
        <div>
          <label className="label">Нотатки</label>
          <input type="text" value={form.notes} onChange={set('notes')} className="input" placeholder="Необов'язково" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-accent disabled:opacity-60">
          {saving ? 'Збереження…' : 'Зберегти'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Скасувати</button>
      </div>
    </form>
  )
}

export default function GreenhouseDetail() {
  const { id } = useParams()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('Планувальник')
  const [greenhouse, setGreenhouse] = useState(null)
  const [zones, setZones] = useState([])
  const [alerts, setAlerts] = useState([])
  const [unreadAlerts, setUnreadAlerts] = useState([])
  const [sensorHistory, setSensorHistory] = useState([])
  const [sensorChartData, setSensorChartData] = useState([])
  const [loadingGh, setLoadingGh] = useState(true)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [savingZone, setSavingZone] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [healthScore, setHealthScore]     = useState(null)

  const { sensorData, newAlerts, connected, clearAlerts } = useWebSocket(id)

  const loadGreenhouse = useCallback(async () => {
    setLoadingGh(true)
    try {
      const [gh, zList, aList, uaList] = await Promise.all([
        getById(id),
        getZones(id),
        getAlerts(id, false).catch(() => []),
        getAlerts(id, true).catch(() => [])
      ])
      setGreenhouse(gh)
      setZones(Array.isArray(zList) ? zList : [])
      setAlerts(Array.isArray(aList) ? aList : [])
      setUnreadAlerts(Array.isArray(uaList) ? uaList : [])
      if (gh?.last_health_score != null) setHealthScore(gh.last_health_score)
    } catch {
      addToast('Помилка завантаження теплиці', 'error')
    } finally {
      setLoadingGh(false)
    }
  }, [id])

  useEffect(() => { loadGreenhouse() }, [loadGreenhouse])

  useEffect(() => {
    async function fetchSensors() {
      try {
        const data = await getSensorLatest(id)
        setSensorHistory(Array.isArray(data) ? data.slice(0, 5) : data ? [data] : [])
      } catch {}
      try {
        const history = await getSensorHistory(id, 24)
        if (Array.isArray(history)) {
          setSensorChartData(history.map(s => ({
            time: new Date(s.recorded_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
            temp: s.temperature != null ? +s.temperature.toFixed(1) : null,
            hum: s.humidity_air != null ? +s.humidity_air.toFixed(1) : null,
            co2: s.co2_ppm != null ? +s.co2_ppm.toFixed(0) : null,
          })))
        }
      } catch {}
    }
    fetchSensors()
  }, [id])

  async function handleAddZone(payload) {
    setSavingZone(true)
    try {
      await createZone({ ...payload, greenhouse_id: id })
      addToast('Зону додано', 'success')
      setShowZoneForm(false)
      const zList = await getZones(id)
      setZones(Array.isArray(zList) ? zList : [])
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Помилка додавання зони', 'error')
    } finally {
      setSavingZone(false)
    }
  }

  async function handleDeleteZone(zoneId) {
    try {
      await removeZone(zoneId)
      addToast('Зону видалено', 'success')
      setDeleteConfirm(null)
      const zList = await getZones(id)
      setZones(Array.isArray(zList) ? zList : [])
    } catch {
      addToast('Помилка видалення зони', 'error')
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead(id)
      addToast('Всі алерти позначено прочитаними', 'success')
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
      setUnreadAlerts([])
    } catch {
      addToast('Помилка', 'error')
    }
  }

  async function handleMarkRead(alertId) {
    try {
      await markRead(alertId)
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
      setUnreadAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch {}
  }

  if (loadingGh) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <LoadingSkeleton rows={3} />
        </main>
      </div>
    )
  }

  if (!greenhouse) {
    return (
      <div className="min-h-screen bg-bg">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <EmptyState icon="❌" title="Теплицю не знайдено" description="Можливо, вона була видалена." />
        </main>
      </div>
    )
  }

  const showOtherTabs = activeTab !== 'Планувальник'

  return (
    <div className="min-h-screen" style={{ background: '#0a0e1a' }}>
      <Navbar />

      {/* ── HEADER ── */}
      <div style={{ background: '#0d1117', borderBottom: '1px solid #1e2535' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/greenhouses"
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => e.currentTarget.style.color='#00d4aa'}
              onMouseLeave={e => e.currentTarget.style.color='#64748b'}
            >
              ← Назад
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold truncate" style={{ color: '#e2e8f0' }}>{greenhouse.name}</h1>
                {healthScore != null && (() => {
                  const hs = healthScore
                  const cfg = hs >= 90
                    ? { color: '#22c55e', bg: '#052e1640', label: 'Відмінно' }
                    : hs >= 70
                    ? { color: '#f59e0b', bg: '#451a0340', label: 'Добре' }
                    : hs >= 50
                    ? { color: '#f97316', bg: '#43140740', label: 'Потребує уваги' }
                    : { color: '#ef4444', bg: '#450a0a40', label: 'Критично' }
                  return (
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                      title="Health score теплиці"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      {Math.round(hs)}% {cfg.label}
                    </span>
                  )
                })()}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-sm" style={{ color: '#64748b' }}>{greenhouse.total_area} м²</span>
                <span style={{ color: '#1e2535' }}>·</span>
                <span className="text-sm" style={{ color: '#64748b' }}>{greenhouse.heating_type}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: connected ? '#00d4aa' : '#374151', boxShadow: connected ? '0 0 6px #00d4aa' : 'none' }} />
              <span className="text-xs" style={{ color: connected ? '#00d4aa' : '#4a5568' }}>{connected ? 'Онлайн' : 'Офлайн'}</span>
            </div>
          </div>
        </div>

        {/* Tabs — underline style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative px-5 py-3 text-sm font-medium transition-colors"
              style={{ color: activeTab === tab ? '#e2e8f0' : '#4a5568', borderBottom: `2px solid ${activeTab === tab ? '#00d4aa' : 'transparent'}` }}
            >
              {tab}
              {tab === 'Алерти' && unreadAlerts.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 text-[9px] rounded-full font-bold px-1" style={{ background: '#ef4444', color: 'white' }}>
                  {unreadAlerts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {unreadAlerts.length > 0 && <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4"><AlertBanner alerts={unreadAlerts} /></div>}
      {newAlerts.length > 0 && <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4"><AlertBanner alerts={newAlerts} /></div>}

      {/* ── ПЛАНУВАЛЬНИК TAB (full width) ── */}
      {activeTab === 'Планувальник' && (
        <GreenhousePlanner
          zones={zones}
          greenhouseId={id}
          greenhouse={greenhouse}
          onZonesChange={() => { getZones(id).then(z => setZones(Array.isArray(z) ? z : [])) }}
          onHealthScore={setHealthScore}
        />
      )}

      {/* ── TAB: Зони ── */}
      {activeTab === 'Зони' && (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Зони теплиці</h2>
              <button onClick={() => setShowZoneForm(v => !v)} className="btn-accent flex items-center gap-1.5">
                <span>+</span> Додати зону
              </button>
            </div>
            {showZoneForm && (
              <div className="mb-4">
                <ZoneForm onSave={handleAddZone} onCancel={() => setShowZoneForm(false)} saving={savingZone} />
              </div>
            )}
            {zones.length === 0 ? (
              <EmptyState icon="🗺️" title="Зон немає" description="Додайте зони для планування посадок." />
            ) : (
              <div className="space-y-3">
                {zones.map(zone => (
                  <div key={zone.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-txt">{zone.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {zone.area} м²
                        {zone.row_count ? ` · ${zone.row_count} рядів` : ''}
                        {zone.notes ? ` · ${zone.notes}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(zone.id)}
                      className="text-muted hover:text-danger transition-colors text-sm px-2 py-1 rounded hover:bg-danger/10"
                    >🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
      </main>
      )}

      {/* ── TAB: Сенсори ── */}
      {activeTab === 'Сенсори' && (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="space-y-5 animate-fadeIn">
            <SensorWidget data={sensorData} connected={connected} greenhouseId={id} />

            {sensorChartData.length > 1 && (
              <div className="card p-5">
                <h3 className="font-medium text-txt text-sm mb-4">Графік за останні 24 год</h3>
                <div className="space-y-6">
                  {/* Temperature chart */}
                  <div>
                    <p className="text-xs text-muted mb-2">Температура (°C)</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={sensorChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="temp" stroke="#00d4aa" dot={false} strokeWidth={2} name="Т°C" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Humidity chart */}
                  <div>
                    <p className="text-xs text-muted mb-2">Вологість повітря (%)</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={sensorChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="hum" stroke="#3b82f6" dot={false} strokeWidth={2} name="Вологість %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* CO2 chart */}
                  <div>
                    <p className="text-xs text-muted mb-2">CO₂ (ppm)</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={sensorChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Line type="monotone" dataKey="co2" stroke="#ffa502" dot={false} strokeWidth={2} name="CO₂ ppm" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {sensorHistory.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="font-medium text-txt text-sm">Останні показники</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="table-th">Час</th>
                        <th className="table-th text-right">Т°C</th>
                        <th className="table-th text-right">Вологість %</th>
                        <th className="table-th text-right">CO₂ ppm</th>
                        <th className="table-th text-right">Світло lux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensorHistory.map((s, i) => (
                        <tr key={i} className="table-row-hover">
                          <td className="table-td text-muted">{formatDate(s.recorded_at)}</td>
                          <td className="table-td text-right">{s.temperature?.toFixed(1) || '—'}</td>
                          <td className="table-td text-right">{s.humidity_air?.toFixed(1) || '—'}</td>
                          <td className="table-td text-right">{s.co2_ppm?.toFixed(0) || '—'}</td>
                          <td className="table-td text-right">{s.light_lux != null ? Math.round(s.light_lux) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
      </main>
      )}

      {/* ── TAB: Алерти ── */}
      {activeTab === 'Алерти' && (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Алерти</h2>
              {unreadAlerts.length > 0 && (
                <button onClick={handleMarkAllRead} className="text-sm text-accent hover:text-accent-light transition-colors">
                  Позначити всі прочитані
                </button>
              )}
            </div>
            {alerts.length === 0 ? (
              <EmptyState icon="✅" title="Немає алертів" description="Все в порядку. Алертів не зафіксовано." />
            ) : (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div
                    key={a.id || i}
                    className={`card p-4 flex items-start gap-3 transition-opacity ${
                      a.is_read ? 'opacity-50' : 'border-l-2 border-l-danger'
                    }`}
                  >
                    <span className="text-xl leading-none">{alertIcon[a.type] || '⚠️'}</span>
                    <div className="flex-1">
                      <p className="text-sm text-txt">{a.message}</p>
                      <p className="text-xs text-muted mt-0.5">{formatDate(a.created_at)}</p>
                    </div>
                    {!a.is_read ? (
                      <button
                        onClick={() => handleMarkRead(a.id)}
                        className="text-xs text-muted hover:text-accent border border-border px-2 py-1 rounded-lg hover:border-accent/40 transition-colors"
                      >
                        Прочитано
                      </button>
                    ) : (
                      <span className="text-xs badge badge-muted">Прочитано</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
      </main>
      )}

      {/* Delete zone confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 max-w-sm w-full shadow-2xl animate-slideUp">
            <h3 className="text-lg font-semibold text-txt mb-2">Видалити зону?</h3>
            <p className="text-sm text-muted mb-5">Цю дію не можна скасувати.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteZone(deleteConfirm)} className="flex-1 py-2 bg-danger hover:bg-danger/80 text-white font-medium rounded-lg transition-colors text-sm">
                Видалити
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-ghost py-2">
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
