import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, subqueryload
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.greenhouse import Greenhouse
from app.models.planting_plan import PlantingPlan
from app.models.alert import Alert
from app.models.plant import Plant
from app.models.news_feed import NewsFeed
from app.models.sensor_log import SensorLog
from app.models.harvest_record import HarvestRecord
from app.models.planting_plan import PlantingPlan as _PlantingPlan
from app.schemas.news_feed import NewsFeedCreate, NewsFeedUpdate, NewsFeedOut

router = APIRouter()

SUPERADMIN_EMAIL = "danakuz150@gmail.com"


class AdminTokenPayload(BaseModel):
    password: str

@router.post("/token")
def admin_token(payload: AdminTokenPayload):
    from app.core.config import settings
    from app.core.security import create_access_token
    if payload.password != settings.ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Невірний пароль")
    token = create_access_token({"sub": "admin", "email": SUPERADMIN_EMAIL, "is_admin": True, "full_name": "Admin"})
    return {"access_token": token, "token_type": "bearer"}


from fastapi.security import OAuth2PasswordBearer as _OAuth2
from jose import jwt as _jwt, JWTError as _JWTError

_oauth2 = _OAuth2(tokenUrl="/auth/login", auto_error=False)

def _require_admin(token: str = Depends(_oauth2), db: Session = Depends(get_db)) -> User:
    exc = HTTPException(status_code=403, detail="Admin access required")
    if not token:
        raise exc
    try:
        from app.core.config import settings as _s
        payload = _jwt.decode(token, _s.SECRET_KEY, algorithms=[_s.ALGORITHM])
    except _JWTError:
        raise exc
    # Token issued by /admin/token has sub="admin" and is_admin=True
    if payload.get("sub") == "admin" and payload.get("is_admin"):
        return None  # no DB user needed
    # Regular user token — verify in DB
    if not payload.get("is_admin"):
        raise exc
    import uuid as _uuid
    try:
        user = db.query(User).filter(User.id == _uuid.UUID(payload["sub"])).first()
    except Exception:
        raise exc
    if not user or user.email.lower() != SUPERADMIN_EMAIL:
        raise exc
    return user


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    total_users       = db.query(User).count()
    verified_users    = db.query(User).filter(User.is_verified.is_(True)).count()
    total_greenhouses = db.query(Greenhouse).count()
    total_plans       = db.query(PlantingPlan).count()
    total_alerts      = db.query(Alert).count()
    unread_alerts     = db.query(Alert).filter(Alert.is_read.is_(False)).count()
    total_sensor_logs = db.query(SensorLog).count()
    revenue_sum = db.query(func.sum(HarvestRecord.revenue)).scalar() or 0.0

    return {
        "users":         {"total": total_users,       "verified": verified_users},
        "greenhouses":   {"total": total_greenhouses},
        "plans":         {"total": total_plans},
        "alerts":        {"total": total_alerts,       "unread": unread_alerts},
        "sensor_logs":   {"total": total_sensor_logs},
        "revenue_uah":   round(revenue_sum, 2),
    }


