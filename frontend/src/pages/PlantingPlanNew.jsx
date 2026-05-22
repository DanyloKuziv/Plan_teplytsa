import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { getAll as getGreenhouses } from '../api/greenhouses.js'
import { getByGreenhouse as getZones } from '../api/zones.js'
import { getAll as getSubstrates } from '../api/substrates.js'
import { getAll as getFarmerPlants, create as createFarmerPlant } from '../api/farmerPlants.js'
import { getAll as getAllPlants } from '../api/plants.js'
import { create as createPlan } from '../api/planting_plans.js'
import { formatDate, formatCurrency } from '../utils/format.js'
import { useToast } from '../context/ToastContext.jsx'

const TOTAL_STEPS = 3

// Default growing params used when user picks a plant without a configured farmerPlant
const PLANT_DEFAULTS = {
  yield_per_m2:    3.0,
  sell_price:      30.0,
  seed_price:      2.0,
  water_seedling:  0.5,
  water_growth:    1.0,
  water_flowering: 0.8,
  water_ripening:  0.6,
}

function StepIndicator({ step }) {
  const labels = ['Місце', 'Культура', 'Підтвердження']
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                i + 1 < step
                  ? 'bg-accent text-bg'
                  : i + 1 === step
                  ? 'bg-accent text-bg shadow-glow-sm ring-4 ring-accent/20'
                  : 'bg-hover text-muted border border-border'
              }`}
            >
              {i + 1 < step ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-[10px] font-medium ${i + 1 === step ? 'text-accent' : 'text-muted'}`}>
              {labels[i]}
            </span>
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className={`flex-1 h-0.5 rounded-full mb-4 transition-colors ${i + 1 < step ? 'bg-accent' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function PlantingPlanNew() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [step, setStep] = useState(1)

  const [greenhouses, setGreenhouses] = useState([])
  const [zones, setZones] = useState([])
  const [substrates, setSubstrates] = useState([])
  const [farmerPlants, setFarmerPlants] = useState([])
  const [allPlants, setAllPlants] = useState([])

  const [selectedGh, setSelectedGh] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [selectedSubstrate, setSelectedSubstrate] = useState('')

  // selectedPlantKey = "fp:UUID" (farmerPlant) | "pl:UUID" (plain plant from catalog)
  const [selectedPlantKey, setSelectedPlantKey] = useState('')
  const [area, setArea] = useState('')
  const [plantedAt, setPlantedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      getGreenhouses().catch(() => []),
      getSubstrates().catch(() => []),
      getFarmerPlants().catch(() => []),
      getAllPlants().catch(() => []),
    ]).then(([ghs, subs, fps, plants]) => {
      setGreenhouses(Array.isArray(ghs) ? ghs : [])
      setSubstrates(Array.isArray(subs) ? subs : [])
      setFarmerPlants(Array.isArray(fps) ? fps : [])
      setAllPlants(Array.isArray(plants) ? plants : [])
    })
  }, [])

  useEffect(() => {
    if (!selectedGh) { setZones([]); setSelectedZone(''); return }
    getZones(selectedGh)
      .then(z => { setZones(Array.isArray(z) ? z : []); setSelectedZone('') })
      .catch(() => setZones([]))
  }, [selectedGh])

  const currentZone = zones.find(z => String(z.id) === String(selectedZone))
  const currentGh   = greenhouses.find(gh => String(gh.id) === String(selectedGh))
  const currentSub  = substrates.find(s => String(s.id) === String(selectedSubstrate))

  // Build combined plant list for the dropdown
  // farmerPlants come first (user has custom settings), then catalog plants not yet configured
  const fpPlantIds = new Set(farmerPlants.map(fp => String(fp.plant_id)))
  const unconfiguredPlants = allPlants.filter(p => !fpPlantIds.has(String(p.id)))

  // Resolve the currently selected item
  function resolveSelected() {
    if (!selectedPlantKey) return null
    if (selectedPlantKey.startsWith('fp:')) {
      const id = selectedPlantKey.slice(3)
      return { type: 'fp', fp: farmerPlants.find(fp => String(fp.id) === id) }
    }
    if (selectedPlantKey.startsWith('pl:')) {
      const id = selectedPlantKey.slice(3)
      return { type: 'pl', plant: allPlants.find(p => String(p.id) === id) }
    }
    return null
  }

  const resolved = resolveSelected()
  const resolvedPlant = resolved?.type === 'fp' ? resolved.fp?.plant : resolved?.plant

  // Effective yield / price for estimates
  const effectiveYield = resolved?.type === 'fp'
    ? resolved.fp?.yield_per_m2
    : PLANT_DEFAULTS.yield_per_m2
  const effectivePrice = resolved?.type === 'fp'
    ? resolved.fp?.sell_price
    : PLANT_DEFAULTS.sell_price
  const effectiveGrowDays = resolvedPlant?.grow_days ?? 30

  const estYield   = selectedPlantKey && area ? (parseFloat(area) * effectiveYield).toFixed(1) : null
  const estRevenue = estYield ? formatCurrency(parseFloat(estYield) * effectivePrice) : null

  function validateStep1() {
    if (!selectedGh)        { addToast('Виберіть теплицю', 'warning');   return false }
    if (!selectedZone)      { addToast('Виберіть зону', 'warning');       return false }
    if (!selectedSubstrate) { addToast('Виберіть субстрат', 'warning');   return false }
    return true
  }

  function validateStep2() {
    if (!selectedPlantKey) { addToast('Виберіть культуру', 'warning'); return false }
    const a = parseFloat(area)
    if (!area || isNaN(a) || a <= 0) { addToast('Введіть коректну площу', 'warning'); return false }
    if (currentZone && a > currentZone.area) {
      addToast(`Площа перевищує зону (${currentZone.area} м²)`, 'warning'); return false
    }
    if (!plantedAt) { addToast('Оберіть дату посадки', 'warning'); return false }
    return true
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    if (!validateStep1() || !validateStep2()) return
    setSubmitting(true)
    try {
      let farmerPlantId

      if (selectedPlantKey.startsWith('fp:')) {
        farmerPlantId = selectedPlantKey.slice(3)
      } else {
        // Auto-create a farmerPlant with defaults for the chosen catalog plant
        const plantId = selectedPlantKey.slice(3)
        const newFp = await createFarmerPlant({
          plant_id:        plantId,
          yield_per_m2:    PLANT_DEFAULTS.yield_per_m2,
          sell_price:      PLANT_DEFAULTS.sell_price,
          seed_price:      PLANT_DEFAULTS.seed_price,
          water_seedling:  PLANT_DEFAULTS.water_seedling,
          water_growth:    PLANT_DEFAULTS.water_growth,
          water_flowering: PLANT_DEFAULTS.water_flowering,
          water_ripening:  PLANT_DEFAULTS.water_ripening,
        })
        farmerPlantId = String(newFp.id)
        // Update local state so future navigations see it
        setFarmerPlants(prev => [...prev, newFp])
        // Switch key to fp: so confirmation shows correct label
        setSelectedPlantKey(`fp:${farmerPlantId}`)
      }

      const result = await createPlan({
        greenhouse_id:   selectedGh,
        zone_id:         selectedZone,
        substrate_id:    selectedSubstrate,
        farmer_plant_id: farmerPlantId,
        area:            parseFloat(area),
        planted_at:      plantedAt,
      })
      addToast('План створено!', 'success')
      navigate(`/planting-plans/${result.plan_id || result.id}`)
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Помилка створення плану', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-sm text-muted hover:text-accent transition-colors">← Назад</button>
          <h1 className="page-title">Новий план посадки</h1>
        </div>

        <StepIndicator step={step} />

        {/* Step 1 — Місце */}
        {step === 1 && (
          <div className="card p-6 space-y-4 animate-fadeIn">
            <h2 className="font-semibold text-txt mb-2">Крок 1 — Місце посадки</h2>

            <div>
              <label className="label">Теплиця *</label>
              <select value={selectedGh} onChange={e => setSelectedGh(e.target.value)} className="input">
                <option value="">Виберіть теплицю…</option>
                {greenhouses.map(gh => (
                  <option key={gh.id} value={gh.id}>{gh.name} ({gh.total_area} м²)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Зона *</label>
              <select
                value={selectedZone}
                onChange={e => setSelectedZone(e.target.value)}
                disabled={!selectedGh}
                className="input disabled:opacity-50"
              >
                <option value="">
                  {!selectedGh ? 'Спочатку виберіть теплицю' : zones.length === 0 ? 'Зон немає — додайте у планувальнику' : 'Виберіть зону…'}
                </option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} ({z.area} м²)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Субстрат *</label>
              <select value={selectedSubstrate} onChange={e => setSelectedSubstrate(e.target.value)} className="input">
                <option value="">Виберіть субстрат…</option>
                {substrates.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.growth_modifier && s.growth_modifier !== 1 ? ` · ріст ×${s.growth_modifier}` : ''}
                    {s.yield_modifier  && s.yield_modifier  !== 1 ? ` · врожай ×${s.yield_modifier}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2 — Культура */}
        {step === 2 && (
          <div className="card p-6 space-y-4 animate-fadeIn">
            <h2 className="font-semibold text-txt mb-2">Крок 2 — Культура</h2>

            <div>
              <label className="label">Культура *</label>
              <select
                value={selectedPlantKey}
                onChange={e => setSelectedPlantKey(e.target.value)}
                className="input"
              >
                <option value="">Виберіть культуру…</option>

                {farmerPlants.length > 0 && (
                  <optgroup label="Мої культури (налаштовані)">
                    {farmerPlants.map(fp => (
                      <option key={`fp:${fp.id}`} value={`fp:${fp.id}`}>
                        {fp.plant?.name || `Культура #${String(fp.id).slice(0, 6)}`}
                        {fp.yield_per_m2 ? ` · ${fp.yield_per_m2} кг/м²` : ''}
                        {fp.sell_price   ? ` · ${fp.sell_price} ₴/кг` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}

                {unconfiguredPlants.length > 0 && (
                  <optgroup label="Каталог культур (стандартні параметри)">
                    {unconfiguredPlants.map(p => (
                      <option key={`pl:${p.id}`} value={`pl:${p.id}`}>
                        {p.name}
                        {p.grow_days ? ` · ${p.grow_days} дн.` : ''}
                        {p.category  ? ` · ${p.category}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {resolved?.type === 'pl' && (
                <p className="text-xs text-muted mt-1.5">
                  Буде використано стандартні параметри.{' '}
                  <button
                    onClick={() => navigate('/farmer-plants')}
                    className="text-accent underline"
                  >
                    Налаштувати у «Мої культури»
                  </button>
                </p>
              )}
            </div>

            {/* Plant info card */}
            {resolved && resolvedPlant && (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 text-xs grid grid-cols-3 gap-2">
                <div>
                  <span className="text-muted">Врожай</span><br/>
                  <span className="text-accent font-semibold">{effectiveYield} кг/м²</span>
                </div>
                <div>
                  <span className="text-muted">Ціна</span><br/>
                  <span className="text-accent font-semibold">{effectivePrice} ₴/кг</span>
                </div>
                <div>
                  <span className="text-muted">Росте</span><br/>
                  <span className="text-accent font-semibold">{effectiveGrowDays} дн.</span>
                </div>
              </div>
            )}

            <div>
              <label className="label">
                Площа (м²) *
                {currentZone && <span className="text-muted font-normal ml-1">макс. {currentZone.area} м²</span>}
              </label>
              <input
                type="number"
                value={area}
                onChange={e => setArea(e.target.value)}
                min="0.1"
                max={currentZone?.area}
                step="0.1"
                className="input"
                placeholder="20"
              />
            </div>

            <div>
              <label className="label">Дата посадки *</label>
              <input
                type="date"
                value={plantedAt}
                onChange={e => setPlantedAt(e.target.value)}
                className="input"
              />
            </div>

            {estYield && (
              <div className="bg-hover rounded-xl p-3 flex items-center justify-between text-sm">
                <span className="text-muted">Попередній прогноз</span>
                <span className="text-accent font-semibold">~{estYield} кг · ~{estRevenue}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Підтвердження */}
        {step === 3 && (
          <div className="card p-6 animate-fadeIn">
            <h2 className="font-semibold text-txt mb-5">Крок 3 — Підтвердження</h2>
            <div className="space-y-0">
              {[
                { label: 'Теплиця',       value: currentGh?.name },
                { label: 'Зона',          value: currentZone?.name },
                { label: 'Субстрат',      value: currentSub?.name },
                { label: 'Культура',      value: resolvedPlant?.name },
                { label: 'Площа',         value: area ? `${area} м²` : null },
                { label: 'Дата посадки',  value: plantedAt ? formatDate(plantedAt) : null },
                { label: 'Прогноз врожаю', value: estYield ? `~${estYield} кг` : null, accent: true },
                { label: 'Прогноз доходу', value: estRevenue || null, accent: true },
              ].map(row => row.value && (
                <div key={row.label} className="flex justify-between py-2.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted">{row.label}</span>
                  <span className={`text-sm font-medium ${row.accent ? 'text-accent' : 'text-txt'}`}>{row.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-accent w-full py-3 mt-6 text-base disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Створення…
                </span>
              ) : 'Створити план'}
            </button>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 mt-5">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost px-5 py-2.5">
              ← Назад
            </button>
          )}
          {step < TOTAL_STEPS && (
            <button onClick={handleNext} className="btn-accent px-5 py-2.5 ml-auto">
              Далі →
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
