#!/bin/bash
set -e

echo "=== Database migration ==="

if alembic upgrade head 2>&1; then
    echo "=== Migrations OK ==="
else
    echo "=== Migration failed — checking DB state ==="

    # Check if core tables exist (users table = schema was created)
    TABLES_EXIST=$(python3 - <<'PYEOF'
import os, sys
try:
    from sqlalchemy import create_engine, text
    url = os.environ.get("DATABASE_URL", "").replace("postgres://", "postgresql://", 1)
    engine = create_engine(url)
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name='users'"
        )).scalar()
        print("yes" if row and row > 0 else "no")
except Exception as e:
    print("no", file=sys.stderr)
    print("no")
PYEOF
)

    echo "=== Tables exist: $TABLES_EXIST ==="

    if [ "$TABLES_EXIST" = "yes" ]; then
        # Schema is intact but alembic_version is gone — just re-stamp
        echo "=== Schema intact, re-stamping alembic version ==="
        alembic stamp head
        echo "=== Stamp OK ==="
    else
        # Types exist but tables are missing — drop stale types and rebuild
        echo "=== Tables missing — dropping stale enum types and rebuilding ==="
        python3 - <<'PYEOF'
import os
from sqlalchemy import create_engine, text
url = os.environ.get("DATABASE_URL", "").replace("postgres://", "postgresql://", 1)
engine = create_engine(url)
with engine.connect() as conn:
    for t in ("heatingtype", "insulationtype", "growthphase", "alerttype"):
        try:
            conn.execute(text(f"DROP TYPE IF EXISTS {t} CASCADE"))
            print(f"Dropped type {t}")
        except Exception as e:
            print(f"Could not drop {t}: {e}")
    conn.commit()
PYEOF
        alembic upgrade head
        echo "=== Rebuilt schema OK ==="
    fi
fi

echo "=== Starting uvicorn ==="
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
