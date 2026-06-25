# NBA Stat App

A full-stack NBA statistics dashboard with live game tracking, player/team analytics, and betting prop recommendations.

## Features

- **Players**: League-wide player stats (Traditional & Advanced), sortable table, player detail card with shooting efficiency bars, follow/pin players
- **Teams**: Team stats with conference filter (East/West), Base & Advanced metrics (ORTG, DRTG, Net Rating, Pace), team logo display
- **Live**: Live play-by-play scoreboard for games in progress
- **Props**: Today's player prop recommendations based on recent game logs vs. betting lines (points, rebounds, assists)
- **Dark mode**: Toggle between light and dark themes, persisted in `localStorage`
- **Search & My Team**: Global player/team search and a personal team filter

## Tech Stack

### Backend
| | |
|---|---|
| Framework | FastAPI + Uvicorn |
| NBA data | `nba_api` (stats.nba.com) |
| Betting odds | The Odds API |
| Caching | In-process pickle cache (`backend/.cache/`) |
| Language | Python 3.11+ |

### Frontend
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Data fetching | TanStack Query (React Query) |
| Routing | React Router v7 |
| HTTP client | Axios |

## Project Structure

```
NBA Stat App/
├── backend/
│   ├── main.py              # FastAPI app, startup cache warming
│   ├── cache.py             # Pickle-based disk cache
│   ├── nba_headers.py       # stats.nba.com request headers + proxy config
│   ├── requirements.txt
│   └── routers/
│       ├── players.py       # /api/players — stats, gamelog, career
│       ├── teams.py         # /api/teams — stats
│       ├── live.py          # /api/live — live scoreboard & play-by-play
│       └── odds.py          # /api/odds — games, props, recommendations
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── PlayersPage.tsx
    │   │   ├── TeamsPage.tsx
    │   │   ├── LivePage.tsx
    │   │   └── PropsPage.tsx
    │   ├── components/      # Header, TeamDot, PlayerAvatar, Sparkline, etc.
    │   ├── api/             # Typed fetch wrappers per resource
    │   └── context/
    │       └── AppContext.tsx  # Global query, scope, myTeam, dark mode state
    └── package.json
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free API key from [the-odds-api.com](https://the-odds-api.com) (for props/recommendations)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
THE_ODDS_API_KEY=your_key_here

# Optional: route NBA API requests through a proxy
# NBA_PROXY=http://host:port
```

Start the server:

```bash
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. On startup it pre-warms the cache for player stats, team stats, and today's props in the background.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/players/stats` | Season player stats (`measure_type`, `per_mode`, `season_type`) |
| GET | `/api/players/{id}/gamelog` | Last N games for a player |
| GET | `/api/players/{id}/career` | Career per-game stats |
| GET | `/api/teams/stats` | Season team stats |
| GET | `/api/live` | Today's live scoreboard |
| GET | `/api/odds/games` | Today's games with moneyline, spread, total |
| GET | `/api/odds/props` | Today's player props (PTS/REB/AST) |
| GET | `/api/odds/recommendations` | Top prop picks backed by recent game logs |
| GET | `/api/health` | Health check |

## Caching

- **NBA stats** — cached 30 minutes (`ttl=1800`)
- **Odds / props** — cached 5 minutes (`ttl=300`)
- **Recommendations** — cached 15 minutes (`ttl=900`)
- **Player positions** — cached 6 hours (`ttl=21600`)

Cache is stored on disk at `backend/.cache/cache.pkl` and survives server restarts. Delete the file to force a fresh fetch.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `THE_ODDS_API_KEY` | Yes (for Props page) | API key from the-odds-api.com |
| `NBA_PROXY` | No | HTTP/SOCKS5 proxy for stats.nba.com requests |
