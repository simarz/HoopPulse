import asyncio
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from nba_api.live.nba.endpoints import scoreboard, playbyplay

router = APIRouter()


@router.get("/scoreboard")
async def get_scoreboard():
    try:
        board = await asyncio.to_thread(scoreboard.ScoreBoard)
        return board.get_dict()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"nba_api error: {e}")


@router.websocket("/ws/{game_id}")
async def ws_playbyplay(websocket: WebSocket, game_id: str):
    await websocket.accept()
    try:
        while True:
            try:
                pbp = await asyncio.to_thread(playbyplay.PlayByPlay, game_id=game_id)
                await websocket.send_json(pbp.get_dict())
            except Exception as e:
                await websocket.send_json({"error": str(e)})
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass
