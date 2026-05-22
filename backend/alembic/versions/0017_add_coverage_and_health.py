"""Add irrigation/heating coverage to planting_plans; health score to greenhouses

Revision ID: 0017
Revises: 0016
Create Date: 2026-05-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("planting_plans", sa.Column(
        "irrigation_coverage", sa.Float, nullable=False, server_default="100"
    ))
    op.add_column("planting_plans", sa.Column(
        "heating_coverage", sa.Float, nullable=False, server_default="100"
    ))
    op.add_column("greenhouses", sa.Column(
        "last_health_score", sa.Float, nullable=True
    ))
    op.add_column("greenhouses", sa.Column(
        "last_health_updated", sa.DateTime, nullable=True
    ))


def downgrade() -> None:
    op.drop_column("planting_plans", "irrigation_coverage")
    op.drop_column("planting_plans", "heating_coverage")
    op.drop_column("greenhouses", "last_health_score")
    op.drop_column("greenhouses", "last_health_updated")
