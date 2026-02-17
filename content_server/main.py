from fastapi import FastAPI, HTTPException, APIRouter, UploadFile, File, Path
from fastapi.responses import FileResponse
from typing import Optional
import logging
import asyncio

# Your project imports
from .saved import path as p
# Sql lite service
from .sql_lite.operation.create import sql_creation
from .sql_lite.service.csv_import import import_csv
from .sql_lite.service.csv_export import export_csv
from .sql_lite.operation.read import resolve_component, ComponentType
from .sql_lite.operation.write import Write
from .sql_lite.operation.delete import Delete

from .youtube.bulk import run_batch# ← this is an async function!
from .youtube.timmer import start_feed_processors # async function!


# Logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(
    title="YouTube Batch Processor API",
    version="1.0",
    description="Multi-tool API: DB init • CSV ↔ SQLite • YouTube bulk processing"
)
asyncio.get_event_loop().create_task(start_feed_processors(p))
# ----------- Router for CSV services -----------
router = APIRouter()

@router.post("/csv/{service}/{name}", summary="Import CSV → DB (+YouTube) or Export DB → CSV")
async def csv_to_sql(
    name: str = Path(..., description="Username / identifier"),
    service: str = Path(..., description="Service type: 'import' or 'export'"),
    file: Optional[UploadFile] = File(None),  # Required for import, ignored for export
):
    log.info(f"CSV service triggered → {service} for user: {name}")

    Path_db = p / f"{name}.db"
    Path_csv = p / f"{name}.csv"  # ← Always fixed filename: {name}.csv

    try:
        if service == "import":
            # --- Upload logic: file is REQUIRED for import ---
            if not file:
                raise HTTPException(
                    status_code=400,
                    detail="File upload is required for 'import' service"
                )

            # --- STRICT .csv extension check (case-insensitive) ---
            if not file.filename:
                log.warning(f"Upload rejected for user {name}: No filename provided")
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded file must have a filename"
                )

            if not file.filename.lower().endswith(".csv"):
                log.warning(
                    f"Upload rejected for user {name}: Invalid file extension '{file.filename}' "
                    "(only .csv files are accepted)"
                )
                raise HTTPException(
                    status_code=400,
                    detail="Only files with .csv extension are accepted"
                )

            # Ensure directory exists
            Path_csv.parent.mkdir(parents=True, exist_ok=True)

            # Log overwrite if file already exists
            if Path_csv.exists():
                log.info(f"Overwriting existing CSV file: {Path_csv} (previous size: {Path_csv.stat().st_size} bytes)")

            # Save uploaded file → always renamed to exactly {name}.csv (pure pathlib + async streaming)
            log.info(
                f"Renaming and saving uploaded file '{file.filename}' (type: {file.content_type}) "
                f"as fixed filename: {Path_csv}"
            )

            chunk_size = 65536  # 64KB chunks – efficient and memory-safe
            with Path_csv.open("wb") as buffer:
                await file.seek(0)  # Ensure we're at the start
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    buffer.write(chunk)

            file_size = Path_csv.stat().st_size
            log.info(f"CSV file successfully saved as {Path_csv} (size: {file_size} bytes)")

            # Proceed with import
            imported_rows = import_csv(Path_csv, Path_db)
            log.info(f"Imported {imported_rows or 0} rows from CSV")

            log.info("Starting YouTube batch processing...")
            await run_batch(Path_db)
            log.info("YouTube batch processing completed")

            return {
                "status": "import_and_processing_complete",
                "imported_rows": imported_rows or 0,
                "message": f"CSV uploaded and renamed to {name}.csv (overwriting any existing file), imported to DB, and YouTube jobs finished",
                "result_csv": str(Path_csv),
                "db_path": str(Path_db),
                "uploaded_file_size_bytes": file_size
            }

        elif service == "export":
            # --- Export: no file upload needed ---
            if file:
                log.warning("Uploaded file ignored during 'export' service")

            exported_rows = export_csv(Path_csv, Path_db)
            log.info(f"Exported {exported_rows} rows to {Path_csv}")

            if Path_csv.exists():
                return FileResponse(
                    path=Path_csv,
                    filename=f"{name}_final_results.csv",
                    media_type="text/csv"
                )
            else:
                return {
                    "status": "exported_but_file_missing",
                    "exported_rows": exported_rows
                }

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid service. Use 'import' or 'export'"
            )

    except FileNotFoundError as e:
        log.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail="CSV or DB file not found")
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Operation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if file:
            await file.close()

# Include the router so the /csv endpoint is active
app.include_router(router)

# ----------- DB Initialization -----------
@app.get("/auth/{mode}/{username}", summary="Initialize database schema or login cleanup")
async def auth_handler(mode: str, username: str):
    if mode == "login":
        await Delete(username=username, db_dir=p, operation="delete", a="daily_cleanup")
        return {"message": "Daily cleanup performed on login (if applicable)"}

    try:
        db_path = p / f"{username}.db"
        log.info(f"[Create] {db_path}")
        sql_creation(str(db_path))
        log.info(f"Database schema created successfully for {username}")
        return {
            "status": "success",
            "message": f"Database initialized for {username}",
            "db_path": str(db_path)
        }
    except Exception as e:
        log.error(f"DB creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"DB init failed: {e}")

# ----------- Dashboard Data -----------
@app.get("/dashboard/{username}")
@app.get("/dashboard/{username}/{domain}")
@app.get("/dashboard/{username}/{domain}/{subdomain}")
async def dashboard_handler(
    username: str,
    domain: str | None = None,
    subdomain: str | None = None,
):
    log.info(f"dashboard_handler triggered: username={username}, domain={domain}, subdomain={subdomain}")

    if domain is None:
        # Root dashboard → Notification
        return resolve_component(username, p, ComponentType.NOTIFICATION)

    if domain == "sidebar":
        # Sidebar (ignores subdomain if accidentally provided)
        return resolve_component(username, p, ComponentType.SIDEBAR)

    # Domain feed (with optional subdomain)
    return resolve_component(
        username,
        p,
        ComponentType.FEED,
        domain=domain,
        subdomain=subdomain,
    )

# ----------- Settings -----------
@app.get("/setting/{username}")
@app.get("/setting/{username}/{operation}/{a}/{b}")
@app.get("/setting/{username}/{operation}/{a}/{b}/{c}")
async def setting_endpoint(
    username: str,
    operation: str | None = None,
    a: str | None = None,
    b: str | None = None,
    c: str | None = None,
):
    """
    Endpoint for viewing and updating user settings.
    - GET /setting/{username} → returns current settings view
    - GET /setting/{username}/{operation}/{a}/{b}/{c} → performs write operation first, then returns updated view
    """
    if operation == "delete":
        await Delete(
            username=username,
            db_dir=p,
            operation=operation,
            a=a or "",
            b=b or "",
            c=c or "",
        )
    elif operation:
        log.info(f"[WRITE] operation={operation} for user={username}")
        Write(
            username=username,
            db_dir=p,
            operation=operation,
            a=a or "",
            b=b or "",
            c=c or "",
        )

    return resolve_component(username, p, ComponentType.SETTING)
