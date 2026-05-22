import uuid
from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.planting_plan import PlantingPlan
from app.models.fertilizer import Fertilizer, GrowthPhase
from app.models.fertilizer_schedule import FertilizerSchedule

# Apply fertilizer once per week during the matching phase
_PHASE_FRACTIONS = {
    GrowthPhase.seedling: (0.0, 0.15),
    GrowthPhase.growth: (0.15, 0.50),
    GrowthPhase.flowering: (0.50, 0.75),
    GrowthPhase.ripening: (0.75, 1.0),
}


def generate_fertilizer_schedules(db: Session, plan: PlantingPlan) -> list[FertilizerSchedule]:
    """Generate weekly fertilizer applications for each growth phase."""
    grow_days = plan.farmer_plant.plant.grow_days
    fertilizers = db.query(Fertilizer).all()

    schedules: list[FertilizerSchedule] = []
    for fertilizer in fertilizers:
        start_frac, end_frac = _PHASE_FRACTIONS[fertilizer.phase]
        phase_start = int(grow_days * start_frac)
        phase_end = int(grow_days * end_frac)

        # Weekly applications throughout the phase
        day = phase_start
        while day < phase_end:
            scheduled_date = plan.planted_at + timedelta(days=day)
            dose_grams = fertilizer.dose_per_m2 * plan.area
            schedules.append(
                FertilizerSchedule(
                    id=uuid.uuid4(),
                    plan_id=plan.id,
                    fertilizer_id=fertilizer.id,
                    scheduled_date=scheduled_date,
                    dose_grams=round(dose_grams, 1),
                    growth_phase=fertilizer.phase,
                )
            )
            day += 7

    db.add_all(schedules)
    return schedules
