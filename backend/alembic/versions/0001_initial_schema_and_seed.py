"""Initial schema and seed data

Revision ID: 0001
Revises:
Create Date: 2026-05-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime, date

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── ENUM types ──────────────────────────────────────────────────────────
    heating_type_enum = postgresql.ENUM("gas", "wood", "electric", "heat_pump", name="heatingtype")
    insulation_type_enum = postgresql.ENUM("none", "basic", "good", name="insulationtype")
    growth_phase_enum = postgresql.ENUM("seedling", "growth", "flowering", "ripening", name="growthphase")

    heating_type_enum.create(op.get_bind(), checkfirst=True)
    insulation_type_enum.create(op.get_bind(), checkfirst=True)
    growth_phase_enum.create(op.get_bind(), checkfirst=True)

    # ── TABLES ───────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "greenhouses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("total_area", sa.Float, nullable=False),
        sa.Column("heating_type", sa.Enum("gas", "wood", "electric", "heat_pump", name="heatingtype"), nullable=False),
        sa.Column("heating_power_kw", sa.Float, nullable=False),
        sa.Column("fuel_cost_per_unit", sa.Float, nullable=False),
        sa.Column("insulation_type", sa.Enum("none", "basic", "good", name="insulationtype"), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_greenhouses_user_id", "greenhouses", ["user_id"])

    op.create_table(
        "zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("greenhouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("greenhouses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("area", sa.Float, nullable=False),
        sa.Column("row_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("notes", sa.Text, nullable=True),
    )
    op.create_index("ix_zones_greenhouse_id", "zones", ["greenhouse_id"])

    op.create_table(
        "plants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("grow_days", sa.Integer, nullable=False),
        sa.Column("plants_per_m2", sa.Float, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
    )

    op.create_table(
        "substrates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("water_coefficient", sa.Float, nullable=False),
    )

    op.create_table(
        "farmer_plants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("yield_per_m2", sa.Float, nullable=False),
        sa.Column("water_seedling", sa.Float, nullable=False),
        sa.Column("water_growth", sa.Float, nullable=False),
        sa.Column("water_flowering", sa.Float, nullable=False),
        sa.Column("water_ripening", sa.Float, nullable=False),
        sa.Column("sell_price", sa.Float, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
    )
    op.create_index("ix_farmer_plants_user_id", "farmer_plants", ["user_id"])

    op.create_table(
        "fertilizers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("npk_formula", sa.String(50), nullable=False),
        sa.Column("phase", sa.Enum("seedling", "growth", "flowering", "ripening", name="growthphase"), nullable=False),
        sa.Column("dose_per_m2", sa.Float, nullable=False),
        sa.Column("price_per_kg", sa.Float, nullable=False),
    )

    op.create_table(
        "planting_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("greenhouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("greenhouses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("zones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("farmer_plant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("farmer_plants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("substrate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("substrates.id"), nullable=False),
        sa.Column("area", sa.Float, nullable=False),
        sa.Column("planted_at", sa.Date, nullable=False),
        sa.Column("expected_harvest_at", sa.Date, nullable=False),
    )
    op.create_index("ix_planting_plans_greenhouse_id", "planting_plans", ["greenhouse_id"])

    op.create_table(
        "irrigation_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("planting_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scheduled_date", sa.Date, nullable=False),
        sa.Column("volume_liters", sa.Float, nullable=False),
        sa.Column("growth_phase", sa.Enum("seedling", "growth", "flowering", "ripening", name="growthphase"), nullable=False),
    )
    op.create_index("ix_irrigation_schedules_plan_id", "irrigation_schedules", ["plan_id"])

    op.create_table(
        "fertilizer_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("planting_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fertilizer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("fertilizers.id"), nullable=False),
        sa.Column("scheduled_date", sa.Date, nullable=False),
        sa.Column("dose_grams", sa.Float, nullable=False),
        sa.Column("growth_phase", sa.Enum("seedling", "growth", "flowering", "ripening", name="growthphase"), nullable=False),
    )
    op.create_index("ix_fertilizer_schedules_plan_id", "fertilizer_schedules", ["plan_id"])

    op.create_table(
        "harvest_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("planting_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actual_yield_kg", sa.Float, nullable=False),
        sa.Column("revenue", sa.Float, nullable=False),
        sa.Column("costs", sa.Float, nullable=False),
        sa.Column("harvested_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("notes", sa.Text, nullable=True),
    )

    op.create_table(
        "market_prices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("plants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("region", sa.String(100), nullable=False),
        sa.Column("price_per_kg", sa.Float, nullable=False),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("recorded_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_market_prices_plant_id", "market_prices", ["plant_id"])

    op.create_table(
        "sensor_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("greenhouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("greenhouses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("temperature", sa.Float, nullable=True),
        sa.Column("humidity_air", sa.Float, nullable=True),
        sa.Column("humidity_soil", sa.Float, nullable=True),
        sa.Column("co2_ppm", sa.Float, nullable=True),
        sa.Column("recorded_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_sensor_logs_greenhouse_id", "sensor_logs", ["greenhouse_id"])
    op.create_index("ix_sensor_logs_recorded_at", "sensor_logs", ["recorded_at"])

    op.create_table(
        "news_feed",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("published_at", sa.DateTime, nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
    )

    # ── SEED DATA ────────────────────────────────────────────────────────────
    # Plants catalog (7 plants)
    plants_table = sa.table(
        "plants",
        sa.column("id", postgresql.UUID),
        sa.column("name", sa.String),
        sa.column("category", sa.String),
        sa.column("grow_days", sa.Integer),
        sa.column("plants_per_m2", sa.Float),
        sa.column("description", sa.Text),
        sa.column("image_url", sa.String),
    )

    plant_ids = {name: uuid.uuid4() for name in ["tomato", "cucumber", "pepper", "lettuce", "basil", "strawberry", "eggplant"]}

    op.bulk_insert(plants_table, [
        {
            "id": plant_ids["tomato"],
            "name": "Томат (Черрі)",
            "category": "Овочі",
            "grow_days": 90,
            "plants_per_m2": 3.5,
            "description": "Індетермінантний сорт для теплиць. Великий урожай при правильному підв'язуванні.",
            "image_url": None,
        },
        {
            "id": plant_ids["cucumber"],
            "name": "Огірок тепличний",
            "category": "Овочі",
            "grow_days": 60,
            "plants_per_m2": 2.5,
            "description": "Партенокарпічний гібрид. Не потребує запилення, ідеальний для закритого ґрунту.",
            "image_url": None,
        },
        {
            "id": plant_ids["pepper"],
            "name": "Перець болгарський",
            "category": "Овочі",
            "grow_days": 120,
            "plants_per_m2": 4.0,
            "description": "Солодкий перець. Вимагає стабільної температури 22–26°C.",
            "image_url": None,
        },
        {
            "id": plant_ids["lettuce"],
            "name": "Салат листовий",
            "category": "Зелень",
            "grow_days": 35,
            "plants_per_m2": 16.0,
            "description": "Швидкостиглий. Ідеальний для гідропоніки та NFT-систем.",
            "image_url": None,
        },
        {
            "id": plant_ids["basil"],
            "name": "Базилік зелений",
            "category": "Зелень",
            "grow_days": 40,
            "plants_per_m2": 20.0,
            "description": "Ароматна зелень. Чутливий до температури нижче 15°C.",
            "image_url": None,
        },
        {
            "id": plant_ids["strawberry"],
            "name": "Полуниця ремонтантна",
            "category": "Ягоди",
            "grow_days": 75,
            "plants_per_m2": 6.0,
            "description": "Плодоносить цілий рік у теплиці. Сорти: Альбіон, Сельва.",
            "image_url": None,
        },
        {
            "id": plant_ids["eggplant"],
            "name": "Баклажан",
            "category": "Овочі",
            "grow_days": 110,
            "plants_per_m2": 3.0,
            "description": "Теплолюбива культура. Оптимальна температура 25–28°C вдень.",
            "image_url": None,
        },
    ])

    # Substrates (3 substrates)
    substrates_table = sa.table(
        "substrates",
        sa.column("id", postgresql.UUID),
        sa.column("name", sa.String),
        sa.column("water_coefficient", sa.Float),
    )
    substrate_ids = {name: uuid.uuid4() for name in ["soil", "coconut", "hydro", "rockwool"]}

    op.bulk_insert(substrates_table, [
        {"id": substrate_ids["soil"], "name": "Ґрунт", "water_coefficient": 1.0},
        {"id": substrate_ids["coconut"], "name": "Кокосовий субстрат", "water_coefficient": 0.85},
        {"id": substrate_ids["hydro"], "name": "Гідропоніка", "water_coefficient": 0.70},
        {"id": substrate_ids["rockwool"], "name": "Мінеральна вата", "water_coefficient": 0.80},
    ])

    # Fertilizers (5 fertilizers across phases)
    fertilizers_table = sa.table(
        "fertilizers",
        sa.column("id", postgresql.UUID),
        sa.column("name", sa.String),
        sa.column("npk_formula", sa.String),
        sa.column("phase", sa.String),
        sa.column("dose_per_m2", sa.Float),
        sa.column("price_per_kg", sa.Float),
    )

    op.bulk_insert(fertilizers_table, [
        {
            "id": uuid.uuid4(),
            "name": "Кореневін Старт",
            "npk_formula": "10-52-10",
            "phase": "seedling",
            "dose_per_m2": 5.0,
            "price_per_kg": 180.0,
        },
        {
            "id": uuid.uuid4(),
            "name": "Агро Вегетатив",
            "npk_formula": "20-10-10",
            "phase": "growth",
            "dose_per_m2": 8.0,
            "price_per_kg": 120.0,
        },
        {
            "id": uuid.uuid4(),
            "name": "Флора Блум",
            "npk_formula": "5-15-35",
            "phase": "flowering",
            "dose_per_m2": 7.0,
            "price_per_kg": 150.0,
        },
        {
            "id": uuid.uuid4(),
            "name": "Фертика Плюс",
            "npk_formula": "8-12-36",
            "phase": "ripening",
            "dose_per_m2": 6.0,
            "price_per_kg": 140.0,
        },
        {
            "id": uuid.uuid4(),
            "name": "Кальцій Нітрат",
            "npk_formula": "15-0-0+Ca",
            "phase": "growth",
            "dose_per_m2": 4.0,
            "price_per_kg": 95.0,
        },
    ])

    # Market prices (3 regions × key plants)
    market_prices_table = sa.table(
        "market_prices",
        sa.column("id", postgresql.UUID),
        sa.column("plant_id", postgresql.UUID),
        sa.column("region", sa.String),
        sa.column("price_per_kg", sa.Float),
        sa.column("source_url", sa.String),
        sa.column("recorded_at", sa.DateTime),
    )

    now = datetime.utcnow()
    regions = ["Київська область", "Харківська область", "Львівська область"]
    price_map = {
        "tomato":     [65.0, 58.0, 70.0],
        "cucumber":   [45.0, 40.0, 50.0],
        "pepper":     [80.0, 75.0, 85.0],
        "lettuce":    [55.0, 50.0, 60.0],
        "strawberry": [120.0, 110.0, 130.0],
    }

    market_rows = []
    for plant_key, prices in price_map.items():
        for region, price in zip(regions, prices):
            market_rows.append({
                "id": uuid.uuid4(),
                "plant_id": plant_ids[plant_key],
                "region": region,
                "price_per_kg": price,
                "source_url": None,
                "recorded_at": now,
            })
    op.bulk_insert(market_prices_table, market_rows)

    # Sample news
    news_table = sa.table(
        "news_feed",
        sa.column("id", postgresql.UUID),
        sa.column("title", sa.String),
        sa.column("url", sa.String),
        sa.column("source", sa.String),
        sa.column("published_at", sa.DateTime),
        sa.column("category", sa.String),
    )

    op.bulk_insert(news_table, [
        {
            "id": uuid.uuid4(),
            "title": "Ціни на томати зросли на 15% через холодну весну",
            "url": "https://agronews.ua/tomato-prices",
            "source": "AgroNews UA",
            "published_at": datetime(2026, 5, 1),
            "category": "Ринок",
        },
        {
            "id": uuid.uuid4(),
            "title": "Субсидії на тепличне господарство 2026: нові умови отримання",
            "url": "https://minagro.gov.ua/subsidii-2026",
            "source": "Мінагрополітики",
            "published_at": datetime(2026, 4, 20),
            "category": "Законодавство",
        },
        {
            "id": uuid.uuid4(),
            "title": "Гідропоніка vs ґрунт: що вигідніше для малих теплиць",
            "url": "https://fermery.ua/hydroponics-vs-soil",
            "source": "Фермери України",
            "published_at": datetime(2026, 4, 15),
            "category": "Технології",
        },
    ])


def downgrade() -> None:
    op.drop_table("news_feed")
    op.drop_table("sensor_logs")
    op.drop_table("market_prices")
    op.drop_table("harvest_records")
    op.drop_table("fertilizer_schedules")
    op.drop_table("irrigation_schedules")
    op.drop_table("planting_plans")
    op.drop_table("fertilizers")
    op.drop_table("farmer_plants")
    op.drop_table("substrates")
    op.drop_table("plants")
    op.drop_table("zones")
    op.drop_table("greenhouses")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS growthphase")
    op.execute("DROP TYPE IF EXISTS insulationtype")
    op.execute("DROP TYPE IF EXISTS heatingtype")
