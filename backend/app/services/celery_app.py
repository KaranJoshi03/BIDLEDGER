import os
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Initialize Celery app
celery_app = Celery(
    "bidledger",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-expirations-every-10-seconds": {
            "task": "app.services.celery_app.check_auction_expirations_task",
            "schedule": 10.0,
        },
    }
)

@celery_app.task(name="app.services.celery_app.check_auction_expirations_task")
def check_auction_expirations_task():
    """Celery periodic job to evaluate close times and forced close caps."""
    from app.db.session import SessionLocal
    from app.services.auction_engine import AuctionEngine
    
    db = SessionLocal()
    try:
        AuctionEngine.check_and_update_auction_closures(db)
        return {"status": "success", "message": "Evaluated auction closures."}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    finally:
        db.close()

@celery_app.task(name="app.services.celery_app.sync_neo4j_bid_task")
def sync_neo4j_bid_task(rfq_id, rfq_code, supplier_id, supplier_name, carrier_name, price, rank, is_l1, prev_l1_supplier_id):
    """Celery background job for graph ingestion."""
    from app.services.neo4j_service import neo4j_service
    neo4j_service.record_bid_event(
        rfq_id=rfq_id,
        rfq_code=rfq_code,
        supplier_id=supplier_id,
        supplier_name=supplier_name,
        carrier_name=carrier_name,
        price=price,
        rank=rank,
        is_l1=is_l1,
        previous_l1_supplier_id=prev_l1_supplier_id
    )
    return {"status": "synced"}
