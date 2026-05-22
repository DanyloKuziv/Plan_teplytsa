"""add is_admin, harvest_notified, news price impact

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('planting_plans', sa.Column('harvest_notified', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('news_feed', sa.Column('summary', sa.Text(), nullable=True))
    op.add_column('news_feed', sa.Column('price_impact_pct', sa.Float(), nullable=True))
    op.add_column('news_feed', sa.Column('affected_plant_name', sa.String(200), nullable=True))


def downgrade():
    op.drop_column('news_feed', 'affected_plant_name')
    op.drop_column('news_feed', 'price_impact_pct')
    op.drop_column('news_feed', 'summary')
    op.drop_column('planting_plans', 'harvest_notified')
    op.drop_column('users', 'is_admin')
