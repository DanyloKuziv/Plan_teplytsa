import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.greenhouse import Greenhouse
from app.models.floor_plan import GreenhouseFloorPlan
from app.models.zone import Zone
from app.models.user import User
from app.schemas.floor_plan import FloorPlanSave

router = APIRouter()


def _assert_owner(greenhouse_id: uuid.UUID, user: User, db: Session) -> Greenhouse:
    gh = db.query(Greenhouse).filter(
        Greenhouse.id == greenhouse_id, Greenhouse.user_id == user.id
    ).first()
    if not gh:
        raise HTTPException(status_code=404, detail="Greenhouse not found")
    return gh


def _parse_stored(plan: GreenhouseFloorPlan) -> dict:
    """Normalize stored grid_data to {cells, zones} regardless of format."""
    raw = plan.grid_data

    if isinstance(raw, dict) and "cells" in raw:
        return {
            "cells": raw.get("cells", {}),
            "zones": raw.get("zones", {}),
            "equip": plan.equipment or [],
        }

    if isinstance(raw, list):
        # Legacy format: list of cell objects [{col, row, type, colorIdx, zoneId}]
        cells = {}
        zones: dict[str, list[str]] = {}
        for cell in raw:
            col, row = cell.get("col", 0), cell.get("row", 0)
            key = f"{col},{row}"
            cells[key] = "wall"
            zone_id = cell.get("zoneId")
            if zone_id:
                zones.setdefault(zone_id, []).append(key)
        return {"cells": cells, "zones": zones, "equip": plan.equipment or []}

    # Unknown / empty
    return {"cells": {}, "zones": {}, "equip": plan.equipment or []}


def _build_response(plan: GreenhouseFloorPlan) -> dict:
    parsed = _parse_stored(plan)
    return {
        "id": str(plan.id),
        "greenhouse_id": str(plan.greenhouse_id),
        "grid_data": parsed["cells"],
        "equipment": parsed["equip"],
        "zones_on_grid": parsed["zones"],
        "updated_at": plan.updated_at.isoformat(),
    }


@router.get("/{greenhouse_id}/floor-plan")
def get_floor_plan(
    greenhouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_owner(greenhouse_id, current_user, db)
    plan = db.query(GreenhouseFloorPlan).filter(
        GreenhouseFloorPlan.greenhouse_id == greenhouse_id
    ).first()
    return _build_response(plan) if plan else None


@router.post("/{greenhouse_id}/floor-plan")
def save_floor_plan(
    greenhouse_id: uuid.UUID,
    payload: FloorPlanSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_owner(greenhouse_id, current_user, db)

    # Update each zone's area from cell count
    for zone_id_str, cell_keys in payload.zones_on_grid.items():
        try:
            zone_id = uuid.UUID(zone_id_str)
        except ValueError:
            continue
        zone = db.query(Zone).filter(Zone.id == zone_id).first()
        if zone:
            zone.area = round(float(len(cell_keys)) * 0.5, 1)

    stored = {
        "cells": payload.grid_data,
        "zones": payload.zones_on_grid,
    }

    existing = db.query(GreenhouseFloorPlan).filter(
        GreenhouseFloorPlan.greenhouse_id == greenhouse_id
    ).first()

    if existing:
        existing.grid_data = stored
        existing.equipment = payload.equipment
        existing.updated_at = datetime.utcnow()
    else:
        existing = GreenhouseFloorPlan(
            id=uuid.uuid4(),
            greenhouse_id=greenhouse_id,
            grid_data=stored,
            equipment=payload.equipment,
            updated_at=datetime.utcnow(),
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return _build_response(existing)
