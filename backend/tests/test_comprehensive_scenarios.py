import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.db import models
from app.schemas.rfq import BidCreate, RFQCreate
from app.services.auction_engine import AuctionEngine

# Isolated In-Memory SQLite Engine for Unit Tests
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

def seed_test_suppliers(db):
    suppliers = [
        models.Supplier(supplier_code="S1", name="Alpha Logistics", contact_email="a@alpha.com", rating=4.9),
        models.Supplier(supplier_code="S2", name="Beta Freight", contact_email="b@beta.com", rating=4.8),
        models.Supplier(supplier_code="S3", name="Gamma Cargo", contact_email="c@gamma.com", rating=4.7),
        models.Supplier(supplier_code="S4", name="Delta Carriers", contact_email="d@delta.com", rating=4.6),
        models.Supplier(supplier_code="S5", name="Epsilon Haulage", contact_email="e@epsilon.com", rating=4.5),
    ]
    db.add_all(suppliers)
    db.commit()
    return suppliers

# 1. Timeline Validation Rules
def test_timeline_validation_forced_less_than_close():
    now = datetime.utcnow()
    with pytest.raises(ValueError, match="Forced Bid Close Time must always be greater than Bid Close Time"):
        RFQCreate(
            rfq_code="VAL-1",
            title="Invalid Forced Time",
            origin_location="MUM",
            destination_location="DEL",
            pickup_service_date=now + timedelta(days=2),
            bid_start_time=now,
            bid_close_time=now + timedelta(hours=2),
            forced_close_time=now + timedelta(hours=1), # Invalid
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger_type="L1_RANK_CHANGE"
        )

def test_timeline_validation_start_greater_than_close():
    now = datetime.utcnow()
    with pytest.raises(ValueError, match="Bid Close Time must be strictly later than Bid Start Time"):
        RFQCreate(
            rfq_code="VAL-2",
            title="Invalid Start Time",
            origin_location="MUM",
            destination_location="DEL",
            pickup_service_date=now + timedelta(days=2),
            bid_start_time=now + timedelta(hours=3),
            bid_close_time=now + timedelta(hours=2), # Invalid
            forced_close_time=now + timedelta(hours=4),
            trigger_window_minutes=10,
            extension_duration_minutes=5,
            extension_trigger_type="L1_RANK_CHANGE"
        )

# 2. Itemized Pricing & Calculations
def test_itemized_total_charges_calculation(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()
    rfq = models.RFQ(
        rfq_code="RFQ-CALC-1",
        title="Freight Haulage",
        origin_location="MUM",
        destination_location="DEL",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(hours=1),
        original_close_time=now + timedelta(hours=1),
        forced_close_time=now + timedelta(hours=3),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE"
    )
    db.add(rfq)
    db.commit()

    quote = BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Alpha Surface Fleet",
        freight_charges=85000.50,
        origin_charges=3500.25,
        destination_charges=2500.25,
        transit_time_days=2,
        quote_validity_date=now + timedelta(days=15),
        notes="All-inclusive rate"
    )
    res = AuctionEngine.submit_quote(db, rfq.id, quote, simulation_now=now)
    assert res["bid"].total_charges == 91001.00
    assert res["assigned_rank"] == "L1"

# 3. Trigger Condition A: ANY_BID in Trigger Window
def test_trigger_any_bid_inside_window(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()
    
    # 5 minutes remaining, Trigger Window is 10 minutes -> inside window!
    rfq = models.RFQ(
        rfq_code="RFQ-ANY-BID",
        title="Any Bid Trigger Test",
        origin_location="HYD",
        destination_location="BOM",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(minutes=5),
        original_close_time=now + timedelta(minutes=5),
        forced_close_time=now + timedelta(minutes=30),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID"
    )
    db.add(rfq)
    db.commit()

    initial_close = rfq.bid_close_time
    res = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Carrier Alpha",
        freight_charges=100000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=2,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=now)

    assert res["extension_triggered"] is True
    assert res["extension_minutes"] == 5
    assert rfq.bid_close_time == initial_close + timedelta(minutes=5)
    assert rfq.extension_count == 1

