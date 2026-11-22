import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    supplier_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    rating = Column(Float, default=4.9)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bids = relationship("Bid", back_populates="supplier", cascade="all, delete-orphan")


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfq_code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    origin_location = Column(String(255), nullable=False)
    destination_location = Column(String(255), nullable=False)
    pickup_service_date = Column(DateTime, nullable=False)
    
    # Timeline
    bid_start_time = Column(DateTime, nullable=False)
    bid_close_time = Column(DateTime, nullable=False)       # Dynamic Close Time (extended dynamically)
    original_close_time = Column(DateTime, nullable=False)  # Anchor Close Time
    forced_close_time = Column(DateTime, nullable=False)    # Absolute Hard Cap
    
    # Status: 'upcoming' | 'active' | 'closed' | 'force_closed'
    status = Column(String(20), default="active", nullable=False, index=True)
    baseline_price = Column(Float, nullable=True)
    
    # British Auction Config
    is_british_auction = Column(Boolean, default=True, nullable=False)
    trigger_window_minutes = Column(Integer, default=10, nullable=False)  # X Minutes
    extension_duration_minutes = Column(Integer, default=5, nullable=False) # Y Minutes
    # 'ANY_BID' | 'ANY_RANK_CHANGE' | 'L1_RANK_CHANGE'
    extension_trigger_type = Column(String(50), default="L1_RANK_CHANGE", nullable=False)
    
    # Metrics
    extension_count = Column(Integer, default=0, nullable=False)
    total_extended_minutes = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bids = relationship("Bid", back_populates="rfq", cascade="all, delete-orphan", order_by="Bid.total_charges.asc()")
    activity_logs = relationship("ActivityLog", back_populates="rfq", cascade="all, delete-orphan", order_by="ActivityLog.timestamp.desc()")


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Quote Submission Fields
    carrier_name = Column(String(255), nullable=False)
    freight_charges = Column(Float, nullable=False)
    origin_charges = Column(Float, default=0.0, nullable=False)
    destination_charges = Column(Float, default=0.0, nullable=False)
    total_charges = Column(Float, nullable=False) # Computed = freight + origin + destination
    transit_time_days = Column(Integer, nullable=False)
    quote_validity_date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    
    # British Auction Dynamic Rank
    rank_assigned = Column(String(10), nullable=True) # L1, L2, L3...
    caused_extension = Column(Boolean, default=False, nullable=False)
    extension_minutes_awarded = Column(Integer, default=0, nullable=False)
    
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    rfq = relationship("RFQ", back_populates="bids")
    supplier = relationship("Supplier", back_populates="bids")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False) # BID_SUBMITTED, TIME_EXTENDED, RANK_CHANGED, L1_CHANGED, AUCTION_CLOSED, AUCTION_FORCE_CLOSED
    summary = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    rfq = relationship("RFQ", back_populates="activity_logs")
