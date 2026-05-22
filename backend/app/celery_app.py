from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "greenhouse",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.irrigation",
        "app.tasks.fertilizer",
        "app.tasks.market_prices",
        "app.tasks.sensor_simulator",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Kiev",
    enable_utc=True,
    task_track_started=True,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

celery_app.conf.beat_schedule = {
    "fetch-market-prices-daily": {
        "task": "app.tasks.market_prices.fetch_market_prices",
        "schedule": crontab(hour=6, minute=0),
    },
    "simulate-sensors": {
        "task": "app.tasks.sensor_simulator.simulate_sensors_all",
        "schedule": 30.0,
    },
}
