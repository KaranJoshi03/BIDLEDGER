import React, { useState } from "react";
import { X, Calendar, Clock, ShieldCheck, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "../services/api";

export default function CreateRFQModal({ onClose, onCreated }) {
  // Form fields
  const [rfqCode, setRfqCode] = useState(`RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [originLocation, setOriginLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [baselinePrice, setBaselinePrice] = useState("");
  
  // Date/Time fields (Local string helper)
  const now = new Date();
  const formatForInput = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const dStart = new Date(now.getTime() - 10 * 60000); // 10 mins ago
  const dClose = new Date(now.getTime() + 60 * 60000); // 1 hr from now
  const dForced = new Date(now.getTime() + 120 * 60000); // 2 hrs from now
  const dPickup = new Date(now.getTime() + 3 * 24 * 3600000); // 3 days

  const [bidStartTime, setBidStartTime] = useState(formatForInput(dStart));
  const [bidCloseTime, setBidCloseTime] = useState(formatForInput(dClose));
  const [forcedCloseTime, setForcedCloseTime] = useState(formatForInput(dForced));
  const [pickupServiceDate, setPickupServiceDate] = useState(formatForInput(dPickup));

  // British Auction Config
  const [isBritishAuction, setIsBritishAuction] = useState(true);
  const [triggerWindowMins, setTriggerWindowMins] = useState(10); // X Minutes
  const [extensionDurationMins, setExtensionDurationMins] = useState(5); // Y Minutes
  const [extensionTriggerType, setExtensionTriggerType] = useState("L1_RANK_CHANGE");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Validations
  const validateDates = () => {
    const start = new Date(bidStartTime).getTime();
    const close = new Date(bidCloseTime).getTime();
    const forced = new Date(forcedCloseTime).getTime();

    if (close <= start) {
      return "Bid Close Time must be strictly later than Bid Start Time.";
    }
    if (forced <= close) {
      return "Forced Bid Close Time must always be greater than Bid Close Time (Hard Cap Rule).";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateDates();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        rfq_code: rfqCode.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        origin_location: originLocation.trim(),
        destination_location: destinationLocation.trim(),
        pickup_service_date: new Date(pickupServiceDate).toISOString(),
        bid_start_time: new Date(bidStartTime).toISOString(),
        bid_close_time: new Date(bidCloseTime).toISOString(),
        forced_close_time: new Date(forcedCloseTime).toISOString(),
        baseline_price: baselinePrice ? parseFloat(baselinePrice) : undefined,
        is_british_auction: isBritishAuction,
        trigger_window_minutes: parseInt(triggerWindowMins),
        extension_duration_minutes: parseInt(extensionDurationMins),
        extension_trigger_type: extensionTriggerType,
      };

      const created = await api.createRfq(payload);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to create RFQ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Create New RFQ with British Auction
              </h3>
              <p className="text-xs text-zinc-500">
                Configure dynamic extension rules and hard forced close ceilings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reference ID & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                RFQ Code / Ref ID *
              </label>
              <input
                type="text"
                value={rfqCode}
                onChange={(e) => setRfqCode(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                RFQ Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Mumbai Port to Delhi ICD - 20x 32ft MXL Trucks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Lane & Pickup Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                Origin Location *
              </label>
              <input
                type="text"
                placeholder="e.g. JNPT Port, Mumbai"
                value={originLocation}
                onChange={(e) => setOriginLocation(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                Destination Location *
              </label>
              <input
                type="text"
                placeholder="e.g. Tughlakabad ICD, Delhi"
                value={destinationLocation}
                onChange={(e) => setDestinationLocation(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                Pickup / Service Date *
              </label>
              <input
                type="datetime-local"
                value={pickupServiceDate}
                onChange={(e) => setPickupServiceDate(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Baseline Budget */}
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
              Baseline Target Budget (₹ optional)
            </label>
            <input
              type="number"
              placeholder="e.g. 120000"
              value={baselinePrice}
              onChange={(e) => setBaselinePrice(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Bidding Timeline */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
                Auction Timeline & Validation Rules
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Rule: Forced Close &gt; Bid Close &gt; Start
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                  Bid Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                  Bid Close Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-rose-300 uppercase mb-1 font-semibold">
                  Forced Bid Close Time *
                </label>
                <input
                  type="datetime-local"
                  value={forcedCloseTime}
                  onChange={(e) => setForcedCloseTime(e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-black/60 border border-rose-800/60 text-rose-200 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* British Auction Options */}
          <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold uppercase text-emerald-300">
                  British Auction Configuration
                </span>
              </div>
              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBritishAuction}
                  onChange={(e) => setIsBritishAuction(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                />
                <span>Enable British Dynamic Extensions</span>
              </label>
            </div>

            {isBritishAuction && (
              <div className="space-y-4 pt-2 border-t border-emerald-500/10">
                
                {/* X and Y minutes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Trigger Window (X Minutes)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={triggerWindowMins}
                        onChange={(e) => setTriggerWindowMins(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-100"
                      />
                      <span className="text-xs text-zinc-500 font-mono">mins</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Monitors activity in last {triggerWindowMins}m before close.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Extension Duration (Y Minutes)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={extensionDurationMins}
                        onChange={(e) => setExtensionDurationMins(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-100"
                      />
                      <span className="text-xs text-zinc-500 font-mono">mins</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Adds +{extensionDurationMins}m whenever trigger criteria is met.
                    </p>
                  </div>
                </div>

                {/* Trigger Types */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                    Extension Trigger Type
                  </label>
                  <select
                    value={extensionTriggerType}
                    onChange={(e) => setExtensionTriggerType(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-black/60 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="L1_RANK_CHANGE">
                      (Recommended) Lowest Bidder (L1) Rank Change in Last X Minutes
                    </option>
                    <option value="ANY_RANK_CHANGE">
                      Any Supplier Rank Change in Last X Minutes
                    </option>
                    <option value="ANY_BID">
                      Any Bid Received in Last X Minutes
                    </option>
                  </select>
                </div>

              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-black bg-emerald-500 hover:bg-emerald-400 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating..." : "Publish British Auction RFQ"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
