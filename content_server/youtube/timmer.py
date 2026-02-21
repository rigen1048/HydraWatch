# (db_path: str, rss_id: str, last_video_id: Optional[str]) -> None
from .feed.processor import process_feed
import sqlite3
import asyncio
import logging
import time
from pathlib import Path
from typing import Optional, Tuple

log = logging.getLogger(__name__)

# 5 minutes after successful processing
SLEEP_AFTER_PROCESS_SEC = 10
SLEEP_WHEN_NOTHING_SCHEDULED = 12 * 3600  # 12 hours
SAFETY_MARGIN_SEC = 5.0

QUERY_EARLIEST_DUE = """
    SELECT rss_id, last_video_id, ts, ts_read
    FROM Channels
    WHERE ts IS NOT NULL
    ORDER BY ts ASC
    LIMIT 1
"""

QUERY_HAS_ANY_SCHEDULED = """
    SELECT 1 FROM Channels WHERE ts IS NOT NULL LIMIT 1
"""

# Assume this exists and is synchronous


def get_earliest_due(conn: sqlite3.Connection) -> Optional[Tuple[str, Optional[str], float, Optional[str]]]:
    cur = conn.cursor()
    cur.execute(QUERY_EARLIEST_DUE)
    row = cur.fetchone()
    if row:
        # Make sure ts is float (Unix timestamp)
        return (row[0], row[1], float(row[2]), row[3])
    return None


def has_any_scheduled(conn: sqlite3.Connection) -> bool:
    cur = conn.cursor()
    cur.execute(QUERY_HAS_ANY_SCHEDULED)
    return cur.fetchone() is not None


async def run_loop(db_path: str):
    log.info("Persistent feed processor started: %s", db_path)
    conn: Optional[sqlite3.Connection] = None

    try:
        conn = sqlite3.connect(
            db_path,
            timeout=15,
            isolation_level=None,  # autocommit
        )
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=5000")

        while True:
            now = time.time()   # ← fixed: wall-clock time

            try:
                row = get_earliest_due(conn)
                if row:
                    rss_id, last_video_id, ts_unix, ts_read = row

                    if now >= ts_unix:
                        # Already due
                        log.info("Due (past ts) → processing %s (ts=%s)",
                                 rss_id, ts_read or ts_unix)
                        await asyncio.to_thread(
                            process_feed,
                            db_path,
                            rss_id,
                            last_video_id
                        )
                        log.debug("process_feed done → sleeping %d min",
                                  SLEEP_AFTER_PROCESS_SEC // 60)
                        await asyncio.sleep(SLEEP_AFTER_PROCESS_SEC)
                        # continue → check again immediately (good for burst of due items)
                    else:
                        # Sleep until due
                        delay = ts_unix - now + SAFETY_MARGIN_SEC
                        delay = max(3.0, delay)
                        friendly_min = delay / 60
                        friendly_h = delay / 3600
                        if friendly_h >= 2:
                            log.info("Next due in ~%.1f hours → %s at %s",
                                     friendly_h, rss_id, ts_read or ts_unix)
                        else:
                            log.info("Next due in ~%.1f min → %s at %s",
                                     friendly_min, rss_id, ts_read or ts_unix)
                        await asyncio.sleep(delay)
                        continue

                # No scheduled channels
                if not has_any_scheduled(conn):
                    log.info("No scheduled channels at all → sleeping 12 hours")
                    await asyncio.sleep(SLEEP_WHEN_NOTHING_SCHEDULED)
                else:
                    # Rare/inconsistent DB state
                    log.warning(
                        "Has rows but no valid earliest ts — retry in 90s")
                    await asyncio.sleep(90)

            except sqlite3.OperationalError as e:
                if "database is locked" in str(e).lower():
                    log.warning("DB locked → wait & retry")
                    await asyncio.sleep(10)
                else:
                    raise
            except Exception as e:
                log.exception("Error in processor loop for %s", db_path)
                await asyncio.sleep(45)  # backoff

    except Exception as e:
        log.error("Processor loop hard crash: %s", db_path, exc_info=True)
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


async def process_one_db(db_path: str):
    try:
        await run_loop(db_path)
    except asyncio.CancelledError:
        log.info("Processor task cancelled: %s", db_path)
    except Exception as e:
        log.error("Feed processor died: %s", db_path, exc_info=True)


async def start_feed_processors(db_directory: str | Path):
    db_dir = Path(db_directory).resolve()
    if not db_dir.is_dir():
        log.error("Not a directory: %s", db_dir)
        return

    db_files = list(db_dir.glob("*.db"))
    if not db_files:
        log.warning("No .db files found in %s", db_dir)
        return

    log.info("Launching %d independent feed processor tasks", len(db_files))

    tasks = []
    for p in db_files:
        path_str = str(p)
        task = asyncio.create_task(process_one_db(path_str))
        tasks.append(task)
        log.debug("Task created for: %s", path_str)

    # Keep the program alive until cancelled (Ctrl+C) or tasks die
    await asyncio.gather(*tasks, return_exceptions=True)
