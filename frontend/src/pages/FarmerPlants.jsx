import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { getAll, create, update, remove } from '../api/farmerPlants.js'
import { getAll as getPlants } from '../api/plants.js'
import { useToast } from '../context/ToastContext.jsx'

const EMPTY_FORM = {
  plant_id: '',
  yield_per_m2: '',
  sell_price: '',
  seed_price: '',
  water_seedling: '',
  water_growth: '',
  water_flowering: '',
  water_ripening: '',
  notes: '',
}

function WaterField({ label, value, onChange }) {
  return (
    <div>
      <label className="label text-[11px]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={onChange}
        min="0"
        step="0.1"
        className="input py-2 text-sm"
        placeholder="л/м²"
      />
    </div>
  )
}

function PlantCard({ fp, onEdit, onDelete }) {
  const p = fp.plant
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-txt">{p?.name || `Культура #${String(fp.id).slice(0, 6)}`}</p>
          {p?.category && <p className="text-xs text-muted mt-0.5">{p.category}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(fp)}
            className="p-2 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
            title="Редагувати"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(fp)}
            className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Видалити"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-hover rounded-lg p-2 text-center">
          <p className="text-muted mb-0.5">Врожай</p>
          <p className="font-semibold text-accent">{fp.yield_per_m2} кг/м²</p>
        </div>
        <div className="bg-hover rounded-lg p-2 text-center">
          <p className="text-muted mb-0.5">Ціна</p>
          <p className="font-semibold text-txt">{fp.sell_price} ₴/кг</p>
        </div>
        <div className="bg-hover rounded-lg p-2 text-center">
          <p className="text-muted mb-0.5">Насіння</p>
          <p className="font-semibold text-txt">{fp.seed_price ?? 2} ₴/шт</p>
        </div>
      </div>

      {p && (
        <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-2">
          <span>Росте {p.grow_days} дн.</span>
          <span>{p.plants_per_m2} шт/м²</span>
        </div>
      )}
    </div>
  )
}

