import asyncio
import pandas as pd
from fastapi import APIRouter, HTTPException
from nba_api.stats.endpoints import leaguedashplayerstats, playercareerstats, playerindex, playergamelog
from nba_api.stats.static import players as nba_players
import cache
from nba_headers import STATS_HEADERS, PROXY

router = APIRouter()


async def _get_position_map(season: str) -> dict[int, str]:
    """Returns {player_id: position_string} for a given season, cached for 6 hours."""
    key = f"positions:{season}"
    cached = cache.get(key, ttl=21600)
    if cached is not None:
        return cached

    endpoint = await asyncio.to_thread(
        playerindex.PlayerIndex,
        season=season,
        headers=STATS_HEADERS,
        proxy=PROXY,
        timeout=90,
    )
    df = endpoint.get_data_frames()[0][["PERSON_ID", "POSITION"]]
    # Normalize "G-F" → "G/F", strip blanks
    pos_map = {
        int(row.PERSON_ID): row.POSITION.replace("-", "/") if row.POSITION else ""
        for row in df.itertuples()
    }
    cache.set(key, pos_map)
    return pos_map


@router.get("")
def get_all_players():
    return nba_players.get_players()


@router.get("/search")
def search_players(q: str):
    q_lower = q.lower()
    all_p = nba_players.get_players()
    exact = [p for p in all_p if p["full_name"].lower() == q_lower]
    if exact:
        return exact[:1]
    return [p for p in all_p if q_lower in p["full_name"].lower()][:5]


@router.get("/stats")
async def get_player_stats(
    season: str = "2025-26",
    season_type: str = "Regular Season",
    measure_type: str = "Base",
    per_mode: str = "PerGame",
):
    key = f"player_stats:{season}:{season_type}:{measure_type}:{per_mode}"
    cached = cache.get(key, ttl=21600)
    if cached is not None:
        return cached

    try:
        stats_task = asyncio.to_thread(
            leaguedashplayerstats.LeagueDashPlayerStats,
            season=season,
            season_type_all_star=season_type,
            measure_type_detailed_defense=measure_type,
            per_mode_detailed=per_mode,
            headers=STATS_HEADERS,
            proxy=PROXY,
            timeout=90,
        )
        # Fetch stats and positions concurrently
        endpoint, pos_map = await asyncio.gather(
            stats_task, _get_position_map(season)
        )
        records = endpoint.get_data_frames()[0].to_dict(orient="records")
        for row in records:
            row["POSITION"] = pos_map.get(int(row["PLAYER_ID"]), "")
        cache.set(key, records)
        return records
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"stats.nba.com unreachable: {type(e).__name__}: {e}",
        )


@router.get("/{player_id}/gamelog")
async def get_player_gamelog(player_id: int, season: str = "2025-26", last_n: int = 5):
    key = f"player_gamelog:{player_id}:{season}:{last_n}"
    cached = cache.get(key, ttl=300)
    if cached is not None:
        return cached

    def _fetch(season_type: str):
        return playergamelog.PlayerGameLog(
            player_id=player_id,
            season=season,
            season_type_all_star=season_type,
            headers=STATS_HEADERS,
            proxy=PROXY,
            timeout=90,
        )

    try:
        reg_result, po_result = await asyncio.gather(
            asyncio.to_thread(_fetch, "Regular Season"),
            asyncio.to_thread(_fetch, "Playoffs"),
            return_exceptions=True,
        )

        dfs = []
        for result in (reg_result, po_result):
            if isinstance(result, Exception):
                continue
            df = result.get_data_frames()[0]
            if not df.empty:
                dfs.append(df)

        if not dfs:
            return []

        combined = pd.concat(dfs, ignore_index=True)
        combined["_sort"] = pd.to_datetime(combined["GAME_DATE"])
        combined = combined.sort_values("_sort", ascending=False).drop(columns=["_sort"])

        records = combined.head(last_n).to_dict(orient="records")
        cache.set(key, records)
        return records
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"stats.nba.com unreachable: {type(e).__name__}: {e}",
        )


@router.get("/{player_id}/career")
async def get_player_career(player_id: int):
    key = f"player_career:{player_id}"
    cached = cache.get(key, ttl=3600)
    if cached is not None:
        return cached

    try:
        endpoint = await asyncio.to_thread(
            playercareerstats.PlayerCareerStats,
            player_id=player_id,
            per_mode36="PerGame",
            headers=STATS_HEADERS,
            proxy=PROXY,
            timeout=90,
        )
        data = endpoint.get_data_frames()[0].to_dict(orient="records")
        cache.set(key, data)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"stats.nba.com unreachable: {type(e).__name__}: {e}",
        )
