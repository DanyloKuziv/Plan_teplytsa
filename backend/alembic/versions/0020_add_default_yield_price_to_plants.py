"""Add default_yield_per_m2 and default_sell_price to plants table

Revision ID: 0020
Revises: 0019
Create Date: 2026-05-24
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("plants", sa.Column("default_yield_per_m2", sa.Float(), nullable=False, server_default="3.0"))
    op.add_column("plants", sa.Column("default_sell_price",   sa.Float(), nullable=False, server_default="30.0"))

    conn = op.get_bind()

    data = [
        ("Огірок тепличний",  12,  65),
        ("Томат (Черрі)",     11,  80),
        ("Перець солодкий",    8,  65),
        ("Салат листовий",     4,  50),
        ("Полуниця",           6, 180),
        ("Тюльпани",          20,  35),
        ("Базилік",            3, 160),
        ("Редиска",            2,  40),
    ]

    for name, yld, price in data:
        conn.execute(sa.text(
            "UPDATE plants SET default_yield_per_m2 = :y, default_sell_price = :p WHERE name = :n"
        ), {"y": yld, "p": price, "n": name})


def downgrade() -> None:
    op.drop_column("plants", "default_sell_price")
    op.drop_column("plants", "default_yield_per_m2")
