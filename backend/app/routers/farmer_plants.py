import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.farmer_plant import FarmerPlant
from app.models.user import User
from app.schemas.farmer_plant import FarmerPlantCreate, FarmerPlantUpdate, FarmerPlantOut

router = APIRouter()


@router.get("/", response_model=list[FarmerPlantOut])
def list_farmer_plants(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(FarmerPlant)
        .options(joinedload(FarmerPlant.plant))
        .filter(FarmerPlant.user_id == current_user.id)
        .all()
    )


@router.post("/", response_model=FarmerPlantOut, status_code=status.HTTP_201_CREATED)
def create_farmer_plant(payload: FarmerPlantCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fp = FarmerPlant(id=uuid.uuid4(), user_id=current_user.id, **payload.model_dump())
    db.add(fp)
    db.commit()
    db.refresh(fp)
    return db.query(FarmerPlant).options(joinedload(FarmerPlant.plant)).filter(FarmerPlant.id == fp.id).first()


@router.get("/{fp_id}", response_model=FarmerPlantOut)
def get_farmer_plant(fp_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fp = db.query(FarmerPlant).options(joinedload(FarmerPlant.plant)).filter(
        FarmerPlant.id == fp_id, FarmerPlant.user_id == current_user.id
    ).first()
    if not fp:
        raise HTTPException(status_code=404, detail="Farmer plant not found")
    return fp


@router.patch("/{fp_id}", response_model=FarmerPlantOut)
def update_farmer_plant(fp_id: uuid.UUID, payload: FarmerPlantUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fp = db.query(FarmerPlant).filter(FarmerPlant.id == fp_id, FarmerPlant.user_id == current_user.id).first()
    if not fp:
        raise HTTPException(status_code=404, detail="Farmer plant not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(fp, field, value)
    db.commit()
    db.refresh(fp)
    return fp


@router.delete("/{fp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farmer_plant(fp_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fp = db.query(FarmerPlant).filter(FarmerPlant.id == fp_id, FarmerPlant.user_id == current_user.id).first()
    if not fp:
        raise HTTPException(status_code=404, detail="Farmer plant not found")
    db.delete(fp)
    db.commit()
