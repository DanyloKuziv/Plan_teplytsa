import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.market_price import MarketPrice
from app.models.user import User
from app.schemas.market_price import MarketPriceOut

router = APIRouter()


@router.get("/", response_model=list[MarketPriceOut])
def get_market_prices(
    plant_id: uuid.UUID | None = Query(None),
    region: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(MarketPrice).options(joinedload(MarketPrice.plant))
    if plant_id:
        q = q.filter(MarketPrice.plant_id == plant_id)
    if region:
        q = q.filter(MarketPrice.region.ilike(f"%{region}%"))

    rows = q.order_by(MarketPrice.recorded_at.desc()).all()

    return [
        MarketPriceOut(
            id=m.id,
            plant_id=m.plant_id,
            plant_name=m.plant.name if m.plant else "—",
            region=m.region,
            price_per_kg=m.price_per_kg,
            source_url=m.source_url,
            recorded_at=m.recorded_at,
        )
        for m in rows
    ]
