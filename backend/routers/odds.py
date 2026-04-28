import asyncio
import os
import httpx
import pandas as pd
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException
from nba_api.stats.endpoints import playergamelog as _playergamelog_ep
from nba_api.stats.static import players as _nba_players
from nba_headers import STATS_HEADERS, PROXY
import cache

_STAT_KEYS = {"points": "PTS", "rebounds": "REB", "assists": "AST"}

_ET = ZoneInfo("America/New_York")


def _today_et_bounds() -> tuple[str, str]:
    """Return (start_of_day_utc_iso, end_of_day_utc_iso) for today in ET."""
    now_et = datetime.now(_ET)
    start = now_et.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    end = now_et.replace(hour=23, minute=59, second=59, microsecond=0).astimezone(timezone.utc)
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    return start.strftime(fmt), end.strftime(fmt)


def _is_today_et(iso_time: str) -> bool:
    dt = datetime.fromisoformat(iso_time.replace("Z", "+00:00"))
    return dt.astimezone(_ET).date() == datetime.now(_ET).date()

router = APIRouter()

_API_KEY = os.getenv("THE_ODDS_API_KEY", "")
_BASE = "https://api.the-odds-api.com/v4"
_SPORT = "basketball_nba"
_PRIORITY = ["draftkings", "fanduel", "betmgm", "caesars", "williamhill_us"]


def _implied(price: int) -> float:
    if price > 0:
        return 100 / (price + 100)
    return abs(price) / (abs(price) + 100)


def _best_outcomes(bookmakers: list, market_key: str) -> list | None:
    for bk_key in _PRIORITY:
        for bk in bookmakers:
            if bk["key"] == bk_key:
                for m in bk.get("markets", []):
                    if m["key"] == market_key:
                        return m["outcomes"]
    for bk in bookmakers:
        for m in bk.get("markets", []):
            if m["key"] == market_key:
                return m["outcomes"]
    return None


def _process_game(game: dict) -> dict:
    home = game["home_team"]
    away = game["away_team"]
    bms = game.get("bookmakers", [])
    out: dict = {
        "id": game["id"],
        "home_team": home,
        "away_team": away,
        "commence_time": game["commence_time"],
        "h2h": None,
        "spread": None,
        "total": None,
    }

    h2h = _best_outcomes(bms, "h2h")
    if h2h:
        ho = next((o for o in h2h if o["name"] == home), None)
        ao = next((o for o in h2h if o["name"] == away), None)
        if ho and ao:
            hi, ai = _implied(ho["price"]), _implied(ao["price"])
            t = hi + ai
            out["h2h"] = {
                "home_odds": ho["price"],
                "away_odds": ao["price"],
                "home_win_pct": round(hi / t * 100, 1),
                "away_win_pct": round(ai / t * 100, 1),
            }

    spread = _best_outcomes(bms, "spreads")
    if spread:
        ho = next((o for o in spread if o["name"] == home), None)
        ao = next((o for o in spread if o["name"] == away), None)
        if ho and ao:
            out["spread"] = {
                "home_spread": ho.get("point"),
                "away_spread": ao.get("point"),
                "home_odds": ho["price"],
                "away_odds": ao["price"],
            }

    total = _best_outcomes(bms, "totals")
    if total:
        ov = next((o for o in total if o["name"] == "Over"), None)
        un = next((o for o in total if o["name"] == "Under"), None)
        if ov and un:
            out["total"] = {
                "line": ov.get("point"),
                "over_odds": ov["price"],
                "under_odds": un["price"],
            }

    return out


