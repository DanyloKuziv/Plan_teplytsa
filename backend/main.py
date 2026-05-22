import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth, greenhouses, zones, farmer_plants, plants, planting_plans,
    market_prices, sensor_logs, news, alerts, websocket, floor_plans,
    substrates, financial, admin,
)

logger = logging.getLogger(__name__)


async def _harvest_checker_loop():
    """Runs every hour. Finds plans due for harvest today and emails owners."""
    from app.core.database import SessionLocal
    from app.models.planting_plan import PlantingPlan
    from app.models.greenhouse import Greenhouse
    from app.models.farmer_plant import FarmerPlant
    from app.models.user import User
    from sqlalchemy.orm import joinedload
    from app.services.email_service import send_harvest_email
    from app.services.yield_service import calculate_forecast

    while True:
        await asyncio.sleep(3600)  # check every hour
        try:
            db = SessionLocal()
            today = date.today()
            plans = (
                db.query(PlantingPlan)
                .options(
                    joinedload(PlantingPlan.farmer_plant).joinedload(FarmerPlant.plant),
                    joinedload(PlantingPlan.greenhouse).joinedload(Greenhouse.user),
                )
                .filter(
                    PlantingPlan.expected_harvest_at <= today,
                    PlantingPlan.harvest_notified.is_(False),
                    PlantingPlan.status == "ready",
                )
                .all()
            )
            for plan in plans:
                try:
                    user  = plan.greenhouse.user
                    plant = plan.farmer_plant.plant
                    fc    = calculate_forecast(db, plan)
                    await send_harvest_email(
                        to_email=user.email,
                        full_name=user.full_name,
                        greenhouse_name=plan.greenhouse.name,
                        plant_name=plant.name if plant else "Культура",
                        plan_id=str(plan.id),
                        area_m2=plan.area,
                        expected_yield_kg=fc.expected_yield_kg,
                        revenue_uah=fc.revenue_uah,
                    )
                    plan.harvest_notified = True
                    db.commit()
                    logger.info("Harvest notification sent for plan %s", plan.id)
                except Exception as exc:
                    logger.error("Harvest notification failed for plan %s: %s", plan.id, exc)
            db.close()
        except Exception as exc:
            logger.error("Harvest checker error: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_harvest_checker_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Greenhouse Planning API",
    description="Платформа планування тепличного виробництва",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

from app.core.config import settings as _settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,           prefix="/auth",           tags=["Авторизація"])
app.include_router(greenhouses.router,    prefix="/greenhouses",    tags=["Теплиці"])
app.include_router(zones.router,          prefix="/zones",          tags=["Зони"])
app.include_router(farmer_plants.router,  prefix="/farmer-plants",  tags=["Рослини фермера"])
app.include_router(plants.router,         prefix="/plants",         tags=["Каталог культур"])
app.include_router(planting_plans.router, prefix="/planting-plans", tags=["Плани посадки"])
app.include_router(market_prices.router,  prefix="/market-prices",  tags=["Ринкові ціни"])
app.include_router(sensor_logs.router,    prefix="/sensor-logs",    tags=["Сенсори"])
app.include_router(news.router,           prefix="/news",           tags=["Новини"])
app.include_router(alerts.router,         prefix="/alerts",         tags=["Алерти"])
app.include_router(websocket.router,      tags=["WebSocket"])
app.include_router(floor_plans.router,    prefix="/greenhouses",    tags=["Планувальник"])
app.include_router(substrates.router,     prefix="/substrates",     tags=["Субстрати"])
app.include_router(financial.router,      prefix="/users/me",       tags=["Фінанси"])
app.include_router(admin.router,          prefix="/admin",          tags=["Адмін"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Greenhouse Planning API"}
