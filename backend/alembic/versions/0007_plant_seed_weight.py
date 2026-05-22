"""add seed_weight_g to plants, fix yield_per_m2 values

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('plants', sa.Column('seed_weight_g', sa.Float(), nullable=False, server_default='0.01'))

    # Realistic seed weights (g per seed)
    op.execute("UPDATE plants SET seed_weight_g = 0.003 WHERE name = 'Томат (Черрі)'")
    op.execute("UPDATE plants SET seed_weight_g = 0.025 WHERE name = 'Огірок тепличний'")
    op.execute("UPDATE plants SET seed_weight_g = 0.001 WHERE name = 'Салат листовий'")
    op.execute("UPDATE plants SET seed_weight_g = 0.006 WHERE name = 'Перець солодкий'")
    op.execute("UPDATE plants SET seed_weight_g = 0.001 WHERE name = 'Базилік'")
    op.execute("UPDATE plants SET seed_weight_g = 0.009 WHERE name = 'Редиска'")
    op.execute("UPDATE plants SET seed_weight_g = 0.002 WHERE name = 'Шпинат'")
    op.execute("UPDATE plants SET seed_weight_g = 0.0   WHERE name = 'Полуниця'")   # розсада

    # Fix yield_per_m2 in farmer_plants to realistic values
    # Tomato cherry: 5-8 kg/m²
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 6.5
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Томат (Черрі)')
    """)
    # Cucumber: 18-25 kg/m² per season
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 22.0
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Огірок тепличний')
    """)
    # Lettuce: 3-5 kg/m²
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 4.0
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Салат листовий')
    """)
    # Pepper: 4-7 kg/m²
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 5.5
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Перець солодкий')
    """)
    # Basil: 1.5-2.5 kg/m²
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 2.0
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Базилік')
    """)
    # Radish: 1.0-2.0 kg/m² per crop cycle
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 1.5
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Редиска')
    """)
    # Strawberry: 2-4 kg/m²
    op.execute("""
        UPDATE farmer_plants SET yield_per_m2 = 3.0
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Полуниця')
    """)


def downgrade():
    op.drop_column('plants', 'seed_weight_g')
