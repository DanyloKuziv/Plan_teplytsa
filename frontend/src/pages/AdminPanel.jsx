import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import * as api from '../api/admin.js'
import { useToast } from '../context/ToastContext.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STORAGE_KEY = 'admin_jwt'

// ── Admin auth ────────────────────────────────────────────────────────────────
function getAdminToken() { return localStorage.getItem(STORAGE_KEY) }
function setAdminToken(t) { localStorage.setItem(STORAGE_KEY, t) }
function clearAdminToken() { localStorage.removeItem(STORAGE_KEY) }

// ── Login page ────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await axios.post(`${API_URL}/admin/token`, { password })
      setAdminToken(data.access_token)
      onLogin(data.access_token)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Невірний пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
      <div className="w-full max-w-sm px-8">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="13" fill="#0d1428"/>
            <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
          </svg>
          <span className="font-bold text-lg text-white tracking-tight">ТеплицяПлан · Адмін</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#00d4aa]/10 border border-[#00d4aa]/20 mb-6 mx-auto">
            <svg width="22" height="22" fill="none" stroke="#00d4aa" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-1">Вхід в адмін-панель</h1>
          <p className="text-white/40 text-sm text-center mb-7">Введіть пароль адміністратора</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Пароль</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#00d4aa]/50 focus:ring-1 focus:ring-[#00d4aa]/10 pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {showPwd
                      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>}
                  </svg>
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-[#00d4aa] text-[#080c14] font-bold text-sm tracking-wide hover:bg-[#00e8bc] transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(0,212,170,0.3)]">
              {loading ? 'Вхід…' : 'Увійти →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtMoney(n) {
  if (!n) return '0 ₴'
  return `${Math.round(n).toLocaleString('uk-UA')} ₴`
}
function subStatus(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const days = Math.ceil((d - now) / 86400000)
  if (days < 0) return { label: 'Прострочена', cls: 'text-red-400' }
  if (days < 7) return { label: `${days} дн.`, cls: 'text-yellow-400' }
  return { label: fmt(iso), cls: 'text-green-400' }
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {sub != null && <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{sub}</span>}
      </div>
      <p className={`text-3xl font-bold ${accent || 'text-white'}`}>{value ?? '—'}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ stats }) {
  if (!stats) return <p className="text-white/40 text-sm">Завантаження…</p>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <StatCard icon="👥" label="Користувачів" value={stats.users?.total}
        sub={`${stats.users?.verified} верифік.`} accent="text-[#00d4aa]" />
      <StatCard icon="🏠" label="Теплиць" value={stats.greenhouses?.total} />
      <StatCard icon="🌱" label="Планів посадки" value={stats.plans?.total} />
      <StatCard icon="🔔" label="Алертів" value={stats.alerts?.total}
        sub={`${stats.alerts?.unread} непрочит.`} accent={stats.alerts?.unread > 0 ? 'text-yellow-400' : 'text-white'} />
      <StatCard icon="📡" label="Лог сенсорів" value={stats.sensor_logs?.total} />
      <StatCard icon="💰" label="Заг. дохід (урожай)" value={fmtMoney(stats.revenue_uah)} accent="text-[#00d4aa]" />
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editSub, setEditSub] = useState(null)
  const [subVal, setSubVal]   = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    api.getUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  async function handleToggleAdmin(id) {
    try {
      const res = await api.toggleAdmin(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_admin: res.is_admin } : u))
    } catch { addToast('Помилка', 'error') }
  }

  async function handleSaveSub(id) {
    try {
      const res = await api.setSubscription(id, subVal || null)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, subscription_expires: res.subscription_expires } : u))
      setEditSub(null)
      addToast('Підписку оновлено', 'success')
    } catch { addToast('Помилка', 'error') }
  }

  async function handleDelete(id, email) {
    if (!confirm(`Видалити користувача ${email}?`)) return
    try {
      await api.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      addToast('Користувача видалено', 'success')
    } catch { addToast('Помилка', 'error') }
  }

  if (loading) return <p className="text-white/40 text-sm">Завантаження…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="pb-3 pr-4 font-medium">Користувач</th>
            <th className="pb-3 pr-4 font-medium">Реєстрація</th>
            <th className="pb-3 pr-4 font-medium">Підписка</th>
            <th className="pb-3 pr-4 font-medium">Теплиці</th>
            <th className="pb-3 pr-4 font-medium">Плани</th>
            <th className="pb-3 pr-4 font-medium">Дохід</th>
            <th className="pb-3 font-medium">Дії</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {users.map(u => {
            const sub = subStatus(u.subscription_expires)
            return (
              <tr key={u.id} className="hover:bg-white/3 transition-colors">
                <td className="py-3 pr-4">
                  <p className="text-white font-medium">{u.full_name}</p>
                  <p className="text-white/40 text-xs">{u.email}</p>
                  <div className="flex gap-1 mt-1">
                    {u.is_verified && <span className="text-[10px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded">верифік.</span>}
                    {u.is_admin   && <span className="text-[10px] bg-[#00d4aa]/15 text-[#00d4aa] px-1.5 py-0.5 rounded">адмін</span>}
                  </div>
                </td>
                <td className="py-3 pr-4 text-white/60 whitespace-nowrap">{fmt(u.created_at)}</td>
                <td className="py-3 pr-4">
                  {editSub === u.id ? (
                    <div className="flex gap-1">
                      <input type="date" value={subVal} onChange={e => setSubVal(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#00d4aa]/50" />
                      <button onClick={() => handleSaveSub(u.id)} className="text-xs bg-[#00d4aa]/20 text-[#00d4aa] px-2 py-1 rounded hover:bg-[#00d4aa]/30">✓</button>
                      <button onClick={() => setEditSub(null)} className="text-xs bg-white/5 text-white/40 px-2 py-1 rounded hover:bg-white/10">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditSub(u.id); setSubVal(u.subscription_expires?.slice(0,10) || '') }}
                      className={`text-xs ${sub ? sub.cls : 'text-white/30'} hover:text-white transition-colors`}>
                      {sub ? sub.label : '— встановити'}
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4 text-white/60 text-center">{u.greenhouse_count}</td>
                <td className="py-3 pr-4 text-white/60 text-center">{u.plans_count}</td>
                <td className="py-3 pr-4 text-[#00d4aa] font-medium whitespace-nowrap">{fmtMoney(u.revenue_uah)}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleAdmin(u.id)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${u.is_admin ? 'bg-white/10 text-white/50 hover:bg-white/15' : 'bg-[#00d4aa]/15 text-[#00d4aa] hover:bg-[#00d4aa]/25'}`}>
                      {u.is_admin ? 'Юзер' : 'Адмін'}
                    </button>
                    <button onClick={() => handleDelete(u.id, u.email)}
                      className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                      Вид.
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Greenhouses ───────────────────────────────────────────────────────────────
function GreenhousesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.getGreenhouses().then(setItems).finally(() => setLoading(false)) }, [])

  if (loading) return <p className="text-white/40 text-sm">Завантаження…</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="pb-3 pr-4 font-medium">Назва</th>
            <th className="pb-3 pr-4 font-medium">Власник</th>
            <th className="pb-3 pr-4 font-medium">Площа</th>
            <th className="pb-3 font-medium">Планів</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map(g => (
            <tr key={g.id} className="hover:bg-white/3">
              <td className="py-3 pr-4 text-white font-medium">{g.name}</td>
              <td className="py-3 pr-4">
                <p className="text-white/70">{g.owner_name}</p>
                <p className="text-white/40 text-xs">{g.owner_email}</p>
              </td>
              <td className="py-3 pr-4 text-white/60">{g.total_area} м²</td>
              <td className="py-3 text-white/60">{g.plans_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Plants ────────────────────────────────────────────────────────────────────
function PlantsTab() {
  const [plants, setPlants]   = useState([])
  const [form, setForm]       = useState({ name: '', category: '', grow_days: 60, plants_per_m2: 4 })
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => { api.getPlants().then(setPlants).finally(() => setLoading(false)) }, [])

  async function handleSave() {
    try {
      if (editId) {
        const updated = await api.updatePlant(editId, form)
        setPlants(prev => prev.map(p => p.id === editId ? updated : p))
      } else {
        const created = await api.createPlant(form)
        setPlants(prev => [...prev, created])
      }
      setForm({ name: '', category: '', grow_days: 60, plants_per_m2: 4 }); setEditId(null)
      addToast(editId ? 'Оновлено' : 'Додано', 'success')
    } catch { addToast('Помилка', 'error') }
  }

  async function handleDelete(id) {
    if (!confirm('Видалити культуру?')) return
    try { await api.deletePlant(id); setPlants(prev => prev.filter(p => p.id !== id)) }
    catch { addToast('Помилка', 'error') }
  }

  if (loading) return <p className="text-white/40 text-sm">Завантаження…</p>

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">{editId ? 'Редагувати' : 'Додати культуру'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['name','Назва','text'],['category','Категорія','text'],['grow_days','Днів росту','number'],['plants_per_m2','Рослин/м²','number']].map(([k,lbl,type]) => (
            <div key={k}>
              <label className="block text-xs text-white/40 mb-1">{lbl}</label>
              <input type={type} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: type === 'number' ? +e.target.value : e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00d4aa]/50" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className="px-4 py-2 bg-[#00d4aa] text-[#080c14] text-sm font-bold rounded-lg hover:bg-[#00e8bc]">
            {editId ? 'Зберегти' : 'Додати'}
          </button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name:'',category:'',grow_days:60,plants_per_m2:4 }) }}
            className="px-4 py-2 bg-white/5 text-white/50 text-sm rounded-lg hover:bg-white/10">Скасувати</button>}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="pb-3 pr-4 font-medium">Назва</th>
            <th className="pb-3 pr-4 font-medium">Категорія</th>
            <th className="pb-3 pr-4 font-medium">Днів</th>
            <th className="pb-3 pr-4 font-medium">Рослин/м²</th>
            <th className="pb-3 font-medium">Дії</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {plants.map(p => (
            <tr key={p.id} className={`hover:bg-white/3 ${editId === p.id ? 'bg-[#00d4aa]/5' : ''}`}>
              <td className="py-3 pr-4 text-white">{p.name}</td>
              <td className="py-3 pr-4 text-white/60">{p.category || '—'}</td>
              <td className="py-3 pr-4 text-white/60">{p.grow_days}</td>
              <td className="py-3 pr-4 text-white/60">{p.plants_per_m2}</td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button onClick={() => { setEditId(p.id); setForm({ name: p.name, category: p.category||'', grow_days: p.grow_days, plants_per_m2: p.plants_per_m2 }) }}
                    className="text-xs px-2 py-1 bg-white/5 text-white/50 rounded hover:bg-white/10">Ред.</button>
                  <button onClick={() => handleDelete(p.id)} className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">Вид.</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Alerts ────────────────────────────────────────────────────────────────────
function AlertsTab() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const LABELS = { high_temperature:'🌡 Висока темп.', low_temperature:'❄️ Низька темп.', high_co2:'💨 Підв. CO₂', low_humidity:'💧 Низька вологість', low_o2:'🫧 Знижений O₂', sensor_offline:'📡 Офлайн', system:'⚙️ Системне' }

  useEffect(() => { api.getAlerts().then(setAlerts).finally(() => setLoading(false)) }, [])

  if (loading) return <p className="text-white/40 text-sm">Завантаження…</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-left">
            <th className="pb-3 pr-4 font-medium">Тип</th>
            <th className="pb-3 pr-4 font-medium">Повідомлення</th>
            <th className="pb-3 pr-4 font-medium">Статус</th>
            <th className="pb-3 font-medium">Дата</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {alerts.map(a => (
            <tr key={a.id} className={`hover:bg-white/3 ${!a.is_read ? 'bg-yellow-500/3' : ''}`}>
              <td className="py-3 pr-4 text-white/80 whitespace-nowrap">{LABELS[a.type] || a.type}</td>
              <td className="py-3 pr-4 text-white/60 max-w-xs truncate">{a.message}</td>
              <td className="py-3 pr-4">
                <span className={`text-xs px-2 py-0.5 rounded ${a.is_read ? 'bg-white/5 text-white/30' : 'bg-yellow-500/15 text-yellow-400'}`}>
                  {a.is_read ? 'Прочитано' : 'Новий'}
                </span>
              </td>
              <td className="py-3 text-white/40 whitespace-nowrap">{fmt(a.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main admin panel ──────────────────────────────────────────────────────────
const TABS = ['Огляд', 'Користувачі', 'Теплиці', 'Культури', 'Алерти']

export default function AdminPanel() {
  const [token, setToken]   = useState(() => getAdminToken())
  const [tab, setTab]       = useState('Огляд')
  const [stats, setStats]   = useState(null)
  const { addToast } = useToast()

  useEffect(() => {
    if (!token) return
    api.getStats().then(setStats).catch(() => {})
  }, [token])

  function handleLogin(t) { setToken(t) }
  function handleLogout() { clearAdminToken(); setToken(null) }

  if (!token) return <AdminLogin onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="13" fill="#0d1428"/>
            <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
          </svg>
          <div>
            <span className="font-bold text-base text-white">ТеплицяПлан</span>
            <span className="text-white/40 text-sm ml-2">· Адмін-панель</span>
          </div>
        </div>
        <button onClick={handleLogout}
          className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Вийти
        </button>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit border border-white/10">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t ? 'bg-[#00d4aa] text-[#080c14]' : 'text-white/50 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'Огляд'        && <DashboardTab stats={stats} />}
        {tab === 'Користувачі'  && <UsersTab />}
        {tab === 'Теплиці'      && <GreenhousesTab />}
        {tab === 'Культури'     && <PlantsTab />}
        {tab === 'Алерти'       && <AlertsTab />}
      </div>
    </div>
  )
}
