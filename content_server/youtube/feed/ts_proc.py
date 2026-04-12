import math
from datetime import datetime, timedelta, timezone
from typing import List, Tuple
import dateutil.parser  # pip install python-dateutil


def _parse_ts(ts: str) -> datetime:
    """Parse any realistic YouTube timestamp → naive UTC datetime"""
    try:
        dt = dateutil.parser.isoparse(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    except Exception as e:
        raise ValueError(f"Unable to parse timestamp: {ts!r} – {e}")


def predict_ts(timestamps: List[str]) -> Tuple[str, int, str]:
    """
    Predict next likely upload time based on historical timestamps.

    Preferred upload time logic:
    - Uses **last upload's time-of-day + 2 hours** (your requested rule)
    - This acts as a buffer / assumes slightly later uploads over time

    Returns:
        Tuple[str, int, str]:
            - "YYYY-MM-DD HH:MM"
            - UNIX timestamp (seconds, UTC)
            - Rank: "abandoned", "weekly", "day", "dual", "week", "month"
    """
    if not timestamps:
        raise ValueError("No timestamps provided")

    dts = sorted(_parse_ts(ts) for ts in timestamps)
    n = len(dts)
    last_dt = dts[-1]

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    days_since_last = (now - last_dt).total_seconds() / 86400.0

    # 1. Abandoned check (overrides everything)
    if days_since_last > 365:
        rank = "abandoned"
        period_days = 365
        base_date = last_dt.date() + timedelta(days=365)
    # 2. Very new channel: assume weekly
    elif n <= 5:
        rank = "week"
        period_days = 7
        base_date = last_dt.date() + timedelta(days=7)
    # 3. Enough history → median gap
    else:
        gaps = [(dts[i] - dts[i-1]).total_seconds() / 86400.0 for i in range(1, n)]
        median_gap = sorted(gaps)[len(gaps) // 2]
        ceil_gap = math.ceil(median_gap)

        if ceil_gap <= 2:
            period_days = 1
            rank = "day"
        elif ceil_gap <= 4:
            period_days = 2
            rank = "dual"
        elif ceil_gap <= 14:
            period_days = 7
            rank = "week"
        else:
            period_days = 30
            rank = "month"

        base_date = last_dt.date() + timedelta(days=period_days)

    # ─────────────────────────────────────────────
    # Preferred time: LAST upload time + 2 hours
    # ─────────────────────────────────────────────
    last_time = last_dt.replace(second=0, microsecond=0).time()
    buffered_time_dt = datetime(2000, 1, 1, last_time.hour, last_time.minute) + timedelta(hours=2)
    preferred_time = buffered_time_dt.time()

    # Handle overflow past midnight → next day (but we add it to base_date anyway)
    if buffered_time_dt.hour >= 24:
        preferred_time = (buffered_time_dt - timedelta(days=1)).time()  # unlikely but safe
        base_date += timedelta(days=1)  # rare correction

    next_dt = datetime.combine(base_date, preferred_time)

    # Project forward if already past or too close (with small extra buffer)
    while next_dt <= now + timedelta(hours=2):
        next_dt += timedelta(days=period_days)

    ts_read = next_dt.strftime("%Y-%m-%d %H:%M")
    ts = int(next_dt.timestamp())

    return ts_read, ts, rank
