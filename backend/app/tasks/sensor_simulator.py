import uuid
import math
import random
import logging
from datetime import datetime

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


def _generate_sensor_data(now: datetime) -> dict:
    hour = now.hour + now.minute / 60.0
    is_day = 8 <= hour <= 20

    # Temperature: base 22, sine wave ±3 over 24h, +3 daytime, -2 night, ±0.5 noise
    temp_sine = 3.0 * math.sin(2 * math.pi * (hour - 6) / 24)
    temp_offset = 3.0 if is_day else -2.0
    temperature = 22.0 + temp_sine + temp_offset + random.uniform(-0.5, 0.5)

    # Humidity air: base 65%, ±10% noise
    humidity_air = 65.0 + random.uniform(-10.0, 10.0)

    # Humidity soil: base 55%, ±5% noise
    humidity_soil = 55.0 + random.uniform(-5.0, 5.0)

    # CO2: daytime 400-600, night 600-900
    if is_day:
        co2_ppm = random.uniform(400, 600)
    else:
        co2_ppm = random.uniform(600, 900)

    # Light: daytime sine 0-45000, night 0
    if is_day:
        day_progress = (hour - 8) / 12.0
        light_lux = max(0.0, 45000.0 * math.sin(math.pi * day_progress) + random.uniform(-500, 500))
    else:
        light_lux = 0.0

    return {
        "temperature": round(temperature, 2),
        "humidity_air": round(max(0.0, min(100.0, humidity_air)), 2),
        "humidity_soil": round(max(0.0, min(100.0, humidity_soil)), 2),
        "co2_ppm": round(co2_ppm, 1),
        "light_lux": round(max(0.0, light_lux), 1),
    }


def _check_thresholds(data: dict, greenhouse_id: uuid.UUID, db) -> list:
    from app.models.alert import Alert, AlertType

    new_alerts = []
    temp = data.get("temperature")
    humidity_air = data.get("humidity_air")
    co2 = data.get("co2_ppm")

    if temp is not None and temp > 35:
        alert = Alert(
            id=uuid.uuid4(),
            greenhouse_id=greenhouse_id,
            type=AlertType.high_temperature,
            message=f"Критична температура {temp:.1f}°C",
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(alert)
        new_alerts.append(alert)

    if temp is not None and temp < 10:
        alert = Alert(
            id=uuid.uuid4(),
            greenhouse_id=greenhouse_id,
            type=AlertType.high_temperature,
            message=f"Низька температура {temp:.1f}°C",
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(alert)
        new_alerts.append(alert)

    if humidity_air is not None and humidity_air < 30:
        alert = Alert(
            id=uuid.uuid4(),
            greenhouse_id=greenhouse_id,
            type=AlertType.low_humidity,
            message=f"Низька вологість повітря {humidity_air:.1f}%",
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(alert)
        new_alerts.append(alert)

    if co2 is not None and co2 > 1500:
        alert = Alert(
            id=uuid.uuid4(),
            greenhouse_id=greenhouse_id,
            type=AlertType.high_co2,
            message=f"Критичний рівень CO₂ {co2:.0f} ppm",
            is_read=False,
            created_at=datetime.utcnow(),
        )
        db.add(alert)
        new_alerts.append(alert)

    if new_alerts:
        db.flush()
    return new_alerts


@celery_app.task(name="app.tasks.sensor_simulator.simulate_sensors_all")
def simulate_sensors_all():
    from app.core.database import SessionLocal
    from app.models.greenhouse import Greenhouse
    from app.models.sensor_log import SensorLog

    db = SessionLocal()
    try:
        greenhouses = db.query(Greenhouse).all()
        now = datetime.utcnow()

        for gh in greenhouses:
            data = _generate_sensor_data(now)

            log = SensorLog(
                id=uuid.uuid4(),
                greenhouse_id=gh.id,
                temperature=data["temperature"],
                humidity_air=data["humidity_air"],
                humidity_soil=data["humidity_soil"],
                co2_ppm=data["co2_ppm"],
                light_lux=data["light_lux"],
                recorded_at=now,
            )
            db.add(log)

            _check_thresholds(data, gh.id, db)

        db.commit()

        # Broadcast via WebSocket if possible
        try:
            import asyncio
            from app.services.ws_manager import manager

            async def _broadcast_all():
                for gh in greenhouses:
                    data = _generate_sensor_data(now)
                    await manager.broadcast(gh.id, {
                        "event": "sensor",
                        "data": {
                            "temperature": data["temperature"],
                            "humidity_air": data["humidity_air"],
                            "humidity_soil": data["humidity_soil"],
                            "co2_ppm": data["co2_ppm"],
                            "light_lux": data["light_lux"],
                            "recorded_at": now.isoformat(),
                        },
                    })

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(_broadcast_all())
                else:
                    loop.run_until_complete(_broadcast_all())
            except RuntimeError:
                pass
        except Exception:
            pass

        logger.info("Simulated sensors for %d greenhouses", len(greenhouses))
        return {"status": "done", "count": len(greenhouses)}

    except Exception:
        db.rollback()
        logger.exception("sensor_simulator task failed")
        raise
    finally:
        db.close()
