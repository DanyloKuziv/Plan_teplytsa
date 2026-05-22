import logging
import time
from app.core.config import settings
from app.core.email import send_email

logger = logging.getLogger(__name__)

_last_sent: dict[str, float] = {}
COOLDOWN_SECONDS = 1800

_ALERT_META = {
    "high_temperature": {"label": "Висока температура", "icon": "🌡", "norm": "до 35°C", "rec": "Перевірте вентиляцію теплиці і за необхідності відчиніть кватирки або увімкніть охолодження."},
    "low_temperature":  {"label": "Низька температура",  "icon": "❄️", "norm": "від 15°C", "rec": "Перевірте систему опалення та ізоляцію теплиці. Закрийте всі отвори."},
    "high_co2":         {"label": "Підвищений CO₂",      "icon": "💨", "norm": "до 1000 ppm", "rec": "Провітріть теплицю — відкрийте фрамуги або увімкніть примусову вентиляцію."},
    "low_humidity":     {"label": "Низька вологість",     "icon": "💧", "norm": "від 50%", "rec": "Збільшіть частоту поливу або увімкніть зволожувач повітря."},
    "low_o2":           {"label": "Знижений рівень O₂",  "icon": "🫧", "norm": "від 19.5%", "rec": "Негайно провітріть теплицю. Перевірте систему вентиляції."},
    "sensor_offline":   {"label": "Датчик не відповідає","icon": "📡", "norm": "стабільне з'єднання", "rec": "Перевірте підключення датчика і живлення пристрою."},
    "system":           {"label": "Системне сповіщення", "icon": "⚙️", "norm": "—", "rec": "Перевірте стан системи в особистому кабінеті."},
}


def _should_send(greenhouse_id: str, alert_type: str) -> bool:
    key = f"{greenhouse_id}:{alert_type}"
    if time.time() - _last_sent.get(key, 0) < COOLDOWN_SECONDS:
        return False
    _last_sent[key] = time.time()
    return True


def _digits_html(code: str, color: str = "#00d4aa") -> str:
    return "".join(
        f'<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;'
        f'background:#0f1628;border:1px solid #1f2937;border-radius:10px;font-size:28px;font-weight:900;'
        f'color:{color};margin:0 4px;">{d}</span>'
        for d in code
    )


def _base_html(header_bg: str, header_content: str, body_content: str) -> str:
    return f"""<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/>
<style>
body{{margin:0;padding:0;background:#0a0e1a;font-family:'Helvetica Neue',Arial,sans-serif;color:#f1f5f9}}
.wrap{{max-width:520px;margin:0 auto;padding:32px 16px}}
.card{{background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden}}
.header{{background:{header_bg};padding:28px 32px;border-bottom:1px solid #1f2937}}
.logo{{display:flex;align-items:center;gap:10px}}
.body{{padding:32px 32px 28px;text-align:center}}
.footer{{padding:20px 32px;border-top:1px solid #1f2937;text-align:center}}
.footer p{{font-size:11px;color:#374151;margin:4px 0}}
</style></head><body>
<div class="wrap"><div class="card">
<div class="header">
  <div class="logo">
    <span style="font-weight:800;font-size:18px;color:#00d4aa">🌱 ТеплицяПлан</span>
  </div>
  {header_content}
</div>
<div class="body">{body_content}</div>
<div class="footer"><p>ТеплицяПлан © 2026</p></div>
</div></div></body></html>"""


async def send_verification_email(to_email: str, full_name: str, code: str) -> bool:
    if not settings.MAIL_ENABLED:
        logger.info("EMAIL disabled: verification code %s for %s", code, to_email)
        return False
    first = full_name.split()[0] if full_name else "Фермере"
    html = _base_html(
        "linear-gradient(135deg,#0d2a22,#0a1628)",
        "<p style='font-size:14px;color:#64748b;margin-top:12px'>Підтвердження email</p>",
        f"<p style='font-size:22px;font-weight:800;color:#fff;margin:0 0 8px'>Підтвердіть вашу пошту</p>"
        f"<p style='font-size:14px;color:#64748b;margin:0 0 28px'>Привіт, <strong style='color:#fff'>{first}!</strong> Введіть код нижче.</p>"
        f"<div style='margin:0 0 20px'>{_digits_html(code)}</div>"
        f"<p style='font-size:12px;color:#374151'>Код дійсний 15 хвилин.</p>",
    )
    ok = await send_email(to_email, "Код підтвердження — ТеплицяПлан", html)
    if ok:
        logger.info("EMAIL: verification sent to %s", to_email)
    return ok