def _extract_props(event_data: dict, game_meta: dict) -> list[dict]:
    STAT_MAP = {
        "player_points": "points",
        "player_rebounds": "rebounds",
        "player_assists": "assists",
    }
    bms = event_data.get("bookmakers", [])
    bk = None
    for bk_key in _PRIORITY:
        bk = next((b for b in bms if b["key"] == bk_key), None)
        if bk:
            break
    if not bk and bms:
        bk = bms[0]
    if not bk:
        return []

    player_map: dict[str, dict] = {}
    for market in bk.get("markets", []):
        stat = STAT_MAP.get(market["key"])
        if not stat:
            continue
        for outcome in market.get("outcomes", []):
            pname = outcome.get("description")
            if not pname:
                continue
            side = outcome["name"]  # "Over" or "Under"
            if pname not in player_map:
                player_map[pname] = {
                    "player": pname,
                    "game_id": game_meta["id"],
                    "home_team": game_meta["home_team"],
                    "away_team": game_meta["away_team"],
                    "commence_time": game_meta["commence_time"],
                    "props": {},
                }
            if stat not in player_map[pname]["props"]:
                player_map[pname]["props"][stat] = {}
            player_map[pname]["props"][stat][side] = {
                "price": outcome["price"],
                "line": outcome.get("point"),
            }

    result = []
    for p in player_map.values():
        clean: dict = {}
        for stat, sides in p["props"].items():
            if "Over" in sides and "Under" in sides:
                clean[stat] = {
                    "line": sides["Over"]["line"],
                    "over_odds": sides["Over"]["price"],
                    "under_odds": sides["Under"]["price"],
                }
        if clean:
            p["props"] = clean
            result.append(p)
    return result


@router.get("/games")
async def get_today_games():
    today_str = datetime.now(_ET).strftime("%Y-%m-%d")
    cache_key = f"odds:games:{today_str}"
    cached = cache.get(cache_key, ttl=300)
    if cached is not None:
        return cached

    if not _API_KEY:
        raise HTTPException(
            status_code=503,
            detail="THE_ODDS_API_KEY not configured. Add it to backend/.env and restart the server.",
        )

    commence_from, commence_to = _today_et_bounds()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_BASE}/sports/{_SPORT}/odds",
            params={
                "apiKey": _API_KEY,
                "regions": "us",
                "markets": "h2h,spreads,totals",
                "oddsFormat": "american",
                "dateFormat": "iso",
                "commenceTimeFrom": commence_from,
                "commenceTimeTo": commence_to,
            },
            timeout=15,
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Odds API returned {resp.status_code}: {resp.text[:300]}",
        )

    # Also filter locally in case the API returns games outside today ET
    today_games = [g for g in resp.json() if _is_today_et(g["commence_time"])]
    games = [_process_game(g) for g in today_games]
    cache.set(cache_key, games)
    return games


@router.get("/props")
async def get_today_props():
    today_str = datetime.now(_ET).strftime("%Y-%m-%d")
    cache_key = f"odds:props:{today_str}"
    cached = cache.get(cache_key, ttl=300)
    if cached is not None:
        return cached

    if not _API_KEY:
        raise HTTPException(
            status_code=503,
            detail="THE_ODDS_API_KEY not configured.",
        )

    games = await get_today_games()

    async def _fetch_game_props(client: httpx.AsyncClient, game: dict) -> list[dict]:
        try:
            resp = await client.get(
                f"{_BASE}/sports/{_SPORT}/events/{game['id']}/odds",
                params={
                    "apiKey": _API_KEY,
                    "regions": "us",
                    "markets": "player_points,player_rebounds,player_assists",
                    "oddsFormat": "american",
                },
                timeout=15,
            )
            if resp.status_code == 200:
                return _extract_props(resp.json(), game)
        except Exception:
            pass
        return []

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[_fetch_game_props(client, g) for g in games])

    all_props: list[dict] = [prop for game_props in results for prop in game_props]
    cache.set(cache_key, all_props)
    return all_props


# ── Helpers for recommendations ───────────────────────────────────────────────

def _find_player_id(name: str, all_players: list) -> int | None:
    name_lo = name.lower()
    # Exact match
    for p in all_players:
        if p["full_name"].lower() == name_lo:
            return p["id"]
    # Strip punctuation (handles "P.J. Washington" vs "PJ Washington")
    stripped = name_lo.replace(".", "").replace("-", " ").replace("  ", " ").strip()
    for p in all_players:
        p_stripped = p["full_name"].lower().replace(".", "").replace("-", " ").replace("  ", " ").strip()
        if p_stripped == stripped:
            return p["id"]
    # Partial last-resort
    for p in all_players:
        if name_lo in p["full_name"].lower():
            return p["id"]
    return None


