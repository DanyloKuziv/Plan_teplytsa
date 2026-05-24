"""Tune substrate modifiers and base yields to realistic small-farm values

Revision ID: 0021
Revises: 0020
Create Date: 2026-05-24
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Hydroponics: realistic +15% yield bonus (not +40%)
    conn.execute(sa.text(
        "UPDATE substrates SET yield_modifier = 1.15, growth_modifier = 1.20 WHERE name = 'Гідропоніка'"
    ))
    # Coconut: keep yield +10%, speed +10%
    conn.execute(sa.text(
        "UPDATE substrates SET yield_modifier = 1.10, growth_modifier = 1.10 WHERE name = 'Кокосовий субстрат'"
    ))
    # Rockwool: +5% yield, +5% growth
    conn.execute(sa.text(
        "UPDATE substrates SET yield_modifier = 1.05, growth_modifier = 1.05 WHERE name = 'Мінеральна вата'"
    ))

    # Lower base yields to conservative mid-range for small greenhouse
    # (12 kg/m² was top-end; realistic average for small farms is 8-10)
    conn.execute(sa.text(
        "UPDATE plants SET default_yield_per_m2 = 10 WHERE name = 'Огірок тепличний'"
    ))
    conn.execute(sa.text(
        "UPDATE plants SET default_yield_per_m2 = 9  WHERE name = 'Томат (Черрі)'"
    ))
    conn.execute(sa.text(
        "UPDATE plants SET default_yield_per_m2 = 6  WHERE name = 'Перець солодкий'"
    ))
    conn.execute(sa.text(
        "UPDATE plants SET default_yield_per_m2 = 3  WHERE name = 'Салат листовий'"
    ))
    conn.execute(sa.text(
        "UPDATE plants SET default_yield_per_m2 = 5  WHERE name = 'Полуниця'"
    ))

    # Also update farmer_plants to match
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 10
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Огірок тепличний')
    """))
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 9
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Томат (Черрі)')
    """))
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 6
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Перець солодкий')
    """))
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 3
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Салат листовий')
    """))
    conn.execute(sa.text("""
        UPDATE farmer_plants SET yield_per_m2 = 5
        WHERE plant_id IN (SELECT id FROM plants WHERE name = 'Полуниця')
    """))


def downgrade() -> None:
    pass
