import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as leadsApi from '../api/leads.js'
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

const CONTACTS = {
  phone: '+380 98 995 25 52',
  phoneHref: 'tel:+380989952552',
  email: 'plangreenhouse@gmail.com',
  threads: '@greenflow.tech',
  threadsHref: 'https://www.threads.net/@greenflow.tech',
}

const NAV = [['problem','Проблема'],['kit','Як це працює'],['pricing','Ціни'],['team','Команда'],['pilot','Пілот'],['faq','FAQ']]

const PAIN_STATS = [
  ['5 з 5', 'підтвердили біль ручного контролю мікроклімату'],
  ['4 з 5', 'найбільше цінують сповіщення про відхилення'],
  ['15', 'кастдевів з власниками теплиць'],
]

const PROBLEMS = [
  { icon: '🌡', title: 'Про перегрів дізнаєтесь запізно', desc: 'Коли симптом уже видно на листі, частину врожаю не врятувати. А втрачений урожай — це втрачені гроші.' },
  { icon: '🚶', title: 'Треба постійно бути поруч', desc: 'Щоб нічого не пропустити, доводиться щодня перевіряти все руками — без вихідних у сезон.' },
  { icon: '👷', title: 'Нема кого найняти', desc: 'Через мобілізацію важко знайти працівників і агронома. Сидіти в теплиці цілодобово нікому.' },
  { icon: '💸', title: 'Готові системи — як ціна теплиці', desc: 'Комплект контролера з датчиками коштує від 94 тис. ₴, а дешевий Wi‑Fi датчик не дає ні історії, ні сервісу.' },
]

const KIT = [
  { num: 1, icon: '📡', title: 'Хаб GreenFlow', price: '$99 · 1 на господарство', desc: 'Наш. Підключає датчики різних брендів по Wi‑Fi і Zigbee, працює через Wi‑Fi, кабель або 4G.' },
  { num: 2, icon: '🌡', title: 'Датчики', price: '≈ $30 на теплицю', desc: 'Свої — будь-якого бренду. Немає — даємо перевірений набір за собівартістю.' },
  { num: 3, icon: '🧑‍🌾', title: 'Агроном у кишені', price: 'від $9.99/міс', desc: 'Застосунок: норми для культур, ризики, історія, команда. Тариф — за розміром теплиці.' },
]

const FEATURES = [
  { icon: '🔔', title: 'Сповіщення про відхилення', desc: 'Перегрів, пересихання, відмова насоса — одразу на телефон, а не тоді, коли видно на рослинах.' },
  { icon: '🌱', title: 'Норми для культур, а не просто поріг', desc: 'Оберіть культуру — застосунок сам підставить допустимі межі температури й вологості для неї.' },
  { icon: '📜', title: 'Історія і ручний режим', desc: 'Видно, що сталося і чому. Якщо щось пішло не так — є запасний сценарій і ручне керування.' },
  { icon: '👥', title: 'Кілька теплиць і команда', desc: 'Усі теплиці на одному екрані, кілька користувачів і підтвердження, хто і що зробив.' },
  { icon: '🗺', title: 'Планувальник теплиці', desc: 'Намалюйте теплицю на сітці й розмістіть зони культур і обладнання простим перетягуванням.' },
  { icon: '📊', title: 'План сезону і прогноз', desc: 'План посадок, графік поливу й добрив і прогноз врожаю та прибутку — ще до посадки.' },
]

const PLANS = [
  { name: 'СТАРТ', price: '$9.99', per: '/міс', who: 'мікрогрін, 1 приміщення', items: ['Сповіщення з урахуванням культури', 'Історія показників', '1 зона'], cta: 'Хочу в пілот' },
  { name: 'ФЕРМА', price: '$15', per: '/міс', who: '2–5 тунельних теплиць', items: ['Усі теплиці на одному екрані', 'Команда й підтвердження', 'Ризики хвороб'], cta: 'Хочу в пілот →', accent: true },
  { name: 'БІЗНЕС · B2B', price: 'За запитом', per: '', who: 'великі господарства й забудовники', items: ['Комплекти оптом', 'White-label під вашим брендом', 'Домовленість за комплект'], cta: 'Обговорити' },
]

