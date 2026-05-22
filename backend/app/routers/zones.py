import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.greenhouse import Greenhouse
from app.models.zone import Zone
from app.models.user import User
from app.schemas.zone import ZoneCreate, ZoneUpdate, ZoneOut

router = APIRouter()


def _assert_greenhouse_owner(greenhouse_id: uuid.UUID, user: User, db: Session):
    gh = db.query(Greenhouse).filter(Greenhouse.id == greenhouse_id, Greenhouse.user_id == user.id).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")


@router.get("/", response_model=list[ZoneOut])
def list_zones(greenhouse_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _assert_greenhouse_owner(greenhouse_id, current_user, db)
    return db.query(Zone).filter(Zone.greenhouse_id == greenhouse_id).all()


@router.post("/", response_model=ZoneOut, status_code=status.HTTP_201_CREATED)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _assert_greenhouse_owner(payload.greenhouse_id, current_user, db)
    zone = Zone(id=uuid.uuid4(), **payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    _assert_greenhouse_owner(zone.greenhouse_id, current_user, db)
    return zone


@router.patch("/{zone_id}", response_model=ZoneOut)
def update_zone(zone_id: uuid.UUID, payload: ZoneUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    _assert_greenhouse_owner(zone.greenhouse_id, current_user, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(zone, field, value)
    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    _assert_greenhouse_owner(zone.greenhouse_id, current_user, db)
    db.delete(zone)
    db.commit()
