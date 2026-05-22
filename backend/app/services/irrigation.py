import uuid
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.planting_plan import PlantingPlan
from app.models.irrigation_schedule import IrrigationSchedule
from app.models.fertilizer import GrowthPhase


# Phase boundaries as fraction of total grow_days
_PHASE_FRACTIONS = {
    GrowthPhase.seedling: (0.0, 0.15),
    GrowthPhase.growth: (0.15, 0.50),
    GrowthPhase.flowering: (0.50, 0.75),
    GrowthPhase.ripening: (0.75, 1.0),
}


def _phase_for_day(day_index: int, total_days: int) -> GrowthPhase:
    ratio = day_index / total_days
    for phase, (start, end) in _PHASE_FRACTIONS.items():
        if start <= ratio < end:
            return phase
    return GrowthPhase.ripening


def _water_rate(farmer_plant, phase: GrowthPhase) -> float:
    mapping = {
        GrowthPhase.seedling: farmer_plant.water_seedling,
        GrowthPhase.growth: farmer_plant.water_growth,
        GrowthPhase.flowering: farmer_plant.water_flowering,
        GrowthPhase.ripening: farmer_plant.water_ripening,
    }
    return mapping[phase]


def generate_irrigation_schedules(db: Session, plan: PlantingPlan) -> list[IrrigationSchedule]:
    """Generate daily irrigation records for the full growing cycle.

    Formula: V = area × water_rate × substrate_coefficient
    """
    farmer_plant = plan.farmer_plant
    substrate = plan.substrate
    grow_days = farmer_plant.plant.grow_days

    schedules: list[IrrigationSchedule] = []
    for day in range(grow_days):
        phase = _phase_for_day(day, grow_days)
        water_rate = _water_rate(farmer_plant, phase)
        volume = plan.area * water_rate * substrate.water_coefficient
        scheduled_date = plan.planted_at + timedelta(days=day)
        schedules.append(
            IrrigationSchedule(
                id=uuid.uuid4(),
                plan_id=plan.id,
                scheduled_date=scheduled_date,
                volume_liters=round(volume, 2),
                growth_phase=phase,
            )
        )

    db.add_all(schedules)
    return schedules