async def _get_gamelog(player_id: int, season: str, sem: asyncio.Semaphore) -> list[dict]:
    """Combined reg season + playoffs gamelog, sharing the same cache as the /gamelog endpoint."""
    key = f"player_gamelog:{player_id}:{season}:5"
    cached = cache.get(key, ttl=300)
    if cached is not None:
        return cached

    def _fetch(st: str):
        return _playergamelog_ep.PlayerGameLog(
            player_id=player_id,
            season=season,
            season_type_all_star=st,
            headers=STATS_HEADERS,
            proxy=PROXY,
            timeout=90,
        )

    async with sem:
        reg, po = await asyncio.gather(
            asyncio.to_thread(_fetch, "Regular Season"),
            asyncio.to_thread(_fetch, "Playoffs"),
            return_exceptions=True,
        )

    dfs = []
    for r in (reg, po):
        if isinstance(r, Exception):
            continue
        df = r.get_data_frames()[0]
        if not df.empty:
            dfs.append(df)

    if not dfs:
        return []

    combined = pd.concat(dfs, ignore_index=True)
    combined["_s"] = pd.to_datetime(combined["GAME_DATE"])
    combined = combined.sort_values("_s", ascending=False).drop(columns=["_s"])
    records = combined.head(5).to_dict(orient="records")
    cache.set(key, records)
    return records


# ── Recommendations endpoint ──────────────────────────────────────────────────

@router.get("/recommendations")
async def get_recommendations(season: str = "2025-26", top_n: int = 12):
    today_str = datetime.now(_ET).strftime("%Y-%m-%d")
    cache_key = f"odds:recommendations:{today_str}:{season}"
    cached = cache.get(cache_key, ttl=300)
    if cached is not None:
        return cached

    props = await get_today_props()
    if not props:
        return []

    all_players = _nba_players.get_players()
    sem = asyncio.Semaphore(5)  # leave threads free for concurrent page requests

    async def analyze(prop_row: dict) -> dict | None:
        player_id = _find_player_id(prop_row["player"], all_players)
        if not player_id:
            return None

        try:
            gamelog = await _get_gamelog(player_id, season, sem)
        except Exception:
            return None

        if not gamelog:
            return None

        stat_results: dict = {}
        for stat, nba_key in _STAT_KEYS.items():
            prop = prop_row["props"].get(stat)
            if not prop:
                continue
            line = prop["line"]
            results = [
                {"value": float(g.get(nba_key) or 0), "hit": float(g.get(nba_key) or 0) > line}
                for g in gamelog
            ]
            stat_results[stat] = {
                "line": line,
                "hits": sum(r["hit"] for r in results),
                "games": len(results),
                "results": results,
            }

        if not stat_results:
            return None

        best_stat, best_data = max(
            stat_results.items(),
            key=lambda x: (x[1]["hits"], x[1]["hits"] / max(x[1]["games"], 1)),
        )

        if best_data["hits"] < 3:
            return None

        return {
            "player": prop_row["player"],
            "away_team": prop_row["away_team"],
            "home_team": prop_row["home_team"],
            "best_stat": best_stat,
            "best_line": best_data["line"],
            "best_hits": best_data["hits"],
            "games_checked": best_data["games"],
            "best_results": best_data["results"],
            "all_stats": stat_results,
        }

    results = await asyncio.gather(*[analyze(p) for p in props], return_exceptions=True)
    recs = [r for r in results if r and not isinstance(r, Exception)]
    recs.sort(
        key=lambda x: (
            x["best_hits"],
            sum(s["hits"] for s in x["all_stats"].values()),
        ),
        reverse=True,
    )

    cache.set(cache_key, recs[:top_n])
    return recs[:top_n]
