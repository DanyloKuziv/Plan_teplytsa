import React, { useState, useEffect, useRef, useCallback } from 'react'
import { formatDate } from '../utils/format.js'
import { post as postSensorLog } from '../api/sensor_logs.js'
import { createAlert } from '../api/alerts.js'

// ── Color / label helpers ─────────────────────────────────────────────────────
function tempColor(v) {
  if (v == null) return 'text-muted'
  if (v > 35 || v < 10) return 'text-danger'
  if (v > 30 || v < 14) return 'text-warn'
  return 'text-accent'
}
function tempLabel(v) {
  if (v == null) return ''
  if (v > 35) return 'Критично!'
  if (v < 10) return 'Критично!'
  if (v > 30) return 'Підвищена'
  if (v < 14) return 'Знижена'
  return 'Норма'
}
function humidColor(v) {
  if (v == null) return 'text-muted'
  if (v < 30) return 'text-danger'
  if (v < 45) return 'text-warn'
  return 'text-accent'
}
function humidLabel(v) {
  if (v == null) return ''
  if (v < 30) return 'Критично низька'
  if (v < 45) return 'Помірна'
  return 'Норма'
}
function co2Color(v) {
  if (v == null) return 'text-muted'
  if (v > 1500) return 'text-danger'
  if (v > 1100) return 'text-warn'
  return 'text-accent'
}
function co2Label(v) {
  if (v == null) return ''
  if (v > 1500) return 'Критично!'
  if (v > 1100) return 'Підвищений'
  return 'Норма'
}
function o2Color(v) {
  if (v == null) return 'text-muted'
  if (v < 18.5) return 'text-danger'
  if (v < 19.5) return 'text-warn'
  return 'text-accent'
}
function o2Label(v) {
  if (v == null) return ''
  if (v < 18.5) return 'Критично!'
  if (v < 19.5) return 'Знижений'
  if (v > 22) return 'Підвищений'
  return 'Норма'
}
function soilLabel(v) {
  if (v == null) return ''
  if (v < 30) return 'Сухо'
  if (v < 50) return 'Помірно'
  if (v < 70) return 'Норма'
  return 'Волого'
}
function lightLabel(v) {
  if (v == null) return ''
  if (v < 100) return 'Темно'
  if (v < 5000) return 'Розсіяне'
  if (v < 20000) return 'Помірне'
  if (v < 40000) return 'Яскраве'
  return 'Дуже яскраве'
}
function getGaugeColor(cls) {
  if (cls === 'text-danger') return '#ff4757'
  if (cls === 'text-warn')   return '#ffa502'
  if (cls === 'text-accent') return '#00d4aa'
  return '#64748b'
}

// ── Sensor definitions ────────────────────────────────────────────────────────
const SENSOR_TYPES = [
  { key: 'temperature',   label: 'Температура',       unit: '°C',  icon: '🌡',  color: '#00d4aa' },
  { key: 'humidity_air',  label: 'Вологість повітря', unit: '%',   icon: '💧',  color: '#3b82f6' },
  { key: 'humidity_soil', label: 'Вологість ґрунту',  unit: '%',   icon: '🌱',  color: '#22c55e' },
  { key: 'co2_ppm',       label: 'CO₂',               unit: 'ppm', icon: '💨',  color: '#f59e0b' },
  { key: 'o2_pct',        label: 'Кисень O₂',         unit: '%',   icon: '🫧',  color: '#8b5cf6' },
  { key: 'light_lux',     label: 'Освітленість',      unit: 'lux', icon: '☀️', color: '#fbbf24' },
]
const DEFAULT_ACTIVE = new Set(['temperature', 'humidity_air', 'co2_ppm', 'o2_pct'])

