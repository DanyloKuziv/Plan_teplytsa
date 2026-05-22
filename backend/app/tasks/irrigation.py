import uuid
import logging
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.irrigation.generate_irrigation_schedules",
    max_retries=3,
    default_retry_delay=10,
)
def generate_irrigation_schedules(self, plan_id: str) -> dict:
    """Generate daily irrigation schedules for a planting plan.

    Runs as a background task after plan creation.
    Sets plan.status = 'ready' if fertilizer schedules are also done.
    """
    from app.core.database import SessionLocal
    from app.models.planting_plan import PlantingPlan
    from app.models.farmer_plant import FarmerPlant
    from app.models.fertilizer_schedule import FertilizerSchedule
    from app.services.irrigation import generate_irrigation_schedules as gen_irrigation
    from sqlalchemy.orm import joinedload

    db = SessionLocal()
    try:
        plan = (
            db.query(PlantingPlan)
            .options(
                joinedload(PlantingPlan.farmer_plant).joinedload(FarmerPlant.plant),
                joinedload(PlantingPlan.substrate),
            )
            .filter(PlantingPlan.id == uuid.UUID(plan_id))
            .first()
        )
        if not plan:
            logger.error("Plan %s not found", plan_id)
            return {"status": "error", "plan_id": plan_id}

        gen_irrigation(db, plan)

        # Mark ready if fertilizer task already finished
        fert_done = db.query(FertilizerSchedule).filter(
            FertilizerSchedule.plan_id == plan.id
        ).first() is not None
        plan.status = "ready" if fert_done else "pending"

        db.commit()
        logger.info("Irrigation schedules generated for plan %s", plan_id)
        return {"status": "done", "plan_id": plan_id}

    except Exception as exc:
        db.rollback()
        logger.exception("Irrigation task failed for plan %s", plan_id)
        try:
            plan = db.query(PlantingPlan).filter(
                PlantingPlan.id == uuid.UUID(plan_id)
            ).first()
            if plan:
                plan.status = "error"
                db.commit()
        except Exception:
            pass
        raise self.retry(exc=exc)
    finally:
        db.close()
