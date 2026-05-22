from pydantic import BaseModel


class WaterCostBreakdown(BaseModel):
    total_liters: float
    cost_uah: float


class FertilizerCostBreakdown(BaseModel):
    total_grams: float
    cost_uah: float


class HeatingCostBreakdown(BaseModel):
    season_kwh: float
    cost_uah: float


class SeedCostBreakdown(BaseModel):
    plants_count: int
    cost_uah: float
    price_per_plant: float = 0.0


class ForecastOut(BaseModel):
    area_m2: float
    expected_yield_kg: float
    revenue_uah: float
    news_price_impact_pct: float = 0.0
    water_cost: WaterCostBreakdown
    seed_cost: SeedCostBreakdown
    fertilizer_cost: FertilizerCostBreakdown
    heating_cost: HeatingCostBreakdown
    total_costs_uah: float
    net_profit_uah: float
    roi_percent: float
