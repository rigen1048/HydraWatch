import sqlite3
from pathlib import Path
from enum import StrEnum
from typing import Protocol, Any
from contextlib import contextmanager

# -------- Internal Use
class ComponentFactory(Protocol):
    def __call__(self, db_path: Path, /, *, domain: str | None = None, subdomain: str | None = None) -> Any:
        ...

class ComponentType(StrEnum):
    NOTIFICATION = "notification"
    FEED = "feed"
    SIDEBAR = "sidebar"
    SETTING = "setting"

def create_notification(db_path: Path, **kwargs) -> Any:
    return Notification(db_path)

def create_feed(db_path: Path, *, domain: str | None = None, subdomain: str | None = None) -> Any:
    if domain is None:
        raise ValueError("domain is required for feed component")
    return Feed(db_path, domain=domain, subdomain=subdomain)

def create_sidebar(db_path: Path, **kwargs) -> Any:
    return Sidebar(db_path)

def create_setting(db_path: Path, **kwargs) -> Any:
    return Setting(db_path)

FACTORY_REGISTRY: dict[ComponentType, ComponentFactory] = {
    ComponentType.NOTIFICATION: create_notification,
    ComponentType.FEED: create_feed,
    ComponentType.SIDEBAR: create_sidebar,
    ComponentType.SETTING: create_setting,
}

def resolve_component(
    username: str,
    db_dir: str | Path | None,
    component_type: ComponentType,
    *,
    domain: str | None = None,
    subdomain: str | None = None,
) -> Any:
    db_path = (Path(db_dir) if db_dir else Path.cwd()) / f"{username}.db"
    if not db_path.is_file():
        raise FileNotFoundError(f"User database not found: {db_path}")
    factory = FACTORY_REGISTRY.get(component_type)
    if factory is None:
        raise ValueError(f"Unknown component type: {component_type.value!r}")
    return factory(db_path, domain=domain, subdomain=subdomain)

# ------ Centralized queries
QUERIES: dict[str, str] = {
    "notification_domains": """
        SELECT
            COALESCE(d.domain_name, 'uncategorized') AS key,
            COUNT(r.video_url) AS count
        FROM Channel c
        LEFT JOIN Domains d ON c.id_domain = d.id_domain
        LEFT JOIN Result r ON r.channel_id = c.id_channel
        GROUP BY c.id_domain
        HAVING count > 0
        ORDER BY key
    """,
    "notification_total": "SELECT COUNT(*) AS total FROM Result",
    "sidebar_structure": """
        SELECT
            COALESCE(d.domain_name, 'uncategorized') AS domain_name,
            COALESCE(sd.subdomain_name, 'uncategorized') AS subdomain_name
        FROM Channel c
        LEFT JOIN Domains d ON c.id_domain = d.id_domain
        LEFT JOIN SubDomains sd ON c.id_subdomain = sd.id_subdomain
        GROUP BY domain_name, subdomain_name
        ORDER BY domain_name, subdomain_name
    """,
    "setting_channels": """
        SELECT
            c.id_channel AS id,
            c.channel_name,
            c.channel_url,
            COALESCE(d.domain_name, 'uncategorized') AS domain_name,
            COALESCE(sd.subdomain_name, 'uncategorized') AS subdomain_name
        FROM Channel c
        LEFT JOIN Domains d ON c.id_domain = d.id_domain
        LEFT JOIN SubDomains sd ON c.id_subdomain = sd.id_subdomain
        ORDER BY c.id_channel
    """,
}

# ------ Internal helpers
@contextmanager
def _db_connection(db_path: Path | str, *, readonly: bool = True):
    path_str = str(db_path)
    conn_str = f"file:{path_str}?mode=ro" if readonly else path_str
    uri = readonly
    conn = sqlite3.connect(conn_str, uri=uri)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# ------ Components

