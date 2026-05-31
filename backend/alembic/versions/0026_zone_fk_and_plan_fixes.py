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

    # Null out any zone.farmer_plant_id values that no longer exist in farmer_plants
    conn.execute(sa.text("""
        UPDATE zones
        SET farmer_plant_id = NULL
        WHERE farmer_plant_id IS NOT NULL
          AND farmer_plant_id NOT IN (SELECT id FROM farmer_plants)
    """))

    # Add the FK constraint now that orphan rows are cleaned up
    # SQLite doesn't support ADD CONSTRAINT — check dialect
    dialect = conn.dialect.name
    if dialect != "sqlite":
        op.create_foreign_key(
            "fk_zones_farmer_plant_id",
            "zones", "farmer_plants",
            ["farmer_plant_id"], ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect != "sqlite":
        op.drop_constraint("fk_zones_farmer_plant_id", "zones", type_="foreignkey")
