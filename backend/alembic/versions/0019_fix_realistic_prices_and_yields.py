"""Fix realistic prices and yields based on Ukrainian market research 2026

Revision ID: 0019
Revises: 0018
Create Date: 2026-05-24
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Огірок тепличний
    # Retail: 125-210 UAH/kg → farm gate ~65 UAH/kg
    # Yield basic greenhouse: 10-15 kg/m²/cycle → 12 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 12, sell_price = 65
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Огірок тепличний')
    """))

    # Томат (Черрі)
    # Retail: 120-180 UAH/kg → farm gate ~80 UAH/kg
    # Yield: 10-15 kg/m²/cycle → 11 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 11, sell_price = 80
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Томат (Черрі)')
    """))

    # Перець солодкий
    # Retail: 80-180 UAH/kg → farm gate ~65 UAH/kg
    # Yield: 8-10 kg/m²/cycle → 8 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 8, sell_price = 65
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Перець солодкий')
    """))

    # Салат листовий
    # Retail: 40-80 UAH/kg → farm gate ~50 UAH/kg
    # Yield: 3-5 kg/m²/cycle → 4 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 4, sell_price = 50
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Салат листовий')
    """))

    # Полуниця
    # Retail: 170-280 UAH/kg → farm gate ~180 UAH/kg
    # Yield basic greenhouse: 5-8 kg/m²/cycle → 6 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 6, sell_price = 180
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Полуниця')
    """))

    # Тюльпани (ціна за стебло ~35 UAH, 20 стебел/м²)
    # Представляємо як: yield=20 "одиниць"/м², sell_price=35 UAH/одиниця
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 20, sell_price = 35
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Тюльпани')
    """))
    conn.execute(sa.text(
        "UPDATE plants SET plants_per_m2 = 20 WHERE name = 'Тюльпани'"
    ))

    # Базилік
    # Retail: 150-200 UAH/kg → farm gate ~160 UAH/kg
    # Yield: 2-4 kg/m²/cycle → 3 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 3, sell_price = 160
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Базилік')
    """))

    # Редиска
    # Retail: 40-60 UAH/kg → farm gate ~40 UAH/kg
    # Yield: 1.5-2.5 kg/m²/cycle → 2 kg/m²
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 2, sell_price = 40
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Редиска')
    """))


def downgrade() -> None:
    pass
