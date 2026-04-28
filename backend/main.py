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
    try:
        logger.info("Cache warm: fetching today's props...")
        await odds.get_today_props()
        logger.info("Cache warm: warming recommendations, player stats, and team stats concurrently...")
        await asyncio.gather(
            odds.get_recommendations(),
            players.get_player_stats(),
            teams.get_team_stats(),
            return_exceptions=True,
        )
        logger.info("Cache warm: done ✓")
    except Exception as e:
        logger.warning(f"Cache warm skipped: {type(e).__name__}: {e}")


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
