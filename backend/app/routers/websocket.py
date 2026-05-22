import uuid
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import get_db
from app.models.greenhouse import Greenhouse
from app.models.sensor_log import SensorLog
from app.models.alert import Alert, AlertType
from app.services.ws_manager import manager

router = APIRouter()

# Thresholds that trigger alerts
_THRESHOLDS: list[tuple[str, float, AlertType, str]] = [
    ("temperature", 35.0,  AlertType.high_temperature, "Температура перевищила {val:.1f}°C (поріг 35°C)"),
    ("co2_ppm",    1500.0, AlertType.high_co2,         "CO₂ перевищив {val:.0f} ppm (поріг 1500 ppm)"),
    ("humidity_air", 30.0, AlertType.low_humidity,     "Вологість повітря впала до {val:.1f}% (поріг 30%)"),
]


def _auth_greenhouse(token: str, greenhouse_id: uuid.UUID, db: Session) -> Greenhouse:
    """Validate JWT and check greenhouse ownership. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    gh = db.query(Greenhouse).filter(
        Greenhouse.id == greenhouse_id,
        Greenhouse.user_id == user_id,
    ).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    return gh


def _check_thresholds(data: dict, greenhouse_id: uuid.UUID, db: Session) -> list[Alert]:
    """Create Alert rows for any breached thresholds. Returns new alert objects."""
    new_alerts: list[Alert] = []
    for field, threshold, alert_type, msg_tpl in _THRESHOLDS:
        value = data.get(field)
        if value is None:
            continue
        breached = (
            value > threshold if alert_type != AlertType.low_humidity
            else value < threshold
        )
        if breached:
            alert = Alert(
                id=uuid.uuid4(),
                greenhouse_id=greenhouse_id,
                type=alert_type,
                message=msg_tpl.format(val=value),
                is_read=False,
                created_at=datetime.utcnow(),
            )
            db.add(alert)
            new_alerts.append(alert)
    if new_alerts:
        db.flush()
    return new_alerts


@router.websocket("/ws/greenhouse/{greenhouse_id}")
async def greenhouse_ws(
    websocket: WebSocket,
    greenhouse_id: uuid.UUID,
    token: str = Query(..., description="JWT access token"),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for sensor data streaming.

    Connect: ws://host/ws/greenhouse/{id}?token=<JWT>

    Send JSON:
        {"temperature": 36.2, "humidity_air": 65, "humidity_soil": 45, "co2_ppm": 800}

    Receive broadcasts:
        {"event": "sensor", "data": {...sensor log...}}
        {"event": "alert",  "data": {"type": "...", "message": "..."}}
    """
    try:
        _auth_greenhouse(token, greenhouse_id, db)
    except HTTPException as exc:
        await websocket.close(code=4001, reason=exc.detail)
        return

    await manager.connect(greenhouse_id, websocket)
    try:
        while True:
            raw = await websocket.receive_json()

            # Persist sensor reading
            log = SensorLog(
                id=uuid.uuid4(),
                greenhouse_id=greenhouse_id,
                temperature=raw.get("temperature"),
                humidity_air=raw.get("humidity_air"),
                humidity_soil=raw.get("humidity_soil"),
                co2_ppm=raw.get("co2_ppm"),
                light_lux=raw.get("light_lux"),
                recorded_at=datetime.utcnow(),
            )
            db.add(log)

            # Check thresholds → write alerts
            triggered = _check_thresholds(raw, greenhouse_id, db)
            db.commit()

            # Broadcast sensor snapshot to all subscribers of this greenhouse
            await manager.broadcast(greenhouse_id, {
                "event": "sensor",
                "data": {
                    "id": str(log.id),
                    "temperature": log.temperature,
                    "humidity_air": log.humidity_air,
                    "humidity_soil": log.humidity_soil,
                    "co2_ppm": log.co2_ppm,
                    "light_lux": log.light_lux,
                    "recorded_at": log.recorded_at.isoformat(),
                },
            })

            # Broadcast each new alert
            for alert in triggered:
                await manager.broadcast(greenhouse_id, {
                    "event": "alert",
                    "data": {
                        "id": str(alert.id),
                        "type": alert.type.value,
                        "message": alert.message,
                        "created_at": alert.created_at.isoformat(),
                    },
                })

    except WebSocketDisconnect:
        manager.disconnect(greenhouse_id, websocket)
    except Exception:
        manager.disconnect(greenhouse_id, websocket)
        db.rollback()
