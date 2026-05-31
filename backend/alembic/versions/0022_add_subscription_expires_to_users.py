"""Add subscription_expires to users

Revision ID: 0022
Revises: 0021
Create Date: 2026-05-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("subscription_expires", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "subscription_expires")