const MARKET = [
  { price: '~1,5 тис. ₴', title: 'Wi‑Fi датчик або дешевий контролер', desc: 'Без історії, без сповіщень по всій теплиці і без сервісу.' },
  { price: 'від $99', title: 'GreenFlow', desc: 'Хаб для будь-яких датчиків і застосунок. Підписка від $9.99/міс.', accent: true },
  { price: '94 200 ₴', title: 'Готовий комплект контролера', desc: 'Контролер і 10 датчиків. Для малої теплиці — як ціна самої теплиці.' },
]

const TEAM = [
  { name: 'Данило Кузів', role: 'Продукт, дизайн, маркетинг, менеджмент', bio: 'Дизайнер 3 роки. Власник освітніх курсів для дітей.', initials: 'ДК' },
  { name: 'Денис Музика', role: 'Fullstack-розробка', bio: '5 років досвіду. Працював в американських і європейських стартапах.', initials: 'ДМ' },
]

const FAQ = [
  ['Чи підійдуть мої датчики?', 'Найімовірніше, так. Хаб GreenFlow підключає датчики різних брендів по Wi‑Fi і Zigbee. Якщо датчиків немає — дамо перевірений набір за собівартістю, приблизно $30 на теплицю.'],
  ['Що потрібно для підключення?', 'Розетка для хаба та інтернет: Wi‑Fi, кабель або 4G. Один хаб — на все господарство.'],
  ['Скільки це коштує?', 'Хаб — $99 разово, базові сповіщення безкоштовні. Тариф «Старт» — $9.99/міс, «Ферма» — $15/міс, для великих господарств і забудовників — за домовленістю.'],
  ['Чим ви відрізняєтесь від датчика з Prom?', 'Ми продаємо не датчик, а агронома в кишені: норми для культур замість голого порогу, історію, кілька теплиць і команду — і все це з датчиками різних брендів на одній платформі.'],
  ['Чи можна користуватися застосунком без датчиків?', 'Так. Планувальник теплиці, план посадок і прогноз врожаю працюють і без обладнання — можна почати вже сьогодні.'],
  ['Що таке пілот і що від мене потрібно?', 'Ставимо хаб у вашу теплицю, допомагаємо все налаштувати й на зв’язку напряму. Від вас — користуватися в сезон і чесно розповідати, що зручно, а що ні.'],
]

const EMPTY_LEAD = { name: '', contact: '', region: '', greenhouses: '', comment: '' }