# ── Users ─────────────────────────────────────────────────────────────────────
@router.get("/users")
def admin_list_users(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    users = (
        db.query(User)
        .options(subqueryload(User.greenhouses).subqueryload(Greenhouse.planting_plans))
        .order_by(User.created_at.desc())
        .all()
    )
    result = []
    for u in users:
        plans_count = sum(len(g.planting_plans) for g in u.greenhouses)
        revenue = (
            db.query(func.sum(HarvestRecord.revenue))
            .join(_PlantingPlan, HarvestRecord.plan_id == _PlantingPlan.id)
            .join(Greenhouse, _PlantingPlan.greenhouse_id == Greenhouse.id)
            .filter(Greenhouse.user_id == u.id)
            .scalar() or 0.0
        )
        result.append({
            "id":                   str(u.id),
            "email":                u.email,
            "full_name":            u.full_name,
            "is_verified":          u.is_verified,
            "is_admin":             u.is_admin,
            "created_at":           u.created_at.isoformat(),
            "greenhouse_count":     len(u.greenhouses),
            "plans_count":          plans_count,
            "revenue_uah":          round(revenue, 2),
            "subscription_expires": u.subscription_expires.isoformat() if u.subscription_expires else None,
        })
    return result


class SubscriptionPayload(BaseModel):
    subscription_expires: Optional[str] = None


@router.patch("/users/{user_id}/subscription")
def set_subscription(user_id: uuid.UUID, payload: SubscriptionPayload, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.subscription_expires = datetime.fromisoformat(payload.subscription_expires) if payload.subscription_expires else None
    db.commit()
    return {"id": str(user.id), "subscription_expires": user.subscription_expires.isoformat() if user.subscription_expires else None}


@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin(user_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email.lower() == SUPERADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot modify superadmin role")
    user.is_admin = not user.is_admin
    db.commit()
    return {"id": str(user.id), "is_admin": user.is_admin}


@router.delete("/users/{user_id}", status_code=204)
def admin_delete_user(user_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email.lower() == SUPERADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Cannot delete superadmin")
    db.delete(user)
    db.commit()


# ── Greenhouses ───────────────────────────────────────────────────────────────
@router.get("/greenhouses")
def admin_list_greenhouses(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    ghs = db.query(Greenhouse).options(joinedload(Greenhouse.user)).all()
    return [
        {
            "id":         str(g.id),
            "name":       g.name,
            "total_area": g.total_area,
            "owner_email": g.user.email if g.user else None,
            "owner_name":  g.user.full_name if g.user else None,
            "plans_count": len(g.planting_plans) if hasattr(g, 'planting_plans') else 0,
        }
        for g in ghs
    ]


# ── Alerts ────────────────────────────────────────────────────────────────────
@router.get("/alerts")
def admin_list_alerts(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    alerts = (
        db.query(Alert)
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":           str(a.id),
            "greenhouse_id": str(a.greenhouse_id),
            "type":         a.type.value,
            "message":      a.message,
            "is_read":      a.is_read,
            "created_at":   a.created_at.isoformat(),
        }
        for a in alerts
    ]


# ── Plants (cultures) ─────────────────────────────────────────────────────────
class PlantCreate(BaseModel):
    name: str
    category: str = ""
    grow_days: int = 60
    plants_per_m2: float = 4.0
    seed_weight_g: float = 0.01
    description: str | None = None

class PlantUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    grow_days: int | None = None
    plants_per_m2: float | None = None
    seed_weight_g: float | None = None
    description: str | None = None


@router.get("/plants")
def admin_list_plants(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    return db.query(Plant).order_by(Plant.name).all()


@router.post("/plants", status_code=201)
def admin_create_plant(payload: PlantCreate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    plant = Plant(
        id=uuid.uuid4(),
        name=payload.name,
        category=payload.category or "",
        grow_days=payload.grow_days,
        plants_per_m2=payload.plants_per_m2,
        seed_weight_g=payload.seed_weight_g,
        description=payload.description,
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


@router.patch("/plants/{plant_id}")
def admin_update_plant(plant_id: uuid.UUID, payload: PlantUpdate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(plant, k, v)
    db.commit()
    db.refresh(plant)
    return plant


@router.delete("/plants/{plant_id}", status_code=204)
def admin_delete_plant(plant_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    plant = db.query(Plant).filter(Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    db.delete(plant)
    db.commit()


# ── News ──────────────────────────────────────────────────────────────────────
@router.get("/news", response_model=list[NewsFeedOut])
def admin_list_news(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    return db.query(NewsFeed).order_by(NewsFeed.published_at.desc()).limit(100).all()


@router.post("/news", response_model=NewsFeedOut, status_code=201)
def admin_create_news(payload: NewsFeedCreate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    item = NewsFeed(id=uuid.uuid4(), **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/news/{news_id}", response_model=NewsFeedOut)
def admin_update_news(news_id: uuid.UUID, payload: NewsFeedUpdate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    item = db.query(NewsFeed).filter(NewsFeed.id == news_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/news/{news_id}", status_code=204)
def admin_delete_news(news_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    item = db.query(NewsFeed).filter(NewsFeed.id == news_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="News not found")
    db.delete(item)
    db.commit()