const ALERT_RULES = [
  {
    type: 'high_temperature',
    check: d => d.temperature != null && d.temperature > 35,
    msg:   d => `Температура ${d.temperature}°C — критично висока, провітрити теплицю`,
    value: d => d.temperature,
  },
  {
    type: 'low_temperature',
    check: d => d.temperature != null && d.temperature < 12,
    msg:   d => `Температура ${d.temperature}°C — занадто низька, перевірте опалення`,
    value: d => d.temperature,
  },
  {
    type: 'high_co2',
    check: d => d.co2_ppm != null && d.co2_ppm > 1200,
    msg:   d => `CO₂ ${d.co2_ppm} ppm — підвищений рівень, провітрити`,
    value: d => d.co2_ppm,
  },
  {
    type: 'low_humidity',
    check: d => d.humidity_air != null && d.humidity_air < 40,
    msg:   d => `Вологість повітря ${d.humidity_air}% — низька, увімкніть зрошення`,
    value: d => d.humidity_air,
  },
  {
    type: 'low_o2',
    check: d => d.o2_pct != null && d.o2_pct < 19,
    msg:   d => `Рівень O₂ ${d.o2_pct}% — знижений, перевірте вентиляцію`,
    value: d => d.o2_pct,
  },
]
const OFFLINE_COOLDOWN_MS = 30 * 60 * 1000   // 30 min between same offline alert
const ALERT_COOLDOWN_MS   = 10 * 60 * 1000   // 10 min between same threshold alert

