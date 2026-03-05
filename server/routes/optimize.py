"""
/api/optimize — Fictional ML model (SilverOptNet) that recommends parameter
adjustments to minimize silver consumption while maintaining quality targets.

The "model" uses physics-informed rules calibrated to simulate a real
GradientBoosting regressor trained on 18 months of production data.
"""
from __future__ import annotations
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import math

router = APIRouter()

# Parameter specifications: optimal setpoint and consumption impact weight
# impact > 0 means higher value → higher consumption (positive correlation)
# impact < 0 means higher value → lower consumption (inverse)
PARAM_SPECS = {
    "line_speed": {
        "label": "Line Speed", "unit": "m/min",
        "min": 0.8, "max": 1.4, "optimal": 1.25,
        "impact": -0.58,  # inverse: faster = less Ag deposited per m²
        "action": "Increase line speed to reduce silver deposition time per m²",
    },
    "silver_flow_rate": {
        "label": "Silver Flow Rate", "unit": "L/min",
        "min": 0.9, "max": 1.3, "optimal": 1.02,
        "impact": 0.52,  # direct: more flow = more consumption
        "action": "Reduce silver solution flow rate to eliminate excess deposition",
    },
    "bath_temperature": {
        "label": "Bath Temperature", "unit": "°C",
        "min": 42, "max": 48, "optimal": 44.0,
        "impact": 0.28,  # higher temp accelerates reaction, increases consumption
        "action": "Lower bath temperature to slow reaction kinetics",
    },
    "sensitizer_conc": {
        "label": "Sensitizer Concentration", "unit": "g/L",
        "min": 0.18, "max": 0.25, "optimal": 0.20,
        "impact": 0.20,
        "action": "Reduce sensitizer to optimal activation level",
    },
    "nozzle_pressure": {
        "label": "Nozzle Pressure", "unit": "bar",
        "min": 2.8, "max": 3.8, "optimal": 3.2,
        "impact": 0.12,
        "action": "Calibrate nozzle pressure for uniform coverage",
    },
    "activator_conc": {
        "label": "Activator Concentration", "unit": "g/L",
        "min": 0.08, "max": 0.14, "optimal": 0.10,
        "impact": 0.10,
        "action": "Adjust activator to minimum effective concentration",
    },
}

NOMINAL_BY_TYPE = {
    "standard_4mm": 8.5,
    "premium_6mm": 11.2,
    "ultra_8mm": 14.8,
}


class OptimizeRequest(BaseModel):
    snapshot: dict
    history: Optional[list] = None


@router.post("/api/optimize")
def optimize(req: OptimizeRequest):
    snap = req.snapshot
    params = snap["parameters"]
    kpis = snap["kpis"]
    mirror_type = snap.get("mirror_type", "standard_4mm")

    current = kpis["silver_consumption_gm2"]
    nominal = NOMINAL_BY_TYPE.get(mirror_type, kpis["nominal_gm2"])

    # ── Compute recommendations ──────────────────────────────────────────────
    recommendations = []
    total_impact_pct = 0.0

    for key, spec in PARAM_SPECS.items():
        val = params.get(key, spec["optimal"])
        opt = spec["optimal"]
        rng = spec["max"] - spec["min"]

        # Normalized deviation from optimal: positive = above optimal
        norm_dev = (val - opt) / (rng / 2)

        # Expected excess consumption from this parameter
        excess_pct = norm_dev * spec["impact"] * 100

        # Only surface if deviation is meaningful (>12% of operating range)
        if abs(norm_dev) > 0.12:
            direction = "increase" if opt > val else "decrease"
            impact = round(-excess_pct, 1)  # negative excess = savings
            recommendations.append({
                "parameter": key,
                "label": spec["label"],
                "current": round(val, 3),
                "target": round(opt, 3),
                "unit": spec["unit"],
                "direction": direction,
                "expected_impact_pct": impact,
                "priority": "high" if abs(norm_dev) > 0.45 else "medium",
                "action": spec["action"],
            })
            total_impact_pct += abs(excess_pct)

    # Sort: high priority first, then by impact magnitude
    recommendations.sort(
        key=lambda r: (0 if r["priority"] == "high" else 1, -abs(r["expected_impact_pct"]))
    )

    # ── Compute optimal consumption ──────────────────────────────────────────
    # Model predicts: with all parameters at setpoint, ~2-3% above nominal
    # (some variance is inherent to the process)
    optimal_gm2 = round(nominal * 1.022, 3)
    achievable_savings_pct = round(max(0, (current - optimal_gm2) / current * 100), 1)

    # ── Confidence ───────────────────────────────────────────────────────────
    # Confidence is higher when process is stable (low absolute deviation)
    stability = 1 - min(abs(kpis["deviation_pct"]) / 35, 1)
    confidence = round(0.72 + 0.20 * stability, 2)

    # ── Forecast horizon ─────────────────────────────────────────────────────
    # Simulate what consumption looks like if recommendations applied now
    # Linear ramp from current to optimal over 30 minutes
    forecast = []
    for minute in range(0, 35, 5):
        t = minute / 30.0
        eased = t * t * (3 - 2 * t)  # smoothstep
        projected = round(current + (optimal_gm2 - current) * eased, 3)
        forecast.append({"minute": minute, "projected_gm2": projected})

    return JSONResponse({
        "current_gm2": round(current, 3),
        "optimal_gm2": optimal_gm2,
        "nominal_gm2": round(nominal, 2),
        "savings_pct": achievable_savings_pct,
        "confidence": confidence,
        "model_name": "SilverOptNet v2.3",
        "model_detail": "Gradient Boosting + Physics-Informed Constraints",
        "last_trained": "2026-02-14",
        "training_samples": 94_320,
        "recommendations": recommendations[:4],
        "forecast": forecast,
    })
