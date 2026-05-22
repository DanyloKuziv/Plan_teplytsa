import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/landing.css'

const Logo = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
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

function useAos() {
  useEffect(() => {
    const els = document.querySelectorAll('.aos-item')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useCountUp(ref, target, suffix = '', isFloat = false) {
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      obs.disconnect()
      const duration = 1800
      const start = performance.now()
      const update = now => {
        const p = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        el.textContent = (isFloat ? (target * ease).toFixed(1) : Math.floor(target * ease)) + suffix
        if (p < 1) requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref, target, suffix, isFloat])
}

const MARQUEE_ITEMS = [
  '🌿 АгроПлюс, Полтавщина', '🌿 Зелена долина, Київ', '🌿 ФГ Мельник, Львів',
  '🌿 Сонячна теплиця, Одеса', '🌿 УкрАгро, Харків', '🌿 Нивка-Агро, Вінниця', '🌿 ЕкоТепло, Дніпро',
]

const FEATURES = [
  { icon: '🗺', title: 'Планувальник теплиці', desc: 'Малюйте форму теплиці на інтерактивній сітці, розміщуйте зони культур і обладнання з drag-and-drop простотою.' },
  { icon: '📊', title: 'Прогноз врожаю і прибутку', desc: 'Математична модель розраховує очікуваний врожай, доходи і ROI до початку посадки. Точність 92%.' },
  { icon: '🌡', title: 'Моніторинг мікроклімату', desc: 'Датчики температури, вологості і CO₂ у реальному часі з автоматичними алертами при відхиленнях від норми.' },
  { icon: '💧', title: 'Автоматичний полив', desc: 'Система генерує графік поливу по фазах росту кожної культури автоматично. Економія води до 40%.' },
  { icon: '📈', title: 'Ринкові ціни', desc: 'Актуальні ціни на культури по регіонах щодня — продавайте у правильний час і максимізуйте виручку.' },
  { icon: '🌿', title: 'Каталог культур', desc: 'База агрономічних норм для 50+ культур з нормами поливу, добрив і щільності посадки. Постійно оновлюється.' },
]

const REVIEWS = [
  { stars: 5, date: 'Травень 2026', text: '"За перший місяць скоротив витрати на воду на 38%. Графік поливу тепер повністю автоматичний — я просто слідкую за дашбордом і реагую на алерти."', name: 'Василь Коваленко', org: 'ТГ "АгроПлюс", Полтава', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80' },
  { stars: 5, date: 'Квітень 2026', text: '"Нарешті зрозуміла, яка культура приносить реальний прибуток. Фінансові прогнози точні — розбіжність з фактом менше 8%. Рекомендую кожному фермеру."', name: 'Оксана Мельник', org: 'Фермер, Львівська обл.', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&h=80&q=80' },
  { stars: 4, date: 'Березень 2026', text: '"Планувальник теплиці — це щось неймовірне. За 5 хвилин розклав зони трьох теплиць і побачив весь план сезону. Шкода, що такого не було раніше."', name: 'Андрій Сидоренко', org: 'ФГ "Зелена долина", Київ', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80' },
  { stars: 5, date: 'Лютий 2026', text: '"Моніторинг CO₂ і кисню в реальному часі — це те, чого мені бракувало роками. Тепер отримую алерт на телефон, якщо щось не так. Врятувало томати двічі."', name: 'Михайло Бондар', org: 'ТК "Сонячна теплиця", Одеса', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&h=80&q=80' },
  { stars: 5, date: 'Січень 2026', text: '"Інтеграція ринкових цін — killer feature. Бачу прямо у додатку, коли вигідніше продавати і одразу коригую графік збору. За сезон заробила на 24% більше."', name: 'Наталія Федоренко', org: 'Фермер, Вінницька обл.', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80' },
  { stars: 5, date: 'Грудень 2025', text: '"Підключили 3 теплиці площею 1200 м² за один день. Підтримка відповіла через 20 хвилин і допомогла налаштувати субстрати під конкретні культури."', name: 'Ігор Савченко', org: 'УкрАгро, Харків', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&h=80&q=80' },
  { stars: 5, date: 'Листопад 2025', text: '"Спочатку був скептиком. Але після того як прогноз прибутку виявився точнішим за мої власні розрахунки в Excel — повністю перейшов на ТеплицяПлан. ROI у першому сезоні — 210%."', name: 'Руслан Ткаченко', org: 'Нивка-Агро, Вінниця — 2 200 м²', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&h=80&q=80', wide: true },
  { stars: 5, date: 'Жовтень 2025', text: '"Зручніший за все, що я пробувала раніше. Планувальник зон drag-and-drop, автоматичний розрахунок потреби в насінні — і це все в одному місці. Нарешті немає Excel на 40 листків."', name: 'Аліна Кравченко', org: 'ЕкоТепло, Дніпро', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=80&h=80&q=80', wide: true },
]

function ReviewCard({ r }) {
  return (
    <div className="glass-card p-6 aos-item" style={r.borderAccent ? { borderColor: 'rgba(0,212,170,0.2)' } : {}}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: '#fbbf24', letterSpacing: 1 }}>{'★'.repeat(r.stars)}{r.stars < 5 ? <span style={{ color: '#374151' }}>{'★'.repeat(5 - r.stars)}</span> : null}</span>
        <span className="text-[10px] text-[#64748b]">{r.date}</span>
      </div>
      <p className="text-[#94a3b8] text-sm leading-relaxed mb-5">{r.text}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2" style={{ borderColor: 'rgba(0,212,170,0.35)' }}>
          <img src={r.img} alt={r.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">{r.name}</p>
          <p className="text-xs text-[#64748b]">{r.org}</p>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [yearly, setYearly] = useState(false)
  const navigate = useNavigate()

  useAos()

  // Navbar scroll effect
  useEffect(() => {
    const nav = document.getElementById('landing-navbar')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hero video crossfade
  const vid1Ref = useRef(null)
  const vid2Ref = useRef(null)
  useEffect(() => {
    const v1 = vid1Ref.current, v2 = vid2Ref.current
    if (!v1 || !v2) return
    let active = 1
    const HOLD = 9000, FADE = 1800
    const id = setInterval(() => {
      if (active === 1) {
        v2.style.opacity = '1'
        setTimeout(() => { v1.style.opacity = '0' }, 300)
        active = 2
      } else {
        v1.style.opacity = '1'
        setTimeout(() => { v2.style.opacity = '0' }, 300)
        active = 1
      }
    }, HOLD + FADE)
    return () => clearInterval(id)
  }, [])

  const scrollTo = useCallback((id, e) => {
    e?.preventDefault()
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const prices = { pro: { monthly: 25, yearly: 20 }, biz: { monthly: 79, yearly: 63 } }

  // Count-up refs
  const c1 = useRef(), c2 = useRef(), c3 = useRef(), c4 = useRef()
  const cv1 = useRef(), cv2 = useRef(), cv3 = useRef(), cv4 = useRef()
  useCountUp(c1, 500, '+')
  useCountUp(c2, 98, '%')
  useCountUp(c3, 2.4, 'x', true)
  useCountUp(c4, 35, '%')
  useCountUp(cv1, 847, 'кг')
  useCountUp(cv2, 184, '%')
  useCountUp(cv3, 500, '+')
  useCountUp(cv4, 2.4, 'M+', true)

  return (
    <div className="landing-root">

      {/* ── NAVBAR ── */}
      <nav id="landing-navbar" className="fixed top-0 left-0 right-0 z-50 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-black text-lg text-white tracking-tight">ТеплицяПлан</span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {[['features','Функції'],['how','Як це працює'],['pricing','Ціни'],['reviews','Відгуки']].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={e => scrollTo(id, e)} className="text-sm text-[#94a3b8] hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn-outline text-sm py-2.5 px-5">Увійти</Link>
            <Link to="/register" className="btn-primary text-sm py-2.5 px-5">Спробувати →</Link>
          </div>
          <button onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 rounded-lg border border-[#1f2937] hover:border-[#00d4aa] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              {mobileOpen
                ? <g><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></g>
                : <g><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></g>
              }
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-[#0f1420] border-b border-[#1f2937] px-5 py-5 space-y-4">
            {[['features','Функції'],['how','Як це працює'],['pricing','Ціни'],['reviews','Відгуки']].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={e => scrollTo(id, e)} className="block text-[#94a3b8] hover:text-white py-2 transition-colors">{label}</a>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <Link to="/login" className="btn-outline text-center py-3">Увійти</Link>
              <Link to="/register" className="btn-primary justify-center py-3">Спробувати безкоштовно →</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex flex-col justify-end overflow-hidden">
        <video ref={vid1Ref} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover video-cross" style={{ zIndex: 0, opacity: 1 }}
          src="/hero-1.mp4" />
        <video ref={vid2Ref} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover video-cross" style={{ zIndex: 0, opacity: 0 }}
          src="/hero-2.mp4" />
        <div className="absolute inset-0 z-1" style={{ background: 'rgba(8,12,20,0.58)' }} />
        <div className="absolute inset-0 z-1" style={{ background: 'radial-gradient(ellipse 120% 75% at -5% 95%, rgba(0,212,170,0.24) 0%, transparent 52%)' }} />
        <div className="absolute inset-0 z-1" style={{ background: 'radial-gradient(ellipse 60% 50% at 105% 5%, rgba(14,165,233,0.12) 0%, transparent 50%)' }} />
        <div className="absolute inset-0 z-1" style={{ backgroundImage: 'linear-gradient(rgba(0,212,170,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.022) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="absolute inset-x-0 top-0 z-1 h-40" style={{ background: 'linear-gradient(to bottom,rgba(8,12,20,0.88) 0%,transparent 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 z-1 h-72" style={{ background: 'linear-gradient(to top,#0a0e1a 0%,rgba(8,12,20,0.4) 60%,transparent 100%)' }} />

        <div className="relative z-10 w-full px-5 sm:px-10 lg:px-20 pb-28 pt-24">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-2.5 bg-[rgba(0,212,170,0.09)] border border-[rgba(0,212,170,0.28)] rounded-full px-4 py-1.5 mb-8 hero-animate backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] pulse-dot" />
              <span className="text-[#00d4aa] text-xs font-bold tracking-[0.15em] uppercase">🌱 Новинка 2026</span>
            </div>
            <h1 className="font-black leading-[0.9] tracking-tight mb-7 hero-animate hero-animate-delay-1 overflow-hidden" style={{ fontSize: 'clamp(3rem,6.5vw,7rem)' }}>
              <span className="block text-white drop-shadow-lg">Розумне</span>
              <span className="block shimmer-text">управління</span>
              <span className="block text-white drop-shadow-lg">тепличним бізнесом</span>
            </h1>
            <p className="text-[#94a3b8] leading-relaxed max-w-xl mb-10 hero-animate hero-animate-delay-2" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>
              Плануйте посадки, контролюйте мікроклімат і прогнозуйте прибуток — все в одній платформі
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-16 hero-animate hero-animate-delay-3">
              <Link to="/register" className="btn-primary text-base backdrop-blur-sm">Спробувати безкоштовно →</Link>
              <a href="#how" onClick={e => scrollTo('how', e)} className="btn-outline text-base backdrop-blur-sm">▶ Переглянути демо</a>
            </div>
            <div className="flex flex-wrap gap-8 sm:gap-14 hero-animate hero-animate-delay-4">
              {[['500+','активних теплиць'],['184%','середній ROI'],['3×','більше врожаю']].map(([val, label]) => (
                <div key={label}>
                  <p className="font-black text-white" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>{val.slice(0,-1)}<span className="text-[#00d4aa]">{val.slice(-1)}</span></p>
                  <p className="text-[#64748b] text-xs mt-0.5 uppercase tracking-widest">{label}</p>
                </div>
              ))}
              <div className="w-px bg-white/8 self-stretch hidden sm:block" />
              <div>
                <p className="text-sm text-[#94a3b8] flex items-center gap-1.5">
                  <svg width="12" height="12" fill="none" stroke="#00d4aa" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Без кредитки
                </p>
                <p className="text-sm text-[#64748b] flex items-center gap-1.5 mt-1">
                  <svg width="12" height="12" fill="none" stroke="#00d4aa" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  14 днів безкоштовно
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-hint absolute bottom-7 left-1/2 z-20 flex flex-col items-center gap-1.5">
          <span className="text-[9px] text-[#64748b] uppercase tracking-[0.2em]">Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <path d="M7 13l5 5 5-5M7 7l5 5 5-5"/>
          </svg>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-16 border-y border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="marquee-wrap mb-12">
          <div className="marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <React.Fragment key={i}>
                <span className="text-[#64748b] text-sm font-medium whitespace-nowrap">{item}</span>
                <span className="text-[#00d4aa]">✦</span>
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="text-center text-sm font-semibold text-[#64748b] uppercase tracking-widest mb-10 aos-item">
          Довіряють 500+ тепличних господарств України
        </p>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            [c1, '0', 'Теплиць'],
            [c2, '0', 'Задоволених фермерів'],
            [c3, '0', 'Більше врожаю'],
            [c4, '0', 'Економія ресурсів'],
          ].map(([ref, init, label], i) => (
            <div key={label} className="text-center aos-item" style={{ transitionDelay: `${i * 80}ms` }}>
              <p ref={ref} className="text-4xl font-black mb-1" style={{ color: '#00d4aa' }}>{init}</p>
              <p className="text-sm text-[#94a3b8]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CINEMATIC VIDEO ── */}
      <section className="py-20 px-4 sm:px-8 lg:px-12" style={{ background: '#0a0e1a' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 aos-item">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-[0.2em] mb-3">В дії</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
              Дивіться на свою теплицю<br className="hidden sm:block"/>
              <span className="shimmer-text">по‑новому</span>
            </h2>
          </div>
          <div className="cine-frame aos-item" style={{ aspectRatio: '16/7' }}>
            <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" src="/hero-2.mp4" />
            <div className="absolute inset-0" style={{ background: 'rgba(8,12,20,0.52)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 90% at 15% 50%, rgba(0,212,170,0.18) 0%, transparent 55%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 85% 20%, rgba(14,165,233,0.1) 0%, transparent 50%)' }} />
            <div className="absolute inset-x-0 bottom-0" style={{ height: '65%', background: 'linear-gradient(to top,rgba(8,12,20,0.95) 0%,rgba(8,12,20,0.4) 50%,transparent 100%)' }} />
            <div className="absolute inset-x-0 top-0" style={{ height: '30%', background: 'linear-gradient(to bottom,rgba(8,12,20,0.6) 0%,transparent 100%)' }} />
            <div className="cine-corner cine-corner-tl" /><div className="cine-corner cine-corner-tr" />
            <div className="cine-corner cine-corner-bl" /><div className="cine-corner cine-corner-br" />
            <div className="absolute top-5 left-5 sm:top-7 sm:left-7 z-10 flex items-center gap-2 text-[10px] font-bold text-white/70 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-500 pulse-dot inline-block" />REC
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 px-6 sm:px-12 pb-8 sm:pb-10">
              <div className="flex flex-wrap gap-6 sm:gap-14 items-end">
                {[[cv1,'text-white','врожаю за сезон'],[cv2,'text-[#00d4aa]','ROI у першому сезоні'],[cv3,'text-white','активних теплиць'],[cv4,'text-[#0ea5e9]','показань сенсорів']].map(([ref, cls, label]) => (
                  <div key={label}>
                    <p ref={ref} className={`font-black ${cls} leading-none num-in`} style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)' }}>—</p>
                    <p className="text-[#64748b] text-xs mt-1.5 uppercase tracking-widest">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-5 px-1 aos-item">
            <p className="text-[#64748b] text-sm">Від 50 м² до 5 гектарів — ТеплицяПлан масштабується разом з вами</p>
            <Link to="/register" className="text-[#00d4aa] text-sm font-semibold hover:text-white transition-colors flex items-center gap-1.5">
              Розпочати зараз
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Можливості</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 aos-item">Все що потрібно для сучасної теплиці</h2>
            <p className="text-[#94a3b8] text-lg max-w-xl mx-auto aos-item">Від планування до збуту — єдина платформа для всього тепличного циклу.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feature-card aos-item" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg text-white mb-3">{f.title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">{f.desc}</p>
                <div className="mt-5 pt-4 border-t border-[#1f2937] flex items-center gap-2 text-xs text-[#00d4aa] font-semibold">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  Дізнатися більше
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Як це працює</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black aos-item">Від реєстрації до першого прогнозу<br className="hidden sm:block"/> за 10 хвилин</h2>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-stretch gap-0">
            {[
              { num: 1, icon: '🏗', title: 'Створіть теплицю', desc: 'Намалюйте план, задайте площу і тип опалення. Конфігуратор проведе вас за 2 хвилини.', accent: true },
              { num: 2, icon: '🌱', title: 'Посадіть культури', desc: 'Оберіть рослини з каталогу, призначте зони, вкажіть дати — система прорахує все автоматично.', accent: false },
              { num: 3, icon: '📊', title: 'Отримайте аналітику', desc: 'Прогноз врожаю, фінансова модель, графіки поливу і добрив готові миттєво. ROI — з першого дня.', accent: true },
            ].map((step, i) => (
              <React.Fragment key={step.num}>
                <div className="flex-1 flex flex-col aos-item" style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="glass-card p-7 flex-1" style={step.accent ? { borderColor: 'rgba(0,212,170,0.25)' } : {}}>
                    <div className="text-4xl mb-4">{step.icon}</div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-[#0a0e1a]" style={{ background: '#00d4aa' }}>{step.num}</div>
                      <h3 className="font-bold text-lg text-white">{step.title}</h3>
                    </div>
                    <p className="text-[#94a3b8] text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                {i < 2 && (
                  <>
                    <div className="hidden md:flex items-center px-3 shrink-0 pt-6">
                      <div className="step-line w-16" />
                    </div>
                    <div className="flex md:hidden justify-center my-0 py-3">
                      <div className="w-0.5 h-8" style={{ background: 'linear-gradient(to bottom,#00d4aa,rgba(0,212,170,0.1))' }} />
                    </div>
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Ціни</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-8 aos-item">Прості та прозорі ціни</h2>
            <div className="toggle-pill mx-auto aos-item">
              <button onClick={() => setYearly(false)} className={`toggle-option${!yearly ? ' active' : ''}`}>Щомісяця</button>
              <button onClick={() => setYearly(true)} className={`toggle-option${yearly ? ' active' : ''}`}>
                Щорічно <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${yearly ? 'bg-[#0a0e1a] text-[#00d4aa]' : 'bg-[rgba(0,212,170,0.2)] text-[#00d4aa]'}`}>-20%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Free */}
            <div className="glass-card p-7 flex flex-col aos-item">
              <p className="text-[#94a3b8] text-sm font-semibold mb-2">БЕЗКОШТОВНО</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-[#64748b] text-sm pb-1.5">/міс</span>
              </div>
              <ul className="space-y-3 text-sm flex-1 mb-8">
                {[['✓','#00d4aa','1 теплиця'],['✓','#00d4aa','До 5 зон'],['✓','#00d4aa','Каталог культур'],['✓','#00d4aa','Базовий прогноз'],['✗','#374151','Ринкові ціни'],['✗','#374151','Датчики клімату'],['✗','#374151','Необмежені плани']].map(([sym,col,text]) => (
                  <li key={text} className="flex items-center gap-2.5">
                    <span style={{ color: col }} className="font-bold">{sym}</span>
                    <span style={{ color: sym === '✓' ? '#f1f5f9' : '#64748b' }}>{text}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-outline text-sm py-3 text-center">Почати безкоштовно</Link>
            </div>
            {/* PRO */}
            <div className="relative flex flex-col aos-item" style={{ transitionDelay: '100ms' }}>
              <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                <span className="bg-[#00d4aa] text-[#0a0e1a] text-[11px] font-black px-4 py-1 rounded-full tracking-wide">Популярний</span>
              </div>
              <div className="glass-card p-7 flex flex-col flex-1 accent-glow" style={{ borderColor: 'rgba(0,212,170,0.45)' }}>
                <p className="text-[#00d4aa] text-sm font-bold mb-2">PRO</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black text-white">${yearly ? prices.pro.yearly : prices.pro.monthly}</span>
                  <span className="text-[#64748b] text-sm pb-1.5">/міс</span>
                </div>
                <ul className="space-y-3 text-sm flex-1 mb-8">
                  {['Необмежено теплиць','Необмежено зон','Ринкові ціни онлайн','Моніторинг датчиків','Алерти і сповіщення','Фінансова аналітика','Експорт PDF звітів'].map(t => (
                    <li key={t} className="flex items-center gap-2.5"><span className="text-[#00d4aa] font-bold">✓</span><span className="text-[#f1f5f9]">{t}</span></li>
                  ))}
                </ul>
                <Link to="/register" className="btn-primary justify-center text-sm py-3">Спробувати 14 днів →</Link>
              </div>
            </div>
            {/* Business */}
            <div className="glass-card p-7 flex flex-col aos-item" style={{ transitionDelay: '200ms' }}>
              <p className="text-[#94a3b8] text-sm font-semibold mb-2">БІЗНЕС</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-black text-white">${yearly ? prices.biz.yearly : prices.biz.monthly}</span>
                <span className="text-[#64748b] text-sm pb-1.5">/міс</span>
              </div>
              <ul className="space-y-3 text-sm flex-1 mb-8">
                {['Все з PRO','До 10 користувачів','API доступ','Пріоритетна підтримка','Брендований звіт','Онбординг менеджер'].map(t => (
                  <li key={t} className="flex items-center gap-2.5"><span className="text-[#00d4aa] font-bold">✓</span><span className="text-[#f1f5f9]">{t}</span></li>
                ))}
              </ul>
              <a href="mailto:sales@teplyciaplan.ua" className="btn-outline text-sm py-3 text-center">Зв'язатися з нами</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKET NEWS ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0a0e1a' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div className="aos-item">
              <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-[0.2em] mb-2">Ринок сьогодні</p>
              <h2 className="text-3xl sm:text-4xl font-black">Новини, що впливають<br className="hidden sm:block"/> на ціни врожаю</h2>
            </div>
            <Link to="/dashboard" className="text-sm text-[#00d4aa] font-semibold hover:text-white transition-colors flex items-center gap-1.5 shrink-0 aos-item">
              Усі новини в додатку
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between aos-item" style={{ borderColor: 'rgba(0,212,170,0.2)' }}>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>↑ +18%</span>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-widest">Томати</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2 leading-snug">Ціна на томати зросла на 18% — ранній літній попит перевищив пропозицію</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">Роздрібні ринки Києва та Харкова зафіксували стрибок ціни з 42 до 50 грн/кг. Аналітики пов'язують зі зниженням імпорту з Туреччини та посухою на півдні.</p>
              </div>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#1f2937]">
                <span className="text-xs text-[#64748b]">09 трав. 2026</span>
                <span className="text-xs text-[#00d4aa] font-semibold">Вплив: HIGH</span>
              </div>
            </div>
            <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between aos-item" style={{ transitionDelay: '80ms', borderColor: 'rgba(239,68,68,0.18)' }}>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>↓ −12%</span>
                  <span className="text-[10px] text-[#64748b] uppercase tracking-widest">Огірки</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2 leading-snug">Надлишок огірків на ринку — тепличні господарства Херсонщини нарощують обсяги</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">Оптова ціна впала з 28 до 24 грн/кг. Рекомендуємо переглянути план посадки та перенести частину площі під перець або зелень.</p>
              </div>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#1f2937]">
                <span className="text-xs text-[#64748b]">08 трав. 2026</span>
                <span className="text-xs text-[#ef4444] font-semibold">Вплив: HIGH</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-1">
              {[
                { badge: '↑ +32%', bc: 'rgba(34,197,94,0.12)', tc: '#22c55e', title: 'Попит на зелень зріс у ресторанному секторі', desc: 'Базилік, петрушка і руккола — ціна піднялась до 320 грн/кг оптом. Сезон травень–серпень.', date: '07 трав. 2026', impact: 'MEDIUM', ic: '#fbbf24', d: 0 },
                { badge: '↓ Дефіцит', bc: 'rgba(239,68,68,0.12)', tc: '#ef4444', title: 'Заморозки пошкодили врожай перцю на Сході', desc: 'Тепличне виробництво має шанс закрити дефіцит. Ціна на перець +22% за тиждень.', date: '06 трав. 2026', impact: 'HIGH', ic: '#00d4aa', d: 60 },
                { badge: '↑ Субсидія', bc: 'rgba(0,212,170,0.1)', tc: '#00d4aa', title: 'Держсубсидії на тепличне виробництво продовжено до 2027 р.', desc: 'Мінагро продовжило програму: до 30% компенсація витрат на обладнання та енергоносії.', date: '05 трав. 2026', impact: 'MEDIUM', ic: '#fbbf24', d: 120 },
              ].map(n => (
                <div key={n.title} className="glass-card p-5 flex gap-4 items-start aos-item" style={{ transitionDelay: `${n.d}ms` }}>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 mt-0.5" style={{ background: n.bc, color: n.tc }}>{n.badge}</span>
                  <div>
                    <p className="text-xs font-bold text-white mb-1">{n.title}</p>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">{n.desc}</p>
                    <p className="text-[10px] text-[#64748b] mt-2">{n.date} · <span style={{ color: n.ic }}>{n.impact}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Ticker */}
          <div className="mt-8 rounded-xl overflow-hidden border border-[#1f2937] aos-item" style={{ background: '#0f1420' }}>
            <div className="flex items-center">
              <div className="px-4 py-2.5 shrink-0 text-[10px] font-bold text-[#00d4aa] uppercase tracking-wider border-r border-[#1f2937]">ЦІНИ</div>
              <div className="marquee-wrap flex-1">
                <div className="marquee-track py-2.5" style={{ animationDuration: '22s' }}>
                  {[
                    ['🍅 Томат','#22c55e','50 грн/кг ↑'],['🥒 Огірок','#ef4444','24 грн/кг ↓'],
                    ['🌶 Перець','#22c55e','95 грн/кг ↑'],['🌿 Базилік','#22c55e','320 грн/кг ↑'],
                    ['🥬 Салат','#94a3b8','38 грн/кг →'],['🍓 Полуниця','#22c55e','180 грн/кг ↑'],
                    ['🧅 Зелена цибуля','#ef4444','28 грн/кг ↓'],['🌱 Шпинат','#22c55e','55 грн/кг ↑'],
                    ['🍅 Томат','#22c55e','50 грн/кг ↑'],['🥒 Огірок','#ef4444','24 грн/кг ↓'],
                    ['🌶 Перець','#22c55e','95 грн/кг ↑'],['🌿 Базилік','#22c55e','320 грн/кг ↑'],
                    ['🥬 Салат','#94a3b8','38 грн/кг →'],['🍓 Полуниця','#22c55e','180 грн/кг ↑'],
                  ].map(([name, color, price], i) => (
                    <React.Fragment key={i}>
                      <span className="text-[11px] text-[#94a3b8] whitespace-nowrap">{name} <span className="font-semibold" style={{ color }}>{price}</span></span>
                      <span className="text-[#1f2937] mx-3">|</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS + CTA ── */}
      <section id="reviews" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Відгуки</p>
            <h2 className="text-3xl sm:text-4xl font-black aos-item">Що кажуть наші клієнти</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            {REVIEWS.slice(0,3).map(r => <ReviewCard key={r.name} r={r} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            {REVIEWS.slice(3,6).map(r => <ReviewCard key={r.name} r={r} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-24">
            {REVIEWS.slice(6).map(r => <ReviewCard key={r.name} r={{ ...r, borderAccent: true }} />)}
          </div>

          {/* CTA Block */}
          <div className="relative rounded-2xl overflow-hidden aos-item">
            <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=75"
              alt="Теплиця" className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.35) saturate(0.6)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(0,212,170,0.25) 0%,rgba(10,14,26,0.7) 60%,rgba(10,14,26,0.85) 100%)' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,212,170,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="relative z-10 p-12 sm:p-20 text-center">
              <div className="inline-flex items-center gap-2.5 bg-[rgba(0,212,170,0.12)] border border-[rgba(0,212,170,0.3)] rounded-full px-4 py-2 text-xs font-bold text-[#00d4aa] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#00d4aa] pulse-dot inline-block" />
                500+ фермерів вже в системі
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 leading-tight">Готові вивести теплицю<br/>на новий рівень?</h2>
              <p className="text-[#94a3b8] text-lg mb-10 max-w-lg mx-auto">Починайте безкоштовно — без кредитної картки, без зобов'язань.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register" className="btn-primary text-base px-8 py-4">Спробувати безкоштовно →</Link>
                <a href="#how" onClick={e => scrollTo('how', e)} className="btn-outline text-base px-8 py-4">▶ Переглянути демо</a>
              </div>
              <p className="text-sm text-[#64748b] mt-6">Приєднуйтесь до 500+ фермерів що вже використовують ТеплицяПлан</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#1f2937] py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#0a0e1a' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2.5 mb-4">
                <Logo size={30} />
                <span className="font-black text-white">ТеплицяПлан</span>
              </a>
              <p className="text-xs text-[#64748b] leading-relaxed">Розумне управління тепличним бізнесом для сучасних фермерів України.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Продукт</p>
              <ul className="space-y-2.5 text-xs text-[#64748b]">
                {[['features','Функції'],['pricing','Ціни'],['how','Як це працює'],['reviews','Відгуки']].map(([id, label]) => (
                  <li key={id}><a href={`#${id}`} onClick={e => scrollTo(id, e)} className="hover:text-[#00d4aa] transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Акаунт</p>
              <ul className="space-y-2.5 text-xs text-[#64748b]">
                <li><Link to="/login" className="hover:text-[#00d4aa] transition-colors">Увійти</Link></li>
                <li><Link to="/register" className="hover:text-[#00d4aa] transition-colors">Реєстрація</Link></li>
                <li><a href="#" className="hover:text-[#00d4aa] transition-colors">Документація</a></li>
                <li><a href="mailto:support@teplyciaplan.ua" className="hover:text-[#00d4aa] transition-colors">Підтримка</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Соцмережі</p>
              <div className="flex flex-col gap-3">
                {[
                  ['Instagram', <svg key="ig" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>],
                  ['Telegram', <svg key="tg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>],
                  ['LinkedIn', <svg key="li" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>],
                ].map(([name, icon]) => (
                  <a key={name} href="#" className="flex items-center gap-2.5 text-xs text-[#64748b] hover:text-[#00d4aa] transition-colors group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#1f2937] group-hover:border-[rgba(0,212,170,0.3)] transition-colors">{icon}</div>
                    {name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[#1f2937] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#64748b]">© 2026 ТеплицяПлан. Усі права захищені.</p>
            <div className="flex gap-6 text-xs text-[#64748b]">
              <a href="#" className="hover:text-[#00d4aa] transition-colors">Умови використання</a>
              <a href="#" className="hover:text-[#00d4aa] transition-colors">Політика конфіденційності</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
