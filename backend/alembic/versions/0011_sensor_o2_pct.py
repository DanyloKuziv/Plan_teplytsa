"""add o2_pct column to sensor_logs

Revision ID: 0011
Revises: 0010
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('sensor_logs', sa.Column('o2_pct', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('sensor_logs', 'o2_pct')