async def send_reset_email(to_email: str, full_name: str, code: str) -> bool:
    if not settings.MAIL_ENABLED:
        logger.info("EMAIL disabled: reset code %s for %s", code, to_email)
        return False
    first = full_name.split()[0] if full_name else "Фермере"
    html = _base_html(
        "linear-gradient(135deg,#1a0d0d,#0a1628)",
        "<p style='font-size:14px;color:#64748b;margin-top:12px'>Скидання паролю</p>",
        f"<p style='font-size:22px;font-weight:800;color:#fff;margin:0 0 8px'>Скидання паролю</p>"
        f"<p style='font-size:14px;color:#64748b;margin:0 0 28px'>Привіт, <strong style='color:#fff'>{first}!</strong> Введіть код нижче.</p>"
        f"<div style='margin:0 0 20px'>{_digits_html(code, '#ef4444')}</div>"
        f"<p style='font-size:12px;color:#374151'>Код дійсний 15 хвилин.</p>",
    )
    ok = await send_email(to_email, "Скидання паролю — ТеплицяПлан", html)
    if ok:
        logger.info("EMAIL: reset sent to %s", to_email)
    return ok


async def send_alert_email(
    to_email: str, full_name: str, greenhouse_id: str, greenhouse_name: str,
    alert_type: str, alert_message: str, value: float | None = None,
    base_url: str = "https://plan-teplytsa.vercel.app",
) -> bool:
    if not _should_send(greenhouse_id, alert_type):
        return False
    if not settings.MAIL_ENABLED:
        return False
    meta = _ALERT_META.get(alert_type, _ALERT_META["system"])
    first = full_name.split()[0] if full_name else "Фермере"
    val_str = f"{value:.1f}" if value is not None else "—"
    html = _base_html(
        "linear-gradient(135deg,#1a1a0d,#0a1628)",
        f"<p style='font-size:20px;font-weight:800;color:#fff;margin-top:12px'>{meta['icon']} {meta['label']}</p>"
        f"<p style='font-size:13px;color:#64748b'>Теплиця: <strong style='color:#f1f5f9'>{greenhouse_name}</strong></p>",
        f"<p style='font-size:15px;color:#94a3b8;margin-bottom:16px'>Привіт, <strong style='color:#fff'>{first}!</strong></p>"
        f"<p style='font-size:14px;color:#64748b;margin-bottom:16px'>{alert_message}</p>"
        f"<div style='background:#0f1628;border:1px solid #1f2937;border-radius:12px;padding:16px;margin-bottom:20px'>"
        f"<p style='font-size:28px;font-weight:900;color:#ef4444;margin:0'>{val_str}</p>"
        f"<p style='font-size:12px;color:#64748b;margin:4px 0 0'>Норма: {meta['norm']}</p></div>"
        f"<p style='font-size:14px;color:#94a3b8'>{meta['rec']}</p>",
    )
    return await send_email(to_email, f"⚠️ {meta['label']} — {greenhouse_name}", html)


async def send_harvest_email(
    to_email: str, full_name: str, greenhouse_name: str, plant_name: str,
    plan_id: str, area_m2: float, expected_yield_kg: float, revenue_uah: float,
    base_url: str = "https://plan-teplytsa.vercel.app",
) -> bool:
    if not settings.MAIL_ENABLED:
        return False
    first = full_name.split()[0] if full_name else "Фермере"
    plan_url = f"{base_url}/planting-plans/{plan_id}"
    html = _base_html(
        "linear-gradient(135deg,#0d2a22,#0a1628)",
        f"<p style='font-size:20px;font-weight:800;color:#fff;margin-top:12px'>🌾 {plant_name} готовий до збору</p>"
        f"<p style='font-size:13px;color:#64748b'>Теплиця: <strong style='color:#f1f5f9'>{greenhouse_name}</strong></p>",
        f"<p style='font-size:15px;color:#94a3b8;margin-bottom:20px'>Привіт, <strong style='color:#fff'>{first}!</strong><br/>Час збирати врожай!</p>"
        f"<div style='display:flex;gap:12px;justify-content:center;margin-bottom:24px'>"
        f"<div style='background:#0f1628;border:1px solid #1f2937;border-radius:12px;padding:14px 20px'>"
        f"<p style='font-size:22px;font-weight:900;color:#00d4aa;margin:0'>{area_m2:.1f}</p>"
        f"<p style='font-size:10px;color:#64748b;margin:4px 0 0'>м²</p></div>"
        f"<div style='background:#0f1628;border:1px solid #1f2937;border-radius:12px;padding:14px 20px'>"
        f"<p style='font-size:22px;font-weight:900;color:#00d4aa;margin:0'>{expected_yield_kg:.0f}</p>"
        f"<p style='font-size:10px;color:#64748b;margin:4px 0 0'>кг</p></div>"
        f"<div style='background:#0f1628;border:1px solid #1f2937;border-radius:12px;padding:14px 20px'>"
        f"<p style='font-size:22px;font-weight:900;color:#00d4aa;margin:0'>₴{revenue_uah:,.0f}</p>"
        f"<p style='font-size:10px;color:#64748b;margin:4px 0 0'>дохід</p></div></div>"
        f"<a href='{plan_url}' style='display:inline-block;background:#00d4aa;color:#0a0e1a;font-weight:800;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none'>Відкрити план →</a>",
    )
    return await send_email(to_email, f"🌾 {plant_name} готовий до збору — {greenhouse_name}", html)
