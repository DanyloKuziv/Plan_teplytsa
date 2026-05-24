import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { register as apiRegister, verifyEmail, resendVerification } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

const LOGO = (
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
)

// ─── Step 1: Registration form ────────────────────────────────────────────────
function RegisterForm({ onSuccess }) {
  const [form, setForm]           = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors]       = useState({})
  const [emailExists, setEmailExists] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [showPwd, setShowPwd]     = useState(false)
  const [showCfm, setShowCfm]     = useState(false)
  const { addToast }              = useToast()
  const { login }                 = useAuth()
  const navigate                  = useNavigate()

  function set(key) {
    return (e) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      setErrors(prev => ({ ...prev, [key]: '' }))
      if (key === 'email') setEmailExists(false)
    }
  }

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = "Введіть ім'я"
    if (!form.email.trim()) e.email = 'Введіть email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Невірний формат email'
    if (!form.password) e.password = 'Введіть пароль'
    else if (form.password.length < 6) e.password = 'Мінімум 6 символів'
    if (!form.confirm) e.confirm = 'Повторіть пароль'
    else if (form.password !== form.confirm) e.confirm = 'Паролі не співпадають'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setEmailExists(false)
    try {
      const data = await apiRegister(form.email, form.password, form.full_name)
      if (data?.access_token) {
        login(data.access_token)
        addToast('Акаунт створено! Ласкаво просимо 🌱', 'success')
        navigate('/dashboard')
      } else {
        onSuccess(form.email)
      }
    } catch (err) {
      const raw = err?.response?.data?.detail || 'Помилка реєстрації'
      const msg = Array.isArray(raw) ? (raw[0]?.msg || String(raw)) : String(raw)
      if (msg.toLowerCase().includes('already registered')) {
        setEmailExists(true)
        setErrors(prev => ({ ...prev, email: 'Цей email вже зареєстрований' }))
      } else {
        addToast(msg, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const matchOk = form.password && form.confirm && form.password === form.confirm

  const fieldClass = (field) => {
    const base = 'w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-1'
    if (errors[field]) return `${base} border-red-500/60 focus:border-red-500 focus:ring-red-500/30`
    if (form[field] && !errors[field]) return `${base} border-accent/40 focus:border-accent focus:ring-accent/20`
    return `${base} border-white/10 focus:border-accent/50 focus:ring-accent/10`
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-1">Створити акаунт</h1>
      <p className="text-white/40 text-sm mb-8">Розпочніть керувати вашою теплицею розумно</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full name */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Повне ім'я</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-sm">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <input type="text" value={form.full_name} onChange={set('full_name')}
              placeholder="Данило Кузів" autoComplete="name"
              className={`${fieldClass('full_name')} pl-9`} />
            {form.full_name && !errors.full_name && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent text-xs">✓</span>
            )}
          </div>
          {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
        </div>

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
            <input type="email" value={form.email} onChange={set('email')}
              placeholder="your@email.com" autoComplete="email"
              className={`${fieldClass('email')} pl-9`} />
            {form.email && !errors.email && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-accent text-xs">✓</span>
            )}
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              {errors.email}
              {emailExists && (
                <Link to="/login" state={{ email: form.email }} className="ml-1 text-accent underline font-medium">
                  Увійти?
                </Link>
              )}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Пароль</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </span>
            <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
              placeholder="Мінімум 6 символів" autoComplete="new-password"
              className={`${fieldClass('password')} pl-9 pr-10`} />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              <EyeIcon open={showPwd} />
            </button>
          </div>
          {form.password && (
            <div className="mt-2 space-y-1">
              <p className={`text-xs flex items-center gap-1 ${form.password.length >= 8 ? 'text-accent' : 'text-white/30'}`}>
                <span>{form.password.length >= 8 ? '✓' : '○'}</span> Мінімум 8 символів
              </p>
              <p className={`text-xs flex items-center gap-1 ${/[0-9]/.test(form.password) ? 'text-accent' : 'text-white/30'}`}>
                <span>{/[0-9]/.test(form.password) ? '✓' : '○'}</span> Містить цифру
              </p>
            </div>
          )}
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Повторіть пароль</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </span>
            <input type={showCfm ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')}
              placeholder="••••••••" autoComplete="new-password"
              className={`${fieldClass('confirm')} pl-9 pr-10`} />
            <button type="button" onClick={() => setShowCfm(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              <EyeIcon open={showCfm} />
            </button>
            {matchOk && (
              <span className="absolute right-9 top-1/2 -translate-y-1/2 text-accent text-xs">✓</span>
            )}
          </div>
          {errors.confirm && <p className="text-xs text-red-400 mt-1">{errors.confirm}</p>}
        </div>

        {emailExists && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-sm">
            <p className="font-medium text-yellow-300">Цей email вже зареєстровано</p>
            <Link to="/login" state={{ email: form.email }}
              className="text-accent underline font-semibold mt-1 inline-block hover:text-accent/80 transition-colors">
              Увійти в існуючий акаунт →
            </Link>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full mt-2 py-3 rounded-xl bg-accent text-[#080c14] font-bold text-sm tracking-wide
            hover:bg-[#00e8bc] transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(0,212,170,0.3)]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Реєстрація…
            </span>
          ) : 'Далі →'}
        </button>
      </form>

      <p className="text-center text-sm text-white/30 mt-6">
        Вже є акаунт?{' '}
        <Link to="/login" className="text-accent font-semibold hover:text-[#00e8bc] transition-colors">
          Увійти
        </Link>
      </p>
    </>
  )
}

// ─── Step 2: OTP verification ─────────────────────────────────────────────────
function VerifyForm({ email }) {
  const [digits, setDigits]   = useState(['', '', '', '', '', ''])
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]
  const { login }   = useAuth()
  const { addToast } = useToast()
  const navigate    = useNavigate()

  useEffect(() => {
    refs[0].current?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function handleDigit(idx, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[idx] = val.slice(-1)
    setDigits(next)
    setError('')
    if (val && idx < 5) refs[idx + 1].current?.focus()
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs[idx - 1].current?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs[idx + 1].current?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    refs[lastFilled].current?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) { setError('Введіть усі 6 цифр'); return }
    setLoading(true)
    setError('')
    try {
      const data = await verifyEmail(email, code)
      localStorage.removeItem('onboarding_done')
      login(data.access_token)
      addToast('Email підтверджено! Ласкаво просимо 🌱', 'success')
      navigate('/dashboard')
    } catch (err) {
      const raw = err?.response?.data?.detail || 'Невірний код'
      setError(Array.isArray(raw) ? raw[0]?.msg || String(raw) : String(raw))
      setDigits(['', '', '', '', '', ''])
      refs[0].current?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0 || resending) return
    setResending(true)
    try {
      await resendVerification(email)
      setCountdown(60)
      setError('')
      addToast('Новий код відправлено', 'success')
    } catch (err) {
      addToast('Не вдалося надіслати код', 'error')
    } finally {
      setResending(false)
    }
  }

  const filled = digits.every(d => d !== '')

  return (
    <>
      {/* Email icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-6">
        <svg width="26" height="26" fill="none" stroke="#00d4aa" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-1">Підтвердіть email</h1>
      <p className="text-white/40 text-sm mb-2">
        Ми надіслали 6-значний код на
      </p>
      <p className="text-accent font-semibold text-sm mb-8 truncate">{email}</p>

      <form onSubmit={handleSubmit}>
        {/* 6-digit input boxes */}
        <div className="flex gap-3 justify-center mb-5" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border outline-none transition-all
                bg-white/5 text-white caret-accent
                ${error ? 'border-red-500/60' : d ? 'border-accent/60 shadow-[0_0_12px_rgba(0,212,170,0.15)]' : 'border-white/10'}
                focus:border-accent focus:ring-1 focus:ring-accent/20`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-xs text-red-400 mb-4">{error}</p>
        )}

        <button type="submit" disabled={loading || !filled}
          className="w-full py-3 rounded-xl bg-accent text-[#080c14] font-bold text-sm tracking-wide
            hover:bg-[#00e8bc] transition-colors disabled:opacity-40 shadow-[0_0_20px_rgba(0,212,170,0.3)]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Перевірка…
            </span>
          ) : 'Підтвердити →'}
        </button>
      </form>

      <div className="text-center mt-5">
        {countdown > 0 ? (
          <p className="text-sm text-white/30">
            Надіслати знову через <span className="text-white/50 tabular-nums">{countdown}с</span>
          </p>
        ) : (
          <button onClick={handleResend} disabled={resending}
            className="text-sm text-accent font-semibold hover:text-[#00e8bc] transition-colors disabled:opacity-50">
            {resending ? 'Надсилання…' : 'Надіслати код знову'}
          </button>
        )}
      </div>
    </>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function Register() {
  const location = useLocation()
  const initEmail = location.state?.email || ''
  const initStep  = location.state?.step === 'verify' ? 'verify' : 'form'

  const [step, setStep]         = useState(initStep)
  const [regEmail, setRegEmail] = useState(initEmail)

  function onRegistered(email) {
    setRegEmail(email)
    setStep('verify')
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#080c14]">

      {/* ── Left: form panel ─────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-[46%] px-8 sm:px-14 py-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          {LOGO}
          <span className="font-bold text-lg text-white tracking-tight">ТеплицяПлан</span>
        </div>

        {step === 'form'
          ? <RegisterForm onSuccess={onRegistered} />
          : <VerifyForm email={regEmail} />
        }
      </div>

      {/* ── Right: video panel ───────────────────────────── */}
      <div className="hidden lg:flex relative flex-1 overflow-hidden">
        <video autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/greenhouse-bg.mp4" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#080c14]/80 via-[#00312a]/60 to-[#001a12]/75" />
        <div className="absolute inset-0 bg-[#00d4aa]/8 mix-blend-multiply" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div />
          <div>
            <p className="text-white/80 text-2xl font-bold leading-snug max-w-xs mb-2">
              Розумне керування теплицею — в одному місці
            </p>
            <p className="text-white/40 text-sm">Аналітика, сенсори, планування врожаю</p>
          </div>
          <div className="space-y-3 max-w-xs">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-accent text-xs font-semibold">● LIVE</span>
                <span className="text-white/40 text-xs">Теплиця №1</span>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">24.3°</p>
                  <p className="text-xs text-white/40">Температура</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#3b82f6]">71%</p>
                  <p className="text-xs text-white/40">Вологість</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#8b5cf6]">20.8%</p>
                  <p className="text-xs text-white/40">O₂</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-white/40 mb-1">Прибуток цього місяця</p>
                <p className="text-xl font-bold text-white">₴ 18 450</p>
              </div>
              <div className="text-accent text-sm font-semibold bg-accent/15 rounded-xl px-2 py-1">↑ 12%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
