import uuid
from datetime import timedelta, date
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.greenhouse import Greenhouse
from app.models.zone import Zone
from app.models.planting_plan import PlantingPlan
from app.models.farmer_plant import FarmerPlant
from app.models.substrate import Substrate
from app.models.irrigation_schedule import IrrigationSchedule
from app.models.fertilizer_schedule import FertilizerSchedule
from app.models.harvest_record import HarvestRecord
from app.models.user import User
from app.schemas.planting_plan import (
    PlantingPlanCreate, PlantingPlanOut,
    PlantingPlanAccepted, PlanProgressOut,
)
from app.schemas.irrigation_schedule import IrrigationScheduleOut
from app.schemas.forecast import ForecastOut
from app.schemas.analytics import AnalyticsOut, ForecastSummary, HarvestActuals, Deviation
from app.services.yield_service import calculate_forecast


class PlantingPlanUpdate(BaseModel):
    substrate_id: uuid.UUID | None = None
    planted_at: date | None = None

router = APIRouter()


def _load_plan(plan_id: uuid.UUID, user: User, db: Session) -> PlantingPlan:
    plan = (
        db.query(PlantingPlan)
        .options(
            joinedload(PlantingPlan.farmer_plant).joinedload(FarmerPlant.plant),
            joinedload(PlantingPlan.substrate),
            joinedload(PlantingPlan.greenhouse),
        )
        .filter(PlantingPlan.id == plan_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Planting plan not found")
    gh = db.query(Greenhouse).filter(
        Greenhouse.id == plan.greenhouse_id, Greenhouse.user_id == user.id
    ).first()
    if not gh:
        raise HTTPException(status_code=403, detail="Access denied")
    return plan


@router.post(
    "/",
    response_model=PlantingPlanAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_planting_plan(
    payload: PlantingPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gh = db.query(Greenhouse).filter(
        Greenhouse.id == payload.greenhouse_id, Greenhouse.user_id == current_user.id
    ).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")

    zone = db.query(Zone).filter(
        Zone.id == payload.zone_id, Zone.greenhouse_id == payload.greenhouse_id
    ).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found in this greenhouse")

    farmer_plant = (
        db.query(FarmerPlant)
        .options(joinedload(FarmerPlant.plant))
        .filter(
            FarmerPlant.id == payload.farmer_plant_id,
            FarmerPlant.user_id == current_user.id,
        )
        .first()
    )
    if not farmer_plant:
        raise HTTPException(status_code=404, detail="Farmer plant not found")

    substrate = db.query(Substrate).filter_by(id=payload.substrate_id).first()
    if not substrate:
        raise HTTPException(status_code=404, detail="Substrate not found")

    grow_days = farmer_plant.plant.grow_days
    expected_harvest_at = payload.planted_at + timedelta(days=grow_days)

    plan = PlantingPlan(
        id=uuid.uuid4(),
        greenhouse_id=payload.greenhouse_id,
        zone_id=payload.zone_id,
        farmer_plant_id=payload.farmer_plant_id,
        substrate_id=payload.substrate_id,
        area=payload.area,
        planted_at=payload.planted_at,
        expected_harvest_at=expected_harvest_at,
        status="pending",
        irrigation_coverage=min(100.0, max(0.0, payload.irrigation_coverage_pct)),
        heating_coverage=min(100.0, max(0.0, payload.heating_coverage_pct)),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    plan_id_str = str(plan.id)
    try:
        from app.tasks.irrigation import generate_irrigation_schedules
        from app.tasks.fertilizer import generate_fertilizer_schedules
        generate_irrigation_schedules.delay(plan_id_str)
        generate_fertilizer_schedules.delay(plan_id_str)
    except Exception:
        # Redis unavailable — fall back to synchronous generation so the plan
        # is never left in an unrecoverable pending state without a worker.
        from app.services.irrigation import generate_irrigation_schedules as gen_irr
        from app.services.fertilizer_svc import generate_fertilizer_schedules as gen_fert
        plan.farmer_plant = farmer_plant
        plan.substrate = substrate
        gen_irr(db, plan)
        gen_fert(db, plan)
        plan.status = "ready"
        db.commit()

    return PlantingPlanAccepted(
        plan_id=plan.id,
        status=plan.status,
        expected_harvest_at=plan.expected_harvest_at,
    )


@router.get("/{plan_id}/status", response_model=PlanProgressOut)
def get_plan_status(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(PlantingPlan).filter(PlantingPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Planting plan not found")
    gh = db.query(Greenhouse).filter(
        Greenhouse.id == plan.greenhouse_id, Greenhouse.user_id == current_user.id
    ).first()
    if not gh:
        raise HTTPException(status_code=403, detail="Access denied")

    irr_count = db.query(IrrigationSchedule).filter(
        IrrigationSchedule.plan_id == plan_id
    ).count()
    fert_count = db.query(FertilizerSchedule).filter(
        FertilizerSchedule.plan_id == plan_id
    ).count()

    # Auto-finalize if both task outputs exist but status wasn't updated (race window)
    if plan.status == "pending" and irr_count > 0 and fert_count > 0:
        plan.status = "ready"
        db.commit()

    return PlanProgressOut(
        plan_id=plan_id,
        status=plan.status,
        progress={
            "irrigation_schedules": irr_count,
            "fertilizer_schedules": fert_count,
        },
    )


@router.get("/", response_model=list[PlantingPlanOut])
def list_planting_plans(
    greenhouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gh = db.query(Greenhouse).filter(
        Greenhouse.id == greenhouse_id, Greenhouse.user_id == current_user.id
    ).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    return (
        db.query(PlantingPlan)
        .options(
            joinedload(PlantingPlan.farmer_plant).joinedload(FarmerPlant.plant),
            joinedload(PlantingPlan.substrate),
        )
        .filter(PlantingPlan.greenhouse_id == greenhouse_id)
        .all()
    )


@router.get("/{plan_id}", response_model=PlantingPlanOut)
def get_planting_plan(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _load_plan(plan_id, current_user, db)


@router.get("/{plan_id}/irrigation-schedule", response_model=list[IrrigationScheduleOut])
def get_irrigation_schedule(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _load_plan(plan_id, current_user, db)
    return (
        db.query(IrrigationSchedule)
        .filter(IrrigationSchedule.plan_id == plan_id)
        .order_by(IrrigationSchedule.scheduled_date)
        .all()
    )


@router.get("/{plan_id}/forecast", response_model=ForecastOut)
def get_forecast(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _load_plan(plan_id, current_user, db)
    return calculate_forecast(db, plan)


@router.get("/{plan_id}/analytics", response_model=AnalyticsOut)
def get_analytics(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _load_plan(plan_id, current_user, db)
    forecast = calculate_forecast(db, plan)

    forecast_summary = ForecastSummary(
        expected_yield_kg=forecast.expected_yield_kg,
        expected_revenue_uah=forecast.revenue_uah,
        expected_costs_uah=forecast.total_costs_uah,
        expected_profit_uah=forecast.net_profit_uah,
    )

    records = db.query(HarvestRecord).filter(HarvestRecord.plan_id == plan_id).all()
    if not records:
        return AnalyticsOut(
            plan_id=str(plan_id),
            area_m2=plan.area,
            has_harvest_data=False,
            forecast=forecast_summary,
            actuals=None,
            deviation=None,
            accuracy_score=None,
        )

    actual_yield = sum(r.actual_yield_kg for r in records)
    actual_revenue = sum(r.revenue for r in records)
    actual_costs = sum(r.costs for r in records)
    actual_profit = actual_revenue - actual_costs

    yield_delta = actual_yield - forecast.expected_yield_kg
    yield_pct = (yield_delta / forecast.expected_yield_kg * 100) if forecast.expected_yield_kg else 0.0
    accuracy = max(0.0, 100.0 - abs(yield_pct))

    return AnalyticsOut(
        plan_id=str(plan_id),
        area_m2=plan.area,
        has_harvest_data=True,
        forecast=forecast_summary,
        actuals=HarvestActuals(
            records_count=len(records),
            actual_yield_kg=round(actual_yield, 2),
            actual_revenue_uah=round(actual_revenue, 2),
            actual_costs_uah=round(actual_costs, 2),
            actual_profit_uah=round(actual_profit, 2),
        ),
        deviation=Deviation(
            yield_kg=round(yield_delta, 2),
            yield_percent=round(yield_pct, 1),
            revenue_uah=round(actual_revenue - forecast.revenue_uah, 2),
            profit_uah=round(actual_profit - forecast.net_profit_uah, 2),
        ),
        accuracy_score=round(accuracy, 1),
    )


@router.patch("/{plan_id}", response_model=PlantingPlanOut)
def update_planting_plan(
    plan_id: uuid.UUID,
    payload: PlantingPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _load_plan(plan_id, current_user, db)
    if payload.substrate_id is not None:
        substrate = db.query(Substrate).filter_by(id=payload.substrate_id).first()
        if not substrate:
            raise HTTPException(status_code=404, detail="Substrate not found")
        plan.substrate_id = payload.substrate_id
    if payload.planted_at is not None:
        grow_days = plan.farmer_plant.plant.grow_days
        plan.planted_at = payload.planted_at
        plan.expected_harvest_at = payload.planted_at + timedelta(days=grow_days)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_planting_plan(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _load_plan(plan_id, current_user, db)
    db.delete(plan)
    db.commit()
