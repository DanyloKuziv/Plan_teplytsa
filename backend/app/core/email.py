import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, html: str) -> bool:
    """Send email via Resend API (primary) or SMTP fallback."""
    if settings.RESEND_API_KEY:
        return await _send_via_resend(to_email, subject, html)
    return await _send_via_smtp(to_email, subject, html)


async def _send_via_resend(to_email: str, subject: str, html: str) -> bool:
    from_addr = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"from": from_addr, "to": [to_email], "subject": subject, "html": html},
                timeout=15,
            )
            if resp.status_code >= 400:
                logger.error("Resend: error %s body=%s", resp.status_code, resp.text)
                return False
            logger.info("Resend: sent to %s (status %s)", to_email, resp.status_code)
            return True
    except Exception as exc:
        logger.error("Resend: failed to %s: %s", to_email, exc)
        return False


async def _send_via_smtp(to_email: str, subject: str, html: str) -> bool:
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
        cfg = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM or settings.MAIL_USERNAME,
            MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        fm = FastMail(cfg)
        msg = MessageSchema(subject=subject, recipients=[to_email], body=html, subtype=MessageType.html)
        await fm.send_message(msg)
        logger.info("SMTP: sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("SMTP: failed to %s: %s", to_email, exc)
        return False
