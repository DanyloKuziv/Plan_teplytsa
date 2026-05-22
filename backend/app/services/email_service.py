import logging
import time
from fastapi_mail import MessageSchema, MessageType
from app.core.config import settings

logger = logging.getLogger(__name__)

# Rate-limit: greenhouse_id:alert_type → last sent timestamp
_last_sent: dict[str, float] = {}
COOLDOWN_SECONDS = 1800  # 30 minutes between same alert type per greenhouse

# Alert type → Ukrainian label + recommendation
_ALERT_META = {
    "high_temperature": {
        "label": "Висока температура",
        "icon": "🌡",
        "norm": "до 35°C",
        "rec": "Перевірте вентиляцію теплиці і за необхідності відчиніть кватирки або увімкніть охолодження.",
    },
    "low_temperature": {
        "label": "Низька температура",
        "icon": "❄️",
        "norm": "від 15°C",
        "rec": "Перевірте систему опалення та ізоляцію теплиці. Закрийте всі отвори.",
    },
    "high_co2": {
        "label": "Підвищений CO₂",
        "icon": "💨",
        "norm": "до 1000 ppm",
        "rec": "Провітріть теплицю — відкрийте фрамуги або увімкніть примусову вентиляцію.",
    },
    "low_humidity": {
        "label": "Низька вологість повітря",
        "icon": "💧",
        "norm": "від 50%",
        "rec": "Збільшіть частоту поливу або увімкніть зволожувач повітря.",
    },
    "low_o2": {
        "label": "Знижений рівень O₂",
        "icon": "🫧",
        "norm": "від 19.5%",
        "rec": "Негайно провітріть теплицю. Перевірте систему вентиляції та герметичність приміщення.",
    },
    "sensor_offline": {
        "label": "Датчик не відповідає",
        "icon": "📡",
        "norm": "стабільне з'єднання",
        "rec": "Перевірте підключення датчика і живлення пристрою. Перезапустіть модуль зв'язку.",
    },
    "system": {
        "label": "Системне сповіщення",
        "icon": "⚙️",
        "norm": "—",
        "rec": "Перевірте стан системи в особистому кабінеті.",
    },
}


def _should_send(greenhouse_id: str, alert_type: str) -> bool:
    key = f"{greenhouse_id}:{alert_type}"
    last = _last_sent.get(key, 0)
    if time.time() - last < COOLDOWN_SECONDS:
        return False
    _last_sent[key] = time.time()
    return True


