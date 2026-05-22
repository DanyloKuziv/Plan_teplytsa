"""Add light_lux column to sensor_logs

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sensor_logs", sa.Column("light_lux", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("sensor_logs", "light_lux")
