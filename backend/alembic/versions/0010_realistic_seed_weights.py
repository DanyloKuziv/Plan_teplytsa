"""update seed_weight_g to realistic sowing rates (g per plant position)

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-09
"""
from alembic import op

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None

# Realistic sowing rate in g per plant position.
# Formula: area_m2 × plants_per_m2 × seed_weight_g / 1000  = kg of seed needed.
# For radish 50m²:  50 × 50 × 0.4 / 1000 = 1.0 kg  ✓
# For spinach 50m²: 50 × 18 × 0.44 / 1000 = 0.396 kg ≈ 400g ✓
# For tomato 50m²:  50 × 3.5 × 0.057 / 1000 = 10g (transplant seedlings) ✓
_SEED_WEIGHTS = {
    'Редиска':           0.40,   # direct sow, ~20 g/m²
    'Шпинат':            0.44,   # direct sow, ~8 g/m²
    'Салат листовий':    0.06,   # direct sow, ~1 g/m²
    'Базилік':           0.025,  # direct sow, ~0.5 g/m²
    'Огірок тепличний':  0.30,   # 1 seed/hole + spare, ~0.75 g/m²
    'Томат (Черрі)':     0.057,  # transplant seedlings, ~0.2 g/m²
    'Перець солодкий':   0.075,  # transplant seedlings, ~0.3 g/m²
    'Полуниця':          0.0,    # runners / seedlings — no seed weight
}


def upgrade():
    for name, weight in _SEED_WEIGHTS.items():
        op.execute(
            f"UPDATE plants SET seed_weight_g = {weight} "
            f"WHERE lower(name) = lower('{name}')"
        )


def downgrade():
    pass
