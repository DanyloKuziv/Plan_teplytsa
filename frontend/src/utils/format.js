export function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value).replace(/\s/g, ' ')
}

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  const formatted = Math.round(value).toLocaleString('uk-UA').replace(/\s/g, ' ')
  return `${formatted} грн`
}

export function formatWeight(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${formatNumber(value)} кг`
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}.${month}.${year}`
  } catch {
    return '—'
  }
}

export function formatPhase(phase) {
  const map = {
    germination: 'Проростання',
    seedling: 'Розсада',
    vegetative: 'Вегетація',
    flowering: 'Цвітіння',
    fruiting: 'Плодоношення',
    ripening: 'Дозрівання',
    harvest: 'Збір',
    dormancy: 'Спокій'
  }
  return map[phase] || phase || '—'
}

export function phaseColor(phase) {
  const map = {
    germination: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
    seedling:    'text-lime-600 bg-lime-50 dark:bg-lime-900/30',
    vegetative:  'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
    flowering:   'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
    fruiting:    'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
    ripening:    'text-red-600 bg-red-50 dark:bg-red-900/30',
    harvest:     'text-green-700 bg-green-50 dark:bg-green-900/30',
    dormancy:    'text-slate-500 bg-slate-100 dark:bg-slate-800'
  }
  return map[phase] || 'text-slate-600 bg-slate-100 dark:bg-slate-800'
}
