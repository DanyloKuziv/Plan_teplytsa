from app.models.greenhouse import Greenhouse, HeatingType, InsulationType

# Heating hours per season (October–April ≈ 210 days × 12h)
_SEASON_HOURS = 210 * 12

# Insulation loss factor — multiplier on required power
_INSULATION_FACTOR = {
    InsulationType.none: 1.40,
    InsulationType.basic: 1.15,
    InsulationType.good: 1.00,
}

# Energy units consumed per kWh of thermal output (fuel_unit / kWh_thermal)
# gas: 1 m³ ≈ 10 kWh, so 0.10 m³/kWh
# wood: 1 kg ≈ 4 kWh, so 0.25 kg/kWh
# electric: 1 kWh_el = 1 kWh_thermal (COP=1 assumed for resistance)
# heat_pump: COP≈3, so 0.33 kWh_el per kWh_thermal
_FUEL_FACTOR = {
    HeatingType.gas: 0.10,
    HeatingType.wood: 0.25,
    HeatingType.electric: 1.00,
    HeatingType.heat_pump: 0.33,
}


def calculate_heating_cost(greenhouse: Greenhouse) -> dict:
    """Return seasonal heating cost breakdown.

    Returns:
        season_kwh: thermal energy needed
        fuel_units: physical fuel consumed
        cost_uah: total cost
    """
    insulation_factor = _INSULATION_FACTOR[greenhouse.insulation_type]
    season_kwh = greenhouse.heating_power_kw * _SEASON_HOURS * insulation_factor
    fuel_units = season_kwh * _FUEL_FACTOR[greenhouse.heating_type]
    cost_uah = fuel_units * greenhouse.fuel_cost_per_unit

    return {
        "season_kwh": round(season_kwh, 1),
        "fuel_units": round(fuel_units, 1),
        "cost_uah": round(cost_uah, 2),
    }
