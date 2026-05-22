import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert, AlertType
from app.models.greenhouse import Greenhouse
from app.models.user import User
from app.schemas.alert import AlertOut


class AlertCreate(BaseModel):
    type: AlertType
    message: str
    value: float | None = None

router = APIRouter()


@router.post("/{greenhouse_id}", response_model=AlertOut, status_code=201)
async def create_alert(
    greenhouse_id: uuid.UUID,
    payload: AlertCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gh = _get_greenhouse(greenhouse_id, current_user, db)
    alert = Alert(
        id=uuid.uuid4(),
        greenhouse_id=greenhouse_id,
        type=payload.type,
        message=payload.message,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Send email in background (non-blocking)
    background_tasks.add_task(
        _send_alert_email_bg,
        to_email=current_user.email,
        full_name=current_user.full_name,
        greenhouse_id=str(greenhouse_id),
        greenhouse_name=gh.name,
        alert_type=payload.type.value,
        alert_message=payload.message,
        value=payload.value,
    )
    return alert


async def _send_alert_email_bg(**kwargs):
    from app.services.email_service import send_alert_email
    await send_alert_email(**kwargs)


def _get_greenhouse(greenhouse_id: uuid.UUID, user: User, db: Session) -> Greenhouse:
    gh = db.query(Greenhouse).filter(
        Greenhouse.id == greenhouse_id,
        Greenhouse.user_id == user.id,
    ).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    return gh


# ── Read-all must be defined BEFORE /{alert_id}/read so FastAPI doesn't
#    try to parse "read-all" as an alert UUID path param.
@router.patch("/{greenhouse_id}/read-all", response_model=dict)
def mark_all_read(
    greenhouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark every unread alert for a greenhouse as read."""
    _get_greenhouse(greenhouse_id, current_user, db)
    updated = (
        db.query(Alert)
        .filter(
            Alert.greenhouse_id == greenhouse_id,
            Alert.is_read.is_(False),
        )
        .update({"is_read": True}, synchronize_session="fetch")
    )
    db.commit()
    return {"marked_read": updated}


@router.patch("/{alert_id}/read", response_model=AlertOut)
def mark_alert_read(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single alert as read. Verifies the alert belongs to the caller."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    # Ownership check: alert → greenhouse → user
    _get_greenhouse(alert.greenhouse_id, current_user, db)
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/{greenhouse_id}", response_model=list[AlertOut])
def get_alerts(
    greenhouse_id: uuid.UUID,
    unread_only: bool = Query(False, description="Return only unread alerts"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_greenhouse(greenhouse_id, current_user, db)
    q = db.query(Alert).filter(Alert.greenhouse_id == greenhouse_id)
    if unread_only:
        q = q.filter(Alert.is_read.is_(False))
    return q.order_by(Alert.created_at.desc()).limit(limit).all()