# 4. Trigger Condition B: ANY_RANK_CHANGE in Trigger Window
def test_trigger_any_rank_change_triggers_on_rank_shift(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    # Create RFQ with 25 minutes left, Trigger Window 10m
    rfq = models.RFQ(
        rfq_code="RFQ-RANK-CHG",
        title="Any Rank Change Test",
        origin_location="BLR",
        destination_location="MAA",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(minutes=25),
        original_close_time=now + timedelta(minutes=25),
        forced_close_time=now + timedelta(hours=2),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_RANK_CHANGE"
    )
    db.add(rfq)
    db.commit()

    # S1 submits L1 bid 20 mins before close (outside window)
    t_outside = now + timedelta(minutes=5)
    AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Alpha",
        freight_charges=50000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t_outside)

    # S2 submits L2 bid 18 mins before close (outside window)
    AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[1].id,
        carrier_name="Beta",
        freight_charges=60000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t_outside + timedelta(minutes=2))

    assert rfq.extension_count == 0

    # Inside window (4 mins before close): S3 submits bid at 55,000
    # S3 displaces S2 from rank L2 -> Rank change occurred!
    t_inside = rfq.bid_close_time - timedelta(minutes=4)
    res = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[2].id,
        carrier_name="Gamma",
        freight_charges=55000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t_inside)

    assert res["assigned_rank"] == "L2"
    assert res["is_new_l1"] is False  # S1 at 50,000 is still L1!
    assert res["extension_triggered"] is True  # But ANY_RANK_CHANGE triggered extension!
    assert rfq.extension_count == 1

# 5. Trigger Condition C: L1_RANK_CHANGE (Only L1 flip triggers extension)
def test_l1_rank_change_does_not_extend_on_inferior_bid(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    rfq = models.RFQ(
        rfq_code="RFQ-L1-ONLY",
        title="L1 Trigger Test",
        origin_location="PUN",
        destination_location="AMD",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(minutes=25),
        original_close_time=now + timedelta(minutes=25),
        forced_close_time=now + timedelta(hours=2),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE"
    )
    db.add(rfq)
    db.commit()

    # S1 submits L1 bid at 70,000 outside window
    AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Alpha",
        freight_charges=70000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=now + timedelta(minutes=5))

    # Inside window (3 mins before close): S2 submits HIGHER bid at 85,000 (L2)
    # L1 did NOT change! Extension should NOT trigger.
    t_inside = rfq.bid_close_time - timedelta(minutes=3)
    res = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[1].id,
        carrier_name="Beta",
        freight_charges=85000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t_inside)

    assert res["assigned_rank"] == "L2"
    assert res["is_new_l1"] is False
    assert res["extension_triggered"] is False
    assert rfq.extension_count == 0

def test_l1_rank_change_extends_on_lower_bid(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    rfq = models.RFQ(
        rfq_code="RFQ-L1-SUCCESS",
        title="L1 Success Test",
        origin_location="PUN",
        destination_location="AMD",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(minutes=25),
        original_close_time=now + timedelta(minutes=25),
        forced_close_time=now + timedelta(hours=2),
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE"
    )
    db.add(rfq)
    db.commit()

    # S1 submits L1 bid at 70,000 outside window
    AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Alpha",
        freight_charges=70000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=now + timedelta(minutes=5))

    # Inside window (3 mins before close): S2 submits LOWER bid at 65,000 (New L1!)
    t_inside = rfq.bid_close_time - timedelta(minutes=3)
    res = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[1].id,
        carrier_name="Beta",
        freight_charges=65000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t_inside)

    assert res["assigned_rank"] == "L1"
    assert res["is_new_l1"] is True
    assert res["extension_triggered"] is True
    assert rfq.extension_count == 1

# 6. Forced Close Hard Cap & Boundary Conditions
def test_forced_close_hard_cap_capping(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    # Close time 2m away, Forced close 4m away. Extension Y=5m would reach 7m!
    # Engine MUST cap new close time strictly at 4m (forced close).
    close_time = now + timedelta(minutes=2)
    forced_time = now + timedelta(minutes=4)

    rfq = models.RFQ(
        rfq_code="RFQ-CAP-HARD",
        title="Cap Test",
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

    res = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Carrier",
        freight_charges=40000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=5)
    ), simulation_now=now)

    assert res["extension_triggered"] is True
    assert res["capped_at_forced"] is True
    assert rfq.bid_close_time == forced_time
    assert rfq.bid_close_time <= rfq.forced_close_time

