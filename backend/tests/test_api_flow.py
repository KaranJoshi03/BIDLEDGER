import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_api_rfq_listing(client):
    res = client.get("/api/rfqs")
    assert res.status_code == 200
    rfqs = res.json()
    assert len(rfqs) >= 5
    # Verify key fields present in all RFQs
    for r in rfqs:
        assert "rfq_code" in r
        assert "title" in r
        assert "bid_close_time" in r
        assert "forced_close_time" in r
        assert "status" in r
        assert "is_british_auction" in r

def test_api_create_and_bid_workflow(client):
    # 1. Fetch available suppliers
    sup_res = client.get("/api/suppliers")
    assert sup_res.status_code == 200
    suppliers = sup_res.json()
    assert len(suppliers) >= 5
    s1 = suppliers[0]
    s2 = suppliers[1]

    # 2. Create new RFQ with British Auction
    now = datetime.utcnow()
    rfq_payload = {
        "rfq_code": f"TEST-API-{int(now.timestamp())}",
        "title": "API Flow Test - Container Haulage",
        "description": "Integration test for British Auction dynamic bidding",
        "origin_location": "JNPT Port, Mumbai",
        "destination_location": "Tughlakabad ICD, Delhi",
        "pickup_service_date": (now + timedelta(days=3)).isoformat(),
        "bid_start_time": (now - timedelta(hours=1)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=8)).isoformat(), # Inside 10m window!
        "forced_close_time": (now + timedelta(minutes=25)).isoformat(),
        "baseline_price": 100000.0,
        "is_british_auction": True,
        "trigger_window_minutes": 20,
        "extension_duration_minutes": 5,
        "extension_trigger_type": "L1_RANK_CHANGE"
    }
    create_res = client.post("/api/rfqs", json=rfq_payload)
    assert create_res.status_code == 201
    created_rfq = create_res.json()
    rfq_id = created_rfq["id"]

    # 3. Supplier 1 submits quote
    quote1 = {
        "supplier_id": s1["id"],
        "carrier_name": "Carrier Alpha",
        "freight_charges": 80000.0,
        "origin_charges": 3000.0,
        "destination_charges": 2000.0,
        "transit_time_days": 2,
        "quote_validity_date": (now + timedelta(days=10)).isoformat(),
        "notes": "First baseline quote"
    }
    bid1_res = client.post(f"/api/rfqs/{rfq_id}/bids", json=quote1)
    assert bid1_res.status_code == 201
    assert bid1_res.json()["assigned_rank"] == "L1"

    # 4. Supplier 2 submits lower quote inside 10-minute trigger window
    quote2 = {
        "supplier_id": s2["id"],
        "carrier_name": "Carrier Beta",
        "freight_charges": 72000.0, # Lower than S1
        "origin_charges": 2500.0,
        "destination_charges": 2000.0,
        "transit_time_days": 2,
        "quote_validity_date": (now + timedelta(days=10)).isoformat(),
        "notes": "Underbid to claim L1"
    }
    bid2_res = client.post(f"/api/rfqs/{rfq_id}/bids", json=quote2)
    assert bid2_res.status_code == 201
    b2_data = bid2_res.json()
    assert b2_data["assigned_rank"] == "L1"
    assert b2_data["extension_triggered"] is True
    assert b2_data["extension_minutes"] == 5

    # 5. Verify RFQ details and activity logs
    detail_res = client.get(f"/api/rfqs/{rfq_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["bids"]) == 2
    assert detail["bids"][0]["rank_assigned"] == "L1"
    assert detail["bids"][0]["total_charges"] == 76500.0
    assert detail["extension_count"] == 2 # 1 on initial L1, 1 on S2 takeover

    # Verify event types in logs
    event_types = [l["event_type"] for l in detail["activity_logs"]]
    assert "BID_SUBMITTED" in event_types
    assert "TIME_EXTENDED" in event_types
    assert "L1_CHANGED" in event_types

def test_api_simulation_bench(client):
    rfqs = client.get("/api/rfqs").json()
    active_rfq = rfqs[0]
    rfq_id = active_rfq["id"]

    # 1. Fast forward to trigger window
    sim1 = client.post(f"/api/rfqs/{rfq_id}/simulate", json={"action": "FAST_FORWARD_TO_TRIGGER_WINDOW"})
    assert sim1.status_code == 200
    assert "Trigger Window" in sim1.json()["message"]

    # 2. Simulate L1 Takeover
    sim2 = client.post(f"/api/rfqs/{rfq_id}/simulate", json={"action": "SIMULATE_L1_TAKEOVER"})
    assert sim2.status_code == 200

    # 3. Test Forced Close Boundary
    sim3 = client.post(f"/api/rfqs/{rfq_id}/simulate", json={"action": "SIMULATE_FORCED_CLOSE_BOUNDARY"})
    assert sim3.status_code == 200
    assert "Forced Close" in sim3.json()["message"]

def test_api_analytics_endpoint(client):
    rfqs = client.get("/api/rfqs").json()
    rfq_id = rfqs[0]["id"]
    res = client.get(f"/api/rfqs/{rfq_id}/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "graph" in data
    assert "nodes" in data["graph"]
    assert "links" in data["graph"]
    assert "savings_amount" in data