def _build_html(
    full_name: str,
    greenhouse_name: str,
    alert_type: str,
    alert_message: str,
    value: float | None,
    greenhouse_url: str,
) -> str:
    meta = _ALERT_META.get(alert_type, _ALERT_META["system"])
    first_name = full_name.split()[0] if full_name else "Фермере"
    value_str = f"{value:.1f}" if value is not None else "—"

    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body {{ margin:0; padding:0; background:#0a0e1a; font-family:'Helvetica Neue',Arial,sans-serif; color:#f1f5f9; }}
  .wrap {{ max-width:560px; margin:0 auto; padding:32px 16px; }}
  .card {{ background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; }}
  .header {{ background:linear-gradient(135deg,#0d2a22 0%,#0a1628 100%); padding:28px 32px; border-bottom:1px solid #1f2937; }}
  .logo {{ display:flex; align-items:center; gap:10px; margin-bottom:20px; }}
  .logo-icon {{ width:36px; height:36px; background:rgba(0,212,170,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; }}
  .logo-text {{ font-weight:800; font-size:16px; color:#fff; letter-spacing:-0.3px; }}
  .badge {{ display:inline-flex; align-items:center; gap:6px; background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3); border-radius:20px; padding:4px 12px; font-size:11px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:0.08em; }}
  .alert-title {{ font-size:20px; font-weight:800; color:#fff; margin:12px 0 4px; }}
  .greenhouse {{ font-size:13px; color:#64748b; }}
  .body {{ padding:28px 32px; }}
  .greeting {{ font-size:15px; color:#94a3b8; margin-bottom:20px; }}
  .metric-box {{ background:#0f1628; border:1px solid #1f2937; border-radius:12px; padding:16px 20px; margin-bottom:20px; }}
  .metric-label {{ font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }}
  .metric-value {{ font-size:28px; font-weight:900; color:#ef4444; }}
  .metric-norm {{ font-size:12px; color:#64748b; margin-top:4px; }}
  .rec-box {{ background:rgba(0,212,170,0.06); border:1px solid rgba(0,212,170,0.2); border-radius:12px; padding:16px 20px; margin-bottom:24px; }}
  .rec-title {{ font-size:11px; font-weight:700; color:#00d4aa; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }}
  .rec-text {{ font-size:14px; color:#94a3b8; line-height:1.6; }}
  .btn {{ display:inline-block; background:#00d4aa; color:#0a0e1a; font-weight:800; font-size:14px; padding:12px 28px; border-radius:10px; text-decoration:none; }}
  .footer {{ padding:20px 32px; border-top:1px solid #1f2937; text-align:center; }}
  .footer p {{ font-size:11px; color:#374151; margin:4px 0; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 56 56" fill="none">
            <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
            <line x1="28" y1="6" x2="28" y2="20" stroke="#00d4aa" stroke-width="2.2"/>
            <line x1="18" y1="20" x2="18" y2="50" stroke="#00d4aa" stroke-width="2"/>
            <line x1="38" y1="20" x2="38" y2="50" stroke="#00d4aa" stroke-width="2"/>
            <path d="M19 50 L19 36 Q19 27 28 27 Q37 27 37 36 L37 50" stroke="#00d4aa" stroke-width="2.2" fill="none"/>
            <line x1="28" y1="48" x2="28" y2="38" stroke="#00d4aa" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M28 41 C23 39 21 35 23 32" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M28 41 C33 39 35 35 33 32" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <span class="logo-text">ТеплицяПлан</span>
      </div>
      <div class="badge">⚠️ Сповіщення</div>
      <p class="alert-title">{meta['icon']} {meta['label']}</p>
      <p class="greenhouse">Теплиця: <strong style="color:#f1f5f9">{greenhouse_name}</strong></p>
    </div>

    <div class="body">
      <p class="greeting">Привіт, <strong style="color:#fff">{first_name}!</strong></p>
      <p style="font-size:14px;color:#64748b;margin-bottom:20px">{alert_message}</p>

      <div class="metric-box">
        <p class="metric-label">Поточне значення</p>
        <p class="metric-value">{value_str}</p>
        <p class="metric-norm">Норма: {meta['norm']}</p>
      </div>

      <div class="rec-box">
        <p class="rec-title">💡 Рекомендація</p>
        <p class="rec-text">{meta['rec']}</p>
      </div>

      <a href="{greenhouse_url}" class="btn">Відкрити теплицю →</a>
    </div>

    <div class="footer">
      <p>ТеплицяПлан © 2026</p>
      <p>Ви отримали цей лист, оскільки зареєстровані на teplytsya.app</p>
    </div>
  </div>
</div>
</body>
</html>"""


def _build_verification_html(full_name: str, code: str) -> str:
    first_name = full_name.split()[0] if full_name else "Фермере"
    digits = "".join(
        f'<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;'
        f'background:#0f1628;border:1px solid #1f2937;border-radius:10px;font-size:28px;font-weight:900;'
        f'color:#00d4aa;margin:0 4px;">{d}</span>'
        for d in code
    )
    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body {{ margin:0; padding:0; background:#0a0e1a; font-family:'Helvetica Neue',Arial,sans-serif; color:#f1f5f9; }}
  .wrap {{ max-width:520px; margin:0 auto; padding:32px 16px; }}
  .card {{ background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; }}
  .header {{ background:linear-gradient(135deg,#0d2a22 0%,#0a1628 100%); padding:28px 32px; border-bottom:1px solid #1f2937; }}
  .logo {{ display:flex; align-items:center; gap:10px; }}
  .logo-icon {{ width:36px; height:36px; background:rgba(0,212,170,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; }}
  .logo-text {{ font-weight:800; font-size:16px; color:#fff; letter-spacing:-0.3px; }}
  .body {{ padding:32px 32px 28px; text-align:center; }}
  .title {{ font-size:22px; font-weight:800; color:#fff; margin:0 0 8px; }}
  .sub {{ font-size:14px; color:#64748b; margin:0 0 32px; }}
  .code-row {{ margin:0 0 28px; }}
  .note {{ font-size:12px; color:#374151; margin:0 0 4px; }}
  .footer {{ padding:20px 32px; border-top:1px solid #1f2937; text-align:center; }}
  .footer p {{ font-size:11px; color:#374151; margin:4px 0; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 56 56" fill="none">
            <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
            <line x1="28" y1="6" x2="28" y2="20" stroke="#00d4aa" stroke-width="2.2"/>
            <line x1="18" y1="20" x2="18" y2="50" stroke="#00d4aa" stroke-width="2"/>
            <line x1="38" y1="20" x2="38" y2="50" stroke="#00d4aa" stroke-width="2"/>
            <path d="M19 50 L19 36 Q19 27 28 27 Q37 27 37 36 L37 50" stroke="#00d4aa" stroke-width="2.2" fill="none"/>
            <line x1="28" y1="48" x2="28" y2="38" stroke="#00d4aa" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M28 41 C23 39 21 35 23 32" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M28 41 C33 39 35 35 33 32" stroke="#00d4aa" stroke-width="2" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <span class="logo-text">ТеплицяПлан</span>
      </div>
    </div>
    <div class="body">
      <p class="title">Підтвердіть вашу пошту</p>
      <p class="sub">Привіт, <strong style="color:#fff">{first_name}!</strong> Введіть код нижче у вікні реєстрації.</p>
      <div class="code-row">{digits}</div>
      <p class="note">Код дійсний 15 хвилин.</p>
      <p class="note">Якщо ви не реєструвалися — просто проігноруйте цей лист.</p>
    </div>
    <div class="footer">
      <p>ТеплицяПлан © 2026</p>
      <p>Ви отримали цей лист, оскільки зареєстровані на teplytsya.app</p>
    </div>
  </div>
</div>
</body>
</html>"""


def _build_reset_html(full_name: str, code: str) -> str:
    first_name = full_name.split()[0] if full_name else "Фермере"
    digits = "".join(
        f'<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;'
        f'background:#0f1628;border:1px solid #1f2937;border-radius:10px;font-size:28px;font-weight:900;'
        f'color:#ef4444;margin:0 4px;">{d}</span>'
        for d in code
    )
    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body {{ margin:0; padding:0; background:#0a0e1a; font-family:'Helvetica Neue',Arial,sans-serif; color:#f1f5f9; }}
  .wrap {{ max-width:520px; margin:0 auto; padding:32px 16px; }}
  .card {{ background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; }}
  .header {{ background:linear-gradient(135deg,#1a0d0d 0%,#0a1628 100%); padding:28px 32px; border-bottom:1px solid #1f2937; }}
  .logo {{ display:flex; align-items:center; gap:10px; }}
  .logo-icon {{ width:36px; height:36px; background:rgba(239,68,68,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; }}
  .logo-text {{ font-weight:800; font-size:16px; color:#fff; letter-spacing:-0.3px; }}
  .body {{ padding:32px 32px 28px; text-align:center; }}
  .footer {{ padding:20px 32px; border-top:1px solid #1f2937; text-align:center; }}
  .footer p {{ font-size:11px; color:#374151; margin:4px 0; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 56 56" fill="none">
            <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#ef4444" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
            <line x1="28" y1="6" x2="28" y2="20" stroke="#ef4444" stroke-width="2.2"/>
            <line x1="18" y1="20" x2="18" y2="50" stroke="#ef4444" stroke-width="2"/>
            <line x1="38" y1="20" x2="38" y2="50" stroke="#ef4444" stroke-width="2"/>
          </svg>
        </div>
        <span class="logo-text">ТеплицяПлан</span>
      </div>
    </div>
    <div class="body">
      <p style="font-size:22px;font-weight:800;color:#fff;margin:0 0 8px">Скидання паролю</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 32px">
        Привіт, <strong style="color:#fff">{first_name}!</strong><br/>
        Введіть цей код у вікні скидання паролю.
      </p>
      <div style="margin:0 0 28px">{digits}</div>
      <p style="font-size:12px;color:#374151;margin:0 0 4px">Код дійсний 15 хвилин.</p>
      <p style="font-size:12px;color:#374151">Якщо ви не запитували скидання — проігноруйте цей лист.</p>
    </div>
    <div class="footer">
      <p>ТеплицяПлан © 2026</p>
      <p>Ви отримали цей лист, оскільки зареєстровані на teplytsya.app</p>
    </div>
  </div>
</div>
</body>
</html>"""


async def send_reset_email(to_email: str, full_name: str, code: str) -> bool:
    if not settings.MAIL_ENABLED:
        logger.info("EMAIL: reset code %s for %s (mail disabled)", code, to_email)
        return False
    try:
        from app.core.email import fm
        html = _build_reset_html(full_name, code)
        msg = MessageSchema(
            subject="Скидання паролю — ТеплицяПлан",
            recipients=[to_email],
            body=html,
            subtype=MessageType.html,
        )
        await fm.send_message(msg)
        logger.info("EMAIL: reset code sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("EMAIL: reset email failed for %s: %s", to_email, exc)
        return False


async def send_verification_email(to_email: str, full_name: str, code: str) -> bool:
    if not settings.MAIL_ENABLED:
        logger.info("EMAIL: verification code %s for %s (mail disabled)", code, to_email)
        return False
    try:
        from app.core.email import fm
        html = _build_verification_html(full_name, code)
        msg = MessageSchema(
            subject="Код підтвердження — ТеплицяПлан",
            recipients=[to_email],
            body=html,
            subtype=MessageType.html,
        )
        await fm.send_message(msg)
        logger.info("EMAIL: verification sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("EMAIL: failed verification send to %s: %s", to_email, exc)
        return False


async def send_alert_email(
    to_email: str,
    full_name: str,
    greenhouse_id: str,
    greenhouse_name: str,
    alert_type: str,
    alert_message: str,
    value: float | None = None,
    base_url: str = "http://localhost:3000",
) -> bool:
    if not _should_send(greenhouse_id, alert_type):
        logger.info("EMAIL: rate-limited %s:%s — skipping", greenhouse_id, alert_type)
        return False

    if not settings.MAIL_ENABLED:
        logger.info(
            "EMAIL: would send to %s — %s / %s",
            to_email, alert_type, alert_message,
        )
        return False

    try:
        from app.core.email import fm
        meta = _ALERT_META.get(alert_type, _ALERT_META["system"])
        greenhouse_url = f"{base_url}/greenhouses/{greenhouse_id}"
        html = _build_html(full_name, greenhouse_name, alert_type, alert_message, value, greenhouse_url)

        msg = MessageSchema(
            subject=f"⚠️ {meta['label']} — {greenhouse_name} | ТеплицяПлан",
            recipients=[to_email],
            body=html,
            subtype=MessageType.html,
        )
        await fm.send_message(msg)
        logger.info("EMAIL: sent alert '%s' to %s", alert_type, to_email)
        return True
    except Exception as exc:
        logger.error("EMAIL: failed to send to %s: %s", to_email, exc)
        return False


def _build_harvest_html(
    full_name: str,
    greenhouse_name: str,
    plant_name: str,
    area_m2: float,
    expected_yield_kg: float,
    revenue_uah: float,
    plan_url: str,
) -> str:
    first_name = full_name.split()[0] if full_name else "Фермере"
    return f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body {{ margin:0; padding:0; background:#0a0e1a; font-family:'Helvetica Neue',Arial,sans-serif; color:#f1f5f9; }}
  .wrap {{ max-width:560px; margin:0 auto; padding:32px 16px; }}
  .card {{ background:#111827; border:1px solid #1f2937; border-radius:16px; overflow:hidden; }}
  .header {{ background:linear-gradient(135deg,#0d2a22 0%,#0a1628 100%); padding:28px 32px; border-bottom:1px solid #1f2937; }}
  .logo {{ display:flex; align-items:center; gap:10px; margin-bottom:20px; }}
  .logo-icon {{ width:36px; height:36px; background:rgba(0,212,170,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; }}
  .logo-text {{ font-weight:800; font-size:16px; color:#fff; letter-spacing:-0.3px; }}
  .badge {{ display:inline-flex; align-items:center; gap:6px; background:rgba(0,212,170,0.12); border:1px solid rgba(0,212,170,0.3); border-radius:20px; padding:4px 12px; font-size:11px; font-weight:700; color:#00d4aa; text-transform:uppercase; letter-spacing:0.08em; }}
  .body {{ padding:28px 32px; }}
  .metrics {{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:24px; }}
  .metric {{ background:#0f1628; border:1px solid #1f2937; border-radius:12px; padding:14px 16px; text-align:center; }}
  .metric-val {{ font-size:22px; font-weight:900; color:#00d4aa; }}
  .metric-lbl {{ font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-top:4px; }}
  .btn {{ display:inline-block; background:#00d4aa; color:#0a0e1a; font-weight:800; font-size:14px; padding:12px 28px; border-radius:10px; text-decoration:none; }}
  .footer {{ padding:20px 32px; border-top:1px solid #1f2937; text-align:center; }}
  .footer p {{ font-size:11px; color:#374151; margin:4px 0; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg width="20" height="20" viewBox="0 0 56 56" fill="none">
            <path d="M28 6 L50 20 L50 50 L6 50 L6 20 Z" stroke="#00d4aa" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
            <line x1="28" y1="6" x2="28" y2="20" stroke="#00d4aa" stroke-width="2.2"/>
            <line x1="18" y1="20" x2="18" y2="50" stroke="#00d4aa" stroke-width="2"/>
            <line x1="38" y1="20" x2="38" y2="50" stroke="#00d4aa" stroke-width="2"/>
            <path d="M19 50 L19 36 Q19 27 28 27 Q37 27 37 36 L37 50" stroke="#00d4aa" stroke-width="2.2" fill="none"/>
          </svg>
        </div>
        <span class="logo-text">ТеплицяПлан</span>
      </div>
      <div class="badge">🌾 Час збирати врожай!</div>
      <p style="font-size:20px;font-weight:800;color:#fff;margin:12px 0 4px">
        {plant_name} готовий до збору
      </p>
      <p style="font-size:13px;color:#64748b">
        Теплиця: <strong style="color:#f1f5f9">{greenhouse_name}</strong>
      </p>
    </div>
    <div class="body">
      <p style="font-size:15px;color:#94a3b8;margin-bottom:20px">
        Привіт, <strong style="color:#fff">{first_name}!</strong><br/>
        Прийшов час збирати врожай — ваш план досяг очікуваної дати.
      </p>
      <div class="metrics">
        <div class="metric">
          <p class="metric-val">{area_m2:.1f}</p>
          <p class="metric-lbl">м² площа</p>
        </div>
        <div class="metric">
          <p class="metric-val">{expected_yield_kg:.0f}</p>
          <p class="metric-lbl">кг прогноз</p>
        </div>
        <div class="metric">
          <p class="metric-val">₴{revenue_uah:,.0f}</p>
          <p class="metric-lbl">дохід</p>
        </div>
      </div>
      <a href="{plan_url}" class="btn">Відкрити план →</a>
    </div>
    <div class="footer">
      <p>ТеплицяПлан © 2026</p>
      <p>Ви отримали цей лист, оскільки зареєстровані на teplytsya.app</p>
    </div>
  </div>
</div>
</body>
</html>"""


async def send_harvest_email(
    to_email: str,
    full_name: str,
    greenhouse_name: str,
    plant_name: str,
    plan_id: str,
    area_m2: float,
    expected_yield_kg: float,
    revenue_uah: float,
    base_url: str = "http://localhost:3000",
) -> bool:
    if not settings.MAIL_ENABLED:
        logger.info("EMAIL: harvest ready for %s — plan %s (mail disabled)", to_email, plan_id)
        return False
    try:
        from app.core.email import fm
        plan_url = f"{base_url}/planting-plans/{plan_id}"
        html = _build_harvest_html(full_name, greenhouse_name, plant_name, area_m2, expected_yield_kg, revenue_uah, plan_url)
        msg = MessageSchema(
            subject=f"🌾 {plant_name} готовий до збору — {greenhouse_name} | ТеплицяПлан",
            recipients=[to_email],
            body=html,
            subtype=MessageType.html,
        )
        await fm.send_message(msg)
        logger.info("EMAIL: harvest notification sent to %s for plan %s", to_email, plan_id)
        return True
    except Exception as exc:
        logger.error("EMAIL: harvest email failed for %s: %s", to_email, exc)
        return False
