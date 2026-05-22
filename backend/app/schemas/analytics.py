from pydantic import BaseModel


class HarvestActuals(BaseModel):
    records_count: int
    actual_yield_kg: float
    actual_revenue_uah: float
    actual_costs_uah: float
    actual_profit_uah: float


class ForecastSummary(BaseModel):
    expected_yield_kg: float
    expected_revenue_uah: float
    expected_costs_uah: float
    expected_profit_uah: float


class Deviation(BaseModel):
    yield_kg: float
    yield_percent: float
    revenue_uah: float
    profit_uah: float


class AnalyticsOut(BaseModel):
    plan_id: str
    area_m2: float
    has_harvest_data: bool
    forecast: ForecastSummary
    actuals: HarvestActuals | None
    deviation: Deviation | None
    accuracy_score: float | None