def test_forced_close_subsequent_bids_prevented_from_extending(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    # Auction already at forced close time
    rfq = models.RFQ(
        rfq_code="RFQ-AT-CAP",
        title="Already at Cap",
        origin_location="DEL",
        destination_location="JAI",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(minutes=2),
        original_close_time=now + timedelta(minutes=2),
        forced_close_time=now + timedelta(minutes=2), # Forced == Close
        status="active",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID"
    )
    db.add(rfq)
    db.commit()

    res = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Carrier",
        freight_charges=40000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=5)
    ), simulation_now=now)

    # Bid is accepted, but close time does NOT increase!
    assert res["extension_triggered"] is False
    assert rfq.bid_close_time == rfq.forced_close_time

# 7. Tie-breaking Rule: Earlier timestamp wins L1
def test_tie_breaking_earlier_timestamp_wins_l1(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    rfq = models.RFQ(
        rfq_code="RFQ-TIE",
        title="Tie Break Test",
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

    # S1 submits 80,000 at t0
    t0 = now
    res1 = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[0].id,
        carrier_name="Alpha",
        freight_charges=80000.0,
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=2,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t0)
    assert res1["assigned_rank"] == "L1"

    # S2 submits identical 80,000 at t0 + 2 minutes
    t1 = t0 + timedelta(minutes=2)
    res2 = AuctionEngine.submit_quote(db, rfq.id, BidCreate(
        supplier_id=suppliers[1].id,
        carrier_name="Beta",
        freight_charges=80000.0, # Exact tie!
        origin_charges=0.0,
        destination_charges=0.0,
        transit_time_days=2,
        quote_validity_date=now + timedelta(days=10)
    ), simulation_now=t1)

    # S1 submitted earlier, so S1 must remain L1, and S2 becomes L2!
    bids = AuctionEngine.recalculate_rankings(db, rfq.id)
    assert bids[0].supplier_id == suppliers[0].id
    assert bids[0].rank_assigned == "L1"
    assert bids[1].supplier_id == suppliers[1].id
    assert bids[1].rank_assigned == "L2"

# 8. Auction Closure Validations
def test_closed_auction_rejects_bids(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    rfq = models.RFQ(
        rfq_code="RFQ-CLOSED-TEST",
        title="Closed Test",
        origin_location="MUM",
        destination_location="DEL",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=2),
        bid_close_time=now - timedelta(minutes=5), # Already closed
        original_close_time=now - timedelta(minutes=5),
        forced_close_time=now + timedelta(hours=1),
        status="closed",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID"
    )
    db.add(rfq)
    db.commit()

    with pytest.raises(ValueError, match="Auction is already closed"):
        AuctionEngine.submit_quote(db, rfq.id, BidCreate(
            supplier_id=suppliers[0].id,
            carrier_name="Alpha",
            freight_charges=80000.0,
            origin_charges=0.0,
            destination_charges=0.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=10)
        ), simulation_now=now)

def test_force_closed_auction_rejects_bids(db):
    suppliers = seed_test_suppliers(db)
    now = datetime.utcnow()

    rfq = models.RFQ(
        rfq_code="RFQ-FORCE-TEST",
        title="Force Closed Test",
        origin_location="MUM",
        destination_location="DEL",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=3),
        bid_close_time=now - timedelta(hours=1),
        original_close_time=now - timedelta(hours=1),
        forced_close_time=now - timedelta(minutes=10), # Forced close passed
        status="force_closed",
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID"
    )
    db.add(rfq)
    db.commit()

    with pytest.raises(ValueError, match="Auction is force-closed"):
        AuctionEngine.submit_quote(db, rfq.id, BidCreate(
            supplier_id=suppliers[0].id,
            carrier_name="Alpha",
            freight_charges=80000.0,
            origin_charges=0.0,
            destination_charges=0.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=10)
        ), simulation_now=now)