function PilotForm() {
  const [form, setForm] = useState(EMPTY_LEAD)
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setStatus('sending')
    try {
      await leadsApi.create(form)
      setStatus('done')
      setForm(EMPTY_LEAD)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="glass-card p-8 text-center flex flex-col items-center justify-center h-full" style={{ borderColor: 'rgba(0,212,170,0.35)' }}>
        <div className="text-5xl mb-4">🌱</div>
        <h3 className="text-xl font-black text-white mb-2">Дякуємо, заявку отримали!</h3>
        <p className="text-[#94a3b8] text-sm mb-6 max-w-xs">Зв’яжемося з вами найближчими днями, щоб домовитися про встановлення хаба.</p>
        <Link to="/register" className="btn-outline text-sm py-3">Поки що — спробувати застосунок</Link>
      </div>
    )
  }

  const input = 'w-full bg-[#0a0e1a] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#00d4aa] transition-colors'
  return (
    <form onSubmit={submit} className="glass-card p-6 sm:p-8 space-y-4" style={{ borderColor: 'rgba(0,212,170,0.35)' }}>
      <h3 className="text-xl font-black text-white">Заявка на пілот</h3>
      <div>
        <label className="block text-xs text-[#94a3b8] mb-1.5">Ім’я *</label>
        <input required minLength={2} maxLength={100} value={form.name} onChange={set('name')} placeholder="Як до вас звертатися" className={input} />
      </div>
      <div>
        <label className="block text-xs text-[#94a3b8] mb-1.5">Телефон, Telegram або email *</label>
        <input required minLength={5} maxLength={120} value={form.contact} onChange={set('contact')} placeholder="+380… або @нікнейм" className={input} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#94a3b8] mb-1.5">Область / місто</label>
          <input maxLength={100} value={form.region} onChange={set('region')} placeholder="Львівська обл." className={input} />
        </div>
        <div>
          <label className="block text-xs text-[#94a3b8] mb-1.5">Скільки теплиць</label>
          <select value={form.greenhouses} onChange={set('greenhouses')} className={input}>
            <option value="">Оберіть</option>
            <option value="1">1</option>
            <option value="2-3">2–3</option>
            <option value="4-10">4–10</option>
            <option value="10+">Більше 10</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-[#94a3b8] mb-1.5">Що вирощуєте, які датчики вже є</label>
        <textarea maxLength={1000} rows={3} value={form.comment} onChange={set('comment')} placeholder="Мікрогрін, томати, розсада… датчики Tuya / немає" className={input + ' resize-none'} />
      </div>
      {status === 'error' && (
        <p className="text-sm text-[#ff4757]">Не вдалося надіслати заявку. Спробуйте ще раз або напишіть нам: {CONTACTS.email}</p>
      )}
      <button type="submit" disabled={status === 'sending'} className="btn-primary w-full justify-center disabled:opacity-60">
        {status === 'sending' ? 'Надсилаємо…' : 'Хочу в пілот →'}
      </button>
      <p className="text-[11px] text-[#64748b] text-center">Використаємо контакт лише для зв’язку щодо пілоту.</p>
    </form>
  )
}

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false)

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

  // Count-up refs
  const cv1 = useRef(), cv2 = useRef(), cv3 = useRef(), cv4 = useRef()
  useCountUp(cv1, 24, '/7')
  useCountUp(cv2, 99, ' $')
  useCountUp(cv3, 30, ' $')
  useCountUp(cv4, 15, '')

  return (
    <div className="landing-root">

      {/* ── NAVBAR ── */}
      <nav id="landing-navbar" className="fixed top-0 left-0 right-0 z-50 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-black text-lg text-white tracking-tight">GreenFlow</span>
          </a>
          <div className="hidden lg:flex items-center gap-7">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={e => scrollTo(id, e)} className="text-sm text-[#94a3b8] hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="btn-outline text-sm py-2.5 px-5">Увійти</Link>
            <a href="#pilot" onClick={e => scrollTo('pilot', e)} className="btn-primary text-sm py-2.5 px-5">Хочу в пілот →</a>
          </div>
          <button onClick={() => setMobileOpen(v => !v)} aria-label="Меню"
            className="lg:hidden p-2 rounded-lg border border-[#1f2937] hover:border-[#00d4aa] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              {mobileOpen
                ? <g><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></g>
                : <g><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></g>
              }
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="lg:hidden bg-[#0f1420] border-b border-[#1f2937] px-5 py-5 space-y-4">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={e => scrollTo(id, e)} className="block text-[#94a3b8] hover:text-white py-2 transition-colors">{label}</a>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              <Link to="/login" className="btn-outline justify-center py-3">Увійти</Link>
              <a href="#pilot" onClick={e => scrollTo('pilot', e)} className="btn-primary justify-center py-3">Хочу в пілот →</a>
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
              <span className="text-[#00d4aa] text-xs font-bold tracking-[0.15em] uppercase">🌱 Набираємо 10 господарств у пілот</span>
            </div>
            <h1 className="font-black leading-[0.9] tracking-tight mb-7 hero-animate hero-animate-delay-1 overflow-hidden" style={{ fontSize: 'clamp(3rem,6.5vw,7rem)' }}>
              <span className="block text-white drop-shadow-lg">Ваша теплиця</span>
              <span className="block shimmer-text">під контролем</span>
              <span className="block text-white drop-shadow-lg">з телефону</span>
            </h1>
            <p className="text-[#94a3b8] leading-relaxed max-w-xl mb-10 hero-animate hero-animate-delay-2" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>
              Хаб і застосунок GreenFlow підключають будь-які датчики. Ви дізнаєтесь про проблему раніше, ніж побачите її на рослинах.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-16 hero-animate hero-animate-delay-3">
              <a href="#pilot" onClick={e => scrollTo('pilot', e)} className="btn-primary text-base backdrop-blur-sm justify-center">Хочу в пілот →</a>
              <Link to="/register" className="btn-outline text-base backdrop-blur-sm justify-center">Спробувати застосунок</Link>
            </div>
            <div className="flex flex-wrap gap-8 sm:gap-14 hero-animate hero-animate-delay-4">
              {[['$99','хаб, разово'],['≈$30','датчики на теплицю'],['$9.99','від, на місяць']].map(([val, label]) => (
                <div key={label}>
                  <p className="font-black text-white" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>{val.slice(0,-1)}<span className="text-[#00d4aa]">{val.slice(-1)}</span></p>
                  <p className="text-[#64748b] text-xs mt-0.5 uppercase tracking-widest">{label}</p>
                </div>
              ))}
              <div className="w-px bg-white/8 self-stretch hidden sm:block" />
              <div>
                <p className="text-sm text-[#94a3b8] flex items-center gap-1.5">
                  <svg width="12" height="12" fill="none" stroke="#00d4aa" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Датчики будь-яких брендів
                </p>
                <p className="text-sm text-[#64748b] flex items-center gap-1.5 mt-1">
                  <svg width="12" height="12" fill="none" stroke="#00d4aa" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Базові сповіщення безкоштовно
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

      {/* ── PROBLEM ── */}
      <section id="problem" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Проблема</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 aos-item">Фермер дізнається про перегрів запізно —<br className="hidden lg:block"/> коли симптом уже на рослинах</h2>
            <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto aos-item">Ми поговорили з власниками теплиць, які вирощують на продаж. Ось що вони кажуть.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            {PAIN_STATS.map(([val, label], i) => (
              <div key={label} className="glass-card p-7 text-center aos-item" style={{ transitionDelay: `${i * 80}ms` }}>
                <p className="text-5xl font-black mb-2" style={{ color: '#00d4aa' }}>{val}</p>
                <p className="text-sm text-[#94a3b8]">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#64748b] mb-12 aos-item">15 кастдевів, вересень–жовтень 2026 · частки — з перших 5 детальних розборів</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PROBLEMS.map((p, i) => (
              <div key={p.title} className="glass-card p-7 flex gap-5 items-start aos-item" style={{ transitionDelay: `${(i % 2) * 80}ms` }}>
                <div className="text-3xl shrink-0">{p.icon}</div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-2">{p.title}</h3>
                  <p className="text-[#94a3b8] text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CINEMATIC VIDEO ── */}
      <section className="py-20 px-4 sm:px-8 lg:px-12" style={{ background: '#0a0e1a' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 aos-item">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-[0.2em] mb-3">Рішення</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
              Ми продаємо не датчик,<br className="hidden sm:block"/>
              <span className="shimmer-text">а агронома в кишені</span>
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
              <span className="w-2 h-2 rounded-full bg-red-500 pulse-dot inline-block" />LIVE
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 px-6 sm:px-12 pb-8 sm:pb-10">
              <div className="flex flex-wrap gap-6 sm:gap-14 items-end">
                {[[cv1,'text-white','моніторинг'],[cv2,'text-[#00d4aa]','хаб, разово'],[cv3,'text-white','датчики на теплицю, ≈'],[cv4,'text-[#0ea5e9]','кастдевів з фермерами']].map(([ref, cls, label]) => (
                  <div key={label}>
                    <p ref={ref} className={`font-black ${cls} leading-none num-in`} style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)' }}>—</p>
                    <p className="text-[#64748b] text-xs mt-1.5 uppercase tracking-widest">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-5 px-1 aos-item">
            <p className="text-[#64748b] text-sm">Фермер не прив’язаний до одного виробника: усе на одній платформі</p>
            <a href="#kit" onClick={e => scrollTo('kit', e)} className="text-[#00d4aa] text-sm font-semibold hover:text-white transition-colors flex items-center gap-1.5">
              Як це працює
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── KIT / HOW IT WORKS ── */}
      <section id="kit" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Як це працює</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 aos-item">Один хаб — будь-які датчики</h2>
            <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto aos-item">Одна коробка збирає дані з усіх датчиків і передає в хмару через Wi‑Fi або 4G. Свої датчики різних брендів чи наш перевірений набір — усе на одній платформі.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {KIT.map((k, i) => (
              <div key={k.title} className="glass-card p-7 flex flex-col aos-item" style={{ transitionDelay: `${i * 100}ms`, ...(i === 2 ? { borderColor: 'rgba(0,212,170,0.35)' } : {}) }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="text-4xl">{k.icon}</div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-[#0a0e1a]" style={{ background: '#00d4aa' }}>{k.num}</div>
                </div>
                <h3 className="font-black text-xl text-white mb-2">{k.title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed flex-1">{k.desc}</p>
                <p className="mt-5 pt-4 border-t border-[#1f2937] text-sm font-bold text-[#00d4aa]">{k.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Застосунок</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 aos-item">Агроном у кишені</h2>
            <p className="text-[#94a3b8] text-lg max-w-xl mx-auto aos-item">Агроном коштує як зарплата — «агроном у кишені» коштує від $9.99 на місяць.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feature-card aos-item" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg text-white mb-3">{f.title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Ціни</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 aos-item">Хаб — один раз.<br className="hidden sm:block"/> Тариф — за розміром теплиці</h2>
            <p className="text-[#94a3b8] text-lg max-w-xl mx-auto aos-item">Хаб $99 разово · датчики ≈ $30 на теплицю · базові сповіщення безкоштовно</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((p, i) => {
              const card = (
                <div className={`glass-card p-7 flex flex-col flex-1${p.accent ? ' accent-glow' : ''}`} style={p.accent ? { borderColor: 'rgba(0,212,170,0.45)' } : {}}>
                  <p className={`text-sm font-bold mb-2 ${p.accent ? 'text-[#00d4aa]' : 'text-[#94a3b8]'}`}>{p.name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-white">{p.price}</span>
                    {p.per && <span className="text-[#64748b] text-sm pb-1.5">{p.per}</span>}
                  </div>
                  <p className="text-xs text-[#64748b] mb-6">{p.who}</p>
                  <ul className="space-y-3 text-sm flex-1 mb-8">
                    {p.items.map(t => (
                      <li key={t} className="flex items-center gap-2.5"><span className="text-[#00d4aa] font-bold">✓</span><span className="text-[#f1f5f9]">{t}</span></li>
                    ))}
                  </ul>
                  <a href="#pilot" onClick={e => scrollTo('pilot', e)} className={`${p.accent ? 'btn-primary' : 'btn-outline'} justify-center text-sm py-3`}>{p.cta}</a>
                </div>
              )
              return p.accent ? (
                <div key={p.name} className="relative flex flex-col aos-item" style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                    <span className="bg-[#00d4aa] text-[#0a0e1a] text-[11px] font-black px-4 py-1 rounded-full tracking-wide">Для 2–5 теплиць</span>
                  </div>
                  {card}
                </div>
              ) : (
                <div key={p.name} className="flex flex-col aos-item" style={{ transitionDelay: `${i * 100}ms` }}>{card}</div>
              )
            })}
          </div>
          <p className="text-center text-xs text-[#64748b] mt-8 aos-item">Ціни попередні. Учасники пілоту отримують умови індивідуально.</p>
        </div>
      </section>

      {/* ── MARKET POSITION ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0a0e1a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Де ми на ринку</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black aos-item">Між датчиком за 1,5 тис.<br className="hidden sm:block"/> і комплектом за 94 тис. — порожньо</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {MARKET.map((m, i) => (
              <div key={m.title} className={`glass-card p-7 flex flex-col aos-item${m.accent ? ' accent-glow' : ''}`}
                style={{ transitionDelay: `${i * 100}ms`, ...(m.accent ? { borderColor: 'rgba(0,212,170,0.45)' } : {}) }}>
                <p className={`text-3xl font-black mb-3 ${m.accent ? 'text-[#00d4aa]' : 'text-white'}`}>{m.price}</p>
                <p className="font-bold text-white mb-2">{m.title}</p>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#64748b] mt-8 aos-item">Ціни з публічних сторінок продавців, жовтень 2026</p>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">Команда</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black aos-item">Самі будуємо продукт —<br className="hidden sm:block"/> від інтерв’ю до коду</h2>
          </div>
          <div className="glass-card p-7 sm:p-10 mb-6 aos-item" style={{ borderColor: 'rgba(0,212,170,0.25)' }}>
            <p className="text-2xl sm:text-3xl font-black text-white mb-4">«А ви можете таке зробити?»</p>
            <p className="text-[#94a3b8] leading-relaxed">Так спитав знайомий фермер з малою теплицею, коли дізнався, що ми робимо софт і AI. Щоб не втратити врожай, йому доводилося постійно бути поруч і перевіряти все руками. Далі були дипломна робота, 15 кастдевів і тест датчиків у справжній теплиці. Сьогодні його теплиця — наш перший пілот.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TEAM.map((t, i) => (
              <div key={t.name} className="glass-card p-7 flex gap-5 items-start aos-item" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shrink-0" style={{ background: 'rgba(0,212,170,0.12)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.3)' }}>{t.initials}</div>
                <div>
                  <p className="font-black text-lg text-white">{t.name}</p>
                  <p className="text-sm text-[#00d4aa] mb-2">{t.role}</p>
                  <p className="text-sm text-[#94a3b8] leading-relaxed">{t.bio}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#64748b] mt-8 aos-item">Учасники акселератора IdeasLab UCU · batch 10</p>
        </div>
      </section>

      {/* ── PILOT ── */}
      <section id="pilot" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="aos-item">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3">Пілотна програма</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 leading-tight">Шукаємо 10 господарств,<br className="hidden sm:block"/> які першими спробують GreenFlow</h2>
            <p className="text-[#94a3b8] text-lg mb-8">Будуємо продукт разом із фермерами, а не за них.</p>
            <div className="space-y-6">
              {[
                ['🎯', 'Кого шукаємо', 'Невеликі господарства з 2–3 теплицями до 50 м², які вирощують на продаж. Особливо чекаємо на мікрогрін.'],
                ['🎁', 'Що отримуєте', 'Хаб GreenFlow у вашій теплиці на особливих умовах, налаштування разом із командою і підтримку напряму.'],
                ['🤝', 'Що просимо', 'Користуватися системою в сезон і чесно розповідати, що зручно, а що ні. Результати пілоту стануть першими кейсами.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)' }}>{icon}</div>
                  <div>
                    <p className="font-bold text-white mb-1">{title}</p>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#64748b] mt-8">
              Забудовник теплиць чи агроном? Напишіть нам — <a href={`mailto:${CONTACTS.email}`} className="text-[#00d4aa] hover:text-white transition-colors">{CONTACTS.email}</a>
            </p>
          </div>
          <div className="aos-item" style={{ transitionDelay: '100ms' }}>
            <PilotForm />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-[#1f2937]" style={{ background: '#0f1420' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#00d4aa] uppercase tracking-widest mb-3 aos-item">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-black aos-item">Часті запитання</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="faq-item glass-card group aos-item">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 font-semibold text-white">
                  {q}
                  <span className="faq-icon text-[#00d4aa] text-xl leading-none shrink-0 transition-transform">+</span>
                </summary>
                <p className="px-6 pb-5 -mt-1 text-sm text-[#94a3b8] leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden aos-item">
            <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=75"
              alt="Теплиця" className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.35) saturate(0.6)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(0,212,170,0.25) 0%,rgba(10,14,26,0.7) 60%,rgba(10,14,26,0.85) 100%)' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,212,170,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,170,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="relative z-10 p-10 sm:p-20 text-center">
              <div className="inline-flex items-center gap-2.5 bg-[rgba(0,212,170,0.12)] border border-[rgba(0,212,170,0.3)] rounded-full px-4 py-2 text-xs font-bold text-[#00d4aa] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#00d4aa] pulse-dot inline-block" />
                Пілот 2026 — 10 господарств
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 leading-tight">Дізнавайтесь про проблему<br/>раніше, ніж рослини</h2>
              <p className="text-[#94a3b8] text-lg mb-10 max-w-lg mx-auto">Залиште заявку — зв’яжемося, підключимо ваші датчики або підберемо набір.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a href="#pilot" onClick={e => scrollTo('pilot', e)} className="btn-primary text-base px-8 py-4 justify-center">Хочу в пілот →</a>
                <Link to="/register" className="btn-outline text-base px-8 py-4 justify-center">Спробувати застосунок</Link>
              </div>
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
                <span className="font-black text-white">GreenFlow</span>
              </a>
              <p className="text-xs text-[#64748b] leading-relaxed">Хаб і застосунок для теплиці: підключає будь-які датчики.<br/>IdeasLab UCU · batch 10.</p>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Продукт</p>
              <ul className="space-y-2.5 text-xs text-[#64748b]">
                {NAV.map(([id, label]) => (
                  <li key={id}><a href={`#${id}`} onClick={e => scrollTo(id, e)} className="hover:text-[#00d4aa] transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Акаунт</p>
              <ul className="space-y-2.5 text-xs text-[#64748b]">
                <li><Link to="/login" className="hover:text-[#00d4aa] transition-colors">Увійти</Link></li>
                <li><Link to="/register" className="hover:text-[#00d4aa] transition-colors">Реєстрація</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-4">Контакти</p>
              <ul className="space-y-2.5 text-xs text-[#64748b]">
                <li><a href={CONTACTS.phoneHref} className="hover:text-[#00d4aa] transition-colors">{CONTACTS.phone}</a></li>
                <li><a href={`mailto:${CONTACTS.email}`} className="hover:text-[#00d4aa] transition-colors break-all">{CONTACTS.email}</a></li>
                <li><a href={CONTACTS.threadsHref} target="_blank" rel="noopener noreferrer" className="hover:text-[#00d4aa] transition-colors">Threads: {CONTACTS.threads}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#1f2937] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-[#64748b]">© 2026 GreenFlow</p>
            <p className="text-xs text-[#64748b]">Данило Кузів · Денис Музика</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
