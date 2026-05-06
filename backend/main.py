from dotenv import load_dotenv
load_dotenv()

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import players, teams, live, odds

logger = logging.getLogger("uvicorn.error")


async def _warm_cache():
    """
    Pre-fetch the slow endpoints on startup so the first user hits warm cache.
    Each step swallows its own failures so one outage doesn't block the others.
    """
    async def _safe(label: str, coro):
        try:
            await coro
            logger.info(f"Cache warm: {label} ✓")
        except Exception as e:
            logger.warning(f"Cache warm: {label} skipped — {type(e).__name__}: {e}")

    # Player + team season stats — what /players and /teams open with.
    # Run in parallel; each underlying NBA endpoint is independent.
    await asyncio.gather(
        _safe("player stats (Base)", players.get_player_stats(measure_type="Base")),
        _safe("player stats (Advanced)", players.get_player_stats(measure_type="Advanced")),
        _safe("team stats (Base)", teams.get_team_stats(season="2025-26", measure_type="Base")),
        _safe("team stats (Advanced)", teams.get_team_stats(season="2025-26", measure_type="Advanced")),
    )

    # Odds pipeline — get_recommendations chains through props → games.
    await _safe("today's props", odds.get_today_props())
    await _safe("recommendations (~30s)", odds.get_recommendations())
    logger.info("Cache warm: done")


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_warm_cache())
    yield


app = FastAPI(title="NBA Stat API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router, prefix="/api/players", tags=["players"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(live.router, prefix="/api/live", tags=["live"])
app.include_router(odds.router, prefix="/api/odds", tags=["odds"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
