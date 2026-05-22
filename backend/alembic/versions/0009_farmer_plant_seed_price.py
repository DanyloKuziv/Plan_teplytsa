"""add seed_price to farmer_plants

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None

# Realistic seed prices per plant (UAH), keyed by exact plant name
_SEED_PRICES = {
    'Редиска':             0.5,
    'Огірок тепличний':    1.5,
    'Томат (Черрі)':       2.0,
    'Салат листовий':      0.3,
    'Перець солодкий':     1.0,
    'Полуниця':            3.0,
    'Шпинат':              0.5,
    'Базилік':             0.5,
}


def upgrade():
    op.add_column('farmer_plants', sa.Column('seed_price', sa.Float(), nullable=False, server_default='2.0'))

    for name, price in _SEED_PRICES.items():
        op.execute(
            f"UPDATE farmer_plants SET seed_price = {price} "
            f"WHERE plant_id IN (SELECT id FROM plants WHERE name = '{name}')"
        )


def downgrade():
    op.drop_column('farmer_plants', 'seed_price')
