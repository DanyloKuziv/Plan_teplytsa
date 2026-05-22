from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.greenhouse import Greenhouse
from app.models.planting_plan import PlantingPlan
from app.models.farmer_plant import FarmerPlant
from app.models.user import User
from app.services.yield_service import calculate_forecast

router = APIRouter()


class CostBreakdown(BaseModel):
    water: float
    seeds: float
    fertilizers: float
    heating: float
    total: float


class FinancialSummary(BaseModel):
    plans_count: int
    total_area_m2: float
    total_yield_kg: float
    total_revenue_uah: float
    costs: CostBreakdown
    net_profit_uah: float
    roi_percent: float


@router.get("/financial-summary", response_model=FinancialSummary)
def get_financial_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    greenhouses = db.query(Greenhouse).filter(
        Greenhouse.user_id == current_user.id
    ).all()
    gh_ids = [gh.id for gh in greenhouses]

    if not gh_ids:
        return _zero_summary()

    plans = (
        db.query(PlantingPlan)
        .options(
            joinedload(PlantingPlan.farmer_plant).joinedload(FarmerPlant.plant),
            joinedload(PlantingPlan.substrate),
            joinedload(PlantingPlan.greenhouse),
        )
        .filter(
            PlantingPlan.greenhouse_id.in_(gh_ids),
            PlantingPlan.status == "ready",
        )
        .all()
    )

    if not plans:
        return _zero_summary()

    total_area = 0.0
    total_yield = 0.0
    total_revenue = 0.0
    total_water = 0.0
    total_seeds = 0.0
    total_fertilizer = 0.0
    total_heating = 0.0

    for plan in plans:
        try:
            f = calculate_forecast(db, plan)
        except Exception:
            continue
        total_area += f.area_m2
        total_yield += f.expected_yield_kg
        total_revenue += f.revenue_uah
        total_water += f.water_cost.cost_uah
        total_seeds += f.seed_cost.cost_uah
        total_fertilizer += f.fertilizer_cost.cost_uah
        total_heating += f.heating_cost.cost_uah

    total_costs = total_water + total_seeds + total_fertilizer + total_heating
    net_profit = total_revenue - total_costs
    roi = round((net_profit / total_costs * 100), 1) if total_costs else 0.0

    return FinancialSummary(
        plans_count=len(plans),
        total_area_m2=round(total_area, 2),
        total_yield_kg=round(total_yield, 2),
        total_revenue_uah=round(total_revenue, 2),
        costs=CostBreakdown(
            water=round(total_water, 2),
            seeds=round(total_seeds, 2),
            fertilizers=round(total_fertilizer, 2),
            heating=round(total_heating, 2),
            total=round(total_costs, 2),
        ),
        net_profit_uah=round(net_profit, 2),
        roi_percent=roi,
    )


def _zero_summary() -> FinancialSummary:
    return FinancialSummary(
        plans_count=0,
        total_area_m2=0.0,
        total_yield_kg=0.0,
        total_revenue_uah=0.0,
        costs=CostBreakdown(water=0, seeds=0, fertilizers=0, heating=0, total=0),
        net_profit_uah=0.0,
        roi_percent=0.0,
    )
