"""Add status column to planting_plans

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing rows were created synchronously → already "ready"
    op.add_column(
        "planting_plans",
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="ready",
        ),
    )


def downgrade() -> None:
    op.drop_column("planting_plans", "status")
