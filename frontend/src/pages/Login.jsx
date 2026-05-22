import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login as apiLogin } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Login() {
  const location = useLocation()
  const [email, setEmail]         = useState(location.state?.email || '')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [wrongPassword, setWrong] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [showPwd, setShowPwd]     = useState(false)
  const { login }                 = useAuth()
  const { addToast }              = useToast()
  const navigate                  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) { addToast('Заповніть усі поля', 'warning'); return }
    setLoading(true)
    setWrong(false)
    setUnverified(false)
    try {
      const data = await apiLogin(email, password)
      login(data.access_token)
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      if (status === 403) {
        setUnverified(true)
      } else {
        setWrong(true)
        addToast('Невірний email або пароль', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = (hasError) => {
    const base = 'w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-1'
    if (hasError) return `${base} border-red-500/60 focus:border-red-500 focus:ring-red-500/30`
    return `${base} border-white/10 focus:border-accent/50 focus:ring-accent/10`
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#080c14]">

      {/* ── Left: form panel ───────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-[46%] px-8 sm:px-14 py-12">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <svg width="36" height="36" viewBox="0 0 56 56" fill="none">
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
          <span className="font-bold text-lg text-white tracking-tight">ТеплицяПлан</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-1">Вхід до акаунту</h1>
        <p className="text-white/40 text-sm mb-8">Раді бачити вас знову</p>

        {location.state?.email && (
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-5 flex items-center gap-2 text-sm animate-fadeIn">
            <span className="text-accent">✓</span>
            <span className="text-white/70">Email заповнено — введіть пароль щоб увійти</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setWrong(false) }}
                placeholder="your@email.com" autoComplete="email"
                className={`${fieldClass(wrongPassword)} pl-9`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-white/50">Пароль</label>
              <Link to="/forgot-password" className="text-xs text-accent/70 hover:text-accent transition-colors">
                Забули пароль?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </span>
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setWrong(false) }}
                placeholder="••••••••" autoComplete="current-password"
                className={`${fieldClass(wrongPassword)} pl-9 pr-10`}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPwd ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>
            {wrongPassword && (
              <p className="text-xs text-red-400 mt-1">Невірний пароль. Спробуйте ще раз.</p>
            )}
          </div>

          {unverified && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm">
              <p className="font-medium text-yellow-300">Email не підтверджено</p>
              <p className="text-white/40 text-xs mt-0.5">
                Перевірте вашу пошту і введіть код підтвердження.{' '}
                <Link to="/register" state={{ email, step: 'verify' }}
                  className="text-accent underline font-semibold hover:text-accent/80">
                  Підтвердити →
                </Link>
              </p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-accent text-[#080c14] font-bold text-sm tracking-wide
              hover:bg-[#00e8bc] transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(0,212,170,0.3)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Вхід…
              </span>
            ) : 'Увійти →'}
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          Немає акаунту?{' '}
          <Link to="/register" className="text-accent font-semibold hover:text-[#00e8bc] transition-colors">
            Зареєструватись
          </Link>
        </p>
      </div>

      {/* ── Right: video panel ─────────────────────────── */}
      <div className="hidden lg:flex relative flex-1 overflow-hidden">
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/greenhouse-bg.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#080c14]/80 via-[#00312a]/60 to-[#001a12]/75" />
        <div className="absolute inset-0 bg-[#00d4aa]/8 mix-blend-multiply" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div />

          <div>
            <p className="text-white/80 text-2xl font-bold leading-snug max-w-xs mb-2">
              Ваша теплиця завжди під контролем
            </p>
            <p className="text-white/40 text-sm">Сенсори, аналітика, планування — в реальному часі</p>
          </div>

          <div className="space-y-3 max-w-xs">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-accent text-xs font-semibold">● LIVE</span>
                <span className="text-white/40 text-xs">Теплиця №1</span>
              </div>
              <div className="flex gap-4">
                <div><p className="text-2xl font-bold text-white">24.3°</p><p className="text-xs text-white/40">Температура</p></div>
                <div><p className="text-2xl font-bold text-[#3b82f6]">71%</p><p className="text-xs text-white/40">Вологість</p></div>
                <div><p className="text-2xl font-bold text-[#8b5cf6]">20.8%</p><p className="text-xs text-white/40">O₂</p></div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-1">Активних планів посадки</p>
                <p className="text-xl font-bold text-white">4 теплиці</p>
              </div>
              <div className="text-[#f59e0b] text-lg">🌿</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
