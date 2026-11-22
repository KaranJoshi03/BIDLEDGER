from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, model_validator, ConfigDict

# --- Supplier Schemas ---
class SupplierBase(BaseModel):
    supplier_code: str
    name: str
    contact_email: str
    phone: Optional[str] = None
    rating: float = 4.9
    is_verified: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Bid / Quote Schemas ---
class BidCreate(BaseModel):
    supplier_id: str
    carrier_name: str
    freight_charges: float = Field(..., ge=0, description="Freight line item charges")
    origin_charges: float = Field(0.0, ge=0, description="Origin handling/terminal charges")
    destination_charges: float = Field(0.0, ge=0, description="Destination charges")
    transit_time_days: int = Field(..., gt=0, description="Transit duration in days")
    quote_validity_date: datetime
    notes: Optional[str] = None

class BidOut(BaseModel):
    id: str
    rfq_id: str
    supplier_id: str
    supplier_name: Optional[str] = None
    carrier_name: str
    freight_charges: float
    origin_charges: float
    destination_charges: float
    total_charges: float
    transit_time_days: int
    quote_validity_date: datetime
    rank_assigned: Optional[str] = None
    caused_extension: bool
    extension_minutes_awarded: int
    notes: Optional[str] = None
    submitted_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Activity Log Schemas ---
class ActivityLogOut(BaseModel):
    id: str
    rfq_id: str
    event_type: str
    summary: str
    details: Dict[str, Any]
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# --- RFQ Schemas ---
class RFQCreate(BaseModel):
    rfq_code: str
    title: str
    description: Optional[str] = None
    origin_location: str
    destination_location: str
    pickup_service_date: datetime
    bid_start_time: datetime
    bid_close_time: datetime
    forced_close_time: datetime
    baseline_price: Optional[float] = None
    is_british_auction: bool = True
    trigger_window_minutes: int = Field(10, gt=0, description="X Minutes: window before close")
    extension_duration_minutes: int = Field(5, gt=0, description="Y Minutes: extension duration")
    extension_trigger_type: str = Field("L1_RANK_CHANGE", description="ANY_BID | ANY_RANK_CHANGE | L1_RANK_CHANGE")

    @model_validator(mode="after")
    def validate_timeline_and_rules(self):
        if self.bid_start_time >= self.bid_close_time:
            raise ValueError("Bid Close Time must be strictly later than Bid Start Time.")
        if self.forced_close_time <= self.bid_close_time:
            raise ValueError("Forced Bid Close Time must always be greater than Bid Close Time.")
        if self.extension_trigger_type not in ["ANY_BID", "ANY_RANK_CHANGE", "L1_RANK_CHANGE"]:
            raise ValueError("extension_trigger_type must be one of: 'ANY_BID', 'ANY_RANK_CHANGE', 'L1_RANK_CHANGE'")
        return self

class RFQListItem(BaseModel):
    id: str
    rfq_code: str
    title: str
    origin_location: str
    destination_location: str
    pickup_service_date: datetime
    bid_start_time: datetime
    bid_close_time: datetime
    original_close_time: datetime
    forced_close_time: datetime
    status: str
    is_british_auction: bool
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: str
    extension_count: int
    total_extended_minutes: int
    baseline_price: Optional[float] = None
    current_lowest_bid: Optional[float] = None
    total_bids_count: int = 0
    l1_supplier_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RFQDetailOut(BaseModel):
    id: str
    rfq_code: str
    title: str
    description: Optional[str] = None
    origin_location: str
    destination_location: str
    pickup_service_date: datetime
    bid_start_time: datetime
    bid_close_time: datetime
    original_close_time: datetime
    forced_close_time: datetime
    status: str
    is_british_auction: bool
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: str
    extension_count: int
    total_extended_minutes: int
    baseline_price: Optional[float] = None
    bids: List[BidOut] = []
    activity_logs: List[ActivityLogOut] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Simulation Command Schema ---
class SimulationRequest(BaseModel):
    action: str = Field(..., description="FAST_FORWARD_TO_TRIGGER_WINDOW | SIMULATE_RIVAL_BID | SIMULATE_L1_TAKEOVER | SIMULATE_FORCED_CLOSE_BOUNDARY")
    supplier_id: Optional[str] = None
    carrier_name: Optional[str] = None
    freight_charges: Optional[float] = None
