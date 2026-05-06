import os
import pickle
import threading
import time
from pathlib import Path
from typing import Any, Optional

_CACHE_DIR = Path(__file__).parent / ".cache"
_CACHE_FILE = _CACHE_DIR / "cache.pkl"

_lock = threading.Lock()
_store: dict[str, tuple[Any, float]] = {}


def _load() -> None:
    global _store
    if not _CACHE_FILE.exists():
        return
    try:
        with open(_CACHE_FILE, "rb") as f:
            loaded = pickle.load(f)
        if isinstance(loaded, dict):
            _store = loaded
    except Exception:
        # Corrupted cache file — start fresh rather than crashing the server.
        _store = {}


def _save_unlocked() -> None:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _CACHE_FILE.with_suffix(".pkl.tmp")
    with open(tmp, "wb") as f:
        pickle.dump(_store, f, protocol=pickle.HIGHEST_PROTOCOL)
    os.replace(tmp, _CACHE_FILE)


_load()


def get(key: str, ttl: int = 300) -> Optional[Any]:
    with _lock:
        if key in _store:
            value, ts = _store[key]
            if time.time() - ts < ttl:
                return value
            del _store[key]
    return None


def set(key: str, value: Any) -> None:
    with _lock:
        _store[key] = (value, time.time())
        try:
            _save_unlocked()
        except Exception:
            # Disk full / readonly — keep the in-memory entry and move on.
            pass
