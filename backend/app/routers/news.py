from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.news_feed import NewsFeed
from app.models.user import User
from app.schemas.news_feed import NewsFeedOut

router = APIRouter()


@router.get("/", response_model=list[NewsFeedOut])
def get_news(
    category: str | None = Query(None),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(NewsFeed)
    if category:
        q = q.filter(NewsFeed.category.ilike(f"%{category}%"))
    return q.order_by(NewsFeed.published_at.desc()).limit(limit).all()
