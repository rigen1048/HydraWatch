# delete.py
import aiosqlite
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any


@asynccontextmanager
async def _db_connection(db_path: Path, readonly: bool = False):
    conn_str = f"file:{db_path}?mode=ro" if readonly else str(db_path)
    uri = readonly
    conn = await aiosqlite.connect(conn_str, uri=uri)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        await conn.close()


def _normalize(name: str | None) -> str | None:
    if name is None:
        return None
    stripped = name.strip()
    return stripped if stripped else None


async def _get_domain_id(conn: aiosqlite.Connection, domain_name: str) -> int:
    domain_name = domain_name.strip()
    if not domain_name:
        raise ValueError("Domain name cannot be empty.")
    async with conn.execute(
        "SELECT id_domain FROM Domains WHERE domain_name = ?",
        (domain_name,),
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise ValueError(f"Domain '{domain_name}' not found.")
    return row["id_domain"]


async def _get_subdomain_id(conn: aiosqlite.Connection, subdomain_name: str) -> int:
    subdomain_name = subdomain_name.strip()
    if not subdomain_name:
        raise ValueError("Subdomain name cannot be empty.")
    async with conn.execute(
        "SELECT id_subdomain FROM SubDomains WHERE subdomain_name = ?",
        (subdomain_name,),
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise ValueError(f"Subdomain '{subdomain_name}' not found.")
    return row["id_subdomain"]


async def _cleanup_unused_categories(conn: aiosqlite.Connection) -> None:
    await conn.execute("""
        DELETE FROM Domains
        WHERE id_domain NOT IN (
            SELECT id_domain FROM Channel WHERE id_domain IS NOT NULL
            UNION
            SELECT id_domain FROM Stocked WHERE id_domain IS NOT NULL
        )
    """)
    await conn.execute("""
        DELETE FROM SubDomains
        WHERE id_subdomain NOT IN (
            SELECT id_subdomain FROM Channel WHERE id_subdomain IS NOT NULL
            UNION
            SELECT id_subdomain FROM Stocked WHERE id_subdomain IS NOT NULL
        )
    """)


async def _handle_batch_delete(
    conn: aiosqlite.Connection,
    domain_name: str | None,
    subdomain_name: str | None,
) -> dict[str, Any]:
    domain_norm = _normalize(domain_name)
    subdomain_norm = _normalize(subdomain_name)
    if not domain_norm and not subdomain_norm:
        raise ValueError(
            "At least one of domain or subdomain must be provided")

    conditions: list[str] = []
    params: list[Any] = []
    if domain_norm:
        conditions.append("id_domain = ?")
        params.append(await _get_domain_id(conn, domain_norm))
    if subdomain_norm:
        conditions.append("id_subdomain = ?")
        params.append(await _get_subdomain_id(conn, subdomain_norm))

    where = " AND ".join(conditions)
    async with conn.execute(f"DELETE FROM Channel WHERE {where}", params) as cur:
        deleted_count = cur.rowcount

    await _cleanup_unused_categories(conn)
    return {
        "status": "success",
        "operation": "batch_delete",
        "deleted_channels": deleted_count,
        "domain": domain_norm,
        "subdomain": subdomain_norm,
    }


async def _handle_individual_delete(
    conn: aiosqlite.Connection,
    channel_id: int,
) -> dict[str, Any]:
    async with conn.execute("SELECT 1 FROM Channel WHERE id_channel = ?", (channel_id,)) as cur:
        row = await cur.fetchone()
    if not row:
        return {"status": "no_changes", "reason": f"Channel {channel_id} not found"}

    await conn.execute("DELETE FROM Channel WHERE id_channel = ?", (channel_id,))
    await _cleanup_unused_categories(conn)

    return {
        "status": "success",
        "operation": "individual_delete",
        "channel_id": channel_id,
        "also_deleted_stocked": True,  # kept for backward compatibility
    }


async def _mark_seen_then_cleanup_after_delay(
    db_path: Path | str,
    delay_hours: float = 2.0
) -> None:
    """
    Background task: mark all unseen → seen=1, wait, then delete all seen=1
    """
    db_path_str = str(db_path)
    try:
        conn = await aiosqlite.connect(db_path_str)
        try:
            # 1. Mark
            await conn.execute("UPDATE Result SET seen = 1 WHERE seen = 0")
            await conn.commit()

            # 2. Wait (non-blocking for event loop)
            await asyncio.sleep(delay_hours * 3600)

            # 3. Delete
            await conn.execute("DELETE FROM Result WHERE seen = 1")
            await conn.commit()
        finally:
            await conn.close()
    except Exception as e:
        # In real app → replace with proper logging
        print(f"[delayed cleanup] failed after {delay_hours}h: {e}")


async def _handle_daily_cleanup(conn: aiosqlite.Connection, db_path: Path) -> dict[str, Any]:
    """
    New behavior for "daily_cleanup":
      - Immediately marks all unseen results as seen
      - Schedules deletion of all seen results after 2 hours (background)
    """
    # Mark everything unseen → seen right now
    await conn.execute("UPDATE Result SET seen = 1 WHERE seen = 0")
    await conn.commit()

    # Fire background cleanup task
    asyncio.create_task(
        _mark_seen_then_cleanup_after_delay(db_path, delay_hours=2.0)
    )

    return {
        "status": "success",
        "operation": "daily_cleanup",
        "message": "All unseen results marked as seen. Cleanup of seen results scheduled in 2 hours (background).",
    }


async def _handle_abandoned_delete(conn: aiosqlite.Connection) -> dict[str, Any]:
    async with conn.execute("""
        DELETE FROM Channel
        WHERE id_channel IN (
            SELECT c.id_channel FROM Channel c
            JOIN Channels t ON c.id_channel = t.id_channel
            WHERE t.rank = 'abandoned'
        )
    """) as cur:
        deleted_count = cur.rowcount

    if deleted_count > 0:
        await _cleanup_unused_categories(conn)

    return {
        "status": "success",
        "operation": "abandoned_delete",
        "deleted_channels": deleted_count,
    }


async def Delete(
    username: str,
    db_dir: str | Path | None = None,
    operation: str = "delete",
    a: str | None = None,
    b: str | None = None,
    c: str | None = None,
) -> dict[str, Any]:
    """
    Public async delete API.
    Handles: batch, individual, daily_cleanup (now mark+delayed), abandoned.
    """
    db_path = (Path(db_dir) if db_dir else Path.cwd()) / f"{username}.db"
    if not db_path.is_file():
        raise FileNotFoundError(f"User database not found: {db_path}")

    op = operation.strip().lower()
    if op != "delete":
        raise ValueError("This module only supports delete operations")

    if a is None:
        raise ValueError("Mode (a) is required for delete operations")

    mode = str(a).strip().lower()

    async with _db_connection(db_path, readonly=False) as conn:
        await conn.execute("BEGIN")
        try:
            if mode == "batch":
                result = await _handle_batch_delete(conn, b, c)
            elif mode == "individual":
                if b is None or not (b_str := str(b).strip()):
                    raise ValueError(
                        "Channel ID (b) is required for individual delete")
                try:
                    channel_id = int(b_str)
                except ValueError:
                    raise ValueError("Channel ID (b) must be an integer")
                result = await _handle_individual_delete(conn, channel_id)
            elif mode == "daily_cleanup":
                if b is not None or c is not None:
                    raise ValueError(
                        "daily_cleanup mode takes no additional parameters")
                result = await _handle_daily_cleanup(conn, db_path)
            elif mode == "abandoned":
                if b is not None or c is not None:
                    raise ValueError(
                        "abandoned mode takes no additional parameters")
                result = await _handle_abandoned_delete(conn)
            else:
                raise ValueError(
                    "Delete mode must be 'batch', 'individual', 'daily_cleanup', or 'abandoned'")

            await conn.commit()
            return result
        except Exception:
            await conn.rollback()
            raise
