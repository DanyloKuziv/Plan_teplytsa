#!/bin/bash
set -e

echo "=== Checking DB state before migration ==="

python3 - <<'PYEOF'
import os, sys
from sqlalchemy import create_engine, text

url = os.environ.get("DATABASE_URL", "").replace("postgres://", "postgresql://", 1)
if not url or "postgresql" not in url:
    print("No PostgreSQL URL found, skipping repair check")
    sys.exit(0)

engine = create_engine(url)

with engine.connect() as conn:
    # Check if users table actually exists
    users_exist = conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name='users'"
    )).scalar()

    if users_exist:
        print("=== DB schema looks intact ===")
        sys.exit(0)

    print("=== Tables missing — resetting alembic_version and cleaning enum types ===")

    # Drop alembic_version so migrations run from scratch
    try:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
        print("Dropped alembic_version")
    except Exception as e:
        print(f"Could not drop alembic_version: {e}")
        conn.rollback()

    # Drop stale ENUM types that block migration 0001
    for t in ("heatingtype", "insulationtype", "growthphase", "alerttype", "growthphase"):
        try:
            conn.execute(text(f"DROP TYPE IF EXISTS {t} CASCADE"))
            conn.commit()
            print(f"Dropped type: {t}")
        except Exception as e:
            print(f"Could not drop type {t}: {e}")
            try:
                conn.rollback()
            except:
                pass
PYEOF

echo "=== Running migrations ==="
alembic upgrade head
echo "=== Migrations OK ==="

echo "=== Starting uvicorn ==="
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
