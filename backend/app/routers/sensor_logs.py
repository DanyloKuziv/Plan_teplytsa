import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.greenhouse import Greenhouse
from app.models.sensor_log import SensorLog
from app.models.user import User
from app.schemas.sensor_log import SensorLogCreate, SensorLogOut

router = APIRouter()


@router.post("/{greenhouse_id}", response_model=SensorLogOut, status_code=201)
def add_sensor_log(
    greenhouse_id: uuid.UUID,
    payload: SensorLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gh = db.query(Greenhouse).filter(Greenhouse.id == greenhouse_id, Greenhouse.user_id == current_user.id).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    log = SensorLog(id=uuid.uuid4(), greenhouse_id=greenhouse_id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{greenhouse_id}/latest", response_model=SensorLogOut)
def get_latest_sensor_log(
    greenhouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gh = db.query(Greenhouse).filter(Greenhouse.id == greenhouse_id, Greenhouse.user_id == current_user.id).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    log = (
        db.query(SensorLog)
        .filter(SensorLog.greenhouse_id == greenhouse_id)
        .order_by(SensorLog.recorded_at.desc())
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="No sensor logs found")
    return log


@router.get("/{greenhouse_id}/history", response_model=list[SensorLogOut])
def get_sensor_history(
    greenhouse_id: uuid.UUID,
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gh = db.query(Greenhouse).filter(Greenhouse.id == greenhouse_id, Greenhouse.user_id == current_user.id).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    since = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(SensorLog)
        .filter(SensorLog.greenhouse_id == greenhouse_id, SensorLog.recorded_at >= since)
        .order_by(SensorLog.recorded_at.asc())
        .limit(limit)
        .all()
    )
