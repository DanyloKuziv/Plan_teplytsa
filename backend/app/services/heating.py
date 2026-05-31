from app.models.greenhouse import Greenhouse, HeatingType, InsulationType

# Heating hours per season (October–April ≈ 210 days × 12h × 50% duty cycle)
_SEASON_HOURS = 210 * 12 * 0.5

# Heat loss W per m² — how much power is actually needed to maintain +18°C inside
_HEAT_LOSS_W_M2 = {
    InsulationType.none: 90,
    InsulationType.basic: 65,
    InsulationType.good: 45,
}

# Energy units consumed per kWh of thermal output (fuel_unit / kWh_thermal)
_FUEL_FACTOR = {
    HeatingType.gas: 0.10,        # 1 m³ ≈ 10 kWh
    HeatingType.wood: 0.25,       # 1 kg ≈ 4 kWh
    HeatingType.electric: 1.00,   # resistance heater
    HeatingType.heat_pump: 0.33,  # COP ≈ 3
}


def calculate_heating_cost(greenhouse: Greenhouse) -> dict:
    """Return seasonal heating cost based on greenhouse heat loss, not installed capacity."""
    heat_loss_w_m2 = _HEAT_LOSS_W_M2[greenhouse.insulation_type]
    required_kw = greenhouse.total_area * heat_loss_w_m2 / 1000
    # Use required power, capped at installed capacity (can't use more than installed)
    effective_kw = min(greenhouse.heating_power_kw, required_kw)

    season_kwh = effective_kw * _SEASON_HOURS
    fuel_units = season_kwh * _FUEL_FACTOR[greenhouse.heating_type]
    cost_uah = fuel_units * greenhouse.fuel_cost_per_unit

    return {
        "season_kwh": round(season_kwh, 1),
        "fuel_units": round(fuel_units, 1),
        "cost_uah": round(cost_uah, 2),
    }
