from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db import models
from app.schemas.rfq import BidCreate
import json

class AuctionEngine:
    @staticmethod
    def get_effective_status(rfq: models.RFQ, now: Optional[datetime] = None) -> str:
        """Computes live dynamic status based on current UTC time."""
        if not now:
            now = datetime.utcnow()
        if rfq.status in ["closed", "force_closed"]:
            return rfq.status
        if now < rfq.bid_start_time:
            return "upcoming"
        if now >= rfq.forced_close_time:
            return "force_closed"
        if now >= rfq.bid_close_time:
            return "closed"
        return "active"

    @staticmethod
    def check_and_update_auction_closures(db: Session, now: Optional[datetime] = None):
        """Auto-evaluates active RFQs whose close time or forced close time has passed."""
        if not now:
            now = datetime.utcnow()
        
        active_rfqs = db.query(models.RFQ).filter(models.RFQ.status.in_(["upcoming", "active"])).all()
        for rfq in active_rfqs:
            new_status = AuctionEngine.get_effective_status(rfq, now)
            if new_status != rfq.status:
                rfq.status = new_status
                if new_status == "closed":
                    log = models.ActivityLog(
                        rfq_id=rfq.id,
                        event_type="AUCTION_CLOSED",
                        summary=f"Auction '{rfq.rfq_code}' closed at {rfq.bid_close_time.strftime('%Y-%m-%d %H:%M:%S UTC')}.",
                        details={"close_time": rfq.bid_close_time.isoformat()}
                    )
                    db.add(log)
                elif new_status == "force_closed":
                    log = models.ActivityLog(
                        rfq_id=rfq.id,
                        event_type="AUCTION_FORCE_CLOSED",
                        summary=f"Auction '{rfq.rfq_code}' reached Forced Bid Close Time ({rfq.forced_close_time.strftime('%Y-%m-%d %H:%M:%S UTC')}). Hard stop enforced.",
                        details={"forced_close_time": rfq.forced_close_time.isoformat()}
                    )
                    db.add(log)
        db.commit()

    @staticmethod
    def recalculate_rankings(db: Session, rfq_id: str) -> List[models.Bid]:
        """Calculates L1, L2, L3... rankings for all bids of an RFQ based on total_charges ASC, submitted_at ASC."""
        bids = db.query(models.Bid).filter(models.Bid.rfq_id == rfq_id).order_by(
            models.Bid.total_charges.asc(),
            models.Bid.submitted_at.asc()
        ).all()

        for idx, b in enumerate(bids):
            b.rank_assigned = f"L{idx + 1}"
        db.commit()
        return bids

    @staticmethod
    def submit_quote(
        db: Session, 
        rfq_id: str, 
        quote_in: BidCreate, 
        simulation_now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes Quote Submission under British Auction rules with:
        - Trigger Window (X minutes) evaluation
        - Extension Duration (Y minutes) calculation
        - 3 Extension Triggers: ANY_BID, ANY_RANK_CHANGE, L1_RANK_CHANGE
        - Strict Forced Bid Close Time ceiling cap
        """
        now = simulation_now if simulation_now else datetime.utcnow()
        rfq = db.query(models.RFQ).filter(models.RFQ.id == rfq_id).first()
        if not rfq:
            raise ValueError("RFQ not found")

        # 1. Status and Time Validations
        current_status = AuctionEngine.get_effective_status(rfq, now)
        if current_status == "upcoming":
            raise ValueError(f"Bidding has not started yet. Starts at: {rfq.bid_start_time.isoformat()} UTC")
        if current_status == "force_closed" or now >= rfq.forced_close_time:
            rfq.status = "force_closed"
            db.commit()
            raise ValueError(f"Auction is force-closed. Hard close time was reached at {rfq.forced_close_time.isoformat()} UTC.")
        if current_status == "closed" or now >= rfq.bid_close_time:
            rfq.status = "closed"
            db.commit()
            raise ValueError(f"Auction is already closed. Closed at {rfq.bid_close_time.isoformat()} UTC.")

        supplier = db.query(models.Supplier).filter(models.Supplier.id == quote_in.supplier_id).first()
        if not supplier:
            raise ValueError("Supplier not found")

        # 2. Snapshot Previous Rankings
        existing_bids = db.query(models.Bid).filter(models.Bid.rfq_id == rfq_id).order_by(
            models.Bid.total_charges.asc(),
            models.Bid.submitted_at.asc()
        ).all()

        previous_ranks_map = {b.supplier_id: b.rank_assigned for b in existing_bids}
        previous_l1_bid = existing_bids[0] if existing_bids else None
        previous_l1_supplier_id = previous_l1_bid.supplier_id if previous_l1_bid else None
        previous_l1_price = previous_l1_bid.total_charges if previous_l1_bid else None

        # 3. Create Bid
        total_charges = round(quote_in.freight_charges + quote_in.origin_charges + quote_in.destination_charges, 2)
        new_bid = models.Bid(
            rfq_id=rfq.id,
            supplier_id=quote_in.supplier_id,
            carrier_name=quote_in.carrier_name,
            freight_charges=round(quote_in.freight_charges, 2),
            origin_charges=round(quote_in.origin_charges, 2),
            destination_charges=round(quote_in.destination_charges, 2),
            total_charges=total_charges,
            transit_time_days=quote_in.transit_time_days,
            quote_validity_date=quote_in.quote_validity_date,
            notes=quote_in.notes,
            submitted_at=now,
            caused_extension=False,
            extension_minutes_awarded=0
        )
        db.add(new_bid)
        db.flush()

        # 4. Recompute Leaderboard
        all_bids = db.query(models.Bid).filter(models.Bid.rfq_id == rfq_id).order_by(
            models.Bid.total_charges.asc(),
            models.Bid.submitted_at.asc()
        ).all()

        for idx, b in enumerate(all_bids):
            b.rank_assigned = f"L{idx + 1}"
        db.flush()

        new_l1_bid = all_bids[0] if all_bids else None
        new_l1_supplier_id = new_l1_bid.supplier_id if new_l1_bid else None
        new_l1_price = new_l1_bid.total_charges if new_l1_bid else None
        assigned_rank = new_bid.rank_assigned

        # Rank change flags
        is_new_l1 = (previous_l1_supplier_id is None) or (
            new_l1_supplier_id != previous_l1_supplier_id or (new_l1_price is not None and previous_l1_price is not None and new_l1_price < previous_l1_price)
        )
        
        any_rank_changed = False
        if not previous_ranks_map:
            any_rank_changed = True
        else:
            for b in all_bids:
                if b.supplier_id in previous_ranks_map:
                    if previous_ranks_map[b.supplier_id] != b.rank_assigned:
                        any_rank_changed = True
                        break
                else:
                    any_rank_changed = True
                    break

        # 5. British Auction Extension Evaluation
        extension_triggered = False
        extension_minutes = 0
        trigger_reason = ""
        old_close_time = rfq.bid_close_time
        new_close_time = rfq.bid_close_time
        capped_at_forced = False

        if rfq.is_british_auction:
            # Remaining time in minutes
            remaining_seconds = (rfq.bid_close_time - now).total_seconds()
            remaining_minutes = remaining_seconds / 60.0
            trigger_window_mins = rfq.trigger_window_minutes

            # Check if current submission is within Trigger Window X
            is_in_trigger_window = (0 <= remaining_minutes <= trigger_window_mins)

            if is_in_trigger_window:
                # Evaluate according to configured Trigger Type
                trigger_type = rfq.extension_trigger_type
                condition_met = False

                if trigger_type == "ANY_BID":
                    condition_met = True
                    trigger_reason = f"Bid submitted by {supplier.name} in last {trigger_window_mins} mins (Trigger: Any Bid)."
                elif trigger_type == "ANY_RANK_CHANGE":
                    if any_rank_changed:
                        condition_met = True
                        trigger_reason = f"Leaderboard rank change occurred in last {trigger_window_mins} mins ({supplier.name} secured {assigned_rank})."
                elif trigger_type == "L1_RANK_CHANGE":
                    if is_new_l1:
                        condition_met = True
                        trigger_reason = f"New Lowest Bidder (L1) achieved in last {trigger_window_mins} mins ({supplier.name} at ₹{total_charges:,.2f})."

                if condition_met:
                    # Attempt extension: Y minutes
                    y_mins = rfq.extension_duration_minutes
                    proposed_close = rfq.bid_close_time + timedelta(minutes=y_mins)

                    # Rule: The auction must never extend beyond the Forced Bid Close Time!
                    if proposed_close > rfq.forced_close_time:
                        actual_close = rfq.forced_close_time
                        capped_at_forced = True
                    else:
                        actual_close = proposed_close

                    if actual_close > rfq.bid_close_time:
                        minutes_added = (actual_close - rfq.bid_close_time).total_seconds() / 60.0
                        rfq.bid_close_time = actual_close
                        rfq.extension_count += 1
                        rfq.total_extended_minutes += int(minutes_added)
                        new_bid.caused_extension = True
                        new_bid.extension_minutes_awarded = int(minutes_added)
                        extension_triggered = True
                        extension_minutes = int(minutes_added)
                        new_close_time = actual_close

                        cap_msg = " [Capped at Forced Close Time]" if capped_at_forced else ""
                        extension_summary = (
                            f"⚡ British Auction Extended by {extension_minutes} min(s) to "
                            f"{new_close_time.strftime('%H:%M:%S UTC')}. {trigger_reason}{cap_msg}"
                        )

                        ext_log = models.ActivityLog(
                            rfq_id=rfq.id,
                            event_type="TIME_EXTENDED",
                            summary=extension_summary,
                            details={
                                "reason": trigger_reason,
                                "extension_minutes": extension_minutes,
                                "old_close_time": old_close_time.isoformat(),
                                "new_close_time": new_close_time.isoformat(),
                                "forced_close_time": rfq.forced_close_time.isoformat(),
                                "capped_at_forced": capped_at_forced,
                                "trigger_type": trigger_type,
                                "supplier_id": supplier.id,
                                "supplier_name": supplier.name,
                                "bid_amount": total_charges
                            },
                            timestamp=now
                        )
                        db.add(ext_log)
                    else:
                        # Already at forced close time
                        db.add(models.ActivityLog(
                            rfq_id=rfq.id,
                            event_type="TIME_EXTENDED",
                            summary=f"Extension trigger condition was met by {supplier.name}, but auction is already at the Forced Bid Close Time hard cap ({rfq.forced_close_time.strftime('%H:%M:%S UTC')}). Further extension prevented.",
                            details={"forced_close_time": rfq.forced_close_time.isoformat()},
                            timestamp=now
                        ))

        # 6. Log Bid Placement
        bid_log_summary = (
            f"Quote of ₹{total_charges:,.2f} submitted by {supplier.name} "
            f"(Carrier: {quote_in.carrier_name}, Transit: {quote_in.transit_time_days}d). Assigned Rank: {assigned_rank}."
        )
        bid_log = models.ActivityLog(
            rfq_id=rfq.id,
            event_type="BID_SUBMITTED",
            summary=bid_log_summary,
            details={
                "bid_id": new_bid.id,
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "carrier_name": quote_in.carrier_name,
                "freight": quote_in.freight_charges,
                "origin": quote_in.origin_charges,
                "destination": quote_in.destination_charges,
                "total": total_charges,
                "rank": assigned_rank,
                "caused_extension": extension_triggered
            },
            timestamp=now
        )
        db.add(bid_log)

        # 7. Log L1 Takeover if applicable
        if is_new_l1 and len(all_bids) > 1:
            prev_name = "None"
            if previous_l1_supplier_id:
                prev_sup = db.query(models.Supplier).filter(models.Supplier.id == previous_l1_supplier_id).first()
                if prev_sup:
                    prev_name = prev_sup.name
            delta = (previous_l1_price - total_charges) if previous_l1_price else 0
            db.add(models.ActivityLog(
                rfq_id=rfq.id,
                event_type="L1_CHANGED",
                summary=f"🏆 {supplier.name} overtook {prev_name} as the new Lowest Bidder (L1) at ₹{total_charges:,.2f} (Savings: ₹{delta:,.2f}).",
                details={
                    "new_l1_supplier": supplier.name,
                    "previous_l1_supplier": prev_name,
                    "previous_price": previous_l1_price,
                    "new_price": total_charges,
                    "savings_delta": delta
                },
                timestamp=now
            ))

        db.commit()
        db.refresh(rfq)
        db.refresh(new_bid)

        return {
            "bid": new_bid,
            "rfq": rfq,
            "assigned_rank": assigned_rank,
            "is_new_l1": is_new_l1,
            "extension_triggered": extension_triggered,
            "extension_minutes": extension_minutes,
            "capped_at_forced": capped_at_forced,
            "trigger_reason": trigger_reason,
            "old_close_time": old_close_time,
            "new_close_time": new_close_time
        }
