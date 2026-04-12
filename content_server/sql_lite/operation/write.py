# write.py
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

@contextmanager
def _db_connection(db_path: Path, readonly: bool = False):
    conn_str = f"file:{db_path}?mode=ro" if readonly else str(db_path)
    uri = readonly
    conn = sqlite3.connect(conn_str, uri=uri)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def _get_or_create_domain(conn: sqlite3.Connection, domain_name: str) -> int:
    domain_name = domain_name.strip()
    if not domain_name:
        raise ValueError("Domain name cannot be empty.")
    cur = conn.execute(
        "SELECT id_domain FROM Domains WHERE domain_name = ?",
        (domain_name,),
    )
    row = cur.fetchone()
    if row:
        return row["id_domain"]
    cur = conn.execute(
        "INSERT INTO Domains (domain_name) VALUES (?)",
        (domain_name,),
    )
    return cur.lastrowid

def _get_or_create_subdomain(conn: sqlite3.Connection, subdomain_name: str) -> int:
    subdomain_name = subdomain_name.strip()
    if not subdomain_name:
        raise ValueError("Subdomain name cannot be empty.")
    cur = conn.execute(
        "SELECT id_subdomain FROM SubDomains WHERE subdomain_name = ?",
        (subdomain_name,),
    )
    row = cur.fetchone()
    if row:
        return row["id_subdomain"]
    cur = conn.execute(
        "INSERT INTO SubDomains (subdomain_name) VALUES (?)",
        (subdomain_name,),
    )
    return cur.lastrowid

def _get_domain_id(conn: sqlite3.Connection, domain_name: str) -> int:
    domain_name = domain_name.strip()
    if not domain_name:
        raise ValueError("Domain name cannot be empty.")
    cur = conn.execute(
        "SELECT id_domain FROM Domains WHERE domain_name = ?",
        (domain_name,),
    )
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Domain '{domain_name}' not found.")
    return row["id_domain"]

def _get_subdomain_id(conn: sqlite3.Connection, subdomain_name: str) -> int:
    subdomain_name = subdomain_name.strip()
    if not subdomain_name:
        raise ValueError("Subdomain name cannot be empty.")
    cur = conn.execute(
        "SELECT id_subdomain FROM SubDomains WHERE subdomain_name = ?",
        (subdomain_name,),
    )
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Subdomain '{subdomain_name}' not found.")
    return row["id_subdomain"]

def _cleanup_unused_categories(conn: sqlite3.Connection) -> None:
    conn.execute("""
        DELETE FROM Domains
        WHERE id_domain NOT IN (
            SELECT id_domain FROM Channel WHERE id_domain IS NOT NULL
            UNION
            SELECT id_domain FROM Stocked WHERE id_domain IS NOT NULL
        )
    """)
    conn.execute("""
        DELETE FROM SubDomains
        WHERE id_subdomain NOT IN (
            SELECT id_subdomain FROM Channel WHERE id_subdomain IS NOT NULL
            UNION
            SELECT id_subdomain FROM Stocked WHERE id_subdomain IS NOT NULL
        )
    """)

def _handle_assign(
    conn: sqlite3.Connection,
    channel_id: int,
    domain_name: str | None,
    subdomain_name: str | None,
) -> dict[str, Any]:
    if not conn.execute("SELECT 1 FROM Channel WHERE id_channel = ?", (channel_id,)).fetchone():
        raise ValueError(f"Channel with ID {channel_id} not found")
    updates: list[str] = []
    params: list[Any] = []
    if domain_name is not None:
        d = domain_name.strip()
        if d == "":
            updates.append("id_domain = NULL")
        elif d:
            updates.append("id_domain = ?")
            params.append(_get_or_create_domain(conn, d))
    if subdomain_name is not None:
        s = subdomain_name.strip()
        if s == "":
            updates.append("id_subdomain = NULL")
        elif s:
            updates.append("id_subdomain = ?")
            params.append(_get_or_create_subdomain(conn, s))
    if updates:
        sql = f"UPDATE Channel SET {', '.join(updates)} WHERE id_channel = ?"
        params.append(channel_id)
        conn.execute(sql, params)
        _cleanup_unused_categories(conn)
        return {"status": "success", "operation": "assign", "updated_fields": len(updates)}
    return {"status": "no_changes", "reason": "no domain or subdomain changes requested"}

def _handle_replace(
    conn: sqlite3.Connection,
    target: str,
    old_name: str,
    new_name: str,
) -> dict[str, Any]:
    target = target.lower()
    if target not in {"domain", "subdomain"}:
        raise ValueError("Target must be 'domain' or 'subdomain'")
    old_name = old_name.strip()
    new_name = new_name.strip()
    if not old_name or not new_name:
        raise ValueError("Old and new names cannot be empty")
    if old_name == new_name:
        return {"status": "no_changes", "reason": "old and new names are identical"}
    is_domain = target == "domain"
    table = "Domains" if is_domain else "SubDomains"
    id_col = "id_domain" if is_domain else "id_subdomain"
    name_col = "domain_name" if is_domain else "subdomain_name"
    get_id = _get_domain_id if is_domain else _get_subdomain_id
    old_id = get_id(conn, old_name)
    cur = conn.execute(f"SELECT {id_col} FROM {table} WHERE {name_col} = ?", (new_name,))
    new_row = cur.fetchone()
    if new_row:
        new_id = new_row[id_col]
        conn.execute(f"UPDATE Channel SET {id_col} = ? WHERE {id_col} = ?", (new_id, old_id))
        conn.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (old_id,))
        _cleanup_unused_categories(conn)
        return {"status": "success", "operation": "merged", "from": old_name, "into": new_name}
    else:
        conn.execute(f"UPDATE {table} SET {name_col} = ? WHERE {id_col} = ?", (new_name, old_id))
        return {"status": "success", "operation": "renamed", "from": old_name, "to": new_name}

def Write(
    username: str,
    db_dir: str | Path | None = None,
    operation: str = "",
    a: str | None = None,
    b: str | None = None,
    c: str | None = None,
) -> dict[str, Any]:
    """
    Public write API — assign and replace operations only.
    All delete operations have been moved to delete.py.
    """
    db_path = (Path(db_dir) if db_dir else Path.cwd()) / f"{username}.db"
    if not db_path.is_file():
        raise FileNotFoundError(f"User database not found: {db_path}")
    operation = operation.strip().lower()
    if operation not in {"assign", "replace"}:
        raise ValueError("Operation must be 'assign' or 'replace' (delete operations are now in delete.py)")
    with _db_connection(db_path, readonly=False) as conn:
        conn.execute("BEGIN")
        try:
            if operation == "assign":
                if c is None or not (c_str := str(c).strip()):
                    raise ValueError("Channel ID (c) is required for assign operation")
                try:
                    channel_id = int(c_str)
                except ValueError:
                    raise ValueError("Channel ID (c) must be an integer")
                result = _handle_assign(conn, channel_id, a, b)
            elif operation == "replace":
                if a is None or not (target := str(a).strip().lower()):
                    raise ValueError("Parameter 'a' must be 'domain' or 'subdomain'")
                if target not in {"domain", "subdomain"}:
                    raise ValueError("Parameter 'a' must be 'domain' or 'subdomain'")
                if b is None or not (old := str(b).strip()):
                    raise ValueError("Old name (b) is required")
                if c is None or not (new := str(c).strip()):
                    raise ValueError("New name (c) is required")
                result = _handle_replace(conn, target, old, new)
            conn.commit()
            return result
        except Exception:
            conn.rollback()
            raise
