import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../api/auth.js'
import { useToast } from '../context/ToastContext.jsx'

const LOGO = (
  <svg width="36" height="36" viewBox="0 0 56 56" fill="none">
    <rect width="56" height="56" rx="13" fill="#0d1428"/>
    <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
    <line x1="28" y1="6" x2="28" y2="20" stroke="#00d4aa" strokeWidth="2.2"/>
    <line x1="18" y1="20" x2="18" y2="50" stroke="#00d4aa" strokeWidth="2"/>
    <line x1="38" y1="20" x2="38" y2="50" stroke="#00d4aa" strokeWidth="2"/>
    <path d="M19 50 L19 36 Q19 27 28 27 Q37 27 37 36 L37 50" stroke="#00d4aa" strokeWidth="2.2" fill="none"/>
    <line x1="28" y1="48" x2="28" y2="38" stroke="#00d4aa" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M28 41 C23 39 21 35 23 32" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M28 41 C33 39 35 35 33 32" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round" fill="none"/>
  </svg>
)

// ── Step 1: Email input ───────────────────────────────────────────────────────
function EmailStep({ onSent }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const { addToast }          = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Введіть правильний email')
      return
    }
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      onSent(email)
    } catch {
      addToast('Помилка. Спробуйте пізніше.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-6">
        <svg width="26" height="26" fill="none" stroke="#00d4aa" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-1">Забули пароль?</h1>
      <p className="text-white/40 text-sm mb-8">
        Введіть ваш email — надішлемо код для скидання
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="your@email.com" autoComplete="email"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-1 pl-9
                ${error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : 'border-white/10 focus:border-accent/50 focus:ring-accent/10'}`}
            />
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-accent text-[#080c14] font-bold text-sm tracking-wide
            hover:bg-[#00e8bc] transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(0,212,170,0.3)]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Надсилання…
            </span>
          ) : 'Надіслати код →'}
        </button>
      </form>

      <p className="text-center text-sm text-white/30 mt-6">
        <Link to="/login" className="text-accent font-semibold hover:text-[#00e8bc] transition-colors">
          ← Повернутись до входу
        </Link>
      </p>
    </>
  )
}

// ── Step 2: OTP + new password ────────────────────────────────────────────────
function ResetStep({ email }) {
  const [digits, setDigits]     = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]
  const { addToast } = useToast()
  const navigate     = useNavigate()

  useEffect(() => { refs[0].current?.focus() }, [])
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
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) refs[idx - 1].current?.focus()
    if (e.key === 'ArrowLeft'  && idx > 0) refs[idx - 1].current?.focus()
    if (e.key === 'ArrowRight' && idx < 5) refs[idx + 1].current?.focus()
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setDigits(next)
    refs[Math.min(pasted.length, 5)].current?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6)    { setError('Введіть усі 6 цифр'); return }
    if (password.length < 6) { setError('Пароль — мінімум 6 символів'); return }
    setLoading(true)
    setError('')
    try {
      await resetPassword(email, code, password)
      addToast('Пароль успішно змінено! Увійдіть.', 'success')
      navigate('/login', { state: { email } })
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
      await forgotPassword(email)
      setCountdown(60)
      setError('')
      addToast('Новий код відправлено', 'success')
    } catch {
      addToast('Не вдалося надіслати код', 'error')
    } finally {
      setResending(false)
    }
  }

  const filled = digits.every(d => d !== '')

  return (
    <>
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
        <svg width="26" height="26" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-white mb-1">Новий пароль</h1>
      <p className="text-white/40 text-sm mb-2">Код відправлено на</p>
      <p className="text-accent font-semibold text-sm mb-8 truncate">{email}</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP boxes */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">Код з листа</label>
          <div className="flex gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input key={i} ref={refs[i]}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-11 h-13 text-center text-xl font-bold rounded-xl border outline-none transition-all
                  bg-white/5 text-white caret-red-400
                  ${error && !filled ? 'border-red-500/60' : d ? 'border-red-400/60 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-white/10'}
                  focus:border-red-400/60 focus:ring-1 focus:ring-red-400/20`}
                style={{ height: '52px' }}
              />
            ))}
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Новий пароль</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </span>
            <input
              type={showPwd ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Мінімум 6 символів" autoComplete="new-password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/10 pl-9 pr-10"
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
        </div>

        {error && <p className="text-center text-xs text-red-400">{error}</p>}

        <button type="submit" disabled={loading || !filled || password.length < 6}
          className="w-full py-3 rounded-xl bg-accent text-[#080c14] font-bold text-sm tracking-wide
            hover:bg-[#00e8bc] transition-colors disabled:opacity-40 shadow-[0_0_20px_rgba(0,212,170,0.3)]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Збереження…
            </span>
          ) : 'Змінити пароль →'}
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

// ── Page wrapper ──────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step, setStep]   = useState('email')
  const [email, setEmail] = useState('')

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#080c14]">

      {/* Left: form */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-[46%] px-8 sm:px-14 py-12">
        <div className="flex items-center gap-2.5 mb-10">
          {LOGO}
          <span className="font-bold text-lg text-white tracking-tight">ТеплицяПлан</span>
        </div>

        {step === 'email'
          ? <EmailStep onSent={e => { setEmail(e); setStep('reset') }} />
          : <ResetStep email={email} />}
      </div>

      {/* Right: video */}
      <div className="hidden lg:flex relative flex-1 overflow-hidden">
        <video autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/greenhouse-bg.mp4" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#080c14]/80 via-[#00312a]/60 to-[#001a12]/75" />
        <div className="absolute inset-0 bg-[#00d4aa]/8 mix-blend-multiply" />
        <div className="relative z-10 flex flex-col justify-end h-full p-12 pb-16">
          <p className="text-white/80 text-2xl font-bold leading-snug max-w-xs mb-2">
            Безпека вашого акаунту — наш пріоритет
          </p>
          <p className="text-white/40 text-sm">Код дійсний 15 хвилин після відправки</p>
        </div>
      </div>
    </div>
  )
}
