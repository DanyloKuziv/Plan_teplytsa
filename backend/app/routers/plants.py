from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.plant import Plant
from app.models.user import User
from app.schemas.plant import PlantOut

router = APIRouter()


@router.get("/", response_model=list[PlantOut])
def list_plants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Plant).order_by(Plant.name).all()
