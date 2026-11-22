import React, { useState, useEffect } from "react";
import { Send, Truck, AlertCircle, CheckCircle2, Zap, ArrowDownRight } from "lucide-react";
import { api } from "../services/api";

export default function QuoteSubmissionForm({ 
  rfq, 
  suppliers = [], 
  onQuoteSubmitted, 
  currentLowestPrice,
  activeSupplierId,
  onSelectSupplier
}) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(activeSupplierId || suppliers[0]?.id || "");
  const [carrierName, setCarrierName] = useState("");
  const [freightCharges, setFreightCharges] = useState("");
  const [originCharges, setOriginCharges] = useState("0");
  const [destinationCharges, setDestinationCharges] = useState("0");
  const [transitTimeDays, setTransitTimeDays] = useState("2");
  const [quoteValidityDays, setQuoteValidityDays] = useState("15");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (activeSupplierId) {
      setSelectedSupplierId(activeSupplierId);
    } else if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [activeSupplierId, suppliers]);

  // Compute total landed cost live
  const numFreight = parseFloat(freightCharges) || 0;
  const numOrigin = parseFloat(originCharges) || 0;
  const numDest = parseFloat(destinationCharges) || 0;
  const totalLandedCost = Math.round((numFreight + numOrigin + numDest) * 100) / 100;

  const isUnderbiddingL1 = currentLowestPrice && totalLandedCost > 0 && totalLandedCost < currentLowestPrice;

  // Shortcut helpers for Supplier quick-bidding
  const handleQuickUnderbid = (deltaAmount) => {
    const target = currentLowestPrice ? Math.max(1000, currentLowestPrice - deltaAmount) : 80000;
    const freight = Math.round(target * 0.85);
    const origin = Math.round(target * 0.08);
    const dest = Math.round(target - freight - origin);

    setFreightCharges(String(freight));
    setOriginCharges(String(origin));
    setDestinationCharges(String(dest));

    // Default carrier if empty
    if (!carrierName) {
      const sup = suppliers.find(s => s.id === selectedSupplierId);
      setCarrierName(`${sup ? sup.name.split(' ')[0] : 'Fast'} Express Linehaul`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setFeedback({ type: "error", message: "Please select a participating supplier." });
      return;
    }
    if (!carrierName.trim()) {
      setFeedback({ type: "error", message: "Carrier Name is required." });
      return;
    }
    if (numFreight <= 0) {
      setFeedback({ type: "error", message: "Freight charges must be greater than zero." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + parseInt(quoteValidityDays || 15));

      const payload = {
        supplier_id: selectedSupplierId,
        carrier_name: carrierName.trim(),
        freight_charges: numFreight,
        origin_charges: numOrigin,
        destination_charges: numDest,
        transit_time_days: parseInt(transitTimeDays || 2),
        quote_validity_date: validityDate.toISOString(),
        notes: notes.trim() || undefined,
      };

      const result = await api.submitBid(rfq.id, payload);
      
      let msg = `Quote submitted successfully! Assigned Rank: ${result.assigned_rank}.`;
      if (result.extension_triggered) {
        msg += ` ⚡ British Auction Extended by +${result.extension_minutes}m!`;
      }
      setFeedback({ type: "success", message: msg, extension: result.extension_triggered });

      // Reset form partially
      setFreightCharges("");
      setNotes("");
      if (onQuoteSubmitted) onQuoteSubmitted();
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Submission failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuctionClosed = rfq.status === "closed" || rfq.status === "force_closed";

  return (
    <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0d0d11] shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-white/[0.06] gap-2">
        <div>
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <span>Supplier Quote Submission Console</span>
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Submit itemized freight quote with real-time rank & extension evaluation.
          </p>
        </div>

        {currentLowestPrice && (
          <div className="text-left sm:text-right font-mono">
            <span className="text-[10px] text-zinc-500 uppercase">Target to beat (L1)</span>
            <div className="text-xs font-bold text-emerald-400">
              ₹{currentLowestPrice.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {isAuctionClosed ? (
        <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-xs font-mono text-zinc-400">
          This British Auction is closed. No further quotes can be submitted.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          
          {/* Quick-Action Bidding Buttons (for Supplier efficiency) */}
          {currentLowestPrice && (
            <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
              <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold block">
                Quick Underbid Shortcuts (Auto-Calculate Charges):
              </span>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleQuickUnderbid(1000)}
                  className="px-2.5 py-1 rounded bg-[#16161c] hover:bg-zinc-800 border border-white/[0.08] hover:border-emerald-500/50 text-emerald-300 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                  <span>Beat L1 by ₹1,000</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickUnderbid(2500)}
                  className="px-2.5 py-1 rounded bg-[#16161c] hover:bg-zinc-800 border border-white/[0.08] hover:border-emerald-500/50 text-emerald-300 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                  <span>Beat L1 by ₹2,500</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickUnderbid(Math.round(currentLowestPrice * 0.02))}
                  className="px-2.5 py-1 rounded bg-[#16161c] hover:bg-zinc-800 border border-white/[0.08] hover:border-emerald-500/50 text-emerald-300 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <ArrowDownRight className="w-3 h-3 text-emerald-400" />
                  <span>Beat L1 by 2%</span>
                </button>
              </div>
            </div>
          )}

          {/* Supplier Selector & Carrier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Participating Supplier *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => {
                  setSelectedSupplierId(e.target.value);
                  if (onSelectSupplier) onSelectSupplier(e.target.value);
                }}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplier_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Carrier Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Blue Dart Surface Fleet, VRL Express"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
                required
              />
            </div>
          </div>

          {/* Charges Breakdown: Freight, Origin, Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Freight Charges (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 78000"
                value={freightCharges}
                onChange={(e) => setFreightCharges(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Origin Handling (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                value={originCharges}
                onChange={(e) => setOriginCharges(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Destination Charges (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                value={destinationCharges}
                onChange={(e) => setDestinationCharges(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Transit Time & Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Transit Time (Days) *
              </label>
              <input
                type="number"
                min="1"
                value={transitTimeDays}
                onChange={(e) => setTransitTimeDays(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                Quote Validity (Days from today) *
              </label>
              <input
                type="number"
                min="1"
                value={quoteValidityDays}
                onChange={(e) => setQuoteValidityDays(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Optional SLA Notes */}
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
              Service Notes & SLA Commitments
            </label>
            <input
              type="text"
              placeholder="e.g. GPS live tracking, 2 dedicated drivers, tarpaulin sealed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
            />
          </div>

          {/* Computed Total & Live Rank Preview */}
          <div className="p-3 rounded-lg bg-black/50 border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono">
                Total Landed Quote
              </span>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                ₹{totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {totalLandedCost > 0 && (
              <div>
                {isUnderbiddingL1 ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Projected: L1 Winner!</span>
                  </span>
                ) : currentLowestPrice ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                    +₹{(totalLandedCost - currentLowestPrice).toLocaleString()} above L1
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
              feedback.type === "success" 
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
            }`}>
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || totalLandedCost <= 0}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-mono font-semibold text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Evaluating British Auction Rules...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Quote to British Auction</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
