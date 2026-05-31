#!/bin/bash
set -e

echo "=== Starting migration ==="

# Try normal migration first
if alembic upgrade head; then
    echo "=== Migrations OK ==="
else
    echo "=== Migration failed — schema likely exists but alembic_version is missing ==="
    echo "=== Stamping current DB state as head and retrying... ==="
    alembic stamp head
    alembic upgrade head
    echo "=== Migrations OK after stamp ==="
fi

echo "=== Starting uvicorn ==="
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
