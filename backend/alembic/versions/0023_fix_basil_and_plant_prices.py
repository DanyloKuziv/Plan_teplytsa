"""Fix basil and other plant prices using LIKE matching

Revision ID: 0023
Revises: 0022
Create Date: 2026-05-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # name_like, yield_per_m2, sell_price_uah
    updates = [
        ("%азилік%",   3, 160),   # Базилік зелений, Базилік, etc.
        ("%гірок%",   10,  65),   # Огірок тепличний, Огірок
        ("%омат%",     9,  80),   # Томат, Томат Черрі
        ("%ерець%",    7,  65),   # Перець солодкий, Перець
        ("%алат%",     4,  50),   # Салат листовий, Салат
        ("%олуниця%",  6, 180),   # Полуниця
        ("%юльпан%",  20,  35),   # Тюльпани
        ("%адиска%",   2,  40),   # Редиска
        ("%петрушка%", 3,  60),
        ("%кріп%",     3,  55),
        ("%шпинат%",   4,  70),
        ("%рукола%",   4,  90),
    ]

    for pattern, yld, price in updates:
        conn.execute(sa.text(
            "UPDATE plants SET default_yield_per_m2 = :y, default_sell_price = :p "
            "WHERE lower(name) LIKE lower(:n)"
        ), {"y": yld, "p": price, "n": pattern})


def downgrade() -> None:
    pass
