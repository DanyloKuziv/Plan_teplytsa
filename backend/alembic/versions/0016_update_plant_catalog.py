"""Update plant catalog with correct agronomy values

Revision ID: 0016
Revises: 0015
Create Date: 2026-05-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Fix plants table (plants_per_m2, grow_days) ───────────────────────
    plant_updates = [
        ("Томат (Черрі)",      4,   90),
        ("Огірок тепличний",   3,   90),
        ("Салат листовий",    25,   30),
        ("Перець солодкий",    4,  120),
        ("Тюльпани",          50,   60),
    ]
    for name, plants_per_m2, grow_days in plant_updates:
        conn.execute(
            sa.text(
                "UPDATE plants SET plants_per_m2 = :ppm2, grow_days = :gd WHERE name = :name"
            ),
            {"ppm2": plants_per_m2, "gd": grow_days, "name": name},
        )

    # ── 2. Fix farmer_plants table (yield, sell_price, seed_price, water) ────
    # These are demo records; update all matching plant name to realistic defaults.
    farmer_plant_updates = [
        # (plant_name, yield_per_m2, sell_price, seed_price,
        #   water_seedling, water_growth, water_flowering, water_ripening)
        ("Томат (Черрі)",     4.0,  90.0, 3.0, 0.3, 0.6, 0.8, 0.5),
        ("Огірок тепличний", 25.0,  35.0, 4.0, 0.4, 0.8, 1.2, 0.9),
        ("Салат листовий",    8.0,  60.0, 0.5, 0.2, 0.4, 0.4, 0.3),
        ("Перець солодкий",   8.0,  55.0, 3.5, 0.3, 0.5, 0.7, 0.5),
        ("Тюльпани",         50.0,  15.0, 2.0, 0.2, 0.4, 0.5, 0.3),
    ]
    for (plant_name, yield_per_m2, sell_price, seed_price,
         ws, wg, wf, wr) in farmer_plant_updates:
        conn.execute(
            sa.text("""
                UPDATE farmer_plants
                SET yield_per_m2     = :yld,
                    sell_price       = :sp,
                    seed_price       = :seedp,
                    water_seedling   = :ws,
                    water_growth     = :wg,
                    water_flowering  = :wf,
                    water_ripening   = :wr
                WHERE plant_id IN (
                    SELECT id FROM plants WHERE name = :name
                )
            """),
            {
                "yld": yield_per_m2, "sp": sell_price, "seedp": seed_price,
                "ws": ws, "wg": wg, "wf": wf, "wr": wr,
                "name": plant_name,
            },
        )


def downgrade() -> None:
    pass
