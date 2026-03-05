"""
Simulated silver consumption data for mirror production line.
In production, this would be replaced with actual sensor/database reads.
"""
import random
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Mirror types and their nominal silver consumption (g/m²)
MIRROR_TYPES = {
    "standard_4mm": {"nominal_consumption": 8.5, "width": 1.2, "speed_range": (2.0, 4.0)},
    "premium_6mm":  {"nominal_consumption": 11.2, "width": 1.5, "speed_range": (1.5, 3.0)},
    "ultra_8mm":    {"nominal_consumption": 14.8, "width": 1.8, "speed_range": (1.0, 2.5)},
}

# Production parameters that influence silver consumption
PARAMETERS = [
    "line_speed",         # m/min — higher speed → less silver deposited
    "bath_temperature",   # °C    — higher temp → more efficient deposition
    "sensitizer_conc",    # g/L   — sensitizer concentration
    "activator_conc",     # g/L   — activator concentration
    "silver_flow_rate",   # mL/min
    "nozzle_pressure",    # bar
]


def _noise(scale: float = 1.0) -> float:
    return random.gauss(0, scale)


def simulate_current_snapshot() -> Dict[str, Any]:
    """Return a realistic real-time snapshot of the production line."""
    mirror_type = random.choice(list(MIRROR_TYPES.keys()))
    cfg = MIRROR_TYPES[mirror_type]

    line_speed       = random.uniform(*cfg["speed_range"])
    bath_temp        = random.uniform(18, 26)  # °C
    sensitizer_conc  = random.uniform(2.5, 4.5)
    activator_conc   = random.uniform(1.0, 2.5)
    nozzle_pressure  = random.uniform(1.5, 3.5)
    silver_flow_rate = random.uniform(80, 160)

    # Silver consumption model (simplified physics-inspired)
    base = cfg["nominal_consumption"]
    consumption = (
        base
        * (3.0 / line_speed) ** 0.6          # slower → more silver
        * (1 + 0.02 * (bath_temp - 22))       # higher temp → slightly more
        * (sensitizer_conc / 3.5) ** 0.4
        * (activator_conc / 1.8) ** 0.3
        * (1 + 0.05 * (nozzle_pressure - 2.5))
        + _noise(0.3)
    )
    consumption = max(0.5, consumption)

    # Derived KPIs
    throughput_area = line_speed * cfg["width"]  # m²/min
    silver_per_min  = consumption * throughput_area
    shift_start     = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
    elapsed_min     = (datetime.now() - shift_start).seconds / 60
    silver_consumed_today = silver_per_min * max(elapsed_min, 0)

    status = "optimal" if 0.9 * base <= consumption <= 1.1 * base else (
        "high" if consumption > 1.1 * base else "low"
    )

    return {
        "timestamp": datetime.now().isoformat(),
        "mirror_type": mirror_type,
        "status": status,
        "kpis": {
            "silver_consumption_gm2":  round(consumption, 2),
            "nominal_gm2":             round(base, 2),
            "deviation_pct":           round((consumption - base) / base * 100, 1),
            "silver_per_min_g":        round(silver_per_min, 1),
            "throughput_m2_min":       round(throughput_area, 2),
            "silver_consumed_today_g": round(silver_consumed_today, 0),
        },
        "parameters": {
            "line_speed":       round(line_speed, 2),
            "bath_temperature": round(bath_temp, 1),
            "sensitizer_conc":  round(sensitizer_conc, 2),
            "activator_conc":   round(activator_conc, 2),
            "nozzle_pressure":  round(nozzle_pressure, 2),
            "silver_flow_rate": round(silver_flow_rate, 1),
        },
    }


def simulate_history(hours: int = 24, interval_minutes: int = 15) -> List[Dict[str, Any]]:
    """Generate historical silver consumption data."""
    records = []
    now = datetime.now()
    steps = int(hours * 60 / interval_minutes)

    # Pick a mirror type for the historical run
    mirror_type = "standard_4mm"
    cfg = MIRROR_TYPES[mirror_type]
    base = cfg["nominal_consumption"]

    for i in range(steps):
        ts = now - timedelta(minutes=(steps - i) * interval_minutes)

        # Simulate shift patterns: maintenance dip around 12:00, ramp-up in morning
        hour = ts.hour
        shift_factor = 1.0
        if 6 <= hour < 8:     shift_factor = 0.85   # warm-up
        elif 12 <= hour < 13: shift_factor = 0.60   # lunch / maintenance stop
        elif 22 <= hour < 6:  shift_factor = 0.0    # night stop

        if shift_factor == 0:
            continue  # no production at night

        line_speed = random.uniform(*cfg["speed_range"]) * shift_factor
        bath_temp  = 20 + 4 * math.sin(2 * math.pi * i / steps) + _noise(0.5)

        consumption = (
            base
            * (3.0 / max(line_speed, 0.5)) ** 0.6
            * (1 + 0.02 * (bath_temp - 22))
            * shift_factor
            + _noise(0.4)
        )
        consumption = max(0, consumption)

        records.append({
            "timestamp":            ts.isoformat(),
            "silver_consumption_gm2": round(consumption, 2),
            "line_speed":            round(line_speed, 2),
            "bath_temperature":      round(bath_temp, 1),
            "mirror_type":           mirror_type,
            "shift_factor":          shift_factor,
        })

    return records


def simulate_parameter_impact() -> List[Dict[str, Any]]:
    """
    Compute correlation-style impact of each parameter on silver consumption.
    Returns a ranked list for the 'parameter impact' panel.
    """
    # Pre-computed from a synthetic regression (would be ML-derived in production)
    impacts = [
        {
            "parameter":   "line_speed",
            "label":       "Line Speed (m/min)",
            "impact_pct":  -34,
            "direction":   "inverse",
            "description": "Slower speed → more silver deposited per m²",
            "optimal_range": "2.5 – 3.5 m/min",
        },
        {
            "parameter":   "bath_temperature",
            "label":       "Bath Temperature (°C)",
            "impact_pct":  18,
            "direction":   "direct",
            "description": "Higher temperature increases deposition efficiency",
            "optimal_range": "20 – 24 °C",
        },
        {
            "parameter":   "sensitizer_conc",
            "label":       "Sensitizer Concentration (g/L)",
            "impact_pct":  15,
            "direction":   "direct",
            "description": "Concentration controls nucleation site density",
            "optimal_range": "3.0 – 4.0 g/L",
        },
        {
            "parameter":   "nozzle_pressure",
            "label":       "Nozzle Pressure (bar)",
            "impact_pct":  12,
            "direction":   "direct",
            "description": "Higher pressure improves spray uniformity",
            "optimal_range": "2.0 – 3.0 bar",
        },
        {
            "parameter":   "activator_conc",
            "label":       "Activator Concentration (g/L)",
            "impact_pct":  11,
            "direction":   "direct",
            "description": "Activator reduces initiation time for silver reduction",
            "optimal_range": "1.5 – 2.0 g/L",
        },
        {
            "parameter":   "silver_flow_rate",
            "label":       "Silver Flow Rate (mL/min)",
            "impact_pct":  9,
            "direction":   "direct",
            "description": "Direct contribution to amount of silver available",
            "optimal_range": "100 – 140 mL/min",
        },
    ]
    return impacts
