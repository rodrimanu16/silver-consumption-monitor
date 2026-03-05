from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import asyncio

from server.data import simulate_current_snapshot, simulate_history, simulate_parameter_impact
from server.routes.chat import router as chat_router
from server.routes.optimize import router as optimize_router
from server import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_db()
    yield
    await db.close_db()


app = FastAPI(title="Silver Consumption Monitor", lifespan=lifespan)
app.include_router(chat_router)
app.include_router(optimize_router)


# ─── API routes ───────────────────────────────────────────────────────────────

@app.get("/api/realtime")
async def get_realtime():
    """Current production snapshot — poll every few seconds. Persists to Lakebase."""
    snap = simulate_current_snapshot()
    asyncio.create_task(db.insert_snapshot(snap))
    return snap


@app.get("/api/history")
async def get_history(hours: int = Query(default=24, ge=1, le=168)):
    """Historical silver consumption — reads from Lakebase, falls back to simulation."""
    rows = await db.query_history(hours)
    if rows is not None and len(rows) >= 2:
        return rows
    return simulate_history(hours=hours)


@app.get("/api/parameters")
def get_parameter_impact():
    """Ranked list of parameters and their impact on silver consumption."""
    return simulate_parameter_impact()


# ─── Serve React SPA ──────────────────────────────────────────────────────────

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))
