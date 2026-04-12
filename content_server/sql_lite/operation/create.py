import sqlite3
from pathlib import Path

def sql_creation(path: str | Path) -> None:
    """
    Creates Sqlite DB + Proper Schema with CASCADE deletes.
    - Domains/SubDomains: survive deletion (SET NULL)
    - Results & tracking: auto-deleted on channel delete (CASCADE)
    """
    con = sqlite3.connect(path)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    #---------------------------------
    # YOUTUBE
    # -----------------------------------
    cur.executescript("""
-- =============================================================
-- Core categorization tables
-- =============================================================
CREATE TABLE IF NOT EXISTS Domains (
    id_domain     INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_name   TEXT NOT NULL DEFAULT 'uncategorized' UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_domains_name ON Domains(domain_name);


CREATE TABLE IF NOT EXISTS SubDomains (
    id_subdomain     INTEGER PRIMARY KEY AUTOINCREMENT,
    subdomain_name   TEXT NOT NULL DEFAULT 'uncategorized' UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_subdomains_name ON SubDomains(subdomain_name);


-- =============================================================
-- Main entity: Channels
-- =============================================================
CREATE TABLE IF NOT EXISTS Channel (
    id_channel      INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_name    TEXT NOT NULL,               -- duplicates allowed, Rare but 2 channels with same name
    channel_url     TEXT NOT NULL UNIQUE,
    channel_logo    TEXT,
    id_domain       INTEGER,                     -- Unrestricted Domain + Subdomain combination on multiple channel without bloat
    id_subdomain    INTEGER,
    FOREIGN KEY (id_domain)    REFERENCES Domains(id_domain)    ON DELETE SET NULL,
    FOREIGN KEY (id_subdomain) REFERENCES SubDomains(id_subdomain) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_channel_id        ON Channel(id_channel);
CREATE INDEX IF NOT EXISTS idx_channel_domain    ON Channel(id_domain);
CREATE INDEX IF NOT EXISTS idx_channel_subdomain ON Channel(id_subdomain);
CREATE INDEX IF NOT EXISTS idx_channel_name      ON Channel(channel_name);
CREATE INDEX IF NOT EXISTS idx_channel_url       ON Channel(channel_url);


-- =============================================================
-- Videos / results collected from channels
-- =============================================================
CREATE TABLE IF NOT EXISTS Result (
    title         TEXT NOT NULL,
    video_url     TEXT PRIMARY KEY,
    thumbnail     TEXT,
    channel_id    INTEGER NOT NULL,
    seen          INTEGER DEFAULT 0,              -- 0 is false, 1 is true. 2 hour delete feature
    published_at  TEXT,                           -- ISO 8601 format recommended
    FOREIGN KEY (channel_id) REFERENCES Channel(id_channel)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_result_channel    ON Result(channel_id);

-- Future Feature:
CREATE TABLE IF NOT EXISTS Stocked(
    title           TEXT NOT NULL,
    video_url       TEXT PRIMARY KEY,
    thumbnail       TEXT,
    id_domain       INTEGER,
    id_subdomain    INTEGER,
    FOREIGN KEY (id_domain)    REFERENCES Domains(id_domain)    ON DELETE SET NULL,
    FOREIGN KEY (id_subdomain) REFERENCES SubDomains(id_subdomain) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_stocked_domain    ON Stocked(id_domain);
CREATE INDEX IF NOT EXISTS idx_stocked_subdomain ON Stocked(id_subdomain);
CREATE INDEX IF NOT EXISTS idx_stocked_url       ON Stocked(video_url);

-- =============================================================
-- RSS / tracking / last-seen state per channel
-- =============================================================
CREATE TABLE IF NOT EXISTS Channels (
    rss_id          TEXT PRIMARY KEY,
    last_video_id   TEXT,                         -- null until backend processes
    ts              INTEGER,                      -- Unix timestamp (seconds), null until backend
    ts_read         TEXT,                         -- Human Readability for Debug
    rank            TEXT,
    counter         INTEGER DEFAULT 0,
    id_channel      INTEGER NOT NULL UNIQUE,      -- 1:1 with Channel
    FOREIGN KEY (id_channel) REFERENCES Channel(id_channel)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tracking_channel ON Channels(id_channel);
CREATE INDEX IF NOT EXISTS idx_tracking_ts      ON Channels(ts);
    """)
    con.commit()
    con.close()
    print("Database schema created/updated successfully!")
# ===============================
# Module Summary(Status: Success)
# ===============================
"""
AnyChanges in YOutube schema needs changes in following modules:
    - csv variants -> csv_import.py, csv_export.py
    - processor.py
    - caller -> bulk & timmer.py
    - read.py and write.py

if change the Convention "uncategorized":
    - read and write
    - sidebar, notification, feed, batch actions, setting/page.tsx in the front end
"""
