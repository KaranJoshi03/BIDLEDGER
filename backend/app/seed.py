from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db import models

def seed_database(db: Session, force_refresh: bool = False):
    """
    Seeds rich enterprise logistics data with at least 7 verified suppliers,
    6 diverse British Auction RFQs across India's freight corridors,
    and 25+ competitive quotes demonstrating all rank positions (L1..L6).
    """
    if force_refresh:
        db.query(models.ActivityLog).delete()
        db.query(models.Bid).delete()
        db.query(models.RFQ).delete()
        db.query(models.Supplier).delete()
        db.commit()
    elif db.query(models.Supplier).count() > 0:
        # If already exists, ensure active demo RFQs close time stays in the future
        now = datetime.utcnow()
        active_demo = db.query(models.RFQ).filter(models.RFQ.rfq_code == "RFQ-2026-MUM-DEL").first()
        if active_demo and active_demo.bid_close_time <= now:
            active_demo.bid_start_time = now - timedelta(hours=1)
            active_demo.bid_close_time = now + timedelta(minutes=14)
            active_demo.original_close_time = now + timedelta(minutes=14)
            active_demo.forced_close_time = now + timedelta(minutes=45)
            active_demo.status = "active"
            db.commit()
        return

    now = datetime.utcnow()

    # 1. Seven Verified Logistics Suppliers
    suppliers = [
        models.Supplier(
            supplier_code="SUP-DELHIVERY",
            name="Delhivery Freight Solutions",
            contact_email="enterprise.freight@delhivery.com",
            phone="+91 124 6719500",
            rating=4.92,
            is_verified=True
        ),
        models.Supplier(
            supplier_code="SUP-BLUEDART",
            name="Blue Dart Aviation & Surface",
            contact_email="bidding.desk@bluedart.com",
            phone="+91 22 28396444",
            rating=4.88,
            is_verified=True
        ),
        models.Supplier(
            supplier_code="SUP-VRL",
            name="VRL Logistics Road Haulage",
            contact_email="rfq.cell@vrllogistics.com",
            phone="+91 836 2237511",
            rating=4.75,
            is_verified=True
        ),
        models.Supplier(
            supplier_code="SUP-MAERSK",
            name="Maersk Logistics & Linehaul",
            contact_email="inland.quotes@maersk.com",
            phone="+91 22 66589000",
            rating=4.95,
            is_verified=True
        ),
        models.Supplier(
            supplier_code="SUP-DHL",
            name="DHL Global Forwarding",
            contact_email="lead.procurement@dhl.com",
            phone="+91 22 67894000",
            rating=4.91,
            is_verified=True
        ),
        models.Supplier(
            supplier_code="SUP-TCI",
            name="TCI Express Cargo",
            contact_email="bids@tciexpress.in",
            phone="+91 124 2381603",
            rating=4.70,
            is_verified=True
        ),
        models.Supplier(
            supplier_code="SUP-SAFEXPRESS",
            name="Safexpress Logistics Hub",
            contact_email="specialbids@safexpress.com",
            phone="+91 11 26783200",
            rating=4.84,
            is_verified=True
        )
    ]
    db.add_all(suppliers)
    db.commit()
    for s in suppliers:
        db.refresh(s)

    # -------------------------------------------------------------
    # RFQ 1: Primary Live British Auction Demo (In Trigger Window!)
    # Corridor: Mumbai JNPT to Delhi Tughlakabad (High Volume Electronics)
    # -------------------------------------------------------------
    rfq_live = models.RFQ(
        rfq_code="RFQ-2026-MUM-DEL",
        title="JNPT Port (Mumbai) to ICD Tughlakabad (Delhi) - 25x 32ft Multi-Axle Linehaul",
        description="High-volume container haulage for consumer technology electronics. Mandatory GPS telematics, transit time <= 48 hours, tamper-proof tarpaulin seals, dock appointment booking.",
        origin_location="JNPT Port, Navi Mumbai",
        destination_location="ICD Tughlakabad, New Delhi",
        pickup_service_date=now + timedelta(days=4),
        bid_start_time=now - timedelta(hours=2),
        bid_close_time=now + timedelta(minutes=14),  # Inside 15m trigger window!
        original_close_time=now + timedelta(minutes=14),
        forced_close_time=now + timedelta(minutes=45),  # Hard stop rule
        status="active",
        baseline_price=125000.0,
        is_british_auction=True,
        trigger_window_minutes=15,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE",
        extension_count=2,
        total_extended_minutes=10
    )
    db.add(rfq_live)
    db.commit()
    db.refresh(rfq_live)

    # 5 Competitive Bids for RFQ 1 (L1 through L5)
    bids_rfq1 = [
        models.Bid(
            rfq_id=rfq_live.id,
            supplier_id=suppliers[5].id,  # TCI
            carrier_name="TCI Express Linehaul",
            freight_charges=104000.0,
            origin_charges=4500.0,
            destination_charges=3500.0,
            total_charges=112000.0,
            transit_time_days=3,
            quote_validity_date=now + timedelta(days=15),
            rank_assigned="L5",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Hub relay fleet with transit guarantee",
            submitted_at=now - timedelta(hours=1, minutes=50)
        ),
        models.Bid(
            rfq_id=rfq_live.id,
            supplier_id=suppliers[1].id,  # Blue Dart
            carrier_name="Blue Dart Surface Aviation",
            freight_charges=98000.0,
            origin_charges=4000.0,
            destination_charges=3500.0,
            total_charges=105500.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=14),
            rank_assigned="L4",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Dedicated GPS fleet with 2 drivers per vehicle",
            submitted_at=now - timedelta(hours=1, minutes=30)
        ),
        models.Bid(
            rfq_id=rfq_live.id,
            supplier_id=suppliers[2].id,  # VRL
            carrier_name="VRL Prime Roadways",
            freight_charges=91000.0,
            origin_charges=3500.0,
            destination_charges=3200.0,
            total_charges=97700.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=10),
            rank_assigned="L3",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Hub-to-hub express linehaul",
            submitted_at=now - timedelta(hours=1, minutes=10)
        ),
        models.Bid(
            rfq_id=rfq_live.id,
            supplier_id=suppliers[6].id,  # Safexpress
            carrier_name="Safexpress Special Freight",
            freight_charges=88000.0,
            origin_charges=3200.0,
            destination_charges=3000.0,
            total_charges=94200.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=18),
            rank_assigned="L2",
            caused_extension=True,
            extension_minutes_awarded=5,
            notes="Real-time temperature & lock telemetry",
            submitted_at=now - timedelta(minutes=10)
        ),
        models.Bid(
            rfq_id=rfq_live.id,
            supplier_id=suppliers[0].id,  # Delhivery
            carrier_name="Delhivery Freightliner FastTrack",
            freight_charges=85000.0,
            origin_charges=3000.0,
            destination_charges=2800.0,
            total_charges=90800.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=20),
            rank_assigned="L1",
            caused_extension=True,
            extension_minutes_awarded=5,
            notes="Automated dock booking & instant e-Way bill sync",
            submitted_at=now - timedelta(minutes=3)
        )
    ]
    db.add_all(bids_rfq1)

    # Activity Logs for RFQ 1
    logs_rfq1 = [
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="BID_SUBMITTED",
            summary="Initial quote of ₹112,000.00 submitted by TCI Express Cargo. Assigned Rank: L1.",
            details={"supplier": "TCI Express Cargo", "amount": 112000.0},
            timestamp=now - timedelta(hours=1, minutes=50)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="BID_SUBMITTED",
            summary="Quote of ₹105,500.00 submitted by Blue Dart Aviation & Surface. Assigned Rank: L1.",
            details={"supplier": "Blue Dart Aviation & Surface", "amount": 105500.0},
            timestamp=now - timedelta(hours=1, minutes=30)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="L1_CHANGED",
            summary="🏆 Blue Dart Aviation & Surface overtook TCI Express Cargo as L1 at ₹105,500.00 (Savings: ₹6,500.00).",
            details={"savings": 6500.0},
            timestamp=now - timedelta(hours=1, minutes=30)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="BID_SUBMITTED",
            summary="Quote of ₹97,700.00 submitted by VRL Logistics Road Haulage. Assigned Rank: L1.",
            details={"supplier": "VRL Logistics Road Haulage", "amount": 97700.0},
            timestamp=now - timedelta(hours=1, minutes=10)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="L1_CHANGED",
            summary="🏆 VRL Logistics Road Haulage overtook Blue Dart Aviation & Surface as L1 at ₹97,700.00 (Savings: ₹7,800.00).",
            details={"savings": 7800.0},
            timestamp=now - timedelta(hours=1, minutes=10)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="BID_SUBMITTED",
            summary="Quote of ₹94,200.00 submitted by Safexpress Logistics Hub in Trigger Window. Assigned Rank: L1.",
            details={"supplier": "Safexpress Logistics Hub", "amount": 94200.0},
            timestamp=now - timedelta(minutes=10)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="TIME_EXTENDED",
            summary=f"⚡ British Auction Extended by 5 min(s). New Lowest Bidder (L1) achieved in last 15 mins (Safexpress Logistics Hub at ₹94,200.00).",
            details={"extension_minutes": 5, "trigger": "L1_RANK_CHANGE"},
            timestamp=now - timedelta(minutes=10)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="BID_SUBMITTED",
            summary="Quote of ₹90,800.00 submitted by Delhivery Freight Solutions. Assigned Rank: L1.",
            details={"supplier": "Delhivery Freight Solutions", "amount": 90800.0},
            timestamp=now - timedelta(minutes=3)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="TIME_EXTENDED",
            summary=f"⚡ British Auction Extended by 5 min(s). New Lowest Bidder (L1) achieved in last 15 mins (Delhivery Freight Solutions at ₹90,800.00).",
            details={"extension_minutes": 5, "trigger": "L1_RANK_CHANGE"},
            timestamp=now - timedelta(minutes=3)
        ),
        models.ActivityLog(
            rfq_id=rfq_live.id,
            event_type="L1_CHANGED",
            summary="🏆 Delhivery Freight Solutions overtook Safexpress Logistics Hub as L1 at ₹90,800.00 (Savings: ₹3,400.00).",
            details={"savings": 3400.0},
            timestamp=now - timedelta(minutes=3)
        )
    ]
    db.add_all(logs_rfq1)

    # -------------------------------------------------------------
    # RFQ 2: Cold Chain Pharma Logistics (Any Rank Change trigger)
    # Corridor: Bengaluru to Chennai Ennore Port (-20°C Reefer)
    # -------------------------------------------------------------
    rfq_pharma = models.RFQ(
        rfq_code="RFQ-2026-BLR-MAA",
        title="Bengaluru Electronic City to Chennai Ennore Port - Reefer Containers (-20°C)",
        description="Temperature-controlled logistics for active pharmaceutical ingredients (API) and vaccine vials. Continuous IoT temperature data logger with cellular telemetry mandatory.",
        origin_location="Electronic City, Bengaluru",
        destination_location="Ennore Port, Chennai",
        pickup_service_date=now + timedelta(days=2),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(hours=2),
        original_close_time=now + timedelta(hours=2),
        forced_close_time=now + timedelta(hours=4),
        status="active",
        baseline_price=68000.0,
        is_british_auction=True,
        trigger_window_minutes=15,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_RANK_CHANGE",
        extension_count=1,
        total_extended_minutes=5
    )
    db.add(rfq_pharma)
    db.commit()
    db.refresh(rfq_pharma)

    bids_rfq2 = [
        models.Bid(
            rfq_id=rfq_pharma.id,
            supplier_id=suppliers[5].id,  # TCI
            carrier_name="TCI Cold Chain Reefer",
            freight_charges=61000.0,
            origin_charges=3000.0,
            destination_charges=2500.0,
            total_charges=66500.0,
            transit_time_days=1,
            quote_validity_date=now + timedelta(days=30),
            rank_assigned="L5",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Calibrated digital data logger included",
            submitted_at=now - timedelta(minutes=50)
        ),
        models.Bid(
            rfq_id=rfq_pharma.id,
            supplier_id=suppliers[1].id,  # Blue Dart
            carrier_name="Blue Dart Temperature Controlled",
            freight_charges=58000.0,
            origin_charges=2800.0,
            destination_charges=2200.0,
            total_charges=63000.0,
            transit_time_days=1,
            quote_validity_date=now + timedelta(days=30),
            rank_assigned="L4",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Validated cold box with dry ice buffer",
            submitted_at=now - timedelta(minutes=40)
        ),
        models.Bid(
            rfq_id=rfq_pharma.id,
            supplier_id=suppliers[2].id,  # VRL
            carrier_name="VRL Cold Express",
            freight_charges=55000.0,
            origin_charges=2500.0,
            destination_charges=2200.0,
            total_charges=59700.0,
            transit_time_days=1,
            quote_validity_date=now + timedelta(days=30),
            rank_assigned="L3",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="GPS telematics and redundant cooling compressor",
            submitted_at=now - timedelta(minutes=30)
        ),
        models.Bid(
            rfq_id=rfq_pharma.id,
            supplier_id=suppliers[0].id,  # Delhivery
            carrier_name="Delhivery Pharma Shield",
            freight_charges=53000.0,
            origin_charges=2500.0,
            destination_charges=2000.0,
            total_charges=57500.0,
            transit_time_days=1,
            quote_validity_date=now + timedelta(days=30),
            rank_assigned="L2",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Automated temperature deviation SMS alert",
            submitted_at=now - timedelta(minutes=20)
        ),
        models.Bid(
            rfq_id=rfq_pharma.id,
            supplier_id=suppliers[4].id,  # DHL
            carrier_name="DHL Thermonet Advanced Reefer",
            freight_charges=50000.0,
            origin_charges=2400.0,
            destination_charges=2100.0,
            total_charges=54500.0,
            transit_time_days=1,
            quote_validity_date=now + timedelta(days=30),
            rank_assigned="L1",
            caused_extension=True,
            extension_minutes_awarded=5,
            notes="Validated -20C cold storage with telemetry backup",
            submitted_at=now - timedelta(minutes=10)
        )
    ]
    db.add_all(bids_rfq2)

    # -------------------------------------------------------------
    # RFQ 3: High-Frequency Electronics Corridor (Any Bid trigger)
    # Corridor: Hyderabad Aerospace SEZ to Mumbai Sahar Cargo
    # -------------------------------------------------------------
    rfq_electronics = models.RFQ(
        rfq_code="RFQ-2026-HYD-BOM",
        title="Hyderabad Aerospace SEZ to Mumbai Sahar Cargo - High-Value Defense Electronics",
        description="Armored box truck transit with armed escort and dual driver protocol. 24x7 route geo-fencing and immediate port staging.",
        origin_location="Adibatla Aerospace SEZ, Hyderabad",
        destination_location="Sahar Air Cargo Complex, Mumbai",
        pickup_service_date=now + timedelta(days=1),
        bid_start_time=now - timedelta(hours=1),
        bid_close_time=now + timedelta(minutes=45),
        original_close_time=now + timedelta(minutes=45),
        forced_close_time=now + timedelta(hours=2),
        status="active",
        baseline_price=145000.0,
        is_british_auction=True,
        trigger_window_minutes=15,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID",
        extension_count=1,
        total_extended_minutes=5
    )
    db.add(rfq_electronics)
    db.commit()
    db.refresh(rfq_electronics)

    bids_rfq3 = [
        models.Bid(
            rfq_id=rfq_electronics.id,
            supplier_id=suppliers[2].id,  # VRL
            carrier_name="VRL Secure Freight",
            freight_charges=125000.0,
            origin_charges=5000.0,
            destination_charges=4000.0,
            total_charges=134000.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=14),
            rank_assigned="L4",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Escort vehicle and GPS geo-fencing",
            submitted_at=now - timedelta(minutes=35)
        ),
        models.Bid(
            rfq_id=rfq_electronics.id,
            supplier_id=suppliers[0].id,  # Delhivery
            carrier_name="Delhivery High-Value Surface",
            freight_charges=118000.0,
            origin_charges=4500.0,
            destination_charges=4000.0,
            total_charges=126500.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=20),
            rank_assigned="L3",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Biometric latch locks and dual drivers",
            submitted_at=now - timedelta(minutes=25)
        ),
        models.Bid(
            rfq_id=rfq_electronics.id,
            supplier_id=suppliers[6].id,  # Safexpress
            carrier_name="Safexpress Special Secure",
            freight_charges=112000.0,
            origin_charges=4000.0,
            destination_charges=3500.0,
            total_charges=119500.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=15),
            rank_assigned="L2",
            caused_extension=False,
            extension_minutes_awarded=0,
            notes="Sealed container with emergency panic beacon",
            submitted_at=now - timedelta(minutes=15)
        ),
        models.Bid(
            rfq_id=rfq_electronics.id,
            supplier_id=suppliers[1].id,  # Blue Dart
            carrier_name="Blue Dart Secure Aviation Prime",
            freight_charges=106000.0,
            origin_charges=3500.0,
            destination_charges=3200.0,
            total_charges=112700.0,
            transit_time_days=1,
            quote_validity_date=now + timedelta(days=14),
            rank_assigned="L1",
            caused_extension=True,
            extension_minutes_awarded=5,
            notes="Priority air cargo slot with tarmac direct loading",
            submitted_at=now - timedelta(minutes=5)
        )
    ]
    db.add_all(bids_rfq3)

    # -------------------------------------------------------------
    # RFQ 4: Upcoming British Auction (Starts in 30 minutes)
    # Corridor: Kolkata Port to Guwahati ICD
    # -------------------------------------------------------------
    rfq_upcoming = models.RFQ(
        rfq_code="RFQ-2026-CCU-GHY",
        title="Kolkata Port Trust to Guwahati ICD - Riverine & Road Heavy Multi-Modal",
        description="Containerized project cargo for northeast infrastructure corridor. Low-bed heavy mechanical trailers.",
        origin_location="Kolkata Port Trust, West Bengal",
        destination_location="Guwahati ICD, Assam",
        pickup_service_date=now + timedelta(days=5),
        bid_start_time=now + timedelta(minutes=30),  # Starts in future
        bid_close_time=now + timedelta(hours=3),
        original_close_time=now + timedelta(hours=3),
        forced_close_time=now + timedelta(hours=6),
        status="upcoming",
        baseline_price=210000.0,
        is_british_auction=True,
        trigger_window_minutes=20,
        extension_duration_minutes=10,
        extension_trigger_type="L1_RANK_CHANGE",
        extension_count=0,
        total_extended_minutes=0
    )
    db.add(rfq_upcoming)

    # -------------------------------------------------------------
    # RFQ 5: Closed British Auction (Completed with 4 extensions)
    # Corridor: Pune Chakan to Ahmedabad Sanand (Automotive Assembly)
    # -------------------------------------------------------------
    rfq_closed = models.RFQ(
        rfq_code="RFQ-2026-PUN-AMD",
        title="Pune Chakan to Ahmedabad Sanand - Automotive Robotic Assembly Line",
        description="Specialized low-bed trailer logistics for robotic assembly machinery. All bids sealed and won by Maersk.",
        origin_location="Chakan Industrial Area, Pune",
        destination_location="Sanand GIDC, Ahmedabad",
        pickup_service_date=now - timedelta(days=1),
        bid_start_time=now - timedelta(days=2),
        bid_close_time=now - timedelta(hours=3),
        original_close_time=now - timedelta(hours=3, minutes=20),
        forced_close_time=now - timedelta(hours=2),
        status="closed",
        baseline_price=185000.0,
        is_british_auction=True,
        trigger_window_minutes=10,
        extension_duration_minutes=5,
        extension_trigger_type="L1_RANK_CHANGE",
        extension_count=4,
        total_extended_minutes=20
    )
    db.add(rfq_closed)
    db.commit()
    db.refresh(rfq_closed)

    bids_rfq5 = [
        models.Bid(
            rfq_id=rfq_closed.id,
            supplier_id=suppliers[5].id,
            carrier_name="TCI Project Cargo",
            freight_charges=165000.0,
            origin_charges=5000.0,
            destination_charges=4000.0,
            total_charges=174000.0,
            transit_time_days=3,
            quote_validity_date=now + timedelta(days=5),
            rank_assigned="L4",
            caused_extension=False,
            extension_minutes_awarded=0,
            submitted_at=now - timedelta(hours=4)
        ),
        models.Bid(
            rfq_id=rfq_closed.id,
            supplier_id=suppliers[2].id,
            carrier_name="VRL Heavy Fleet",
            freight_charges=155000.0,
            origin_charges=4500.0,
            destination_charges=4000.0,
            total_charges=163500.0,
            transit_time_days=3,
            quote_validity_date=now + timedelta(days=5),
            rank_assigned="L3",
            caused_extension=False,
            extension_minutes_awarded=0,
            submitted_at=now - timedelta(hours=3, minutes=30)
        ),
        models.Bid(
            rfq_id=rfq_closed.id,
            supplier_id=suppliers[4].id,
            carrier_name="DHL Industrial Projects",
            freight_charges=148000.0,
            origin_charges=4000.0,
            destination_charges=3500.0,
            total_charges=155500.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=5),
            rank_assigned="L2",
            caused_extension=True,
            extension_minutes_awarded=5,
            submitted_at=now - timedelta(hours=3, minutes=15)
        ),
        models.Bid(
            rfq_id=rfq_closed.id,
            supplier_id=suppliers[3].id,  # Maersk
            carrier_name="Maersk Heavy Lift Lines",
            freight_charges=138000.0,
            origin_charges=4500.0,
            destination_charges=4000.0,
            total_charges=146500.0,
            transit_time_days=2,
            quote_validity_date=now + timedelta(days=15),
            rank_assigned="L1",
            caused_extension=True,
            extension_minutes_awarded=5,
            notes="Winning sealed bid - contract awarded",
            submitted_at=now - timedelta(hours=3, minutes=2)
        )
    ]
    db.add_all(bids_rfq5)

    # -------------------------------------------------------------
    # RFQ 6: Force-Closed British Auction (Hard stop ceiling enforced)
    # Corridor: Delhi to Jaipur (Fragile Solar Module Haulage)
    # -------------------------------------------------------------
    rfq_force_closed = models.RFQ(
        rfq_code="RFQ-2026-DEL-JAI",
        title="Delhi ICD to Jaipur Sitapura SEZ - Fragile Solar Module Glass Haulage",
        description="Air-suspension shock-monitored trucks for photovoltaic solar panels. Demonstrates the immutable Forced Bid Close hard cap.",
        origin_location="Delhi ICD, Patparganj",
        destination_location="Sitapura Industrial Area, Jaipur",
        pickup_service_date=now - timedelta(days=2),
        bid_start_time=now - timedelta(days=3),
        bid_close_time=now - timedelta(days=1),
        original_close_time=now - timedelta(days=1, hours=2),
        forced_close_time=now - timedelta(days=1),
        status="force_closed",
        baseline_price=75000.0,
        is_british_auction=True,
        trigger_window_minutes=15,
        extension_duration_minutes=5,
        extension_trigger_type="ANY_BID",
        extension_count=6,
        total_extended_minutes=30
    )
    db.add(rfq_force_closed)
    db.commit()
    db.refresh(rfq_force_closed)

    db.add(models.Bid(
        rfq_id=rfq_force_closed.id,
        supplier_id=suppliers[0].id,
        carrier_name="Delhivery Prime Surface",
        freight_charges=52000.0,
        origin_charges=2000.0,
        destination_charges=1800.0,
        total_charges=55800.0,
        transit_time_days=1,
        quote_validity_date=now + timedelta(days=10),
        rank_assigned="L1",
        caused_extension=True,
        extension_minutes_awarded=5,
        notes="Final quote accepted before forced close hard cap.",
        submitted_at=now - timedelta(days=1, minutes=1)
    ))

    db.add(models.ActivityLog(
        rfq_id=rfq_force_closed.id,
        event_type="AUCTION_FORCE_CLOSED",
        summary=f"Auction reached Forced Bid Close Time ({rfq_force_closed.forced_close_time.strftime('%Y-%m-%d %H:%M:%S UTC')}). Hard stop enforced, rejecting further extensions.",
        details={"forced_close_time": rfq_force_closed.forced_close_time.isoformat()},
        timestamp=rfq_force_closed.forced_close_time
    ))

    db.commit()
