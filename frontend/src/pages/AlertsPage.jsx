import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { getByGreenhouse, markRead, markAllRead } from '../api/alerts.js'
import { formatDate } from '../utils/format.js'
import { useToast } from '../context/ToastContext.jsx'

const FILTERS = ['Всі', 'Температура', 'CO₂', 'Вологість', 'Непрочитані']

const alertIcon = (type) => {
  if (type === 'high_temperature') return '🌡️'
  if (type === 'high_co2')         return '🌫️'
  if (type === 'low_humidity')     return '💧'
  return '⚠️'
}

function filterAlerts(alerts, filter) {
  if (filter === 'Всі') return alerts
  if (filter === 'Непрочитані') return alerts.filter(a => !a.is_read)
  if (filter === 'Температура') return alerts.filter(a => a.type === 'high_temperature')
  if (filter === 'CO₂')         return alerts.filter(a => a.type === 'high_co2')
  if (filter === 'Вологість')   return alerts.filter(a => a.type === 'low_humidity')
  return alerts
}

export default function AlertsPage() {
  const { greenhouse_id } = useParams()
  const { addToast } = useToast()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Всі')

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getByGreenhouse(greenhouse_id, false)
      setAlerts(Array.isArray(data) ? data : [])
    } catch {
      addToast('Помилка завантаження алертів', 'error')
    } finally {
      setLoading(false)
    }
  }, [greenhouse_id])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  async function handleMarkRead(alertId) {
    try {
      await markRead(alertId)
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a))
    } catch {
      addToast('Помилка', 'error')
    }
  }

  async function handleMarkAllRead() {
    try {
      const result = await markAllRead(greenhouse_id)
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
      addToast(`Позначено прочитаними: ${result?.marked_read ?? 'всі'}`, 'success')
    } catch {
      addToast('Помилка', 'error')
    }
  }

  const filtered = filterAlerts(alerts, filter)
  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/greenhouses" className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400">
            ← Назад
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Алерти теплиці
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-0.5">{unreadCount} непрочитаних</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              ✔ Позначити всі прочитані
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {f}
              {f === 'Непрочитані' && unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="✅" title="Алертів немає" description="Нема сповіщень для обраного фільтру." />
        ) : (
          <div className="space-y-2">
            {filtered.map((alert, i) => (
              <div
                key={alert.id || i}
                className={`flex items-start gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 border shadow-sm transition-all ${
                  alert.is_read
                    ? 'border-slate-100 dark:border-slate-700 opacity-60'
                    : 'border-red-100 dark:border-red-900/30'
                }`}
              >
                <span className="text-2xl leading-none shrink-0 mt-0.5">{alertIcon(alert.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{alert.message}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatDate(alert.created_at)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {alert.is_read ? (
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-2.5 py-1 rounded-full">
                      Прочитано
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Непрочитано" />
                  )}
                  {!alert.is_read && (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="text-xs text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-lg hover:border-primary-300 transition-colors"
                    >
                      Прочитано
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
