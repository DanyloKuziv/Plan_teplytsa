from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.substrate import Substrate

router = APIRouter()


@router.get("/")
def list_substrates(db: Session = Depends(get_db)):
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "water_coefficient": s.water_coefficient,
            "growth_modifier": s.growth_modifier,
            "yield_modifier": s.yield_modifier,
        }
        for s in db.query(Substrate).order_by(Substrate.name).all()
    ]
