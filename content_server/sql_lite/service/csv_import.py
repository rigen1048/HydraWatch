from __future__ import annotations
import csv
import re
import sqlite3
from pathlib import Path
from typing import List, Optional, Dict
from pydantic import BaseModel, AnyUrl, ValidationError, StringConstraints
from typing_extensions import Annotated

# ===============================
# Centralized SQL Queries (Updated for new schema)
# ===============================
QUERIES = {
    "upsert_domain": "INSERT OR IGNORE INTO Domains (domain_name) VALUES (?)",
    "get_domain_id": "SELECT id_domain FROM Domains WHERE domain_name = ?",
    "upsert_subdomain": "INSERT OR IGNORE INTO SubDomains (subdomain_name) VALUES (?)",
    "get_subdomain_id": "SELECT id_subdomain FROM SubDomains WHERE subdomain_name = ?",
    "upsert_channel": """
        INSERT INTO Channel
        (channel_name, channel_url, channel_logo, id_domain, id_subdomain)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(channel_url) DO UPDATE SET
            channel_name = excluded.channel_name,
            id_domain = excluded.id_domain,
            id_subdomain = excluded.id_subdomain
    """,
    "get_channel_id": "SELECT id_channel FROM Channel WHERE channel_url = ?",
    "upsert_backend": """
        INSERT INTO Channels (rss_id, id_channel)
        VALUES (?, ?)
        ON CONFLICT(rss_id) DO UPDATE SET
            id_channel = excluded.id_channel
    """,
}

# ===============================
# Pydantic Model
# ===============================
ChannelID = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=24, max_length=24, pattern=r"^UC[0-9A-Za-z_-]{22}$")
]
ChannelName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class ChannelRow(BaseModel):
    rss_id: ChannelID
    channel_url: AnyUrl
    channel_name: ChannelName
    domain: Optional[str] = None
    subdomain: Optional[str] = None
    model_config = {"extra": "ignore"}

# ===============================
# Header Mapping
# ===============================
class HeaderMapper:
    MAPPINGS = {
        "channel_id": ["Channel ID", "channel id", "ChannelID", "ID"],
        "channel_url": ["Channel URL", "channel url", "URL", "Link"],
        "channel_name": ["Channel title", "channel title", "Name", "Title", "channel_name"],
        "domain": ["Domains", "Domain", "Category"],
        "subdomain": ["Sub Domains", "SubDomain", "Sub Category", "SubDomains"],
    }

    @classmethod
    def resolve(cls, headers: List[str]) -> Dict[str, str]:
        lowered = [h.strip().lower() for h in headers]
        mapping: Dict[str, str] = {}
        for key, options in cls.MAPPINGS.items():
            for opt in options:
                try:
                    idx = lowered.index(opt.lower())
                    mapping[key] = headers[idx]
                    break
                except ValueError:
                    continue
            else:
                if key in ("channel_id", "channel_url", "channel_name"):
                    raise ValueError(f"Required column not found: {key} (tried: {options})")
        return mapping

# ===============================
# CSV Parser
# ===============================
class CSVParser:
    @staticmethod
    def extract_uc_id(value: str) -> str:
        match = re.search(r"(UC[0-9A-Za-z_-]{22})", value.strip())
        if not match:
            raise ValueError(f"Invalid YouTube Channel ID: {value!r}")
        return match.group(1)

    @staticmethod
    def clean(value: Optional[str]) -> Optional[str]:
        return value.strip() if value and value.strip() else None

    @classmethod
    def parse(cls, path: Path) -> List[ChannelRow]:
        if not path.exists():
            raise FileNotFoundError(f"CSV not found: {path}")
        rows: List[ChannelRow] = []
        with path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                raise ValueError("CSV has no headers")
            col = HeaderMapper.resolve(reader.fieldnames)
            for lineno, row in enumerate(reader, start=2):
                try:
                    rss_id = cls.extract_uc_id(row[col["channel_id"]])
                    url = row[col["channel_url"]].strip()
                    name = row[col["channel_name"]].strip()
                    domain_col = col.get("domain")
                    subdomain_col = col.get("subdomain")
                    domain = cls.clean(row.get(domain_col)) if domain_col else None
                    subdomain = cls.clean(row.get(subdomain_col)) if subdomain_col else None
                    rows.append(ChannelRow(
                        rss_id=rss_id,
                        channel_url=url,
                        channel_name=name,
                        domain=domain,
                        subdomain=subdomain,
                    ))
                except (ValidationError, ValueError) as e:
                    print(f"Skipping row {lineno}: {e}")
                except Exception as e:
                    print(f"Error row {lineno}: {e}")
        if not rows:
            raise ValueError("No valid channels in CSV")
        print(f"Successfully parsed {len(rows)} channels")
        return rows

