from __future__ import annotations
import csv
from pathlib import Path
from typing import List, Tuple, Literal
import sqlite3

# ===============================
# Centralized SQL Queries
# ===============================
QUERIES = {
    "get_tracked_channels": """
        SELECT
            c.rss_id,
            ch.id_channel,
            ch.channel_name,
            ch.channel_url,
            COALESCE(d.domain_name, 'uncategorized'),
            COALESCE(sd.subdomain_name, 'uncategorized')
        FROM Channels c
        JOIN Channel ch ON c.id_channel = ch.id_channel
        LEFT JOIN Domains d ON ch.id_domain = d.id_domain
        LEFT JOIN SubDomains sd ON ch.id_subdomain = sd.id_subdomain
        WHERE c.rss_id LIKE 'UC%'
          AND length(c.rss_id) = 24
        ORDER BY
            COALESCE(d.domain_name, 'uncategorized'),
            COALESCE(sd.subdomain_name, 'uncategorized'),
            ch.channel_name
    """
}

class DBExporter:
    @classmethod
    def export(
        cls,
        cursor: sqlite3.Cursor,
        output_csv: Path | str,
        format_style: Literal["full", "pretty", "minimal"] = "full",
    ) -> None:
        output_csv = Path(output_csv)
        output_csv.parent.mkdir(parents=True, exist_ok=True)

        cursor.execute(QUERIES["get_tracked_channels"])
        raw_rows = cursor.fetchuncategorized()  # (rss_id, id_channel, name, url, domain, subdomain)

        if not raw_rows:
            print("No tracked channels found (Channels table empty or no valid UC ids).")
            return

        rows: List[Tuple[str, str, str, str, str]] = []
        for rss_id, id_channel, name, url, domain, subdomain in raw_rows:
            rows.append((rss_id, url, name, domain, subdomain))

        # Format selection
        if format_style == "minimal":
            headers = ["Channel ID", "Channel URL", "Channel title"]
            get_row = lambda r: [r[0], r[1], r[2]]
        else:
            headers = ["Channel ID", "Channel URL", "Channel title", "Domains", "Sub Domains"]
            if format_style == "pretty":
                # Clean look: blank when 'uncategorized'
                get_row = lambda r: [
                    r[0], r[1], r[2],
                    "" if r[3] == "uncategorized" else r[3],
                    "" if r[4] == "uncategorized" else r[4],
                ]
            else:  # "full" — show exact DB value (including 'uncategorized')
                get_row = lambda r: [r[0], r[1], r[2], r[3], r[4]]

        with output_csv.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(get_row(r) for r in rows)

        print(f"Exported {len(rows)} tracked channels → {output_csv.name} [{format_style}]")

# ===============================
# Public function
# ===============================
def export_csv(
    output_csv: Path | str,
    input_db: Path | str,
    format_style: Literal["full", "pretty", "minimal"] = "full",
) -> None:
    """Pure read-only export from DB → CSV."""
    input_db = Path(input_db)
    with sqlite3.connect(input_db) as conn:
        conn.execute("PRAGMA foreign_keys = ON")  # Not needed for read, but consistent
        cursor = conn.cursor()
        DBExporter.export(cursor, output_csv, format_style)

# ===============================
# Standalone test / usage reminder
# ===============================
if __name__ == "__main__":
    print("Run with actual paths, for example:")
    print(" export_csv('tracked_channels_full.csv', 'your_database.db', format_style='full')")
    print(" export_csv('tracked_channels_pretty.csv', 'your_database.db', format_style='pretty')")
    print(" export_csv('tracked_channels_minimal.csv', 'your_database.db', format_style='minimal')")

"""
Returns:
  - full → Channel ID,Channel URL,Channel title,Domains,Sub Domains (shows 'uncategorized')
  - pretty → same as full but blanks instead of 'uncategorized' for cleaner look
  - minimal → Channel ID,Channel URL,Channel title (original simple format)

Notes:
  - Sorted by domain → subdomain → channel name
  - Only valid YouTube UC... rss_id entries are exported
  - Supports pretty @handle URLs (no longer requires UC ID to be extractable from channel_url)

Imported By:
  - fast_api.py
"""
