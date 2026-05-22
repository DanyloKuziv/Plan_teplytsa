import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import * as api from '../api/admin.js'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {sub != null && (
          <span className="text-xs text-muted bg-hover px-2 py-0.5 rounded-full">{sub}</span>
        )}
      </div>
      <p className={`text-3xl font-bold ${accent || 'text-txt'}`}>{value ?? '—'}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-hover rounded-xl mb-6 w-fit">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${active === t ? 'bg-card text-accent shadow-sm' : 'text-muted hover:text-txt'}`}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────
function DashboardTab({ stats }) {
  if (!stats) return <div className="text-muted text-sm">Завантаження…</div>
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Користувачів" value={stats.users?.total}
          sub={`${stats.users?.verified} верифік.`} accent="text-accent" />
        <StatCard icon="🏠" label="Теплиць" value={stats.greenhouses?.total} />
        <StatCard icon="🌱" label="Планів посадки" value={stats.plans?.total} />
        <StatCard icon="🔔" label="Алертів" value={stats.alerts?.total}
          sub={`${stats.alerts?.unread} непрочит.`} accent={stats.alerts?.unread > 0 ? 'text-warn' : 'text-txt'} />
        <StatCard icon="📡" label="Записів сенсорів" value={stats.sensor_logs?.total} />
        <StatCard icon="₴" label="Загальний дохід" value={`${(stats.revenue_uah || 0).toLocaleString('uk-UA')} ₴`} accent="text-accent" />
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => addToast('Помилка завантаження', 'error')).finally(() => setLoading(false))
  }, [])

  async function handleToggleAdmin(id) {
    try {
      const res = await api.toggleAdmin(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_admin: res.is_admin } : u))
    } catch { addToast('Помилка', 'error') }
  }

  if (loading) return <div className="text-muted text-sm">Завантаження…</div>
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="table-th">Ім'я / Email</th>
            <th className="table-th text-center">Верифік.</th>
            <th className="table-th text-center">Теплиць</th>
            <th className="table-th text-center">Адмін</th>
            <th className="table-th">Дата реєстр.</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="table-row-hover">
              <td className="table-td">
                <p className="font-medium text-txt">{u.full_name}</p>
                <p className="text-xs text-muted">{u.email}</p>
              </td>
              <td className="table-td text-center">
                {u.is_verified
                  ? <span className="text-accent text-xs font-semibold">✓</span>
                  : <span className="text-muted text-xs">—</span>}
              </td>
              <td className="table-td text-center text-txt">{u.greenhouse_count}</td>
              <td className="table-td text-center">
                <button onClick={() => handleToggleAdmin(u.id)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors
                    ${u.is_admin
                      ? 'border-accent/40 text-accent bg-accent/10 hover:bg-accent/20'
                      : 'border-border text-muted hover:border-accent/30 hover:text-accent'}`}>
                  {u.is_admin ? 'Адмін' : 'Юзер'}
                </button>
              </td>
              <td className="table-td text-muted text-xs">
                {new Date(u.created_at).toLocaleDateString('uk-UA')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Plants tab ────────────────────────────────────────────────────────────────
function PlantsTab() {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', category: '', grow_days: 60, plants_per_m2: 4 })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const load = useCallback(() => {
    api.getPlants().then(setPlants).catch(() => addToast('Помилка', 'error')).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  function startEdit(p) {
    setEditId(p.id)
    setForm({ name: p.name, category: p.category || '', grow_days: p.grow_days, plants_per_m2: p.plants_per_m2 })
  }
  function cancelEdit() { setEditId(null); setForm({ name: '', category: '', grow_days: 60, plants_per_m2: 4 }) }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editId) {
        await api.updatePlant(editId, { ...form, grow_days: +form.grow_days, plants_per_m2: +form.plants_per_m2 })
        addToast('Культуру оновлено', 'success')
      } else {
        await api.createPlant({ ...form, grow_days: +form.grow_days, plants_per_m2: +form.plants_per_m2 })
        addToast('Культуру додано', 'success')
      }
      cancelEdit()
      load()
    } catch { addToast('Помилка збереження', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Видалити культуру?')) return
    try {
      await api.deletePlant(id)
      setPlants(prev => prev.filter(p => p.id !== id))
      addToast('Видалено', 'success')
    } catch { addToast('Помилка', 'error') }
  }

  const inputCls = 'w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-txt outline-none focus:border-accent/50 transition-colors'

  if (loading) return <div className="text-muted text-sm">Завантаження…</div>
  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-txt mb-3">{editId ? 'Редагувати культуру' : 'Додати культуру'}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="col-span-2">
            <label className="text-xs text-muted mb-1 block">Назва</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Томат Черрі" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Категорія</label>
            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="Овочі" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Днів росту</label>
            <input type="number" value={form.grow_days} onChange={e => setForm(p => ({ ...p, grow_days: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Рослин/м²</label>
            <input type="number" step="0.5" value={form.plants_per_m2} onChange={e => setForm(p => ({ ...p, plants_per_m2: e.target.value }))}
              className={inputCls} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="btn-accent text-xs px-4 py-2 disabled:opacity-40">
            {saving ? 'Збереження…' : editId ? 'Зберегти' : '+ Додати'}
          </button>
          {editId && (
            <button onClick={cancelEdit} className="text-xs px-4 py-2 border border-border rounded-lg text-muted hover:text-txt transition-colors">
              Скасувати
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="table-th">Назва</th>
              <th className="table-th">Категорія</th>
              <th className="table-th text-center">Днів</th>
              <th className="table-th text-center">Рослин/м²</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody>
            {plants.map(p => (
              <tr key={p.id} className={`table-row-hover ${editId === p.id ? 'bg-accent/5' : ''}`}>
                <td className="table-td font-medium text-txt">{p.name}</td>
                <td className="table-td text-muted">{p.category || '—'}</td>
                <td className="table-td text-center text-txt">{p.grow_days}</td>
                <td className="table-td text-center text-txt">{p.plants_per_m2}</td>
                <td className="table-td">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(p)} className="text-xs text-muted hover:text-accent transition-colors">Ред.</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-muted hover:text-danger transition-colors">Вид.</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── News tab ──────────────────────────────────────────────────────────────────
function NewsTab() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', url: '', source: '', published_at: new Date().toISOString().slice(0, 16),
    category: '', summary: '', price_impact_pct: '', affected_plant_name: '',
  })
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const load = useCallback(() => {
    api.getNews().then(setNews).catch(() => addToast('Помилка', 'error')).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  function startEdit(n) {
    setEditId(n.id)
    setForm({
      title: n.title, url: n.url, source: n.source,
      published_at: n.published_at ? n.published_at.slice(0, 16) : '',
      category: n.category || '', summary: n.summary || '',
      price_impact_pct: n.price_impact_pct ?? '',
      affected_plant_name: n.affected_plant_name || '',
    })
  }
  function cancelEdit() {
    setEditId(null)
    setForm({ title: '', url: '', source: '', published_at: new Date().toISOString().slice(0, 16), category: '', summary: '', price_impact_pct: '', affected_plant_name: '' })
  }

  async function handleSave() {
    if (!form.title.trim() || !form.url.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        published_at: new Date(form.published_at).toISOString(),
        price_impact_pct: form.price_impact_pct !== '' ? +form.price_impact_pct : null,
        affected_plant_name: form.affected_plant_name || null,
        summary: form.summary || null,
        category: form.category || null,
      }
      if (editId) {
        const { published_at, url, source, ...updatePayload } = payload
        await api.updateNews(editId, updatePayload)
        addToast('Новину оновлено', 'success')
      } else {
        await api.createNews(payload)
        addToast('Новину додано', 'success')
      }
      cancelEdit()
      load()
    } catch { addToast('Помилка збереження', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Видалити новину?')) return
    try {
      await api.deleteNews(id)
      setNews(prev => prev.filter(n => n.id !== id))
      addToast('Видалено', 'success')
    } catch { addToast('Помилка', 'error') }
  }

  const inputCls = 'w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-txt outline-none focus:border-accent/50 transition-colors'

  if (loading) return <div className="text-muted text-sm">Завантаження…</div>
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-txt mb-3">{editId ? 'Редагувати новину' : 'Додати новину'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted mb-1 block">Заголовок</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ціни на томати зросли на 15%..." className={inputCls} />
          </div>
          {!editId && (
            <>
              <div>
                <label className="text-xs text-muted mb-1 block">URL</label>
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  placeholder="https://..." className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Джерело</label>
                <input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                  placeholder="AgroUA" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Дата публікації</label>
                <input type="datetime-local" value={form.published_at}
                  onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Категорія</label>
                <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  placeholder="ціни" className={inputCls} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted mb-1 block">
              Вплив на ціну (%)
              <span className="ml-1 text-accent/60">+ підвищення / - зниження</span>
            </label>
            <input type="number" step="0.5" value={form.price_impact_pct}
              onChange={e => setForm(p => ({ ...p, price_impact_pct: e.target.value }))}
              placeholder="+15" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Культура (назва для пошуку)</label>
            <input value={form.affected_plant_name} onChange={e => setForm(p => ({ ...p, affected_plant_name: e.target.value }))}
              placeholder="Томат" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted mb-1 block">Короткий опис</label>
            <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
              rows={2} placeholder="Короткий зміст новини..." className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving || !form.title.trim()}
            className="btn-accent text-xs px-4 py-2 disabled:opacity-40">
            {saving ? 'Збереження…' : editId ? 'Зберегти' : '+ Додати'}
          </button>
          {editId && (
            <button onClick={cancelEdit} className="text-xs px-4 py-2 border border-border rounded-lg text-muted hover:text-txt transition-colors">
              Скасувати
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="table-th">Заголовок</th>
              <th className="table-th">Культура</th>
              <th className="table-th text-center">Вплив</th>
              <th className="table-th">Дата</th>
              <th className="table-th" />
            </tr>
          </thead>
          <tbody>
            {news.map(n => (
              <tr key={n.id} className={`table-row-hover ${editId === n.id ? 'bg-accent/5' : ''}`}>
                <td className="table-td">
                  <p className="font-medium text-txt truncate max-w-xs">{n.title}</p>
                  <p className="text-xs text-muted">{n.source}</p>
                </td>
                <td className="table-td text-muted text-xs">{n.affected_plant_name || '—'}</td>
                <td className="table-td text-center">
                  {n.price_impact_pct != null ? (
                    <span className={`text-xs font-bold ${n.price_impact_pct > 0 ? 'text-accent' : 'text-danger'}`}>
                      {n.price_impact_pct > 0 ? '+' : ''}{n.price_impact_pct}%
                    </span>
                  ) : <span className="text-muted text-xs">—</span>}
                </td>
                <td className="table-td text-muted text-xs">
                  {new Date(n.published_at).toLocaleDateString('uk-UA')}
                </td>
                <td className="table-td">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(n)} className="text-xs text-muted hover:text-accent transition-colors">Ред.</button>
                    <button onClick={() => handleDelete(n.id)} className="text-xs text-muted hover:text-danger transition-colors">Вид.</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Alerts tab ────────────────────────────────────────────────────────────────
function AlertsTab() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    api.getAlerts().then(setAlerts).catch(() => addToast('Помилка', 'error')).finally(() => setLoading(false))
  }, [])

  const TYPE_LABELS = {
    high_temperature: '🌡 Висока темп.',
    low_temperature:  '❄️ Низька темп.',
    high_co2:         '💨 CO₂',
    low_humidity:     '💧 Вологість',
    low_o2:           '🫧 O₂',
    sensor_offline:   '📡 Offline',
    system:           '⚙️ Система',
  }

  if (loading) return <div className="text-muted text-sm">Завантаження…</div>
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="table-th">Тип</th>
            <th className="table-th">Повідомлення</th>
            <th className="table-th text-center">Прочит.</th>
            <th className="table-th">Дата</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(a => (
            <tr key={a.id} className={`table-row-hover ${!a.is_read ? 'bg-warn/3' : ''}`}>
              <td className="table-td">
                <span className="text-xs font-medium text-txt whitespace-nowrap">
                  {TYPE_LABELS[a.type] || a.type}
                </span>
              </td>
              <td className="table-td text-muted text-xs max-w-xs truncate">{a.message}</td>
              <td className="table-td text-center">
                {a.is_read
                  ? <span className="text-accent text-xs">✓</span>
                  : <span className="w-2 h-2 rounded-full bg-warn inline-block" />}
              </td>
              <td className="table-td text-muted text-xs whitespace-nowrap">
                {new Date(a.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = ['Дашборд', 'Користувачі', 'Культури', 'Новини', 'Алерти']

export default function AdminPanel() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [tab, setTab]     = useState('Дашборд')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(err => {
        if (err?.response?.status === 403) navigate('/dashboard')
      })
  }, [navigate])

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-xl">
            🛡
          </div>
          <div>
            <h1 className="text-xl font-bold text-txt">Адмін-панель</h1>
            <p className="text-xs text-muted">ТеплицяПлан — управління платформою</p>
          </div>
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'Дашборд'      && <DashboardTab stats={stats} />}
        {tab === 'Користувачі'  && <UsersTab />}
        {tab === 'Культури'     && <PlantsTab />}
        {tab === 'Новини'       && <NewsTab />}
        {tab === 'Алерти'       && <AlertsTab />}
      </main>
    </div>
  )
}
