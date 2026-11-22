import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.db import models
from app.schemas.rfq import BidCreate, RFQCreate
from app.services.auction_engine import AuctionEngine

# Setup in-memory SQLite database for tests
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def create_sample_suppliers(db):
    s1 = models.Supplier(supplier_code="S1", name="Alpha Logistics", contact_email="a@alpha.com")
    s2 = models.Supplier(supplier_code="S2", name="Beta Freight", contact_email="b@beta.com")
    s3 = models.Supplier(supplier_code="S3", name="Gamma Cargo", contact_email="c@gamma.com")
    db.add_all([s1, s2, s3])
    db.commit()
    return s1, s2, s3

def test_rfq_timeline_validation():
    now = datetime.utcnow()
    # Forced close must be > Bid close
    with pytest.raises(ValueError, match="Forced Bid Close Time must always be greater than Bid Close Time"):
        RFQCreate(
            rfq_code="TEST-FAIL-1",
            title="Test RFQ",
            origin_location="MUM",
            destination_location="DEL",
            pickup_service_date=now + timedelta(days=2),
            bid_start_time=now,
            bid_close_time=now + timedelta(hours=2),
            forced_close_time=now + timedelta(hours=1), # Invalid!
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger_type="L1_RANK_CHANGE"
        )

def test_bid_placement_and_total_calculation(db):
    s1, _, _ = create_sample_suppliers(db)
    now = datetime.utcnow()
    
    rfq = models.RFQ(
        rfq_code="TEST-RFQ-1",
        title="Freight Haulage",
        origin_location="MUM",
        destination_location="DEL",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(hours=2),
        original_close_time=now + timedelta(hours=2),
        forced_close_time=now + timedelta(hours=4),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE"
    )
    db.add(rfq)
    db.commit()

    quote = BidCreate(
        supplier_id=s1.id,
        carrier_name="Alpha Fleet",
        freight_charges=50000.0,
        origin_charges=3000.0,
        destination_charges=2000.0,
        transit_time_days=2,
        quote_validity_date=now + timedelta(days=10)
    )
    result = AuctionEngine.submit_quote(db, rfq.id, quote, simulation_now=now)
    assert result["bid"].total_charges == 55000.0
    assert result["assigned_rank"] == "L1"
    assert result["extension_triggered"] is False # Outside trigger window (2 hours remaining, window is 10 mins)

def test_british_auction_extension_on_l1_change(db):
    s1, s2, _ = create_sample_suppliers(db)
    now = datetime.utcnow()
    
    # Auction starts 2 hours ago, ends in 30 minutes. Trigger Window X is 10 minutes.
    rfq = models.RFQ(
        rfq_code="TEST-RFQ-EXT",
        title="Live British Auction",
        origin_location="BLR",
        destination_location="MAA",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=2),
        bid_close_time=now + timedelta(minutes=30),
        original_close_time=now + timedelta(minutes=30),
        forced_close_time=now + timedelta(hours=2),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE"
    )
    db.add(rfq)
    db.commit()

    # S1 submits bid 25 minutes before close -> OUTSIDE trigger window (window is 10m)
    t_outside = now + timedelta(minutes=5) # 25 minutes before close
    res1 = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=s1.id,
        carrier_name="Alpha",
        freight_charges=60000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=5)
    ), simulation_now=t_outside)

    assert res1["extension_triggered"] is False
    assert rfq.extension_count == 0

    initial_close = rfq.bid_close_time

    # S2 submits lower bid 6 minutes before close -> INSIDE trigger window (remaining = 6m <= 10m)
    t_inside = rfq.bid_close_time - timedelta(minutes=6)
    res2 = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=s2.id,
        carrier_name="Beta",
        freight_charges=55000.0, # Lower than 60,000! Takes over L1
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=5)
    ), simulation_now=t_inside)

    assert res2["is_new_l1"] is True
    assert res2["extension_triggered"] is True
    assert res2["extension_minutes"] == 5
    assert rfq.bid_close_time == initial_close + timedelta(minutes=5)
    assert rfq.extension_count == 1

def test_forced_close_hard_cap_enforcement(db):
    s1, s2, _ = create_sample_suppliers(db)
    now = datetime.utcnow()
    
    # Close time is 2 minutes from now, Forced close is 4 minutes from now
    # Extension Y is 5 minutes -> 2 + 5 = 7 minutes, which exceeds forced close (4 mins)!
    # The engine MUST cap new close time exactly at 4 minutes!
    close_time = now + timedelta(minutes=2)
    forced_time = now + timedelta(minutes=4)

    rfq = models.RFQ(
        rfq_code="TEST-CAP-1",
        title="Forced Cap Test",
        origin_location="DEL",
        destination_location="JAI",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=close_time,
        original_close_time=close_time,
        forced_close_time=forced_time,
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID"
    )
    db.add(rfq)
    db.commit()

    result = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=s1.id,
        carrier_name="Alpha",
        freight_charges=40000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=5)
    ), simulation_now=now)

    assert result["extension_triggered"] is True
    assert result["capped_at_forced"] is True
    # The new close time MUST NOT exceed forced_close_time!
    assert rfq.bid_close_time <= rfq.forced_close_time
    assert rfq.bid_close_time == forced_time
