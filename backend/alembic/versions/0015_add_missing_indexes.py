"""add missing FK indexes for performance

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-09
"""
from alembic import op

revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index('ix_planting_plans_farmer_plant_id', 'planting_plans', ['farmer_plant_id'])
    op.create_index('ix_planting_plans_substrate_id',    'planting_plans', ['substrate_id'])
    op.create_index('ix_fertilizer_schedules_fertilizer_id', 'fertilizer_schedules', ['fertilizer_id'])


def downgrade():
    op.drop_index('ix_planting_plans_farmer_plant_id', table_name='planting_plans')
    op.drop_index('ix_planting_plans_substrate_id',    table_name='planting_plans')
    op.drop_index('ix_fertilizer_schedules_fertilizer_id', table_name='fertilizer_schedules')
