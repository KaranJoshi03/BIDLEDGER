from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from app.db.session import get_db
from app.db import models
from app.schemas.rfq import (
    RFQCreate, RFQListItem, RFQDetailOut, BidCreate, BidOut, SimulationRequest
)
from app.services.auction_engine import AuctionEngine
from app.services.neo4j_service import neo4j_service
from app.services.websocket_manager import ws_manager

router = APIRouter()

@router.get("", response_model=List[RFQListItem])
def list_rfqs(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists all RFQs with current lowest bid, countdown state, and extension metrics."""
    AuctionEngine.check_and_update_auction_closures(db)
    query = db.query(models.RFQ)
    if status and status != "all":
        query = query.filter(models.RFQ.status == status)
    
    rfqs = query.order_by(models.RFQ.created_at.desc()).all()
    result = []
    
    for r in rfqs:
        lowest_bid = db.query(models.Bid).filter(models.Bid.rfq_id == r.id).order_by(models.Bid.total_charges.asc()).first()
        bids_count = db.query(models.Bid).filter(models.Bid.rfq_id == r.id).count()
        l1_name = lowest_bid.supplier.name if (lowest_bid and lowest_bid.supplier) else None
        
        result.append(RFQListItem(
            id=r.id,
            rfq_code=r.rfq_code,
            title=r.title,
            origin_location=r.origin_location,
            destination_location=r.destination_location,
            pickup_service_date=r.pickup_service_date,
            bid_start_time=r.bid_start_time,
            bid_close_time=r.bid_close_time,
            original_close_time=r.original_close_time,
            forced_close_time=r.forced_close_time,
            status=r.status,
            is_british_auction=r.is_british_auction,
            trigger_window_minutes=r.trigger_window_minutes,
            extension_duration_minutes=r.extension_duration_minutes,
            extension_trigger_type=r.extension_trigger_type,
            extension_count=r.extension_count,
            total_extended_minutes=r.total_extended_minutes,
            baseline_price=r.baseline_price,
            current_lowest_bid=lowest_bid.total_charges if lowest_bid else None,
            total_bids_count=bids_count,
            l1_supplier_name=l1_name
        ))
    return result

@router.post("", response_model=RFQDetailOut, status_code=status.HTTP_201_CREATED)
def create_rfq(rfq_in: RFQCreate, db: Session = Depends(get_db)):
    """Creates a new RFQ with British Auction configuration and strict forced close validations."""
    # Check duplicate code
    existing = db.query(models.RFQ).filter(models.RFQ.rfq_code == rfq_in.rfq_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"RFQ code '{rfq_in.rfq_code}' already exists.")

    now = datetime.utcnow()
    initial_status = "active" if now >= rfq_in.bid_start_time else "upcoming"

    rfq = models.RFQ(
        rfq_code=rfq_in.rfq_code,
        title=rfq_in.title,
        description=rfq_in.description,
        origin_location=rfq_in.origin_location,
        destination_location=rfq_in.destination_location,
        pickup_service_date=rfq_in.pickup_service_date,
        bid_start_time=rfq_in.bid_start_time,
        bid_close_time=rfq_in.bid_close_time,
        original_close_time=rfq_in.bid_close_time, # Set original anchor close time
        forced_close_time=rfq_in.forced_close_time,
        status=initial_status,
        baseline_price=rfq_in.baseline_price,
        is_british_auction=rfq_in.is_british_auction,
        trigger_window_minutes=rfq_in.trigger_window_minutes,
        extension_duration_minutes=rfq_in.extension_duration_minutes,
        extension_trigger_type=rfq_in.extension_trigger_type,
        extension_count=0,
        total_extended_minutes=0
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)

    # Add initial activity log
    init_log = models.ActivityLog(
        rfq_id=rfq.id,
        event_type="BID_SUBMITTED",
        summary=f"RFQ '{rfq.rfq_code}' created. British Auction: {rfq.is_british_auction} (X={rfq.trigger_window_minutes}m, Y={rfq.extension_duration_minutes}m, Trigger={rfq.extension_trigger_type}).",
        details={
            "trigger_window_minutes": rfq.trigger_window_minutes,
            "extension_duration_minutes": rfq.extension_duration_minutes,
            "extension_trigger_type": rfq.extension_trigger_type,
            "forced_close_time": rfq.forced_close_time.isoformat()
        }
    )
    db.add(init_log)
    db.commit()

    return rfq

@router.get("/{rfq_id}", response_model=RFQDetailOut)
def get_rfq_details(rfq_id: str, db: Session = Depends(get_db)):
    """Retrieves full RFQ details, supplier quotes sorted by price (L1, L2..), and complete audit log."""
    AuctionEngine.check_and_update_auction_closures(db)
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    # Ensure supplier name is attached
    for b in rfq.bids:
        if b.supplier:
            b.supplier_name = b.supplier.name

    return rfq

@router.post("/{rfq_id}/bids", status_code=status.HTTP_201_CREATED)
async def submit_quote_endpoint(rfq_id: str, quote_in: BidCreate, db: Session = Depends(get_db)):
    """Submits a quote, evaluates British Auction extensions, records audit log, and notifies WebSockets."""
    try:
        eval_result = AuctionEngine.submit_quote(db, rfq_id, quote_in)
        bid = eval_result["bid"]
        rfq = eval_result["rfq"]

        # Push to Neo4j
        prev_l1_sup_id = None
        if len(rfq.bids) > 1 and eval_result["is_new_l1"]:
            l2 = next((b for b in rfq.bids if b.rank_assigned == "L2"), None)
            if l2:
                prev_l1_sup_id = l2.supplier_id

        neo4j_service.record_bid_event(
            rfq_id=rfq.id,
            rfq_code=rfq.rfq_code,
            supplier_id=bid.supplier_id,
            supplier_name=bid.supplier.name if bid.supplier else "Supplier",
            carrier_name=bid.carrier_name,
            price=bid.total_charges,
            rank=bid.rank_assigned,
            is_l1=eval_result["is_new_l1"],
            previous_l1_supplier_id=prev_l1_sup_id
        )

        # Broadcast WebSocket event
        ws_payload = {
            "type": "NEW_BID_PLACED",
            "rfq_id": rfq.id,
            "bid_id": bid.id,
            "supplier_name": bid.supplier.name if bid.supplier else "Supplier",
            "total_charges": bid.total_charges,
            "rank": bid.rank_assigned,
            "extension_triggered": eval_result["extension_triggered"],
            "extension_minutes": eval_result["extension_minutes"],
            "new_close_time": rfq.bid_close_time.isoformat(),
            "capped_at_forced": eval_result["capped_at_forced"],
            "trigger_reason": eval_result["trigger_reason"]
        }
        await ws_manager.broadcast_to_room(rfq.id, ws_payload)

        return {
            "status": "success",
            "message": "Quote submitted successfully.",
            "bid_id": bid.id,
            "assigned_rank": bid.rank_assigned,
            "total_charges": bid.total_charges,
            "extension_triggered": eval_result["extension_triggered"],
            "extension_minutes": eval_result["extension_minutes"],
            "capped_at_forced": eval_result["capped_at_forced"],
            "new_bid_close_time": rfq.bid_close_time
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/{rfq_id}/analytics")
def get_rfq_analytics(rfq_id: str, db: Session = Depends(get_db)):
    """Returns Neo4j graph topology and price trend analytics for the visualizer."""
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    graph_data = neo4j_service.get_rfq_graph(rfq_id, db_rfq=rfq)
    
    # Calculate savings vs baseline
    lowest_bid = db.query(models.Bid).filter(models.Bid.rfq_id == rfq.id).order_by(models.Bid.total_charges.asc()).first()
    savings_amount = 0.0
    savings_percent = 0.0
    if rfq.baseline_price and lowest_bid:
        savings_amount = max(0.0, rfq.baseline_price - lowest_bid.total_charges)
        savings_percent = round((savings_amount / rfq.baseline_price) * 100, 2)

    return {
        "rfq_code": rfq.rfq_code,
        "baseline_price": rfq.baseline_price,
        "lowest_price": lowest_bid.total_charges if lowest_bid else None,
        "savings_amount": savings_amount,
        "savings_percent": savings_percent,
        "extension_count": rfq.extension_count,
        "total_extended_minutes": rfq.total_extended_minutes,
        "graph": graph_data
    }

@router.post("/{rfq_id}/simulate")
async def simulate_auction_scenario(rfq_id: str, sim_req: SimulationRequest, db: Session = Depends(get_db)):
    """
    Simulation Test Bench endpoint enabling immediate verification of British Auction features:
    1. FAST_FORWARD_TO_TRIGGER_WINDOW: Sets close time to (now + (X - 2) minutes) so the trigger window is immediately active!
    2. SIMULATE_RIVAL_BID: Injects a rival supplier bid inside the trigger window.
    3. SIMULATE_L1_TAKEOVER: Injects a lower bid to trigger L1 change.
    4. SIMULATE_FORCED_CLOSE_BOUNDARY: Sets close time to 1 min before forced close to test hard cap!
    """
    rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    now = datetime.utcnow()

    if sim_req.action == "FAST_FORWARD_TO_TRIGGER_WINDOW":
        # Put close time 3 minutes from now (inside trigger window X=10 or X=5)
        rfq.bid_start_time = now - timedelta(hours=2)
        rfq.bid_close_time = now + timedelta(minutes=3)
        rfq.forced_close_time = now + timedelta(minutes=15)
        rfq.status = "active"
        db.commit()
        
        db.add(models.ActivityLog(
            rfq_id=rfq.id,
            event_type="TIME_EXTENDED",
            summary=f"⚡ [SIMULATION] Clock advanced into Trigger Window! Auction closing in 3 minutes. Trigger Window: {rfq.trigger_window_minutes}m.",
            details={"action": "FAST_FORWARD_TO_TRIGGER_WINDOW", "new_close_time": rfq.bid_close_time.isoformat()}
        ))
        db.commit()
        
        await ws_manager.broadcast_to_room(rfq.id, {
            "type": "SIMULATION_UPDATE",
            "message": "Clock fast-forwarded into Trigger Window",
            "new_close_time": rfq.bid_close_time.isoformat()
        })
        return {"status": "success", "message": "Fast-forwarded into Trigger Window. Remaining: 3 minutes."}

    elif sim_req.action == "SIMULATE_FORCED_CLOSE_BOUNDARY":
        # Put close time 1 minute before forced close
        rfq.bid_close_time = now + timedelta(minutes=2)
        rfq.forced_close_time = now + timedelta(minutes=3)
        rfq.status = "active"
        db.commit()

        db.add(models.ActivityLog(
            rfq_id=rfq.id,
            event_type="TIME_EXTENDED",
            summary=f"⚡ [SIMULATION] Auction positioned at Forced Close Boundary! Forced close in 3 mins. Any extension will be capped.",
            details={"action": "SIMULATE_FORCED_CLOSE_BOUNDARY"}
        ))
        db.commit()
        return {"status": "success", "message": "Auction positioned 1 minute before Forced Close Time."}

    elif sim_req.action in ["SIMULATE_RIVAL_BID", "SIMULATE_L1_TAKEOVER"]:
        # Find a supplier different from current L1
        suppliers = db.query(models.Supplier).all()
        if not suppliers:
            raise HTTPException(status_code=400, detail="No suppliers available for simulation.")
        
        lowest_bid = db.query(models.Bid).filter(models.Bid.rfq_id == rfq.id).order_by(models.Bid.total_charges.asc()).first()
        target_supplier = suppliers[0]
        if lowest_bid:
            other_suppliers = [s for s in suppliers if s.id != lowest_bid.supplier_id]
            if other_suppliers:
                target_supplier = other_suppliers[0]

        if sim_req.action == "SIMULATE_L1_TAKEOVER":
            current_low = lowest_bid.total_charges if lowest_bid else 100000.0
            new_target_price = round(current_low - 2500.0, 2)
        else: # Rival bid without necessarily being L1
            current_low = lowest_bid.total_charges if lowest_bid else 100000.0
            new_target_price = round(current_low + 1200.0, 2)

        freight = round(new_target_price * 0.8, 2)
        origin = round(new_target_price * 0.1, 2)
        dest = round(new_target_price - freight - origin, 2)

        quote = BidCreate(
            supplier_id=target_supplier.id,
            carrier_name=sim_req.carrier_name or "Apex Express Cargo",
            freight_charges=freight,
            origin_charges=origin,
            destination_charges=dest,
            transit_time_days=3,
            quote_validity_date=now + timedelta(days=15),
            notes=f"Automated test bid ({sim_req.action})"
        )
        return AuctionEngine.submit_quote(db, rfq.id, quote, simulation_now=now)

    else:
        raise HTTPException(status_code=400, detail="Unknown simulation action.")
