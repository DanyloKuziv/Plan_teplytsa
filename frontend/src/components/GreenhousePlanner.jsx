import React, { useState, useCallback, useEffect, useRef } from 'react'
import { getFloorPlan, saveFloorPlan } from '../api/floor_plans.js'
import { update as updateZone } from '../api/zones.js'
import { getAll as getFarmerPlants, create as createFarmerPlant } from '../api/farmerPlants.js'
import { getAll as getAllPlants } from '../api/plants.js'
import { getAll as getSubstrates } from '../api/substrates.js'
import { create as createPlantingPlan } from '../api/planting_plans.js'
import { update as updateGreenhouse } from '../api/greenhouses.js'
import { useToast } from '../context/ToastContext.jsx'

const COLS      = 32
const ROWS      = 22
const CELL      = 36
const CELL_AREA = 0.5

const Z_COLORS = ['#2d6a4f','#8b1a1a','#1a3a6b','#6b4c1a','#4a1a6b','#1a5a5a']
const Z_BORDER = ['#40a070','#cc4040','#4070cc','#cc8840','#8840cc','#40aaaa']

const EQUIPMENT_TYPES = [
  { type: 'water',  icon: '🚰', label: 'Полив' },
  { type: 'heater', icon: '🔥', label: 'Обігрів' },
  { type: 'light',  icon: '💡', label: 'Підсвітка' },
  { type: 'door',   icon: '🚪', label: 'Вхід' },
  { type: 'drip',   icon: '💧', label: 'Крапельниця' },
  { type: 'fan',    icon: '🌀', label: 'Вентиляція' },
]

const COVERAGE = {
  water:  { radius: 2,   color: '#3b82f622', label: 'Полив' },
  drip:   { radius: 2,   color: '#3b82f622', label: 'Крапельниця' },
  heater: { radius: 3.5, color: '#f9731618', label: 'Обігрів' },
  light:  { radius: 3,   color: '#fbbf2420', label: 'Підсвітка' },
}

const TOOLS = [
  { id: 'draw',  icon: '🏗', label: 'Форма' },
  { id: 'zone',  icon: '🌿', label: 'Зони' },
  { id: 'equip', icon: '⚙️', label: 'Обладнання' },
  { id: 'erase', icon: '🗑', label: 'Ластик' },
]

const EQUIP_ICONS = { water:'🚰', heater:'🔥', light:'💡', door:'🚪', drip:'💧', fan:'🌀' }

// ── Engineering analysis constants ──────────────────────────────────────────
const HEAT_LOSS_FACTOR = { none: 85, basic: 65, good: 45 }
const HEATER_KW_UNIT   = 2.0

const ST = {
  ok:   { color: '#22c55e', icon: '✓', bg: '#052e1640', border: '#166534' },
  warn: { color: '#f59e0b', icon: '⚠', bg: '#451a0340', border: '#78350f' },
  bad:  { color: '#ef4444', icon: '✗', bg: '#450a0a40', border: '#7f1d1d' },
}

function analyzeIrrigation(zones, equipment, zonePaint, zoneCellCounts) {
  return zones
    .filter(z => (zoneCellCounts[z.id] || 0) > 0)
    .map(z => {
      const cellSet = new Set(
        Object.entries(zonePaint).filter(([, id]) => id === z.id).map(([k]) => k)
      )
      const actual  = equipment.filter(e => e.type === 'drip' && cellSet.has(ck(e.col, e.row))).length
      const areaM2  = +(zoneCellCounts[z.id] * CELL_AREA).toFixed(1)
      const needed  = Math.ceil(areaM2 / 3)
      const pct     = needed > 0 ? Math.min(100, Math.round((actual / needed) * 100)) : 100
      return {
        zoneId: z.id, zoneName: z.name, areaM2, actual, needed, pct,
        status: pct >= 100 ? 'ok' : pct >= 60 ? 'warn' : 'bad',
      }
    })
}

function analyzeHeating(greenhouse, equipment) {
  const area       = greenhouse?.total_area ?? 0
  const insul      = greenhouse?.insulation_type ?? 'basic'
  const hlf        = HEAT_LOSS_FACTOR[insul] ?? 65
  const neededKw   = +(area * hlf / 1000).toFixed(1)
  const boilerKw   = greenhouse?.heating_power_kw ?? 0
  const heatersCnt = equipment.filter(e => e.type === 'heater').length
  const actualKw   = +(Math.max(boilerKw, heatersCnt * HEATER_KW_UNIT)).toFixed(1)
  const pct        = neededKw > 0 ? Math.min(999, Math.round((actualKw / neededKw) * 100)) : 100
  return {
    neededKw, actualKw, boilerKw, heatersCnt, pct,
    minBoilerKw: +(neededKw * 1.1).toFixed(1),
    status: pct >= 100 ? 'ok' : pct >= 70 ? 'warn' : 'bad',
  }
}

function analyzeVentilation(greenhouse, equipment) {
  const area   = greenhouse?.total_area ?? 0
  const needed = Math.max(1, Math.ceil(area / 25))
  const actual = equipment.filter(e => e.type === 'fan').length
  const pct    = Math.min(999, Math.round((actual / needed) * 100))
  return { needed, actual, pct, status: pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : 'bad' }
}
// ────────────────────────────────────────────────────────────────────────────

function ck(col, row) { return `${col},${row}` }
function dist(ax, ay, bx, by) { return Math.sqrt((ax-bx)**2 + (ay-by)**2) }