export default function FarmerPlants() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [farmerPlants, setFarmerPlants] = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    Promise.all([
      getAll().catch(() => []),
      getPlants().catch(() => []),
    ]).then(([fps, ps]) => {
      setFarmerPlants(Array.isArray(fps) ? fps : [])
      setPlants(Array.isArray(ps) ? ps : [])
      setLoading(false)
    })
  }, [])

  const alreadyAddedIds = new Set(farmerPlants.map(fp => String(fp.plant_id)))
  const availablePlants = plants.filter(p => !alreadyAddedIds.has(String(p.id)))

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(fp) {
    setEditTarget(fp)
    setForm({
      plant_id:       String(fp.plant_id),
      yield_per_m2:   String(fp.yield_per_m2),
      sell_price:     String(fp.sell_price),
      seed_price:     String(fp.seed_price ?? 2),
      water_seedling: String(fp.water_seedling),
      water_growth:   String(fp.water_growth),
      water_flowering:String(fp.water_flowering),
      water_ripening: String(fp.water_ripening),
      notes:          fp.notes || '',
    })
    setShowForm(true)
  }

  function setField(key) {
    return (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function validate() {
    if (!editTarget && !form.plant_id) { addToast('Виберіть культуру', 'warning'); return false }
    if (!form.yield_per_m2 || parseFloat(form.yield_per_m2) <= 0) { addToast('Введіть врожайність', 'warning'); return false }
    if (!form.sell_price   || parseFloat(form.sell_price)   <= 0) { addToast('Введіть ціну продажу', 'warning'); return false }
    if (!form.seed_price   || parseFloat(form.seed_price)   < 0)  { addToast('Введіть ціну насіння', 'warning'); return false }
    if (!form.water_seedling || parseFloat(form.water_seedling) < 0) { addToast('Введіть полив (розсада)', 'warning'); return false }
    if (!form.water_growth   || parseFloat(form.water_growth)   < 0) { addToast('Введіть полив (ріст)', 'warning'); return false }
    if (!form.water_flowering|| parseFloat(form.water_flowering)< 0) { addToast('Введіть полив (цвітіння)', 'warning'); return false }
    if (!form.water_ripening || parseFloat(form.water_ripening) < 0) { addToast('Введіть полив (дозрівання)', 'warning'); return false }
    return true
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        plant_id:        form.plant_id,
        yield_per_m2:    parseFloat(form.yield_per_m2),
        sell_price:      parseFloat(form.sell_price),
        seed_price:      parseFloat(form.seed_price),
        water_seedling:  parseFloat(form.water_seedling),
        water_growth:    parseFloat(form.water_growth),
        water_flowering: parseFloat(form.water_flowering),
        water_ripening:  parseFloat(form.water_ripening),
        notes:           form.notes || null,
      }
      if (editTarget) {
        const updated = await update(editTarget.id, payload)
        setFarmerPlants(prev => prev.map(fp => fp.id === editTarget.id ? updated : fp))
        addToast('Культуру оновлено', 'success')
      } else {
        const created = await create(payload)
        setFarmerPlants(prev => [...prev, created])
        addToast('Культуру додано', 'success')
      }
      setShowForm(false)
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Помилка збереження', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(fp) {
    try {
      await remove(fp.id)
      setFarmerPlants(prev => prev.filter(x => x.id !== fp.id))
      addToast('Культуру видалено', 'success')
    } catch {
      addToast('Помилка видалення', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const selectedPlant = plants.find(p => String(p.id) === form.plant_id)
  const editPlant = editTarget?.plant

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-sm text-muted hover:text-accent transition-colors">← Назад</button>
            <h1 className="page-title">Мої культури</h1>
          </div>
          <button onClick={openCreate} className="btn-accent px-4 py-2 text-sm">
            + Додати культуру
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5 h-40 animate-pulse bg-hover" />
            ))}
          </div>
        ) : farmerPlants.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-txt font-semibold mb-1">Ще немає культур</p>
            <p className="text-muted text-sm mb-5">Додайте культури, щоб створювати плани посадки та отримувати прогнози.</p>
            <button onClick={openCreate} className="btn-accent px-5 py-2.5">Додати першу культуру →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {farmerPlants.map(fp => (
              <PlantCard
                key={fp.id}
                fp={fp}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </main>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-txt text-lg">
                {editTarget ? `Редагувати: ${editPlant?.name || ''}` : 'Нова культура'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-txt p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Plant select — only for create */}
              {!editTarget && (
                <div>
                  <label className="label">Культура *</label>
                  <select value={form.plant_id} onChange={setField('plant_id')} className="input">
                    <option value="">Виберіть культуру…</option>
                    {availablePlants.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.category} · {p.grow_days} дн.
                      </option>
                    ))}
                  </select>
                  {availablePlants.length === 0 && plants.length > 0 && (
                    <p className="text-xs text-muted mt-1">Усі доступні культури вже додані.</p>
                  )}
                </div>
              )}

              {/* Plant info hint */}
              {(selectedPlant || editPlant) && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 text-xs grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted">Росте</span><br/>
                    <span className="text-accent font-semibold">{(selectedPlant || editPlant)?.grow_days} дн.</span>
                  </div>
                  <div>
                    <span className="text-muted">Щільність</span><br/>
                    <span className="text-accent font-semibold">{(selectedPlant || editPlant)?.plants_per_m2} шт/м²</span>
                  </div>
                  <div>
                    <span className="text-muted">Категорія</span><br/>
                    <span className="text-accent font-semibold">{(selectedPlant || editPlant)?.category}</span>
                  </div>
                </div>
              )}

              {/* Yield and prices */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Врожай (кг/м²) *</label>
                  <input type="number" value={form.yield_per_m2} onChange={setField('yield_per_m2')}
                    min="0.1" step="0.1" className="input" placeholder="4.5" />
                </div>
                <div>
                  <label className="label">Ціна продажу (₴/кг) *</label>
                  <input type="number" value={form.sell_price} onChange={setField('sell_price')}
                    min="0" step="1" className="input" placeholder="30" />
                </div>
                <div>
                  <label className="label">Ціна насіння (₴/шт) *</label>
                  <input type="number" value={form.seed_price} onChange={setField('seed_price')}
                    min="0" step="0.1" className="input" placeholder="2.0" />
                </div>
              </div>

              {/* Water per phase */}
              <div>
                <p className="label mb-2">Норма поливу по фазах (л/м²) *</p>
                <div className="grid grid-cols-2 gap-3">
                  <WaterField label="Розсада" value={form.water_seedling} onChange={setField('water_seedling')} />
                  <WaterField label="Ріст"    value={form.water_growth}   onChange={setField('water_growth')} />
                  <WaterField label="Цвітіння" value={form.water_flowering} onChange={setField('water_flowering')} />
                  <WaterField label="Дозрівання" value={form.water_ripening} onChange={setField('water_ripening')} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Примітки</label>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  rows={2}
                  className="input resize-none"
                  placeholder="Особливості вирощування…"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2.5 flex-1">
                  Скасувати
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-accent px-4 py-2.5 flex-1 disabled:opacity-60">
                  {saving ? 'Збереження…' : editTarget ? 'Зберегти' : 'Додати'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Видалити культуру?"
          itemName={deleteTarget.plant?.name}
          message="Культуру буде видалено з ваших записів. Існуючі плани посадки залишаться."
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
