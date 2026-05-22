import React, { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar.jsx'
import GreenhouseCard from '../components/GreenhouseCard.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { getAll, create, update, remove } from '../api/greenhouses.js'
import { getByGreenhouse as getPlansByGh } from '../api/planting_plans.js'
import { useToast } from '../context/ToastContext.jsx'

const HEATING_TYPES = [
  { value: 'gas',       label: '🔥 Газ' },
  { value: 'wood',      label: '🪵 Дрова' },
  { value: 'electric',  label: '⚡ Електро' },
  { value: 'heat_pump', label: '♻️ Тепловий насос' }
]

const INSULATION_TYPES = [
  { value: 'none',  label: 'Без утеплення' },
  { value: 'basic', label: 'Базове утеплення' },
  { value: 'good',  label: 'Гарне утеплення' }
]

const EMPTY_FORM = {
  name: '', total_area: '', heating_type: 'gas',
  heating_power_kw: '', fuel_cost_per_unit: '', insulation_type: 'basic'
}

function GreenhouseForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  function set(key) { return (e) => setForm(prev => ({ ...prev, [key]: e.target.value })) }
  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      total_area: parseFloat(form.total_area),
      heating_power_kw: form.heating_power_kw ? parseFloat(form.heating_power_kw) : undefined,
      fuel_cost_per_unit: form.fuel_cost_per_unit ? parseFloat(form.fuel_cost_per_unit) : undefined
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4 animate-slideUp">
      <h3 className="font-semibold text-txt">{initial?.id ? 'Редагувати теплицю' : 'Нова теплиця'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Назва *</label>
          <input type="text" value={form.name} onChange={set('name')} required className="input" placeholder="Теплиця 1" />
        </div>
        <div>
          <label className="label">Площа (м²) *</label>
          <input type="number" value={form.total_area} onChange={set('total_area')} required min="0" step="0.1" className="input" placeholder="100" />
        </div>
        <div>
          <label className="label">Тип опалення</label>
          <select value={form.heating_type} onChange={set('heating_type')} className="input">
            {HEATING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Утеплення</label>
          <select value={form.insulation_type} onChange={set('insulation_type')} className="input">
            {INSULATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Потужність опалення (кВт)</label>
          <input type="number" value={form.heating_power_kw} onChange={set('heating_power_kw')} min="0" step="0.1" className="input" placeholder="10" />
        </div>
        <div>
          <label className="label">Вартість палива (за одиницю)</label>
          <input type="number" value={form.fuel_cost_per_unit} onChange={set('fuel_cost_per_unit')} min="0" step="0.01" className="input" placeholder="7.5" />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-accent disabled:opacity-60">
          {saving ? 'Збереження…' : 'Зберегти'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Скасувати</button>
      </div>
    </form>
  )
}

export default function Greenhouses() {
  const [greenhouses, setGreenhouses] = useState([])
  const [planCounts, setPlanCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editGh, setEditGh] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const { addToast } = useToast()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAll()
      setGreenhouses(data)
      const counts = {}
      await Promise.all(data.map(async (gh) => {
        try {
          const plans = await getPlansByGh(gh.id)
          counts[gh.id] = Array.isArray(plans) ? plans.length : 0
        } catch { counts[gh.id] = 0 }
      }))
      setPlanCounts(counts)
    } catch {
      addToast('Помилка завантаження теплиць', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (editGh) { await update(editGh.id, payload); addToast('Теплицю оновлено', 'success') }
      else { await create(payload); addToast('Теплицю створено', 'success') }
      setShowForm(false)
      setEditGh(null)
      await fetchAll()
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Помилка збереження', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await remove(id)
      addToast('Теплицю видалено', 'success')
      setDeleteConfirm(null)
      await fetchAll()
    } catch {
      addToast('Помилка видалення', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Мої теплиці</h1>
          <button
            onClick={() => { setEditGh(null); setShowForm(true) }}
            className="btn-accent flex items-center gap-2 shadow-glow-sm"
          >
            <span className="text-base leading-none">+</span>
            Додати теплицю
          </button>
        </div>

        {showForm && (
          <div className="mb-6">
            <GreenhouseForm initial={editGh} onSave={handleSave} onCancel={() => { setShowForm(false); setEditGh(null) }} saving={saving} />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LoadingSkeleton rows={3} />
          </div>
        ) : greenhouses.length === 0 ? (
          <EmptyState icon="🏡" title="Немає теплиць"
            description="Натисніть «Додати теплицю», щоб розпочати."
            actionLabel="Додати першу теплицю" onAction={() => setShowForm(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {greenhouses.map(gh => (
              <div key={gh.id} className="relative group">
                <GreenhouseCard greenhouse={gh} planCount={planCounts[gh.id] || 0} />
                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.preventDefault(); setEditGh(gh); setShowForm(true) }}
                    className="w-7 h-7 bg-card hover:bg-hover border border-border rounded-lg flex items-center justify-center text-xs text-muted hover:text-accent transition-colors"
                    title="Редагувати"
                  >✏️</button>
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteConfirm(gh.id) }}
                    className="w-7 h-7 bg-card hover:bg-danger/10 border border-border rounded-lg flex items-center justify-center text-xs text-muted hover:text-danger transition-colors"
                    title="Видалити"
                  >🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteConfirm && (
          <ConfirmDialog
            title="Видалити теплицю?"
            itemName={greenhouses.find(g => g.id === deleteConfirm)?.name}
            message="Цю дію неможливо скасувати. Всі плани посадки цієї теплиці також будуть видалені."
            onConfirm={() => handleDelete(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </main>
    </div>
  )
}
