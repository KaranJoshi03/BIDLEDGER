import asyncio
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.api.endpoints import rfqs, suppliers, websocket, tests_summary
from app.services.auction_engine import AuctionEngine
from app.seed import seed_database

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("bidledger")

# Ensure tables are created immediately
Base.metadata.create_all(bind=engine)

def init_seed():
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("Database initialized & pre-seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

# Pre-seed on start
init_seed()

# Background task for auto-closing expired auctions
async def periodic_auction_monitor():
    while True:
        try:
            db = SessionLocal()
            AuctionEngine.check_and_update_auction_closures(db)
            db.close()
        except Exception as e:
            logger.error(f"Error in periodic_auction_monitor: {e}")
        await asyncio.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor_task = asyncio.create_task(periodic_auction_monitor())
    yield
    monitor_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="British Auction RFQ Engine with dynamic trigger window extensions and forced close caps.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API & WebSocket Routers
app.include_router(rfqs.router, prefix="/api/rfqs", tags=["RFQs & British Auction"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(tests_summary.router, prefix="/api/tests", tags=["Automated Test Scenarios"])
app.include_router(websocket.router, tags=["WebSockets"])

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BidLedger Engine",
        "british_auction_rules": "active"
    }

# Static pages for Architecture and Test Scenarios
@app.get("/architecture")
async def architecture_page():
    file_path = os.path.join(frontend_dist, "architecture.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"detail": "Architecture page not available"}

@app.get("/tests")
async def tests_page():
    file_path = os.path.join(frontend_dist, "tests.html")
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"detail": "Tests page not available"}

# Mount React Frontend SPA (Single Page Application)
app_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist"))
root_frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

frontend_dist = app_dist if os.path.exists(app_dist) else root_frontend_dist

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": "BidLedger - British Auction RFQ Engine",
            "documentation": "/docs",
            "api_v1": "/api"
        }