# ===============================
# Database Importer (Updated for new schema)
# ===============================
class DatabaseImporter:
    @staticmethod
    def import_channels(cursor: sqlite3.Cursor, channels: List[ChannelRow]) -> None:
        # Ensure default domain/subdomain exist
        cursor.execute(QUERIES["upsert_domain"], ("uncategorized",))
        cursor.execute(QUERIES["get_domain_id"], ("uncategorized",))
        default_domain_id = cursor.fetchone()[0]
        cursor.execute(QUERIES["upsert_subdomain"], ("uncategorized",))
        cursor.execute(QUERIES["get_subdomain_id"], ("uncategorized",))
        default_subdomain_id = cursor.fetchone()[0]

        inserted = 0
        for ch in channels:
            try:
                # Domain
                domain_name = ch.domain or "uncategorized"
                cursor.execute(QUERIES["upsert_domain"], (domain_name,))
                cursor.execute(QUERIES["get_domain_id"], (domain_name,))
                domain_id = cursor.fetchone()[0]

                # Subdomain
                subdomain_name = ch.subdomain or "uncategorized"
                cursor.execute(QUERIES["upsert_subdomain"], (subdomain_name,))
                cursor.execute(QUERIES["get_subdomain_id"], (subdomain_name,))
                row = cursor.fetchone()
                subdomain_id = row[0] if row else default_subdomain_id

                # Channel upsert (proper upsert on unique channel_url, logo untouched on conflict)
                cursor.execute(
                    QUERIES["upsert_channel"],
                    (ch.channel_name, str(ch.channel_url), None, domain_id, subdomain_id)
                )

                # Retrieve channel by unique channel_url
                cursor.execute(QUERIES["get_channel_id"], (str(ch.channel_url),))
                id_channel = cursor.fetchone()[0]

                # Backend tracking link (upsert on rss_id)
                cursor.execute(QUERIES["upsert_backend"], (ch.rss_id, id_channel))
                inserted += 1
            except sqlite3.IntegrityError as e:
                print(f"Integrity error for {ch.channel_name} ({ch.rss_id}): {e}")
            except Exception as e:
                print(f"Failed to import {ch.channel_name}: {e}")

        print(f"Successfully imported {inserted}/{len(channels)} channels")

# ===============================
# THE ONE AND ONLY PUBLIC FUNCTION
# ===============================
def import_csv(csv_path: Path, db_path: Path) -> None:
    """
    Single entry point.
    This function opens its own connection, enables foreign keys,
    and commits the transaction.
    """
    try:
        csv_path = Path(csv_path)
        db_path = Path(db_path)
        print(f"Starting CSV import → {csv_path.name}")
        channels = CSVParser.parse(csv_path)
        with sqlite3.connect(db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            cursor = conn.cursor()
            DatabaseImporter.import_channels(cursor, channels)
            conn.commit()
        print("CSV import completed successfully")
    except Exception as e:
        print(f"Import failed: {e}")
        raise

# ===============================
# Module Summary (Status: Updated for current schema)
# ===============================
"""
Handled:
    - Both CSV styles (standard + with Domains/Sub Domains)
    - Proper upserts using unique constraints (channel_url UNIQUE, rss_id PRIMARY KEY)
    - channel_name no longer assumed unique → retrieval by channel_url
    - channel_logo left untouched on updates (remains None or previously set)
    - Foreign keys respected
    - SQL injection safe (parameterized)

Dependencies:
    - SQLite DB exists with current schema

Imported by:
    - fast_api.py
"""
