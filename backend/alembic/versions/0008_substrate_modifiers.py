"""add growth_modifier and yield_modifier to substrates

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('substrates', sa.Column('growth_modifier', sa.Float(), nullable=False, server_default='1.0'))
    op.add_column('substrates', sa.Column('yield_modifier',  sa.Float(), nullable=False, server_default='1.0'))

    # Ґрунт — базовий субстрат, без бонусів
    op.execute("UPDATE substrates SET growth_modifier=1.0,  yield_modifier=1.0  WHERE name='Ґрунт'")

    # Кокосовий субстрат — краща аерація та вологоутримання
    op.execute("UPDATE substrates SET growth_modifier=1.15, yield_modifier=1.20 WHERE name='Кокосовий субстрат'")

    # Гідропоніка — оптимальне живлення, швидший ріст, найвищий врожай
    op.execute("UPDATE substrates SET growth_modifier=1.30, yield_modifier=1.40 WHERE name='Гідропоніка'")


def downgrade():
    op.drop_column('substrates', 'growth_modifier')
    op.drop_column('substrates', 'yield_modifier')
