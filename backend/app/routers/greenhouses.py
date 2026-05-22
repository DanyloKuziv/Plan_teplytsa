import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.greenhouse import Greenhouse
from app.models.user import User
from app.schemas.greenhouse import GreenhouseCreate, GreenhouseUpdate, GreenhouseOut

router = APIRouter()


def _get_owned(greenhouse_id: uuid.UUID, user: User, db: Session) -> Greenhouse:
    gh = db.query(Greenhouse).filter(Greenhouse.id == greenhouse_id, Greenhouse.user_id == user.id).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    return gh


@router.get("/", response_model=list[GreenhouseOut])
def list_greenhouses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Greenhouse).filter(Greenhouse.user_id == current_user.id).all()


@router.post("/", response_model=GreenhouseOut, status_code=status.HTTP_201_CREATED)
def create_greenhouse(payload: GreenhouseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gh = Greenhouse(id=uuid.uuid4(), user_id=current_user.id, **payload.model_dump())
    db.add(gh)
    db.commit()
    db.refresh(gh)
    return gh


@router.get("/{greenhouse_id}", response_model=GreenhouseOut)
def get_greenhouse(greenhouse_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_owned(greenhouse_id, current_user, db)


@router.patch("/{greenhouse_id}", response_model=GreenhouseOut)
def update_greenhouse(greenhouse_id: uuid.UUID, payload: GreenhouseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gh = _get_owned(greenhouse_id, current_user, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(gh, field, value)
    db.commit()
    db.refresh(gh)
    return gh


@router.delete("/{greenhouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_greenhouse(greenhouse_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gh = _get_owned(greenhouse_id, current_user, db)
    db.delete(gh)
    db.commit()
