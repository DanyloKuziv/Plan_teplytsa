import logging
from html import escape

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter()


class LeadIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    contact: str = Field(..., min_length=5, max_length=120)  # телефон / Telegram / email
    region: str = Field("", max_length=100)
    greenhouses: str = Field("", max_length=50)
    comment: str = Field("", max_length=1000)


@router.post("/", status_code=201)
async def create_lead(lead: LeadIn):
    """Заявка на пілот з лендингу. Без БД: лог + лист на LEADS_EMAIL."""
    logger.warning("NEW LEAD: %s", lead.model_dump())
    print(f"[LEAD] {lead.model_dump()}", flush=True)

    if settings.LEADS_EMAIL:
        rows = "".join(
            f"<tr><td><b>{label}</b></td><td>{escape(value) or '—'}</td></tr>"
            for label, value in [
                ("Ім'я", lead.name),
                ("Контакт", lead.contact),
                ("Регіон", lead.region),
                ("Теплиць", lead.greenhouses),
                ("Коментар", lead.comment),
            ]
        )
        await send_email(
            settings.LEADS_EMAIL,
            f"GreenFlow: нова заявка на пілот — {lead.name}",
            f"<h2>Нова заявка на пілот</h2><table cellpadding='6'>{rows}</table>",
        )
    return {"ok": True}
