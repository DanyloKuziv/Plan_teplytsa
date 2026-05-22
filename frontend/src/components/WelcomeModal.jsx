import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="16" fill="#00d4aa22"/>
        <path d="M14 36 C14 28 20 22 28 22 C36 22 42 28 42 36" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M10 36h36" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round"/>
        <rect x="24" y="36" width="8" height="8" rx="1" fill="#00d4aa44" stroke="#00d4aa" strokeWidth="2"/>
        <circle cx="28" cy="17" r="3" fill="#00d4aa"/>
        <path d="M20 36V28M28 36V24M36 36V28" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Ласкаво просимо до ТеплицяПлан! 🌱',
    body: 'Це ваш розумний помічник для управління теплицями. За кілька кроків ми покажемо, як максимально ефективно використовувати платформу.',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="16" fill="#3b82f622"/>
        <rect x="12" y="14" width="32" height="28" rx="3" stroke="#60a5fa" strokeWidth="2.5"/>
        <path d="M12 22h32" stroke="#60a5fa" strokeWidth="2"/>
        <path d="M20 30h4M20 35h8" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="37" cy="32" r="6" fill="#3b82f622" stroke="#60a5fa" strokeWidth="2"/>
        <path d="M35 32l1.5 1.5L39 30" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Додайте свою першу теплицю',
    body: 'Перейдіть до розділу «Теплиці» та натисніть «Додати теплицю». Вкажіть площу, тип опалення та утеплення — система автоматично розрахує витрати.',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="16" fill="#ffa50222"/>
        <rect x="10" y="16" width="36" height="24" rx="2" stroke="#ffa502" strokeWidth="2.5"/>
        <path d="M10 22h36" stroke="#ffa502" strokeWidth="2"/>
        <path d="M16 22v18M22 22v18M28 22v18M34 22v18M40 22v18" stroke="#ffa502" strokeWidth="1" opacity="0.4"/>
        <rect x="14" y="26" width="8" height="5" rx="1" fill="#ffa50233" stroke="#ffa502" strokeWidth="1.5"/>
        <rect x="24" y="28" width="8" height="3" rx="1" fill="#ffa50233" stroke="#ffa502" strokeWidth="1.5"/>
        <rect x="34" y="25" width="8" height="6" rx="1" fill="#ffa50233" stroke="#ffa502" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Плануйте посадки у планувальнику',
    body: 'Відкрийте теплицю → вкладка «Планувальник». Там ви можете розмістити зони посадки на інтерактивній схемі, обрати культури та субстрат, а система прорахує врожай і витрати.',
  },
  {
    icon: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="16" fill="#ff475722"/>
        <path d="M28 14v6M28 36v6M14 28h6M36 28h6" stroke="#ff4757" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="28" cy="28" r="8" stroke="#ff4757" strokeWidth="2.5"/>
        <path d="M24 28l3 3 5-5" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Моніторинг і фінансовий прогноз',
    body: 'Підключіть датчики температури й вологості, відстежуйте алерти та переглядайте фінансові прогнози у розділі «Панель керування». Все під контролем!',
  },
]

export default function WelcomeModal() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('onboarding_done')) {
      const t = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(t)
    }
  }, [])

  function finish() {
    localStorage.setItem('onboarding_done', '1')
    setVisible(false)
  }

  function goToGreenhouses() {
    finish()
    navigate('/greenhouses')
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-modalIn overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-hover">
          <div
            className="h-full bg-accent transition-all duration-400 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-accent' : i < step ? 'w-3 bg-accent/50' : 'w-3 bg-border'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted">{step + 1} / {STEPS.length}</span>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            {current.icon}
          </div>

          {/* Content */}
          <div key={step} className="text-center animate-fadeIn">
            <h2 className="text-xl font-bold text-txt mb-3">{current.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{current.body}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="btn-ghost px-4 py-2.5"
              >
                ← Назад
              </button>
            )}
            <div className="flex-1" />
            {isLast ? (
              <button onClick={goToGreenhouses} className="btn-accent px-6 py-2.5">
                Почати роботу →
              </button>
            ) : (
              <button onClick={() => setStep(s => s + 1)} className="btn-accent px-6 py-2.5">
                Далі →
              </button>
            )}
          </div>

          {/* Skip */}
          {!isLast && (
            <div className="text-center mt-4">
              <button onClick={finish} className="text-xs text-muted hover:text-txt transition-colors">
                Пропустити
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
