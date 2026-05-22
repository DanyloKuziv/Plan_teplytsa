"""Fix catalog mismatches: coconut yield_mod, cucumber grow_days, pepper/tulip water rates

Revision ID: 0018
Revises: 0017
Create Date: 2026-05-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Кокосовий субстрат: yield_modifier 1.2 → 1.1
    conn.execute(sa.text(
        "UPDATE substrates SET yield_modifier = 1.1 WHERE name = 'Кокосовий субстрат'"
    ))

    # 2. Огірок тепличний: grow_days 90 → 60
    conn.execute(sa.text(
        "UPDATE plants SET grow_days = 60 WHERE name = 'Огірок тепличний'"
    ))

    # 3. Перець солодкий farmer_plants: water rates
    conn.execute(sa.text("""
        UPDATE farmer_plants
        SET water_growth = 0.6, water_flowering = 0.9, water_ripening = 0.7
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Перець солодкий')
    """))

    # 4. Тюльпани farmer_plants: water rates
    conn.execute(sa.text("""
        UPDATE farmer_plants
        SET water_growth = 0.3, water_flowering = 0.4, water_ripening = 0.2
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Тюльпани')
    """))


def downgrade() -> None:
    pass
