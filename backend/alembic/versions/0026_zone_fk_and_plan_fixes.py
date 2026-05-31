"""Add FK on zone.farmer_plant_id; clean orphan zone references

Revision ID: 0026
Revises: 0025
Create Date: 2026-05-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0026"
down_revision: Union[str, None] = "0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Null out orphan zone.farmer_plant_id references
    conn.execute(sa.text("""
        UPDATE zones
        SET farmer_plant_id = NULL
        WHERE farmer_plant_id IS NOT NULL
          AND farmer_plant_id::text NOT IN (SELECT id::text FROM farmer_plants)
    """))

    if dialect == "sqlite":
        return

    # Check if the FK constraint already exists before creating it
    exists = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_zones_farmer_plant_id'
          AND table_name = 'zones'
    """)).fetchone()

    # Ensure the column is UUID type before adding FK
    col_type = conn.execute(sa.text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'zones' AND column_name = 'farmer_plant_id'
    """)).scalar()

    if col_type and col_type.lower() != 'uuid':
        conn.execute(sa.text(
            "ALTER TABLE zones ALTER COLUMN farmer_plant_id TYPE uuid USING farmer_plant_id::uuid"
        ))

    if not exists:
        op.create_foreign_key(
            "fk_zones_farmer_plant_id",
            "zones", "farmer_plants",
            ["farmer_plant_id"], ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "sqlite":
        return
    try:
        op.drop_constraint("fk_zones_farmer_plant_id", "zones", type_="foreignkey")
    except Exception:
        pass
