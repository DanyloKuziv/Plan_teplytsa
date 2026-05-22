"""Add greenhouse_floor_plans table

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "greenhouse_floor_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "greenhouse_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("greenhouses.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("grid_data", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("equipment", sa.JSON, nullable=False, server_default="[]"),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_floor_plans_greenhouse_id", "greenhouse_floor_plans", ["greenhouse_id"])


def downgrade() -> None:
    op.drop_table("greenhouse_floor_plans")