// ── Seeded determinism per greenhouse ────────────────────────────────────────
function ghHash(ghId) {
  if (!ghId) return 1
  let h = 0
  for (let i = 0; i < ghId.length; i++) {
    h = (Math.imul(31, h) + ghId.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}
function getBaseline(ghId) {
  const s = ghHash(ghId)
  return {
    tempCenter:  17 + seededRand(s)     * 9,   // 17–26 °C
    humCenter:   52 + seededRand(s + 1) * 22,  // 52–74 %
    co2Center:   430 + seededRand(s + 2) * 220, // 430–650 ppm
    o2Center:    20.3 + (seededRand(s + 3) - 0.5) * 0.6,
    lightCenter: 5000 + seededRand(s + 4) * 10000,
    soilCenter:  48 + seededRand(s + 5) * 18,
  }
}
function getSensorSerial(ghId, key) {
  const s = ghHash(ghId + key)
  const h = (n) => Math.floor(seededRand(n) * 256).toString(16).toUpperCase().padStart(2, '0')
  return `${h(s)}${h(s + 1)}-${h(s + 2)}${h(s + 3)}`
}
function getSensorSignal(ghId, key) {
  // 1–4 bars, stable per GH+sensor
  return 1 + (ghHash(ghId + key + 'sig') % 4)
}

// ── Simulation helpers ────────────────────────────────────────────────────────
function nudge(val, min, max, step) {
  const delta = (Math.random() - 0.5) * 2 * step
  return Math.max(min, Math.min(max, +(val + delta).toFixed(2)))
}
function makeInitial(ghId) {
  const b = getBaseline(ghId)
  return {
    temperature:   +(b.tempCenter  + (Math.random() - 0.5) * 4).toFixed(1),
    humidity_air:  +(b.humCenter   + (Math.random() - 0.5) * 8).toFixed(1),
    humidity_soil: +(b.soilCenter  + (Math.random() - 0.5) * 6).toFixed(1),
    co2_ppm:       +(b.co2Center   + (Math.random() - 0.5) * 80).toFixed(0),
    o2_pct:        +(b.o2Center    + (Math.random() - 0.5) * 0.2).toFixed(2),
    light_lux:     +(b.lightCenter + (Math.random() - 0.5) * 2000).toFixed(0),
    recorded_at: new Date().toISOString(),
  }
}
function tickSimulation(prev) {
  return {
    temperature:   nudge(prev.temperature,   8, 40,    0.3),
    humidity_air:  nudge(prev.humidity_air,  20, 98,   1.2),
    humidity_soil: nudge(prev.humidity_soil, 10, 95,   0.8),
    co2_ppm:       nudge(prev.co2_ppm,       300, 2000, 25),
    o2_pct:        nudge(prev.o2_pct,        17, 23,   0.04),
    light_lux:     nudge(prev.light_lux,     0, 65000, 400),
    recorded_at: new Date().toISOString(),
  }
}
function updateHistory(history, data, activeKeys) {
  const MAX = 30
  const next = { ...history }
  for (const key of activeKeys) {
    const arr = next[key] ? [...next[key]] : []
    if (data[key] != null) arr.push(data[key])
    if (arr.length > MAX) arr.splice(0, arr.length - MAX)
    next[key] = arr
  }
  return next
}

// ── Persistence ───────────────────────────────────────────────────────────────
function loadSimState(ghId) {
  try {
    const raw = localStorage.getItem(`sim_${ghId}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}
function saveSimState(ghId, state) {
  try { localStorage.setItem(`sim_${ghId}`, JSON.stringify(state)) } catch {}
}
function clearSimState(ghId) {
  try { localStorage.removeItem(`sim_${ghId}`) } catch {}
}
function canFireAlert(ghId, type) {
  try {
    const ts = parseInt(localStorage.getItem(`sim_alert_${ghId}_${type}`) || '0', 10)
    return Date.now() - ts > ALERT_COOLDOWN_MS
  } catch { return true }
}
function setAlertFired(ghId, type) {
  try { localStorage.setItem(`sim_alert_${ghId}_${type}`, String(Date.now())) } catch {}
}
function canFireOfflineAlert(ghId, sensorKey) {
  try {
    const ts = parseInt(localStorage.getItem(`sim_offline_${ghId}_${sensorKey}`) || '0', 10)
    return Date.now() - ts > OFFLINE_COOLDOWN_MS
  } catch { return true }
}
function setOfflineAlertFired(ghId, sensorKey) {
  try { localStorage.setItem(`sim_offline_${ghId}_${sensorKey}`, String(Date.now())) } catch {}
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ values, color = '#00d4aa', width = 72, height = 22 }) {
  if (!values || values.length < 2) return <div style={{ width, height }} />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 2) + 1
    const y = height - 2 - ((v - min) / range) * (height - 4)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

// ── Signal bars ───────────────────────────────────────────────────────────────
function SignalBars({ bars = 4, active = true }) {
  return (
    <div className="flex items-end gap-[2px]">
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ width: 3, height: 4 + i * 2,
          background: active && i <= bars ? '#00d4aa' : '#2a3040',
          borderRadius: 1 }} />
      ))}
    </div>
  )
}

// ── Trend arrow ───────────────────────────────────────────────────────────────
function Trend({ values }) {
  if (!values || values.length < 4) return null
  const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3
  const older  = values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
  const diff = recent - older
  if (Math.abs(diff) < 0.5) return <span className="text-muted text-xs">→</span>
  return <span className={diff > 0 ? 'text-warn text-xs' : 'text-accent text-xs'}>{diff > 0 ? '↑' : '↓'}</span>
}

// ── SemiGauge ─────────────────────────────────────────────────────────────────
function SemiGauge({ value, min = 0, max = 100, color = '#00d4aa', label, unit, size = 100 }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = 38, cx = 50, cy = 54
  const circumference = Math.PI * r
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.6} viewBox="0 0 100 60">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#2a3040" strokeWidth="7" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }} />
        <text x="50" y="52" textAnchor="middle" fontSize="13" fontWeight="bold" fill={color}>
          {value != null ? (typeof value === 'number' ? value.toFixed(value < 10 ? 2 : 1) : value) : '—'}
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="6" fill="#64748b">{unit}</text>
      </svg>
      <span className="text-[10px] text-muted mt-0.5 text-center leading-tight">{label}</span>
    </div>
  )
}

// ── Sensor card ───────────────────────────────────────────────────────────────
function SensorCard({ sensor, value, colorClass, label, history, ghId, offline }) {
  const serial = getSensorSerial(ghId, sensor.key)
  const bars   = getSensorSignal(ghId, sensor.key)

  return (
    <div className={`metric-card flex flex-col gap-2 transition-all ${offline ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted text-xs font-medium">
          <span className="text-base leading-none">{sensor.icon}</span>
          <span>{sensor.label}</span>
        </div>
        <SignalBars bars={offline ? 0 : bars} active={!offline} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className={`text-2xl font-bold tabular-nums ${offline ? 'text-muted' : colorClass}`}>
          {offline ? (
            <span className="text-danger text-sm font-semibold flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-danger" />
              Offline
            </span>
          ) : value != null ? (
            <>
              {typeof value === 'number'
                ? (value >= 1000 ? Math.round(value) : value.toFixed(sensor.unit === 'ppm' ? 0 : 1))
                : value}
              <span className="text-xs font-normal ml-1 text-muted">{sensor.unit}</span>
            </>
          ) : <span className="text-border text-base">—</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {!offline && <Trend values={history?.[sensor.key]} />}
          <Sparkline values={history?.[sensor.key]} color={offline ? '#374151' : sensor.color} width={72} height={20} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${offline ? 'text-danger' : colorClass}`}>{offline ? 'Не відповідає' : label}</span>
        <span className="text-[10px] text-muted/50 font-mono">{serial}</span>
      </div>
    </div>
  )
}

// ── Connecting overlay ────────────────────────────────────────────────────────
function ConnectingOverlay({ sensors, onDone }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState([])

  useEffect(() => {
    if (step >= sensors.length) {
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
    const delay = 350 + Math.random() * 450
    const t = setTimeout(() => {
      setDone(prev => [...prev, sensors[step].key])
      setStep(s => s + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [step, sensors, onDone])

  return (
    <div className="card p-6 animate-fadeIn">
      <p className="text-sm font-semibold text-txt mb-1">Підключення датчиків...</p>
      <p className="text-xs text-muted mb-5">Встановлення з'єднання з пристроями</p>
      <div className="space-y-3">
        {sensors.map((s, i) => {
          const isDone    = done.includes(s.key)
          const isCurrent = i === step
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-base w-6 text-center leading-none">{s.icon}</span>
              <span className="flex-1 text-sm text-txt">{s.label}</span>
              <span className="font-mono text-[10px] text-muted/50 hidden sm:block">
                {getSensorSerial('', s.key)}
              </span>
              <span className="text-xs w-24 text-right">
                {isDone ? (
                  <span className="text-accent font-medium flex items-center gap-1 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                    Підключено
                  </span>
                ) : isCurrent ? (
                  <span className="text-warn flex items-center gap-1 justify-end">
                    <span className="inline-block w-3 h-3 border-2 border-warn border-t-transparent rounded-full animate-spin" />
                    З'єднання...
                  </span>
                ) : (
                  <span className="text-muted">Очікування</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
      {step >= sensors.length && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-accent text-sm animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Усі датчики підключено — запуск симуляції
        </div>
      )}
    </div>
  )
}

// ── Setup panel ───────────────────────────────────────────────────────────────
function SimSetupPanel({ activeKeys, onToggleKey, onSave, onStart, ghId }) {
  return (
    <div className="card p-5 animate-fadeIn">
      <div className="mb-4">
        <p className="font-semibold text-txt text-sm">Оберіть датчики для теплиці</p>
        <p className="text-xs text-muted mt-0.5">Конфігурація зберігається окремо для кожної теплиці</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {SENSOR_TYPES.map(s => {
          const active = activeKeys.has(s.key)
          const serial = getSensorSerial(ghId || '', s.key)
          return (
            <button key={s.key} onClick={() => onToggleKey(s.key)}
              className={`flex flex-col gap-1 px-3 py-2.5 rounded-xl text-xs border transition-all text-left
                ${active
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-border bg-hover text-muted hover:text-txt hover:border-border/80'}`}>
              <div className="flex items-center gap-1.5 font-medium">
                <span>{s.icon}</span>
                <span className="truncate">{s.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
              </div>
              <span className="font-mono text-[10px] opacity-40">{serial}</span>
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={onSave}
          className="flex-1 text-xs px-4 py-2 rounded-lg border border-border text-muted hover:text-txt hover:border-accent/30 transition-colors">
          Зберегти
        </button>
        <button onClick={onStart} disabled={activeKeys.size === 0}
          className="flex-1 text-xs px-4 py-2 rounded-lg bg-accent text-bg font-semibold hover:bg-accent-light transition-colors disabled:opacity-40">
          ▶ Підключити
        </button>
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function SensorWidget({ data: liveSensorData, connected, greenhouseId }) {
  // ── Restore persisted state ──────────────────────────────────────────────
  const saved = greenhouseId ? loadSimState(greenhouseId) : null
  const [activeKeys,  setActiveKeys]  = useState(() => {
    if (saved?.keys) return new Set(saved.keys)
    return DEFAULT_ACTIVE
  })
  const [simPhase,  setSimPhase]  = useState(() => saved?.phase || 'idle')
  const [simData,   setSimData]   = useState(() => saved?.data || null)
  const [history,   setHistory]   = useState(() => saved?.history || {})
  const [offline,   setOffline]   = useState(() => saved?.offline || {})
  const [showSetup, setShowSetup] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const intervalRef   = useRef(null)
  const tickRef       = useRef(0)
  const stateRef      = useRef({ simData, history, offline, activeKeys })

  // Keep ref in sync for use inside interval closure
  useEffect(() => { stateRef.current = { simData, history, offline, activeKeys } }, [simData, history, offline, activeKeys])

  // ── Seconds-ago counter ──────────────────────────────────────────────────
  useEffect(() => {
    if (simPhase !== 'running') return
    const t = setInterval(() => {
      const rec = stateRef.current.simData?.recorded_at
      if (rec) setSecondsAgo(Math.round((Date.now() - new Date(rec).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [simPhase])

  // ── Start interval ───────────────────────────────────────────────────────
  const startInterval = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSimData(prev => {
        if (!prev) return prev
        const next = tickSimulation(prev)
        tickRef.current += 1

        setHistory(h => {
          const nh = updateHistory(h, next, stateRef.current.activeKeys)
          // Offline: 0.4% chance per sensor per tick to go offline for 5-12 min
          setOffline(prevOff => {
            const now = Date.now()
            const newOff = { ...prevOff }
            let changed = false
            for (const key of stateRef.current.activeKeys) {
              if (newOff[key] && now < newOff[key]) continue // still offline
              if (newOff[key] && now >= newOff[key]) {
                // recovered
                newOff[key] = null
                changed = true
              }
              if (!newOff[key] && Math.random() < 0.004) {
                const dur = (5 + Math.random() * 7) * 60 * 1000
                newOff[key] = now + dur
                changed = true
                // Fire offline alert
                if (greenhouseId && canFireOfflineAlert(greenhouseId, key)) {
                  const sLabel = SENSOR_TYPES.find(s => s.key === key)?.label || key
                  createAlert(greenhouseId, 'sensor_offline',
                    `Датчик "${sLabel}" не відповідає — перевірте підключення`
                  ).catch(() => {})
                  setOfflineAlertFired(greenhouseId, key)
                }
              }
            }
            if (changed) return newOff
            return prevOff
          })

          // Persist every 5th tick
          if (greenhouseId && tickRef.current % 5 === 0) {
            const payload = {}
            for (const key of stateRef.current.activeKeys) payload[key] = next[key]
            postSensorLog(greenhouseId, payload).catch(() => {})

            // Threshold alerts (10-min cooldown per type)
            const now = Date.now()
            for (const rule of ALERT_RULES) {
              if (rule.check(next) && canFireAlert(greenhouseId, rule.type)) {
                createAlert(greenhouseId, rule.type, rule.msg(next), rule.value(next)).catch(() => {})
                setAlertFired(greenhouseId, rule.type)
              }
            }

            // Save state to localStorage
            saveSimState(greenhouseId, {
              phase: 'running',
              data: next,
              keys: [...stateRef.current.activeKeys],
              history: nh,
              offline: stateRef.current.offline,
            })
          }
          return nh
        })

        return next
      })
    }, 3000)
  }, [greenhouseId])

  // ── Auto-resume if was running ───────────────────────────────────────────
  useEffect(() => {
    if (simPhase === 'running') startInterval()
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── After connecting animation → start running ───────────────────────────
  const onConnected = useCallback(() => {
    const initial = makeInitial(greenhouseId)
    setSimData(initial)
    setSimPhase('running')
    setHistory({})
    setOffline({})
    startInterval()
  }, [greenhouseId, startInterval])

  const stopSim = useCallback(() => {
    clearInterval(intervalRef.current)
    setSimPhase('idle')
    setSimData(null)
    setHistory({})
    setOffline({})
    tickRef.current = 0
    if (greenhouseId) clearSimState(greenhouseId)
  }, [greenhouseId])

  const toggleKey = useCallback(key => {
    setActiveKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const saveConf = useCallback(() => {
    if (greenhouseId) {
      const s = loadSimState(greenhouseId) || {}
      saveSimState(greenhouseId, { ...s, keys: [...activeKeys] })
    }
  }, [greenhouseId, activeKeys])

  const activeSensors = SENSOR_TYPES.filter(s => activeKeys.has(s.key))
  const data   = simPhase === 'running' ? simData : liveSensorData
  const isLive = simPhase === 'running' || connected

  function val(key) {
    if (!data) return null
    if (simPhase === 'running' && !activeKeys.has(key)) return null
    if (offline[key] && Date.now() < offline[key]) return null
    return data[key] ?? null
  }

  const temp   = val('temperature')
  const humAir = val('humidity_air')
  const o2     = val('o2_pct')
  const tempC  = getGaugeColor(tempColor(temp))
  const humC   = getGaugeColor(humidColor(humAir))
  const o2C    = getGaugeColor(o2Color(o2))

  const offlineCount = Object.values(offline).filter(v => v && Date.now() < v).length

  return (
    <div className="space-y-4">

      {/* ── Control bar ─────────────────────────────────────────── */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${isLive ? 'text-accent' : 'text-muted'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-accent animate-pulse' : 'bg-border'}`} />
            {simPhase === 'running' ? 'Симуляція' : simPhase === 'connecting' ? 'Підключення...' : connected ? 'Live' : 'Офлайн'}
          </span>
          {simPhase === 'running' && (
            <span className="text-xs text-muted hidden sm:flex items-center gap-2">
              <span>{activeSensors.length} датчиків</span>
              {offlineCount > 0 && (
                <span className="text-danger font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                  {offlineCount} offline
                </span>
              )}
              {secondsAgo > 0 && (
                <span className="text-muted/60">· оновлено {secondsAgo}с тому</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {simPhase !== 'connecting' && (
            <button onClick={() => setShowSetup(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                ${showSetup ? 'border-accent/50 text-accent bg-accent/10' : 'border-border text-muted hover:text-accent hover:border-accent/30'}`}>
              {showSetup ? '✕' : '⚙'} Датчики
            </button>
          )}
          {simPhase === 'idle' && !connected && (
            <button onClick={() => setShowSetup(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors">
              ▶ Підключити
            </button>
          )}
          {simPhase === 'running' && (
            <button onClick={stopSim}
              className="text-xs px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 transition-colors">
              ◼ Зупинити
            </button>
          )}
        </div>
      </div>

      {/* ── Setup panel ─────────────────────────────────────────── */}
      {showSetup && simPhase === 'idle' && (
        <SimSetupPanel
          activeKeys={activeKeys}
          onToggleKey={toggleKey}
          onSave={saveConf}
          onStart={() => { saveConf(); setSimPhase('connecting'); setShowSetup(false) }}
          ghId={greenhouseId}
        />
      )}
      {showSetup && simPhase === 'running' && (
        <div className="card p-4 animate-fadeIn">
          <p className="text-xs text-muted mb-3">Активні датчики</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeSensors.map(s => (
              <div key={s.key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5 border border-accent/20">
                <span>{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-accent truncate">{s.label}</p>
                  <p className="text-[10px] font-mono text-muted/50">{getSensorSerial(greenhouseId || '', s.key)}</p>
                </div>
                <SignalBars bars={offline[s.key] && Date.now() < offline[s.key] ? 0 : getSensorSignal(greenhouseId || '', s.key)} active={!(offline[s.key] && Date.now() < offline[s.key])} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connecting animation ─────────────────────────────────── */}
      {simPhase === 'connecting' && (
        <ConnectingOverlay sensors={activeSensors} onDone={onConnected} />
      )}

      {/* ── No data state ────────────────────────────────────────── */}
      {!data && simPhase !== 'connecting' && (
        <div className="card p-5">
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-muted text-sm mb-2">Датчики не підключені</p>
            <p className="text-xs text-muted/70 mb-4">Запустіть симуляцію або підключіть реальні датчики</p>
            <button onClick={() => setShowSetup(true)} className="btn-accent text-sm px-5 py-2">
              Підключити датчики →
            </button>
          </div>
        </div>
      )}

      {/* ── Sensor readings ─────────────────────────────────────── */}
      {data && (
        <div className="card p-5">
          <h3 className="section-title mb-5">Сенсори</h3>

          {/* Gauges */}
          {(temp != null || humAir != null || o2 != null) && (
            <div className="flex justify-around flex-wrap gap-4 mb-5 bg-hover rounded-xl p-4">
              {temp != null && (
                <div className="flex flex-col items-center gap-1">
                  <SemiGauge value={temp} min={-10} max={50} color={tempC} label="Температура" unit="°C" />
                  <span className={`text-xs font-medium ${tempColor(temp)}`}>{tempLabel(temp)}</span>
                </div>
              )}
              {humAir != null && (
                <div className="flex flex-col items-center gap-1">
                  <SemiGauge value={humAir} min={0} max={100} color={humC} label="Вологість повітря" unit="%" />
                  <span className={`text-xs font-medium ${humidColor(humAir)}`}>{humidLabel(humAir)}</span>
                </div>
              )}
              {o2 != null && (
                <div className="flex flex-col items-center gap-1">
                  <SemiGauge value={o2} min={15} max={25} color={o2C} label="Кисень O₂" unit="%" size={90} />
                  <span className={`text-xs font-medium ${o2Color(o2)}`}>{o2Label(o2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Sensor cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeSensors.map(s => {
              const v = val(s.key)
              const isOffline = !!(offline[s.key] && Date.now() < offline[s.key])
              let colorClass = 'text-accent'
              let label = ''
              switch (s.key) {
                case 'temperature':   colorClass = tempColor(v);  label = tempLabel(v);  break
                case 'humidity_air':  colorClass = humidColor(v); label = humidLabel(v); break
                case 'humidity_soil': colorClass = humidColor(v); label = soilLabel(v);  break
                case 'co2_ppm':       colorClass = co2Color(v);   label = co2Label(v);   break
                case 'o2_pct':        colorClass = o2Color(v);    label = o2Label(v);    break
                case 'light_lux':     colorClass = v > 0 ? 'text-warn' : 'text-muted'; label = lightLabel(v); break
              }
              return (
                <SensorCard key={s.key} sensor={s} value={v} colorClass={colorClass}
                  label={label} history={history} ghId={greenhouseId || ''} offline={isOffline} />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
