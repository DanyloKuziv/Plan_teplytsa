import uuid
import random
import logging
from datetime import datetime
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.market_prices.fetch_market_prices")
def fetch_market_prices() -> dict:
    """Refresh market prices with ±10% variation from last known values.

    Scheduled daily at 06:00 via Celery Beat.
    Inserts new rows (keeps history); GET endpoint returns latest per plant+region.
    """
    from app.core.database import SessionLocal
    from app.models.market_price import MarketPrice
    from sqlalchemy import func

    db = SessionLocal()
    try:
        # Latest price per (plant_id, region)
        subq = (
            db.query(
                MarketPrice.plant_id,
                MarketPrice.region,
                func.max(MarketPrice.recorded_at).label("latest"),
            )
            .group_by(MarketPrice.plant_id, MarketPrice.region)
            .subquery()
        )
        latest_prices = (
            db.query(MarketPrice)
            .join(
                subq,
                (MarketPrice.plant_id == subq.c.plant_id)
                & (MarketPrice.region == subq.c.region)
                & (MarketPrice.recorded_at == subq.c.latest),
            )
            .all()
        )

        if not latest_prices:
            logger.warning("No existing market prices to update")
            return {"updated": 0}

        now = datetime.utcnow()
        new_rows = []
        for price in latest_prices:
            variation = random.uniform(-0.10, 0.10)
            new_price = max(1.0, round(price.price_per_kg * (1 + variation), 2))
            new_rows.append(
                MarketPrice(
                    id=uuid.uuid4(),
                    plant_id=price.plant_id,
                    region=price.region,
                    price_per_kg=new_price,
                    source_url=None,
                    recorded_at=now,
                )
            )

        db.add_all(new_rows)
        db.commit()
        logger.info("Market prices refreshed: %d entries updated", len(new_rows))
        return {"updated": len(new_rows), "at": now.isoformat()}

    except Exception as exc:
        db.rollback()
        logger.exception("Market price fetch failed")
        raise exc
    finally:
        db.close()
