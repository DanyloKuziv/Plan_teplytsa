"""Expand plant catalog: fix Баклажан price, add 18 new plants

Revision ID: 0024
Revises: 0023
Create Date: 2026-05-31
"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# name, category, grow_days, plants_per_m2, seed_weight_g, default_yield_per_m2, default_sell_price, description
NEW_PLANTS = [
    # Зелень
    ("Редиска",          "Зелень",   25, 40, 0.009, 2.5,  45, "Найшвидша культура. Декілька врожаїв за сезон."),
    ("Шпинат",           "Зелень",   30, 25, 0.002, 3.0,  70, "Багатий на залізо та вітаміни. Добре росте взимку."),
    ("Кріп",             "Зелень",   35, 30, 0.001, 2.0,  55, "Популярна пряна зелень. Невибагливий у догляді."),
    ("Петрушка",         "Зелень",   60, 25, 0.001, 2.5,  60, "Листкова та коренева. Постійний попит на ринку."),
    ("Рукола",           "Зелень",   30, 25, 0.001, 3.0,  90, "Популярна салатна зелень. Висока ціна на ринку."),
    ("Цибуля зелена",    "Зелень",   35, 30, 0.003, 3.0,  50, "Пір'я на зелень. Можна вирощувати з цибулин."),
    ("Кінза",            "Зелень",   35, 30, 0.003, 2.0,  70, "Пряна зелень. Популярна в приправах та салатах."),
    ("М'ята перцева",    "Зелень",   45, 15, 0.000, 2.0, 120, "Ароматна зелень. Вирощується розсадою або живцями."),
    ("Мангольд",         "Зелень",   55, 16, 0.002, 4.0,  60, "Листовий буряк. Декоративний і поживний."),
    ("Пак-чой",          "Зелень",   45, 20, 0.001, 4.0,  70, "Китайська капуста. Швидкий ріст, висока врожайність."),
    # Овочі
    ("Томат великоплідний", "Овочі", 110,  3, 0.003, 8.0,  70, "Великі плоди 200-400 г. Популярні сорти: Бичаче серце, Рожевий гігант."),
    ("Перець гострий",   "Овочі",   110,  4, 0.006, 5.0,  80, "Гострий перець. Висока ціна та стабільний попит."),
    ("Кабачок",          "Овочі",    50,  1, 0.100,10.0,  30, "Ранній і урожайний. 1 рослина займає ~1 м²."),
    ("Баклажан",         "Овочі",   110,  3, 0.006, 8.0,  55, None),  # fix existing
    # Ягоди / Фрукти
    ("Малина ремонтантна","Ягоди",   90,  2, 0.000, 3.0, 250, "Плодоносить двічі на рік. Висока ціна на ринку."),
    # Квіти (yield = кількість стебел/м², ціна = за стебло)
    ("Тюльпани",         "Квіти",    60, 20, 0.000,20.0,  35, "Популярна зрізна квітка. 1 луковиця = 1 стебло."),
    ("Троянди зрізні",   "Квіти",    75,  4, 0.000,15.0,  50, "Преміум зрізні квіти. Висока рентабельність."),
    ("Хризантема",       "Квіти",    70,  6, 0.000,12.0,  40, "Осіння зрізна квітка. Тривале зберігання."),
]


def upgrade() -> None:
    conn = op.get_bind()

    # Fix existing Баклажан prices (in plants table)
    conn.execute(sa.text(
        "UPDATE plants SET default_yield_per_m2 = 8, default_sell_price = 55, "
        "plants_per_m2 = 3, grow_days = 110 WHERE lower(name) LIKE '%аклажан%'"
    ))
    # Fix existing farmer_plants for Баклажан
    conn.execute(sa.text(
        "UPDATE farmer_plants SET yield_per_m2 = 8, sell_price = 55 "
        "WHERE plant_id IN (SELECT id FROM plants WHERE lower(name) LIKE '%аклажан%')"
    ))

    for (name, category, grow_days, ppm2, seed_w, yld, price, desc) in NEW_PLANTS:
        if name == "Баклажан":
            continue  # already fixed above

        # Skip if already exists
        result = conn.execute(sa.text("SELECT id FROM plants WHERE name = :n"), {"n": name})
        if result.fetchone():
            # Just update prices
            conn.execute(sa.text(
                "UPDATE plants SET default_yield_per_m2 = :y, default_sell_price = :p, "
                "plants_per_m2 = :ppm2, grow_days = :gd, seed_weight_g = :sw WHERE name = :n"
            ), {"y": yld, "p": price, "ppm2": ppm2, "gd": grow_days, "sw": seed_w, "n": name})
            continue

        plant_id = str(uuid.uuid4())
        conn.execute(sa.text(
            "INSERT INTO plants (id, name, category, grow_days, plants_per_m2, seed_weight_g, "
            "default_yield_per_m2, default_sell_price, description, image_url) "
            "VALUES (:id, :name, :cat, :gd, :ppm2, :sw, :yld, :price, :desc, NULL)"
        ), {
            "id": plant_id, "name": name, "cat": category, "gd": grow_days,
            "ppm2": ppm2, "sw": seed_w, "yld": yld, "price": price,
            "desc": desc,
        })


def downgrade() -> None:
    conn = op.get_bind()
    names = [p[0] for p in NEW_PLANTS if p[0] != "Баклажан"]
    for name in names:
        conn.execute(sa.text("DELETE FROM plants WHERE name = :n"), {"n": name})
