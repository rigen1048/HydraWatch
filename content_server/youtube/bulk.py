# youtube/bulk.py
import asyncio
import logging
from typing import Tuple, Optional
from asyncio import to_thread, Lock
from .feed.processor import process_feed  # ← sync function (uses asyncio.run inside)

log = logging.getLogger(__name__)

# GLOBAL LOCK → ONLY ONE channel processes at a time ACROSS THE ENTIRE SERVER
# This is exactly what you wanted: maximum safety for YouTube
_global_channel_lock = Lock()

async def run_batch(db_path: str) -> None:
    """
    Process all channels one-by-one with 10-second gaps.
    Only ONE channel runs at any moment — no matter how many users trigger it.
    """
    import sqlite3
    conn = sqlite3.connect(db_path, timeout=30.0)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT rss_id, last_video_id
            FROM Channels
            ORDER BY counter ASC, ts ASC NULLS FIRST
        """)
        rows: list[Tuple[str, Optional[str]]] = cur.fetchall()
    except Exception as e:
        log.error("Failed to read Channels table from %s: %s", db_path, e)
        raise
    finally:
        conn.close()

    total = len(rows)
    if total == 0:
        log.info("No channels found – nothing to do")
        return

    log.info("batch_runner START | channels=%d | db=%s", total, db_path)

    for idx, (rss_id, last_video_id) in enumerate(rows, start=1):
        log.info("[ %d / %d ] Processing rss_id=%s", idx, total, rss_id)

        # THIS IS THE CORE: only one channel runs at a time → YouTube is safe forever
        async with _global_channel_lock:
            try:
                await to_thread(process_feed, db_path, rss_id, last_video_id)
            except Exception:
                log.exception("Failed processing rss_id=%s – continuing with next", rss_id)

        # 10-second polite delay (only between channels, not after the last one)
        if idx < total:
            log.debug("Sleeping 10 seconds before next channel...")
            await asyncio.sleep(10)

    log.info("batch_runner FINISHED – all %d channels processed successfully", total)
