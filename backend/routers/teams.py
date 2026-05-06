import asyncio
from fastapi import APIRouter, HTTPException
from nba_api.stats.endpoints import leaguedashteamstats
from nba_api.stats.static import teams as nba_teams
import cache
from nba_headers import STATS_HEADERS, PROXY

router = APIRouter()

# Build a TEAM_ID -> abbreviation lookup once at import time.
_ABBR_BY_ID: dict[int, str] = {
    t["id"]: t["abbreviation"] for t in nba_teams.get_teams()
}


@router.get("")
def get_all_teams():
    return nba_teams.get_teams()


@router.get("/stats")
async def get_team_stats(
    season: str = "2024-25",
    season_type: str = "Regular Season",
    measure_type: str = "Base",
    per_mode: str = "PerGame",
):
    key = f"team_stats:{season}:{season_type}:{measure_type}:{per_mode}"
    cached = cache.get(key, ttl=1800)
    if cached is not None:
        return cached

    try:
        endpoint = await asyncio.to_thread(
            leaguedashteamstats.LeagueDashTeamStats,
            season=season,
            season_type_all_star=season_type,
            measure_type_detailed_defense=measure_type,
            per_mode_detailed=per_mode,
            headers=STATS_HEADERS,
            proxy=PROXY,
            timeout=90,
        )
        data = endpoint.get_data_frames()[0].to_dict(orient="records")
        for row in data:
            row["TEAM_ABBREVIATION"] = _ABBR_BY_ID.get(row.get("TEAM_ID"), "")
        cache.set(key, data)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"stats.nba.com unreachable: {type(e).__name__}: {e}",
        )