def Notification(db_path: Path | str):
    with _db_connection(db_path) as conn:
        domain_rows = conn.execute(QUERIES["notification_domains"]).fetchall()
        total_all = conn.execute(QUERIES["notification_total"]).fetchone()["total"]

        domains = []
        for row in domain_rows:
            key = row["key"]
            if key.lower() == "all":
                continue
            name = "Uncategorized" if key == "uncategorized" else key
            domains.append({"key": key, "name": name, "count": row["count"]})

        domains.insert(0, {"key": "all", "name": "All", "count": total_all})

        return {"domains": domains}


def Feed(db_path: Path | str, domain: str, subdomain: str | None = None):
    domain_input = (domain or "").strip()
    domain_lower = domain_input.lower() or "all"

    subdomain_input = (subdomain or "").strip() if subdomain is not None else ""
    sub_lower = subdomain_input.lower() or "all"

    with _db_connection(db_path) as conn:
        base_query = """
            SELECT
                r.rowid AS id,
                r.title,
                r.video_url AS url,
                r.thumbnail,
                c.channel_name AS creator,
                COALESCE(d.domain_name, 'No domain') AS domain,          -- or whatever fallback you prefer
                COALESCE(sd.subdomain_name, 'No subdomain') AS subdomain -- or 'None', '', etc.
            FROM Result r
            JOIN Channel c ON r.channel_id = c.id_channel
            LEFT JOIN Domains d ON c.id_domain = d.id_domain
            LEFT JOIN SubDomains sd ON c.id_subdomain = sd.id_subdomain
        """

        where_parts = []
        params: list[Any] = []

        if domain_lower != "all":
            where_parts.append("LOWER(TRIM(d.domain_name)) = LOWER(TRIM(?))")
            params.append(domain_input)

        if sub_lower != "all":
            where_parts.append("LOWER(TRIM(sd.subdomain_name)) = LOWER(TRIM(?))")
            params.append(subdomain_input)

        where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

        full_query = f"{base_query}\n{where_clause}\nORDER BY r.published_at DESC"

        rows = conn.execute(full_query, params).fetchall()

        videos = [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "creator": row["creator"],
                "thumbnail": row["thumbnail"] or "/placeholder.svg",
                "url": row["url"],
                "domain": row["domain"],
                "subdomain": row["subdomain"],
            }
            for row in rows
        ]

        return {"videos": videos}

def Sidebar(db_path: Path | str):
    """
    Adds a virtual domain without any subdomain: To get all the Feed
    Regular domains show their real subdomains (including any named 'uncategorized')
    No special treatment for the string 'uncategorized'
    """
    with _db_connection(db_path) as conn:
        rows = conn.execute(QUERIES["sidebar_structure"]).fetchall()
        domain_to_subs: dict[str, set[str]] = {}
        for row in rows:
            domain = row["domain_name"]
            sub = row["subdomain_name"]
            domain_to_subs.setdefault(domain, set())
            # Add every subdomain exactly as it appears — including "uncategorized"
            domain_to_subs[domain].add(sub)

        result = {"domains": []}

        # Virtual "All" domain – always first, no subdomains
        result["domains"].append({
            "key": "all",
            "name": "All",
            "subdomains": []
        })

        # Regular domains
        regular_domains = []
        for domain_key in sorted(domain_to_subs.keys()):
            if domain_key.lower() == "all":
                continue

            # Use domain name exactly as it is in the database
            display_name = domain_key

            actual_subs = domain_to_subs[domain_key]

            # Include all subdomains exactly as they are (including "uncategorized")
            sub_items = [
                {"key": sub, "name": sub}
                for sub in sorted(actual_subs)
            ] if actual_subs else []

            regular_domains.append({
                "key": domain_key,
                "name": display_name,
                "subdomains": sub_items
            })

        # Sort regular domains alphabetically by display name
        regular_domains.sort(key=lambda x: x["name"].lower())

        result["domains"].extend(regular_domains)
        return result
def Setting(db_path: Path | str):
    with _db_connection(db_path, readonly=False) as conn:
        rows = conn.execute(QUERIES["setting_channels"]).fetchall()
        result = [
            {
                "id": row["id"],
                "channelName": row["channel_name"],
                "url": row["channel_url"],
                "domain": row["domain_name"],
                "subdomain": row["subdomain_name"],
                "selected": False,
            }
            for row in rows
        ]
        return result
