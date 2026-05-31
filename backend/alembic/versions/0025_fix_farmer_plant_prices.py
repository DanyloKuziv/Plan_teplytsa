"""Sync farmer_plants sell_price/yield_per_m2 with corrected plant catalog

Revision ID: 0025
Revises: 0024
Create Date: 2026-05-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# pattern (LIKE on plant name), yield_per_m2, sell_price
UPDATES = [
    ("%азилік%",          3,  160),
    ("%гірок%",          10,   65),
    ("%омат (Черрі)%",    9,   80),
    ("%омат великоплідний%", 8, 70),
    ("%ерець болгарський%", 7, 65),
    ("%ерець солодкий%",   7,   65),
    ("%ерець гострий%",    5,   80),
    ("%алат листовий%",    4,   50),
    ("%олуниця%",          5,  180),
    ("%аклажан%",          8,   55),
    ("%абачок%",          10,   30),
    ("%алина%",            3,  250),
    ("%едиска%",         2.5,   45),
    ("%пинат%",            3,   70),
    ("%ріп%",              2,   55),
    ("%етрушка%",        2.5,   60),
    ("%укола%",            3,   90),
    ("%ибуля зелена%",     3,   50),
    ("%інза%",             2,   70),
    ("%'ята%",             2,  120),
    ("%ангольд%",          4,   60),
    ("%ак-чой%",           4,   70),
    ("%юльпан%",          20,   35),
    ("%роянди%",          15,   50),
    ("%ризантема%",       12,   40),
]


def upgrade() -> None:
    conn = op.get_bind()
    for pattern, yld, price in UPDATES:
        # Only update records that still have the old default price (30.0),
        # so user-customized prices are not overwritten.
        conn.execute(sa.text("""
            UPDATE farmer_plants
            SET yield_per_m2 = :y, sell_price = :p
            WHERE sell_price = 30.0
              AND plant_id IN (
                SELECT id FROM plants WHERE lower(name) LIKE lower(:n)
            )
        """), {"y": yld, "p": price, "n": pattern})


def downgrade() -> None:
    pass
