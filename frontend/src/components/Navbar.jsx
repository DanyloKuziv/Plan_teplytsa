import React, { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getAll as getGreenhouses } from '../api/greenhouses.js'
import { getByGreenhouse } from '../api/alerts.js'

const navLinks = [
  { to: '/dashboard',     label: 'Панель',     icon: '▦' },
  { to: '/greenhouses',   label: 'Теплиці',    icon: '🌿' },
  { to: '/farmer-plants', label: 'Культури',   icon: '🌱' },
  { to: '/market-prices', label: 'Ринок цін',  icon: '📈' },
]

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function avatarColor(name) {
  const colors = ['#00d4aa', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981']
  if (!name) return colors[0]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export default function Navbar() {
  const { logout, token, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function fetchAlerts() {
      try {
        const ghs = await getGreenhouses()
        if (cancelled) return
        let total = 0
        await Promise.all(
          ghs.map(async (gh) => {
            try {
              const alerts = await getByGreenhouse(gh.id, true)
              if (!cancelled) total += Array.isArray(alerts) ? alerts.length : 0
            } catch {}
          })
        )
        if (!cancelled) setAlertCount(total)
      } catch {}
    }
    fetchAlerts()
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const linkClass = ({ isActive }) =>
    `relative flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-150 ${
      isActive
        ? 'text-accent bg-accent/10 shadow-glow-sm'
        : 'text-muted hover:text-txt hover:bg-hover'
    }`

  // full_name is now embedded in the JWT payload
  const fullName  = user?.full_name || ''
  const email     = user?.email || ''
  // "Василь К." — first word + first letter of second word + dot
  const shortName = (() => {
    if (!fullName) return email.split('@')[0].slice(0, 8) || 'Користувач'
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
    return parts[0]
  })()
  const initials  = getInitials(fullName || email)
  const bgColor   = avatarColor(fullName || email)

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 font-bold text-lg group">
            <svg width="34" height="34" viewBox="0 0 56 56" fill="none">
              <rect width="56" height="56" rx="13" fill="#0d1428"/>
              <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
              <line x1="28" y1="6" x2="28" y2="20" stroke="#00d4aa" strokeWidth="2.2"/>
              <line x1="18" y1="20" x2="18" y2="50" stroke="#00d4aa" strokeWidth="2"/>
              <line x1="38" y1="20" x2="38" y2="50" stroke="#00d4aa" strokeWidth="2"/>
              <path d="M19 50 L19 36 Q19 27 28 27 Q37 27 37 36 L37 50" stroke="#00d4aa" strokeWidth="2.2" fill="none"/>
              <line x1="28" y1="20" x2="28" y2="27" stroke="#00d4aa" strokeWidth="1.8"/>
              <line x1="6" y1="35" x2="19" y2="35" stroke="#00d4aa" strokeWidth="1.7"/>
              <line x1="37" y1="35" x2="50" y2="35" stroke="#00d4aa" strokeWidth="1.7"/>
              <line x1="28" y1="48" x2="28" y2="38" stroke="#00d4aa" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M28 41 C23 39 21 35 23 32" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M28 41 C33 39 35 35 33 32" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            <span className="hidden sm:inline text-txt">ТеплицяПлан</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent/10 to-transparent pointer-events-none" />
                    )}
                    <span className="text-base leading-none">{l.icon}</span>
                    {l.label}
                    {l.to === '/greenhouses' && alertCount > 0 && (
                      <span className="ml-0.5 min-w-[18px] h-[18px] bg-danger text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {user?.is_admin && (
              <NavLink to="/admin" className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent/10 to-transparent pointer-events-none" />}
                    <span className="text-base leading-none">🛡</span>
                    Адмін
                  </>
                )}
              </NavLink>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => navigate('/greenhouses')}
              className="relative p-2 text-muted hover:text-txt hover:bg-hover rounded-lg transition-colors"
              title={alertCount > 0 ? `${alertCount} непрочитаних алертів` : 'Алерти'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-danger text-white text-[9px] rounded-full flex items-center justify-center px-0.5 font-bold animate-fadeIn">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* User avatar + dropdown */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 rounded-lg p-1 hover:bg-hover transition-colors"
                aria-label="Меню користувача"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-bg flex-shrink-0"
                  style={{ backgroundColor: bgColor }}
                >
                  {initials}
                </div>
                <span className="hidden sm:block text-sm text-txt max-w-[120px] truncate">{shortName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`hidden sm:block text-muted transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl py-1.5 animate-slideUp z-50">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-txt truncate">{fullName || shortName}</p>
                    <p className="text-xs text-muted truncate mt-0.5">{email}</p>
                  </div>
                  {/* Menu items */}
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/greenhouses') }}
                    className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-txt hover:bg-hover transition-colors flex items-center gap-2.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    Мої теплиці
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/dashboard') }}
                    className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-txt hover:bg-hover transition-colors flex items-center gap-2.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    Панель
                  </button>
                  {user?.is_admin && (
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/admin') }}
                      className="w-full text-left px-4 py-2.5 text-sm text-accent hover:bg-accent/10 transition-colors flex items-center gap-2.5"
                    >
                      <span>🛡</span>
                      Адмін-панель
                    </button>
                  )}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); logout() }}
                      className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors flex items-center gap-2.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                      </svg>
                      Вийти
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="lg:hidden p-2 text-muted hover:text-txt hover:bg-hover rounded-lg transition-colors"
              aria-label="Меню"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-card px-4 py-3 space-y-1 animate-slideUp">
          {navLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span className="text-base leading-none">{l.icon}</span>
                  {l.label}
                  {l.to === '/greenhouses' && alertCount > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] bg-danger text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                      {alertCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => { logout(); setMenuOpen(false) }}
            className="w-full text-left text-sm font-medium text-danger px-3 py-2 rounded-lg hover:bg-danger/10 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Вийти
          </button>
        </div>
      )}
    </header>
  )
}
