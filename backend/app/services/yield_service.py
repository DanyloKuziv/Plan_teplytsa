from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.planting_plan import PlantingPlan
from app.models.irrigation_schedule import IrrigationSchedule
from app.models.fertilizer_schedule import FertilizerSchedule
from app.models.fertilizer import Fertilizer
from app.models.news_feed import NewsFeed
from app.services.heating import calculate_heating_cost
from app.schemas.forecast import ForecastOut, WaterCostBreakdown, SeedCostBreakdown, FertilizerCostBreakdown, HeatingCostBreakdown

_WATER_PRICE_PER_LITER = 0.05
_NEWS_LOOKBACK_DAYS = 30
_SEASON_DAYS = 210  # Oct–Apr heating season (7 months × 30 days)


def _news_price_impact(db: Session, plant_name: str) -> float:
    """Return sum of price_impact_pct for recent news matching plant_name. Clamped to ±60%."""
    cutoff = datetime.utcnow() - timedelta(days=_NEWS_LOOKBACK_DAYS)
    rows = (
        db.query(NewsFeed.price_impact_pct)
        .filter(
            NewsFeed.price_impact_pct.isnot(None),
            NewsFeed.published_at >= cutoff,
            NewsFeed.affected_plant_name.ilike(f"%{plant_name}%"),
        )
        .all()
    )
    total = sum(r.price_impact_pct for r in rows if r.price_impact_pct is not None)
    return max(-60.0, min(60.0, total))


def calculate_forecast(db: Session, plan: PlantingPlan) -> ForecastOut:
    farmer_plant = plan.farmer_plant
    greenhouse = plan.greenhouse

    substrate = plan.substrate
    yield_mod = substrate.yield_modifier if substrate else 1.0
    expected_yield_kg = plan.area * farmer_plant.yield_per_m2 * yield_mod

    # Equipment coverage penalties (stored at plan creation time)
    irr_cov  = getattr(plan, 'irrigation_coverage', 100.0) or 100.0
    heat_cov = getattr(plan, 'heating_coverage', 100.0) or 100.0
    irr_pen  = 0.85 if irr_cov < 80 else 1.0
    heat_pen = 0.90 if heat_cov < 70 else 1.0
    expected_yield_kg *= irr_pen * heat_pen

    base_revenue_uah = expected_yield_kg * farmer_plant.sell_price

    # News price adjustment
    plant_name = farmer_plant.plant.name if farmer_plant.plant else ""
    news_pct = _news_price_impact(db, plant_name) if plant_name else 0.0
    revenue_uah = base_revenue_uah * (1 + news_pct / 100)

    plants_per_m2    = farmer_plant.plant.plants_per_m2 if farmer_plant.plant else 4.0
    plants_count     = round(plan.area * plants_per_m2)
    seed_price_per_plant = farmer_plant.seed_price
    seed_cost_uah    = plants_count * seed_price_per_plant

    total_liters = (
        db.query(func.sum(IrrigationSchedule.volume_liters))
        .filter(IrrigationSchedule.plan_id == plan.id)
        .scalar() or 0.0
    )
    water_cost_uah = total_liters * _WATER_PRICE_PER_LITER

    fert_schedules = (
        db.query(FertilizerSchedule, Fertilizer)
        .join(Fertilizer, FertilizerSchedule.fertilizer_id == Fertilizer.id)
        .filter(FertilizerSchedule.plan_id == plan.id)
        .all()
    )
    total_grams = sum(fs.dose_grams for fs, _ in fert_schedules)
    fertilizer_cost_uah = sum(
        (fs.dose_grams / 1000) * fert.price_per_kg for fs, fert in fert_schedules
    )

    heating = calculate_heating_cost(greenhouse)
    area_ratio = plan.area / greenhouse.total_area if greenhouse.total_area else 1.0
    grow_days = farmer_plant.plant.grow_days if farmer_plant.plant else 30
    # Heating cost proportional to zone area and crop cycle length vs. full season
    heating_cost_uah = heating["cost_uah"] * area_ratio * (grow_days / _SEASON_DAYS)

    total_costs = water_cost_uah + seed_cost_uah + fertilizer_cost_uah + heating_cost_uah
    net_profit = revenue_uah - total_costs
    roi = (net_profit / total_costs * 100) if total_costs else 0.0

    return ForecastOut(
        area_m2=plan.area,
        expected_yield_kg=round(expected_yield_kg, 2),
        revenue_uah=round(revenue_uah, 2),
        news_price_impact_pct=round(news_pct, 1),
        water_cost=WaterCostBreakdown(
            total_liters=round(total_liters, 1),
            cost_uah=round(water_cost_uah, 2),
        ),
        seed_cost=SeedCostBreakdown(
            plants_count=plants_count,
            cost_uah=round(seed_cost_uah, 2),
            price_per_plant=seed_price_per_plant,
        ),
        fertilizer_cost=FertilizerCostBreakdown(
            total_grams=round(total_grams, 1),
            cost_uah=round(fertilizer_cost_uah, 2),
        ),
        heating_cost=HeatingCostBreakdown(
            season_kwh=round(heating["season_kwh"] * area_ratio * (grow_days / _SEASON_DAYS), 1),
            cost_uah=round(heating_cost_uah, 2),
        ),
        total_costs_uah=round(total_costs, 2),
        net_profit_uah=round(net_profit, 2),
        roi_percent=round(roi, 1),
    )
