# processor.py
import logging
from datetime import datetime, timedelta
from typing import List, Optional
import sqlite3
import asyncio
from .fetcher import feed_fetcher, Video
from .ts_proc import predict_ts

log = logging.getLogger(__name__)

# ==================================================================
# SQL Queries
# ==================================================================
QUERIES = {
    "upsert_channel": """
        INSERT INTO Channel (channel_name, channel_url)
        VALUES (?, ?)
        ON CONFLICT(channel_url) DO UPDATE SET
            channel_name = excluded.channel_name
    """,
    "get_channel_fk": """
        SELECT id_channel FROM Channel WHERE channel_url = ?
    """,
    "upsert_channels_tracking": """
        INSERT INTO Channels (rss_id, last_video_id, ts, ts_read, rank, counter, id_channel)
        VALUES (?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(rss_id) DO UPDATE SET
            last_video_id = excluded.last_video_id,
            ts = excluded.ts,
            ts_read = excluded.ts_read,
            rank = excluded.rank,
            counter = 0,
            id_channel = excluded.id_channel
    """,
    "get_counter_rank": """
        SELECT counter, rank FROM Channels WHERE rss_id = ?
    """,
    "update_tracking_no_new": """
        UPDATE Channels SET
            counter = ?,
            rank = ?,
            ts = ?,
            ts_read = ?
        WHERE rss_id = ?
    """,
    "insert_video": """
        INSERT OR IGNORE INTO Result (title, video_url, thumbnail, channel_id)
        VALUES (?, ?, ?, ?)
    """,
}

def _get_next_rank(current: Optional[str]) -> str:
    order = ["day", "dual", "week", "month", "abandoned"]
    if current not in order:
        return "day"
    idx = order.index(current)
    return order[min(idx + 1, len(order) - 1)]

def _handle_no_new(conn: sqlite3.Connection, rss_id: str, is_error: bool = False) -> None:
    cur = conn.cursor()
    cur.execute(QUERIES["get_counter_rank"], (rss_id,))
    row = cur.fetchone()
    if row:
        counter, rank = row
    else:
        counter = 0
        rank = "day"
        log.info("No tracking row for rss_id=%s → starting with day rank on no-new", rss_id)

    counter += 1
    new_rank = rank
    if counter > 5:
        new_rank = _get_next_rank(rank)
        counter = 0
        log.info("Rank promoted to %s for rss_id=%s", new_rank, rss_id)

    delay_days = {
        "day": 1,
        "dual": 2,
        "week": 7,
        "month": 30,
        "abandoned": 365,
    }.get(new_rank, 7)

    now = datetime.now()
    next_dt = now + timedelta(days=delay_days)
    next_ts = int(next_dt.timestamp())
    next_ts_read = next_dt.strftime('%Y-%m-%d %H:%M')

    cur.execute(
        QUERIES["update_tracking_no_new"],
        (counter, new_rank, next_ts, next_ts_read, rss_id),
    )
    if cur.rowcount == 0:
        log.warning("No tracking row to update for rss_id=%s during no-new handling", rss_id)
    else:
        conn.commit()

    reason = "error" if is_error else "no new videos"
    log.info(
        "No new videos (%s) → rss_id=%s | counter=%d | rank=%s | next check: %s",
        reason, rss_id, counter, new_rank, next_ts_read,
    )

def _save_data(
    conn: sqlite3.Connection,
    videos: List[Video],
    latest_video_id: str,
    channel_name: str,
    channel_url: str,
    next_ts: int,
    next_ts_read: str,
    rank: str,
    rss_id: str,
) -> None:
    cur = conn.cursor()
    # 1. Upsert channel by unique channel_url
    cur.execute(QUERIES["upsert_channel"], (channel_name, channel_url))
    cur.execute(QUERIES["get_channel_fk"], (channel_url,))
    row = cur.fetchone()
    if not row:
        raise RuntimeError(f"Channel url '{channel_url}' not found after upsert")
    channel_fk = row[0]

    # 2. Update tracking – reset counter, set predicted rank/ts
    cur.execute(
        QUERIES["upsert_channels_tracking"],
        (rss_id, latest_video_id, next_ts, next_ts_read, rank, channel_fk),
    )

    # 3. Insert new videos
    for video in videos:
        cur.execute(
            QUERIES["insert_video"],
            (video.title, video.url, video.thumbnail, channel_fk),
        )

    conn.commit()
    log.info(
        "SUCCESS → %s | +%d new videos | rank=%s | next check: %s",
        channel_name,
        len(videos),
        rank,
        next_ts_read,
    )

def process_feed(db_path: str, rss_id: str, video_id: Optional[str] = None) -> None:
    conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        result = asyncio.run(feed_fetcher(rss_id, video_id))

        if result is None:
            log.warning("Fetcher returned None → treating as error for rss_id=%s", rss_id)
            _handle_no_new(conn, rss_id, is_error=True)

        elif result == "old":
            _handle_no_new(conn, rss_id, is_error=False)

        else:
            # Success with new videos: recent_timestamps, new_videos, latest_video_id, channel_name, channel_url
            pre_ts, new_videos, latest_video_id, channel_name, channel_url = result

            # ──────────────────────────────
            # Next check prediction (only on success with new videos)
            # ──────────────────────────────
            try:
                if pre_ts:
                    ts_read, ts, rank = predict_ts(pre_ts[-20:])
                else:
                    # Brand new – no history
                    tomorrow = datetime.now() + timedelta(days=1)
                    next_dt = tomorrow.replace(hour=23, minute=59, second=0, microsecond=0)
                    ts_read = next_dt.strftime('%Y-%m-%d %H:%M')
                    ts = int(next_dt.timestamp())
                    rank = "day"
                    log.info("No timestamp history → scheduling tomorrow 23:59, rank=day")
            except Exception as exc:
                log.warning("predict_ts failed → funcategorizedback +7 days | %s", exc)
                funcategorizedback_dt = datetime.now() + timedelta(days=7)
                ts_read = funcategorizedback_dt.strftime('%Y-%m-%d %H:%M')
                ts = int(funcategorizedback_dt.timestamp())
                rank = "week"

            # ──────────────────────────────
            # Save everything
            # ──────────────────────────────
            _save_data(
                conn=conn,
                videos=new_videos,
                latest_video_id=latest_video_id,
                channel_name=channel_name,
                channel_url=channel_url,
                next_ts=ts,
                next_ts_read=ts_read,
                rank=rank,
                rss_id=rss_id,
            )
    except Exception:
        log.exception("CRITICAL failure processing rss_id=%s", rss_id)
        try:
            _handle_no_new(conn, rss_id, is_error=True)
        except Exception:
            pass
        raise
    finally:
        conn.close()
