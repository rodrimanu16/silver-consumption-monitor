"""
Lakebase (managed Postgres) connection pool with OAuth token refresh.
Gracefully falls back to demo/simulation mode if DB is not configured.
"""
import os
import asyncpg
from typing import Optional
from server.config import get_oauth_token

_pool: Optional[asyncpg.Pool] = None
_demo_mode: bool = False

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS silver_snapshots (
    id          SERIAL PRIMARY KEY,
    ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mirror_type TEXT,
    status      TEXT,
    consumption_gm2   REAL,
    nominal_gm2       REAL,
    deviation_pct     REAL,
    silver_per_min_g  REAL,
    throughput_m2_min REAL,
    line_speed        REAL,
    bath_temperature  REAL,
    sensitizer_conc   REAL,
    activator_conc    REAL,
    nozzle_pressure   REAL,
    silver_flow_rate  REAL
);
"""


async def init_db():
    """Call once on app startup to create pool and ensure table exists."""
    global _pool, _demo_mode

    if not os.environ.get("PGHOST"):
        print("[db] PGHOST not set — running in demo/simulation mode")
        _demo_mode = True
        return

    try:
        token = get_oauth_token()
        _pool = await asyncpg.create_pool(
            host=os.environ["PGHOST"],
            port=int(os.environ.get("PGPORT", "5432")),
            database=os.environ["PGDATABASE"],
            user=os.environ["PGUSER"],
            password=token,
            ssl="require",
            min_size=2,
            max_size=10,
        )
        async with _pool.acquire() as conn:
            await conn.execute(CREATE_TABLE_SQL)
        print("[db] Lakebase connected and table ready")
    except Exception as e:
        print(f"[db] Lakebase connection failed: {e} — falling back to demo mode")
        _demo_mode = True


async def close_db():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def is_demo_mode() -> bool:
    return _demo_mode


async def insert_snapshot(snap: dict):
    """Write a realtime snapshot to Lakebase (non-blocking best-effort)."""
    if _demo_mode or _pool is None:
        return
    try:
        kpis = snap["kpis"]
        params = snap["parameters"]
        async with _pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO silver_snapshots
                   (mirror_type, status, consumption_gm2, nominal_gm2, deviation_pct,
                    silver_per_min_g, throughput_m2_min,
                    line_speed, bath_temperature, sensitizer_conc,
                    activator_conc, nozzle_pressure, silver_flow_rate)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
                snap["mirror_type"],
                snap["status"],
                kpis["silver_consumption_gm2"],
                kpis["nominal_gm2"],
                kpis["deviation_pct"],
                kpis["silver_per_min_g"],
                kpis["throughput_m2_min"],
                params["line_speed"],
                params["bath_temperature"],
                params["sensitizer_conc"],
                params["activator_conc"],
                params["nozzle_pressure"],
                params["silver_flow_rate"],
            )
    except Exception as e:
        print(f"[db] insert_snapshot failed: {e}")


async def query_history(hours: int) -> Optional[list]:
    """
    Fetch silver consumption history from Lakebase.
    Returns None if in demo mode (caller should fall back to simulation).
    """
    if _demo_mode or _pool is None:
        return None
    try:
        async with _pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT ts, mirror_type, consumption_gm2, line_speed, bath_temperature
                   FROM silver_snapshots
                   WHERE ts >= NOW() - ($1 || ' hours')::INTERVAL
                   ORDER BY ts ASC""",
                str(hours),
            )
        return [
            {
                "timestamp": row["ts"].isoformat(),
                "silver_consumption_gm2": round(row["consumption_gm2"], 2),
                "line_speed": round(row["line_speed"], 2),
                "bath_temperature": round(row["bath_temperature"], 1),
                "mirror_type": row["mirror_type"],
            }
            for row in rows
        ]
    except Exception as e:
        print(f"[db] query_history failed: {e}")
        return None
