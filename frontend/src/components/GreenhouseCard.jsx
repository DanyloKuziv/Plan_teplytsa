import React from 'react'
import { Link } from 'react-router-dom'

const heatingIcon = { gas: '🔥', wood: '🪵', electric: '⚡', heat_pump: '♻️' }
const heatingLabel = { gas: 'Газ', wood: 'Дрова', electric: 'Електро', heat_pump: 'Тепловий насос' }
const insulationColor = { none: 'text-danger', basic: 'text-warn', good: 'text-accent' }
const insulationLabel = { none: 'Без утеплення', basic: 'Базове', good: 'Гарне утеплення' }

function MiniGridThumbnail({ area }) {
  const cols = Math.min(12, Math.max(4, Math.round(Math.sqrt(area / 0.5) * 1.4)))
  const rows = Math.min(8,  Math.max(3, Math.round(Math.sqrt(area / 0.5) / 1.4)))
  const cells = cols * rows
  const filledCount = Math.round(cells * 0.3)

  return (
    <div className="relative w-full h-14 bg-hover rounded-lg overflow-hidden border border-border/50 flex-shrink-0">
      <svg width="100%" height="100%" viewBox={`0 0 ${cols * 8} ${rows * 8}`} preserveAspectRatio="xMidYMid meet">
        <rect width={cols * 8} height={rows * 8} fill="#222736"/>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const idx = r * cols + c
            const isFilled = idx < filledCount && (idx * 7 + 3) % 5 !== 0
            return (
              <rect
                key={`${r}-${c}`}
                x={c * 8 + 0.5}
                y={r * 8 + 0.5}
                width={7}
                height={7}
                rx={1}
                fill={isFilled ? '#00d4aa22' : '#1a1f2e'}
                stroke="#2a3040"
                strokeWidth="0.5"
              />
            )
          })
        )}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const idx = r * cols + c
            const isZone = idx < filledCount && (idx * 7 + 3) % 5 !== 0
            if (!isZone) return null
            return (
              <rect
                key={`z-${r}-${c}`}
                x={c * 8 + 1.5}
                y={r * 8 + 1.5}
                width={5}
                height={5}
                rx={0.5}
                fill="#00d4aa"
                opacity={0.25 + (idx % 3) * 0.1}
              />
            )
          })
        )}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
      <span className="absolute bottom-1 right-2 text-[9px] text-muted font-medium">Планувальник</span>
    </div>
  )
}

export default function GreenhouseCard({ greenhouse, planCount = 0, sensorOnline = false }) {
  const { id, name, total_area, heating_type, insulation_type } = greenhouse

  return (
    <Link
      to={`/greenhouses/${id}`}
      className="card-hover block p-5 group animate-fadeIn"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-xl group-hover:bg-accent/20 transition-colors flex-shrink-0">
            🏡
          </div>
          <div>
            <h3 className="font-semibold text-txt group-hover:text-accent transition-colors leading-tight">
              {name}
            </h3>
            <p className="text-xs text-muted mt-0.5">{total_area} м²</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${sensorOnline ? 'bg-accent shadow-glow-sm' : 'bg-border'}`} />
            <span className="text-xs text-muted">{sensorOnline ? 'Online' : 'Offline'}</span>
          </div>
          {planCount > 0 && (
            <span className="badge-accent">
              {planCount} {planCount === 1 ? 'план' : planCount < 5 ? 'плани' : 'планів'}
            </span>
          )}
        </div>
      </div>

      {/* Mini planner grid */}
      <MiniGridThumbnail area={total_area || 100} />

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-hover rounded-lg p-2 flex items-center gap-2">
          <span className="text-sm">{heatingIcon[heating_type] || '🔥'}</span>
          <span className="text-xs text-muted truncate">{heatingLabel[heating_type] || heating_type}</span>
        </div>
        <div className="bg-hover rounded-lg p-2 flex items-center gap-2">
          <span className="text-xs">🧱</span>
          <span className={`text-xs font-medium truncate ${insulationColor[insulation_type] || 'text-muted'}`}>
            {insulationLabel[insulation_type] || insulation_type}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted">Переглянути деталі</span>
        <svg className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