export default function GreenhousePlanner({ zones = [], greenhouseId, greenhouse, onZonesChange, onHealthScore }) {
  const { addToast } = useToast()
  const totalArea = greenhouse?.total_area ?? 999
  const maxCells  = Math.ceil(totalArea / CELL_AREA)

  const [mode, setMode]               = useState('draw')
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [selectedEquip, setSelectedEquip]   = useState(EQUIPMENT_TYPES[0])
  const [activeZoneId, setActiveZoneId]     = useState(null)

  const [wallCells, setWallCells] = useState({})
  const [zonePaint, setZonePaint] = useState({})
  const [flashCell, setFlashCell] = useState(null)
  const [equipment, setEquipment] = useState([])
  const [painting, setPainting]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [dirty, setDirty]         = useState(false)
  const [hoveredEquip, setHoveredEquip] = useState(null)
  const [showHint, setShowHint] = useState(() => {
    if (!greenhouseId) return false
    return !localStorage.getItem(`planner_hint_shown_${greenhouseId}`)
  })

  // Zone panel state
  const [zpName, setZpName]               = useState('')
  const [zpPlantId, setZpPlantId]         = useState('')
  const [zpSubstrateId, setZpSubstrateId] = useState('')
  const [zpDate, setZpDate]               = useState(new Date().toISOString().slice(0,10))
  const [creatingPlan, setCreatingPlan]   = useState(false)

  const [farmerPlants, setFarmerPlants] = useState([])
  const [allPlants, setAllPlants]       = useState([])
  const [substrates, setSubstrates]     = useState([])

  const wallRef   = useRef({})
  const zoneRef   = useRef({})
  const equipRef  = useRef([])
  const dirtyRef  = useRef(false)
  const debounceRef = useRef(null)

  useEffect(() => { wallRef.current  = wallCells }, [wallCells])
  useEffect(() => { zoneRef.current  = zonePaint }, [zonePaint])
  useEffect(() => { equipRef.current = equipment }, [equipment])

  useEffect(() => {
    if (showHint && (Object.keys(wallCells).length > 0 || equipment.length > 0)) {
      setShowHint(false)
      if (greenhouseId) localStorage.setItem(`planner_hint_shown_${greenhouseId}`, '1')
    }
  }, [wallCells, equipment, showHint, greenhouseId])

  useEffect(() => {
    if (zones.length && !selectedZoneId) setSelectedZoneId(zones[0]?.id ?? null)
  }, [zones])

  useEffect(() => {
    getFarmerPlants().then(d => setFarmerPlants(Array.isArray(d) ? d : [])).catch(() => {})
    getAllPlants().then(d => setAllPlants(Array.isArray(d) ? d : [])).catch(() => {})
    getSubstrates().then(d => setSubstrates(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!greenhouseId) return
    getFloorPlan(greenhouseId).then(plan => {
      if (!plan) return
      const walls = {}
      Object.keys(plan.grid_data || {}).forEach(k => { walls[k] = true })
      setWallCells(walls)
      const zp = {}
      Object.entries(plan.zones_on_grid || {}).forEach(([zId, cells]) => {
        cells.forEach(k => { zp[k] = zId })
      })
      setZonePaint(zp)
      if (Array.isArray(plan.equipment)) setEquipment(plan.equipment)
    }).catch(() => {})
  }, [greenhouseId])

  async function doSave(auto = false) {
    setSaving(true)
    try {
      const zonesOnGrid = {}
      Object.entries(zoneRef.current).forEach(([k, zId]) => {
        if (!zonesOnGrid[zId]) zonesOnGrid[zId] = []
        zonesOnGrid[zId].push(k)
      })
      const gridData = {}
      Object.keys(wallRef.current).forEach(k => { gridData[k] = 'wall' })
      await saveFloorPlan(greenhouseId, { grid_data: gridData, equipment: equipRef.current, zones_on_grid: zonesOnGrid })
      setLastSaved(new Date())
      setDirty(false); dirtyRef.current = false
      if (!auto) addToast('План збережено ✓', 'success')

      // Persist health score to greenhouse
      if (equipRef.current.length > 0 || (greenhouse?.heating_power_kw ?? 0) > 0) {
        const curEq  = equipRef.current
        const curZp  = zoneRef.current
        const curZcc = {}
        Object.values(curZp).forEach(zId => { curZcc[zId] = (curZcc[zId] || 0) + 1 })
        const iA  = analyzeIrrigation(zones, curEq, curZp, curZcc)
        const hA  = analyzeHeating(greenhouse, curEq)
        const vA  = analyzeVentilation(greenhouse, curEq)
        const irrigAvg = iA.length > 0 ? iA.reduce((s, z) => s + z.pct, 0) / iA.length : 100
        const score    = Math.round((irrigAvg + Math.min(100, hA.pct) + Math.min(100, vA.pct)) / 3)
        try {
          await updateGreenhouse(greenhouseId, {
            last_health_score: score,
            last_health_updated: new Date().toISOString(),
          })
          if (onHealthScore) onHealthScore(score)
        } catch {}
      }
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail
        : Array.isArray(detail) ? detail.map(d => d.msg).join('; ')
        : err?.message || 'Помилка збереження'
      addToast(msg, 'error')
    } finally { setSaving(false) }
  }

  function markDirty() {
    setDirty(true); dirtyRef.current = true
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { if (dirtyRef.current) doSave(true) }, 3000)
  }

  // Derived
  const wallCount = Object.keys(wallCells).length
  const wallArea  = +(wallCount * CELL_AREA).toFixed(1)
  const usedPct   = Math.min(100, maxCells > 0 ? (wallCount / maxCells) * 100 : 0)
  const zoneIdxMap = {}
  zones.forEach((z, i) => { zoneIdxMap[z.id] = i })

  const zoneCellCounts = {}
  Object.values(zonePaint).forEach(zId => { zoneCellCounts[zId] = (zoneCellCounts[zId] || 0) + 1 })
  const paintedCount = Object.keys(zonePaint).filter(k => wallCells[k]).length
  const freeArea  = +((wallCount - paintedCount) * CELL_AREA).toFixed(1)

  // Engineering analysis (reactive to equipment + zones + greenhouse)
  const irrigAnalysis = analyzeIrrigation(zones, equipment, zonePaint, zoneCellCounts)
  const heatAnalysis  = analyzeHeating(greenhouse, equipment)
  const ventAnalysis  = analyzeVentilation(greenhouse, equipment)
  const allSts        = [...irrigAnalysis.map(z => z.status), heatAnalysis.status, ventAnalysis.status]
  const overallSt     = allSts.includes('bad') ? 'bad' : allSts.includes('warn') ? 'warn' : 'ok'
  const showAnalysis  = equipment.length > 0 || (greenhouse?.heating_power_kw ?? 0) > 0

  const paintCell = useCallback((col, row) => {
    const key = ck(col, row)
    if (mode === 'erase') {
      setWallCells(prev => { const n={...prev}; delete n[key]; return n })
      setZonePaint(prev => { const n={...prev}; delete n[key]; return n })
      markDirty(); return
    }
    if (mode === 'draw') {
      setWallCells(prev => {
        if (prev[key]) return prev
        if (Object.keys(prev).length >= maxCells) { addToast(`Ліміт ${totalArea} м²`, 'warning'); return prev }
        markDirty()
        return { ...prev, [key]: true }
      }); return
    }
    if (mode === 'zone') {
      if (!wallCells[key]) { setFlashCell(key); setTimeout(() => setFlashCell(k => k===key?null:k), 400); return }
      if (!selectedZoneId) return
      setZonePaint(prev => ({ ...prev, [key]: selectedZoneId }))
      markDirty()
    }
  }, [mode, wallCells, selectedZoneId, maxCells, totalArea, addToast])

  const handleCellDown = useCallback((col, row) => {
    if (mode === 'equip') {
      setEquipment(prev => [...prev.filter(e => !(e.col===col && e.row===row)), { ...selectedEquip, col, row, id: Date.now() }])
      markDirty(); return
    }
    setPainting(true); paintCell(col, row)
  }, [mode, selectedEquip, paintCell])

  const handleCellEnter = useCallback((col, row) => {
    if (!painting || mode === 'equip') return
    paintCell(col, row)
  }, [painting, mode, paintCell])

  // Resolve zpPlantKey ("fp:UUID" | "pl:UUID") → actual farmerPlant object (may be null for catalog plant)
  function resolveFp(key) {
    if (!key) return null
    if (key.startsWith('fp:')) return farmerPlants.find(f => String(f.id) === key.slice(3)) || null
    return null // catalog plant — no fp yet
  }
  function resolveGenericPlant(key) {
    if (!key) return null
    if (key.startsWith('pl:')) return allPlants.find(p => String(p.id) === key.slice(3)) || null
    if (key.startsWith('fp:')) {
      const fp = farmerPlants.find(f => String(f.id) === key.slice(3))
      return fp?.plant || null
    }
    return null
  }

  // Default water/yield params used when auto-creating a farmerPlant
  const FP_DEFAULTS = { yield_per_m2: 3.0, sell_price: 30.0, seed_price: 2.0,
    water_seedling: 0.5, water_growth: 1.0, water_flowering: 0.8, water_ripening: 0.6 }

  // Ensure a real farmerPlant exists for the chosen key; returns farmerPlant id string
  async function ensureFarmerPlant(key) {
    if (!key) return null
    if (key.startsWith('fp:')) {
      const fpId = key.slice(3)
      const exists = farmerPlants.find(f => String(f.id) === fpId)
      if (exists) return fpId
      // stale reference — fall through to create fresh
    }
    const plantId = key.startsWith('fp:') ? null : key.slice(3)
    if (!plantId) return null
    // reuse existing farmer_plant for this plant if one already exists
    const existing = farmerPlants.find(f => String(f.plant_id) === plantId)
    if (existing) return String(existing.id)
    const plant = allPlants.find(p => String(p.id) === plantId)
    const defaults = {
      ...FP_DEFAULTS,
      yield_per_m2: plant?.default_yield_per_m2 ?? FP_DEFAULTS.yield_per_m2,
      sell_price:   plant?.default_sell_price   ?? FP_DEFAULTS.sell_price,
    }
    const newFp = await createFarmerPlant({ plant_id: plantId, ...defaults })
    setFarmerPlants(prev => [...prev, newFp])
    return String(newFp.id)
  }

  function openZonePanel(zId) {
    const z = zones.find(z => z.id === zId)
    if (!z) return
    setActiveZoneId(zId)
    setZpName(z.name)
    // Restore saved farmer_plant_id as fp: key
    setZpPlantId(z.farmer_plant_id ? `fp:${z.farmer_plant_id}` : '')
    setZpSubstrateId(substrates[0]?.id || '')
    setZpDate(new Date().toISOString().slice(0,10))
  }

  async function handleSaveZone() {
    if (!activeZoneId) return
    try {
      const fpId = await ensureFarmerPlant(zpPlantId)
      await updateZone(activeZoneId, { name: zpName, farmer_plant_id: fpId || null })
      // Upgrade key to fp: if it was pl:
      if (fpId && zpPlantId.startsWith('pl:')) setZpPlantId(`fp:${fpId}`)
      addToast('Зону оновлено', 'success')
      if (onZonesChange) onZonesChange()
    } catch (err) {
      const d = err?.response?.data?.detail
      const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => x.msg).join('; ') : err?.message || 'Помилка збереження зони'
      addToast(msg, 'error')
    }
  }

  async function handleCreatePlan() {
    if (!zpPlantId) { addToast('Оберіть культуру', 'warning'); return }
    if (!zpSubstrateId) { addToast('Оберіть субстрат', 'warning'); return }
    setCreatingPlan(true)
    try {
      const fpId = await ensureFarmerPlant(zpPlantId)
      if (!fpId) { addToast('Помилка визначення культури', 'error'); return }
      if (zpPlantId.startsWith('pl:')) setZpPlantId(`fp:${fpId}`)
      const activeIrr = irrigAnalysis.find(a => a.zoneId === activeZoneId)
      await createPlantingPlan({
        greenhouse_id: greenhouseId,
        zone_id: activeZoneId,
        farmer_plant_id: fpId,
        substrate_id: zpSubstrateId,
        area: +(((zoneCellCounts[activeZoneId] || 1) * CELL_AREA).toFixed(1)),
        planted_at: zpDate,
        irrigation_coverage_pct: activeIrr ? activeIrr.pct : 100,
        heating_coverage_pct: Math.min(100, heatAnalysis.pct),
      })
      addToast('План посадки створено ✓', 'success')
      setActiveZoneId(null)
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Помилка', 'error')
    } finally { setCreatingPlan(false) }
  }

  // Forecast — fp may be null for catalog plant (uses defaults for display)
  const fp           = resolveFp(zpPlantId)
  const genericPlant = resolveGenericPlant(zpPlantId)  // works for both fp: and pl:
  const substrate    = substrates.find(s => s.id === zpSubstrateId)
  const zpAreaM2     = activeZoneId ? +(((zoneCellCounts[activeZoneId] || 0) * CELL_AREA).toFixed(1)) : 0
  const hasPlantSelected = !!zpPlantId

  // Substrate modifiers (default 1.0 = no effect)
  const growthMod = substrate?.growth_modifier ?? 1.0
  const yieldMod  = substrate?.yield_modifier  ?? 1.0

  // Effective params: use fp values if available, else catalog plant defaults, else hardcoded fallback
  const effYieldPerM2 = fp?.yield_per_m2 ?? genericPlant?.default_yield_per_m2 ?? FP_DEFAULTS.yield_per_m2
  const effSellPrice  = fp?.sell_price   ?? genericPlant?.default_sell_price   ?? FP_DEFAULTS.sell_price
  const effGrowDays   = genericPlant?.grow_days ?? 30
  const effPlantsM2   = genericPlant?.plants_per_m2 ?? 4
  const effSeedPrice  = fp?.seed_price ?? 2.0

  // Seeds — show plant count, not weight
  const plantsCount   = hasPlantSelected ? Math.round(zpAreaM2 * effPlantsM2) : null
  const seedsDisplay  = plantsCount != null ? `${plantsCount} рослин` : null

  // Yield adjusted by substrate
  const yieldKg = hasPlantSelected
    ? +(zpAreaM2 * effYieldPerM2 * yieldMod).toFixed(1)
    : null

  // Grow days adjusted by substrate
  const adjGrowDays   = Math.round(effGrowDays / growthMod)
  const harvestDate   = hasPlantSelected && adjGrowDays
    ? new Date(new Date(zpDate).getTime() + adjGrowDays * 86400000).toLocaleDateString('uk-UA')
    : null
  const growDaysLabel = hasPlantSelected
    ? adjGrowDays !== effGrowDays
      ? `${adjGrowDays} дн. (замість ${effGrowDays})`
      : `${adjGrowDays} дн.`
    : null

  const revenue  = hasPlantSelected && yieldKg ? Math.round(parseFloat(yieldKg) * effSellPrice) : null

  // Costs
  const seedCost = plantsCount != null ? Math.round(plantsCount * effSeedPrice) : 0
  const opCost   = adjGrowDays ? Math.round(zpAreaM2 * adjGrowDays * 0.8) : Math.round(zpAreaM2 * 30)
  const costs    = hasPlantSelected && zpAreaM2 ? seedCost + opCost : null
  const profit   = revenue != null && costs != null ? revenue - costs : null

  // Yield penalty from equipment analysis
  const activeIrrigA  = irrigAnalysis.find(a => a.zoneId === activeZoneId)
  const irrigPenalty  = activeIrrigA && activeIrrigA.pct < 80 ? 0.85 : 1.0
  const heatPenalty   = heatAnalysis.pct < 70 ? 0.90 : 1.0
  const yieldPenalty  = irrigPenalty * heatPenalty
  const adjYieldKg    = yieldKg != null ? +(parseFloat(yieldKg) * yieldPenalty).toFixed(1) : null
  const adjRevenue    = adjYieldKg != null ? Math.round(parseFloat(adjYieldKg) * effSellPrice) : null
  const adjProfit     = adjRevenue != null && costs != null ? adjRevenue - costs : null

  const savedAgo = lastSaved ? Math.round((Date.now() - lastSaved) / 60000) : null

  const barColor = usedPct >= 100 ? '#ef4444' : usedPct >= 80 ? '#f59e0b' : '#00d4aa'

  const hintText = {
    draw:  `Малюйте форму теплиці — клік або перетягування. Ліміт: ${totalArea} м² (${maxCells} клітин)`,
    zone:  'Клікайте на клітини теплиці щоб призначити зону. Оберіть зону в сайдбарі.',
    equip: 'Клікайте щоб розмістити обладнання. Кола показують зону покриття.',
    erase: 'Клікайте або перетягуйте для видалення клітин та зон.',
  }

  return (
    <div className="flex relative" style={{ minHeight: 'calc(100vh - 200px)', background: '#0a0e1a' }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className="flex flex-col overflow-y-auto flex-shrink-0"
        style={{ width: 280, background: '#0d1117', borderRight: '1px solid #1e2535' }}
      >
        {/* Tools */}
        <div className="p-4 border-b" style={{ borderColor: '#1e2535' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Інструменти</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TOOLS.map(t => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: mode === t.id ? '#0d2518' : 'transparent',
                  border: `1.5px solid ${mode === t.id ? '#00d4aa' : '#1e2535'}`,
                  color: mode === t.id ? '#00d4aa' : '#64748b',
                }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ fontSize: 10 }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Area progress */}
        <div className="p-4 border-b" style={{ borderColor: '#1e2535' }}>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold" style={{ color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Площа</p>
            <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>
              {wallArea} / {totalArea} м²
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e2535' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${usedPct}%`, background: barColor }} />
          </div>
          {freeArea > 0 && (
            <p className="text-xs mt-1.5" style={{ color: '#4a5568' }}>Вільно: <span style={{ color: '#64748b' }}>{freeArea} м²</span></p>
          )}
        </div>

        {/* Equipment mode: equip picker */}
        {mode === 'equip' && (
          <div className="p-4 border-b" style={{ borderColor: '#1e2535' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Обладнання</p>
            <div className="space-y-1">
              {EQUIPMENT_TYPES.map(eq => (
                <button
                  key={eq.type}
                  onClick={() => setSelectedEquip(eq)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    background: selectedEquip.type === eq.type ? '#0d2518' : 'transparent',
                    border: `1.5px solid ${selectedEquip.type === eq.type ? '#00d4aa' : '#1e2535'}`,
                    color: selectedEquip.type === eq.type ? '#e2e8f0' : '#64748b',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{eq.icon}</span>
                  <span className="flex-1 text-left text-xs">{eq.label}</span>
                  {equipment.filter(e => e.type === eq.type).length > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#1e2535', color: '#00d4aa' }}>
                      {equipment.filter(e => e.type === eq.type).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zones list */}
        <div className="p-4 flex-1 border-b" style={{ borderColor: '#1e2535' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Зони</p>
          {zones.length === 0 ? (
            <p className="text-xs" style={{ color: '#4a5568' }}>Немає зон. Додайте на вкладці «Зони».</p>
          ) : (
            <div className="space-y-1.5">
              {zones.map((z, i) => {
                const count = zoneCellCounts[z.id] || 0
                const areaM2 = +(count * CELL_AREA).toFixed(1)
                const isSelected = selectedZoneId === z.id && mode === 'zone'
                const fp = farmerPlants.find(f => f.id === z.farmer_plant_id)
                return (
                  <button
                    key={z.id}
                    onClick={() => {
                      if (mode === 'zone') { setSelectedZoneId(z.id) }
                      else { openZonePanel(z.id) }
                    }}
                    onDoubleClick={() => openZonePanel(z.id)}
                    className="w-full text-left rounded-xl p-2.5 transition-all"
                    style={{
                      background: activeZoneId === z.id ? Z_COLORS[i % Z_COLORS.length] + '30' : isSelected ? Z_COLORS[i % Z_COLORS.length] + '20' : 'transparent',
                      border: `1.5px solid ${activeZoneId === z.id ? Z_BORDER[i % Z_BORDER.length] : isSelected ? Z_BORDER[i % Z_BORDER.length] + '80' : '#1e2535'}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: Z_COLORS[i % Z_COLORS.length], border: `1px solid ${Z_BORDER[i % Z_BORDER.length]}` }} />
                      <span className="flex-1 text-xs font-medium truncate" style={{ color: '#e2e8f0' }}>{z.name}</span>
                      <span className="text-xs tabular-nums flex-shrink-0" style={{ color: Z_BORDER[i % Z_BORDER.length] }}>{areaM2} м²</span>
                    </div>
                    <p className="text-xs mt-1 ml-5" style={{ color: '#4a5568' }}>
                      {fp?.plant?.name || '— не обрано'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Engineering equipment analysis */}
        {showAnalysis && (
          <div className="p-4 border-b" style={{ borderColor: '#1e2535' }}>
            {/* Header with overall status */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: '#4a5568', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                🔍 Аналіз обладнання
              </p>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: ST[overallSt].bg, color: ST[overallSt].color, border: `1px solid ${ST[overallSt].border}` }}
              >
                {overallSt === 'ok' ? '✅ Готово' : overallSt === 'warn' ? '⚠️ Увага' : '❌ Критично'}
              </span>
            </div>

            {/* Irrigation per zone */}
            {irrigAnalysis.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold mb-2" style={{ color: '#64748b' }}>💧 Полив (крапельниці)</p>
                <div className="space-y-2">
                  {irrigAnalysis.map(z => (
                    <div key={z.zoneId} className="pl-2" style={{ borderLeft: `2px solid ${ST[z.status].color}` }}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="truncate" style={{ color: '#e2e8f0', maxWidth: 110 }}>{z.zoneName}</span>
                        <span className="font-bold tabular-nums flex-shrink-0 ml-1" style={{ color: ST[z.status].color }}>
                          {z.actual}/{z.needed} ({z.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#1e2535' }}>
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${z.pct}%`, background: ST[z.status].color }} />
                      </div>
                      <p className="text-[10px]" style={{ color: ST[z.status].color }}>
                        {z.status === 'ok'  && '✓ Полив достатній'}
                        {z.status === 'warn' && `⚠ Потрібно ще ${z.needed - z.actual} кр.`}
                        {z.status === 'bad'  && `✗ Критично — ще ${z.needed - z.actual} кр.`}
                      </p>
                      {z.status !== 'ok' && z.needed > z.actual && (() => {
                        const extra   = z.needed - z.actual
                        const zoneObj = zones.find(zo => zo.id === z.zoneId)
                        const fp_     = farmerPlants.find(f => f.id === zoneObj?.farmer_plant_id)
                        const avgRate = fp_
                          ? (fp_.water_seedling + fp_.water_growth + fp_.water_flowering + fp_.water_ripening) / 4
                          : 0.75
                        const extraW  = +(extra * 3 * avgRate).toFixed(1)
                        return (
                          <p className="text-[10px] mt-0.5" style={{ color: '#4a5568' }}>
                            💡 +{extra} кр. → +{extraW} л/добу
                          </p>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Heating */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color: '#64748b' }}>🔥 Опалення</p>
              <div className="pl-2" style={{ borderLeft: `2px solid ${ST[heatAnalysis.status].color}` }}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: '#94a3b8' }}>Є / Потрібно</span>
                  <span className="font-bold tabular-nums" style={{ color: ST[heatAnalysis.status].color }}>
                    {heatAnalysis.actualKw} / {heatAnalysis.neededKw} кВт
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#1e2535' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, heatAnalysis.pct)}%`, background: ST[heatAnalysis.status].color }} />
                </div>
                <p className="text-[10px]" style={{ color: ST[heatAnalysis.status].color }}>
                  {heatAnalysis.status === 'ok'   && '✓ Опалення достатнє'}
                  {heatAnalysis.status === 'warn'  && '⚠ Можливі холодні зони'}
                  {heatAnalysis.status === 'bad'   && '✗ Недостатнє опалення'}
                </p>
                {heatAnalysis.status === 'bad' && (
                  <p className="text-[10px] mt-0.5" style={{ color: '#4a5568' }}>
                    💡 Рекомендується котел ≥ {heatAnalysis.minBoilerKw} кВт
                  </p>
                )}
              </div>
            </div>

            {/* Ventilation */}
            <div>
              <p className="text-[11px] font-semibold mb-2" style={{ color: '#64748b' }}>🌀 Вентиляція</p>
              <div className="pl-2" style={{ borderLeft: `2px solid ${ST[ventAnalysis.status].color}` }}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span style={{ color: '#94a3b8' }}>Є / Потрібно</span>
                  <span className="font-bold tabular-nums" style={{ color: ST[ventAnalysis.status].color }}>
                    {ventAnalysis.actual} / {ventAnalysis.needed} шт.
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: '#1e2535' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, ventAnalysis.pct)}%`, background: ST[ventAnalysis.status].color }} />
                </div>
                <p className="text-[10px]" style={{ color: ST[ventAnalysis.status].color }}>
                  {ventAnalysis.status === 'ok'   && '✓ Вентиляція достатня'}
                  {ventAnalysis.status === 'warn'  && '⚠ Ризик перегріву влітку'}
                  {ventAnalysis.status === 'bad'   && '✗ Критично — можливий перегрів'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save / Reset */}
        <div className="p-4 mt-auto">
          <div className="text-xs mb-3 text-center" style={{ color: '#4a5568' }}>
            {dirty
              ? <span style={{ color: '#f59e0b' }}>● Є незбережені зміни</span>
              : savedAgo !== null
                ? <span>Автозбережено {savedAgo < 1 ? 'щойно' : `${savedAgo} хв тому`}</span>
                : <span>Не збережено</span>
            }
          </div>
          <button
            onClick={() => doSave(false)}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-2"
            style={{ background: saving ? '#1e2535' : '#00d4aa', color: saving ? '#4a5568' : '#0a0e1a' }}
          >
            {saving ? 'Зберігаємо…' : 'Зберегти план →'}
          </button>
          <button
            onClick={() => { setWallCells({}); setZonePaint({}); setEquipment([]); markDirty() }}
            className="w-full py-2 rounded-xl text-xs transition-all"
            style={{ background: 'transparent', border: '1px solid #1e2535', color: '#4a5568' }}
          >
            Скинути
          </button>
        </div>
      </aside>

      {/* ── MAIN GRID ── */}
      <main className="flex-1 overflow-auto flex flex-col items-center justify-start p-6" style={{ background: '#0a0e1a' }}>
        <div className="rounded-xl overflow-auto" style={{ border: '1px solid #1e2535' }}>
          <svg
            width={COLS * CELL}
            height={ROWS * CELL}
            style={{ display: 'block', userSelect: 'none', cursor: mode === 'erase' ? 'crosshair' : 'crosshair', background: '#0d1117' }}
            onMouseLeave={() => setPainting(false)}
            onMouseUp={() => setPainting(false)}
          >
            <defs>
              <clipPath id="gh-clip">
                {Object.keys(wallCells).map(k => {
                  const [c, r] = k.split(',').map(Number)
                  return <rect key={k} x={c*CELL} y={r*CELL} width={CELL} height={CELL} />
                })}
              </clipPath>
            </defs>

            {/* Grid lines (faint) */}
            {Array.from({ length: ROWS + 1 }).map((_, r) => (
              <line key={`h${r}`} x1={0} y1={r*CELL} x2={COLS*CELL} y2={r*CELL} stroke="#1a1f2e" strokeWidth="0.5" />
            ))}
            {Array.from({ length: COLS + 1 }).map((_, c) => (
              <line key={`v${c}`} x1={c*CELL} y1={0} x2={c*CELL} y2={ROWS*CELL} stroke="#1a1f2e" strokeWidth="0.5" />
            ))}

            {/* Cells */}
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const key  = ck(col, row)
                const isWall  = !!wallCells[key]
                const zoneId  = zonePaint[key]
                const zIdx    = zoneId !== undefined ? (zoneIdxMap[zoneId] ?? 0) : null
                const isFlash = flashCell === key

                let fill = 'transparent', stroke = 'none', sw = 0

                if (isFlash) {
                  fill = '#ef444440'; stroke = '#ef4444'; sw = 1.5
                } else if (isWall) {
                  if (zIdx !== null) {
                    fill   = Z_COLORS[zIdx % Z_COLORS.length] + 'dd'
                    stroke = Z_BORDER[zIdx % Z_BORDER.length]
                  } else {
                    fill   = '#1a2a1e'
                    stroke = '#2a4a32'
                  }
                  sw = 1
                }

                return (
                  <rect
                    key={key}
                    x={col*CELL} y={row*CELL}
                    width={CELL} height={CELL}
                    fill={fill} stroke={stroke} strokeWidth={sw}
                    style={{ cursor: 'crosshair' }}
                    onMouseDown={e => { e.preventDefault(); handleCellDown(col, row) }}
                    onMouseEnter={() => handleCellEnter(col, row)}
                  />
                )
              })
            )}

            {/* Coverage circles — clipped to greenhouse shape, only in equip mode */}
            {mode === 'equip' && (
              <g clipPath="url(#gh-clip)">
                {equipment.map(eq => {
                  const cfg = COVERAGE[eq.type]
                  if (!cfg) return null
                  return (
                    <circle
                      key={eq.id + '-cov'}
                      cx={eq.col*CELL + CELL/2} cy={eq.row*CELL + CELL/2}
                      r={cfg.radius * CELL}
                      fill={cfg.color}
                      style={{ pointerEvents: 'none' }}
                    />
                  )
                })}
              </g>
            )}

            {/* Zone name labels */}
            {zones.map((z, zi) => {
              const keys = Object.entries(zonePaint).filter(([,zId]) => zId === z.id).map(([k]) => k)
              if (!keys.length) return null
              const coords = keys.map(k => { const [c,r] = k.split(',').map(Number); return {c,r} })
              const minR = Math.min(...coords.map(x => x.r))
              const minC = Math.min(...coords.filter(x => x.r === minR).map(x => x.c))
              return (
                <text key={z.id}
                  x={minC*CELL + 4} y={minR*CELL + 12}
                  fontSize={9} fontWeight="700"
                  fill={Z_BORDER[zi % Z_BORDER.length]}
                  style={{ pointerEvents: 'none' }}
                >{z.name}</text>
              )
            })}

            {/* Equipment icons */}
            {equipment.map(eq => {
              const zoneId = zonePaint[ck(eq.col, eq.row)]
              const zone   = zones.find(z => z.id === zoneId)
              const isHovered = hoveredEquip === eq.id
              const typeLabel = EQUIPMENT_TYPES.find(t => t.type === eq.type)?.label || eq.type
              // Tooltip dimensions
              const ttLines = [typeLabel, zone ? `Зона: ${zone.name}` : '— поза зоною'].filter(Boolean)
              const ttW = 100, ttH = ttLines.length * 13 + 8
              const ttX = Math.min(eq.col * CELL - (ttW - CELL) / 2, COLS * CELL - ttW - 2)
              const ttY = eq.row * CELL - ttH - 6
              return (
                <g key={eq.id}
                  onMouseEnter={() => setHoveredEquip(eq.id)}
                  onMouseLeave={() => setHoveredEquip(null)}
                >
                  <text
                    x={eq.col*CELL + CELL/2} y={eq.row*CELL + CELL/2 + 6}
                    textAnchor="middle" fontSize={CELL * 0.5}
                    style={{ pointerEvents: 'none' }}
                  >{eq.icon}</text>
                  <rect
                    x={eq.col*CELL + CELL - 10} y={eq.row*CELL + 1}
                    width={9} height={9} fill="#ef4444" rx="2"
                    style={{ cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); setEquipment(prev => prev.filter(e2 => e2.id !== eq.id)); markDirty() }}
                  />
                  <text x={eq.col*CELL + CELL - 5.5} y={eq.row*CELL + 8.5}
                    textAnchor="middle" fontSize={7} fill="white"
                    style={{ pointerEvents: 'none' }}>×</text>

                  {/* Hover tooltip */}
                  {isHovered && ttY > 0 && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={4}
                        fill="#0d1117" stroke="#2a3a50" strokeWidth={1} />
                      {ttLines.map((line, i) => (
                        <text key={i} x={ttX + ttW / 2} y={ttY + 12 + i * 13}
                          textAnchor="middle" fontSize={9}
                          fill={i === 0 ? '#00d4aa' : '#94a3b8'}
                          fontWeight={i === 0 ? '700' : '400'}
                        >{line}</text>
                      ))}
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Hint */}
        <p className="mt-3 text-xs" style={{ color: '#374151' }}>{hintText[mode]}</p>
      </main>

      {/* ── ONBOARDING HINT ── */}
      {showHint && Object.keys(wallCells).length === 0 && equipment.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <div
            className="pointer-events-auto mx-4 rounded-2xl p-6 text-center max-w-sm"
            style={{ background: '#0d1117ee', border: '1px solid #00d4aa40', backdropFilter: 'blur(8px)' }}
          >
            <div className="text-3xl mb-3">👋</div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#e2e8f0' }}>
              Почніть проектування теплиці
            </p>
            <ol className="text-xs text-left space-y-2 mb-4" style={{ color: '#94a3b8' }}>
              <li><span style={{ color: '#00d4aa' }}>1.</span> <strong style={{ color: '#e2e8f0' }}>Форма</strong> — намалюйте контур теплиці кліком або перетяганням</li>
              <li><span style={{ color: '#00d4aa' }}>2.</span> <strong style={{ color: '#e2e8f0' }}>Зони</strong> — розподіліть площу між культурами</li>
              <li><span style={{ color: '#00d4aa' }}>3.</span> <strong style={{ color: '#e2e8f0' }}>Обладнання</strong> — розмістіть полив, опалення і вентиляцію</li>
            </ol>
            <button
              className="text-xs px-4 py-2 rounded-lg font-medium"
              style={{ background: '#00d4aa', color: '#0a0e1a' }}
              onClick={() => {
                setShowHint(false)
                if (greenhouseId) localStorage.setItem(`planner_hint_shown_${greenhouseId}`, '1')
              }}
            >
              Зрозуміло →
            </button>
          </div>
        </div>
      )}

      {/* ── ZONE DETAIL PANEL ── */}
      {activeZoneId && (() => {
        const z = zones.find(z => z.id === activeZoneId)
        const zi = zones.findIndex(z => z.id === activeZoneId)
        if (!z) return null
        return (
          <aside
            className="flex-shrink-0 overflow-y-auto flex flex-col"
            style={{ width: 320, background: '#0d1117', borderLeft: '1px solid #1e2535' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#1e2535' }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ background: Z_COLORS[zi % Z_COLORS.length], border: `1px solid ${Z_BORDER[zi % Z_BORDER.length]}` }} />
                <span className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>Деталі зони</span>
              </div>
              <button onClick={() => setActiveZoneId(null)} style={{ color: '#4a5568' }} className="hover:text-white text-lg leading-none">×</button>
            </div>

            <div className="p-4 flex flex-col gap-4 flex-1">
              {/* Name */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Назва зони</label>
                <input
                  value={zpName} onChange={e => setZpName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: '#1a1f2e', border: '1px solid #2a3040', color: '#e2e8f0' }}
                />
              </div>

              {/* Area (read-only) */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: '#1a1f2e' }}>
                <span className="text-xs" style={{ color: '#64748b' }}>Площа зони</span>
                <span className="text-sm font-bold" style={{ color: '#00d4aa' }}>{zpAreaM2} м²</span>
              </div>

              {/* Plant */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Культура</label>
                <select
                  value={zpPlantId} onChange={e => setZpPlantId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: '#1a1f2e', border: '1px solid #2a3040', color: '#e2e8f0' }}
                >
                  <option value="">— Оберіть культуру —</option>

                  {farmerPlants.length > 0 && (
                    <optgroup label="Мої культури">
                      {farmerPlants.map(f => (
                        <option key={`fp:${f.id}`} value={`fp:${f.id}`}>
                          {f.plant?.name || `#${String(f.id).slice(0,6)}`}
                          {f.yield_per_m2 ? ` · ${f.yield_per_m2} кг/м²` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {allPlants.filter(p => !farmerPlants.some(f => String(f.plant_id) === String(p.id))).length > 0 && (
                    <optgroup label="Каталог (стандартні параметри)">
                      {allPlants
                        .filter(p => !farmerPlants.some(f => String(f.plant_id) === String(p.id)))
                        .map(p => (
                          <option key={`pl:${p.id}`} value={`pl:${p.id}`}>
                            {p.name}
                            {p.grow_days ? ` · ${p.grow_days} дн.` : ''}
                          </option>
                        ))
                      }
                    </optgroup>
                  )}
                </select>
                {zpPlantId.startsWith('pl:') && (
                  <p className="text-[10px] mt-1" style={{ color: '#64748b' }}>
                    Стандартні параметри. При збереженні буде додано до «Мої культури».
                  </p>
                )}
              </div>

              {/* Substrate */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Субстрат</label>
                <select
                  value={zpSubstrateId} onChange={e => setZpSubstrateId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: '#1a1f2e', border: '1px solid #2a3040', color: '#e2e8f0' }}
                >
                  <option value="">— Оберіть субстрат —</option>
                  {substrates.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Planting date */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Дата посадки</label>
                <input
                  type="date" value={zpDate} onChange={e => setZpDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{ background: '#1a1f2e', border: '1px solid #2a3040', color: '#e2e8f0', colorScheme: 'dark' }}
                />
              </div>

              {/* Save zone button */}
              <button
                onClick={handleSaveZone}
                className="w-full py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: '#1e2535', border: '1px solid #2a3040', color: '#94a3b8' }}
              >
                Зберегти назву / культуру
              </button>

              {/* Forecast */}
              {hasPlantSelected && zpAreaM2 > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a2a' }}>
                  <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#0d2518' }}>
                    <p className="text-xs font-semibold" style={{ color: '#40a070' }}>📊 Прогноз</p>
                    {zpPlantId.startsWith('pl:') && (
                      <span className="text-[10px]" style={{ color: '#64748b' }}>стандартні</span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    {[
                      { icon: '🌾', label: 'Врожай',
                        value: adjYieldKg != null ? `~${adjYieldKg} кг` : '—',
                        sub: (() => {
                          const parts = []
                          if (yieldMod !== 1.0) parts.push(`×${yieldMod} субстрат`)
                          if (yieldPenalty < 1.0) parts.push(`×${yieldPenalty.toFixed(2)} обладнання`)
                          return parts.length ? parts.join(', ') : null
                        })(),
                        accent: false },
                      { icon: '⏱', label: 'Дозрівання',
                        value: growDaysLabel || '—',
                        sub: growthMod !== 1.0 ? `×${growthMod} швидкість росту` : null },
                      { icon: '📅', label: 'Дата збору',  value: harvestDate || '—' },
                      { icon: '🌱', label: 'Насіння',     value: seedsDisplay || '—' },
                      { icon: '💰', label: 'Дохід',       value: adjRevenue ? `~${adjRevenue.toLocaleString('uk-UA')} ₴` : '—' },
                      { icon: '💸', label: 'Витрати',
                        value: costs ? `~${costs.toLocaleString('uk-UA')} ₴` : '—',
                        sub: costs ? `насіння ~${seedCost} ₴ + операц. ~${opCost} ₴` : null },
                      { icon: '📈', label: 'Прибуток',
                        value: adjProfit != null ? `~${adjProfit.toLocaleString('uk-UA')} ₴` : '—',
                        accent: adjProfit != null && adjProfit > 0 },
                    ].map(row => (
                      <div key={row.label} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#64748b' }}>{row.icon} {row.label}:</span>
                          <span className="font-semibold" style={{ color: row.accent ? '#00d4aa' : '#e2e8f0' }}>{row.value}</span>
                        </div>
                        {row.sub && <p className="text-right mt-0.5" style={{ color: '#374151', fontSize: 10 }}>{row.sub}</p>}
                      </div>
                    ))}

                    {/* Equipment penalty warnings */}
                    {irrigPenalty < 1.0 && (
                      <div className="mt-2 rounded-lg px-2.5 py-2 text-[10px]" style={{ background: '#451a0340', border: '1px solid #78350f' }}>
                        <p style={{ color: '#f59e0b' }}>⚠ Недостатнє покриття поливу може знизити врожайність на 15%</p>
                      </div>
                    )}
                    {heatPenalty < 1.0 && (
                      <div className="mt-1 rounded-lg px-2.5 py-2 text-[10px]" style={{ background: '#450a0a40', border: '1px solid #7f1d1d' }}>
                        <p style={{ color: '#ef4444' }}>⚠ Ризик втрат врожаю при низьких температурах (−10%)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Create plan button */}
              <button
                onClick={handleCreatePlan}
                disabled={creatingPlan || !zpPlantId || !zpSubstrateId}
                className="mt-auto w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: (!zpPlantId || !zpSubstrateId) ? '#1e2535' : '#00d4aa',
                  color: (!zpPlantId || !zpSubstrateId) ? '#4a5568' : '#0a0e1a',
                }}
              >
                {creatingPlan ? 'Створюємо…' : '🌱 Створити план посадки'}
              </button>
            </div>
          </aside>
        )
      })()}
    </div>
  )
}
