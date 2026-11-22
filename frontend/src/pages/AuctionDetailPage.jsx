import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Share2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Truck, 
  RefreshCw,
  Sliders,
  TrendingDown,
  Briefcase,
  UserCheck
} from "lucide-react";
import { api } from "../services/api";
import AuctionCountdown from "../components/AuctionCountdown";
import TimelineVisualizer from "../components/TimelineVisualizer";
import LeaderboardTable from "../components/LeaderboardTable";
import QuoteSubmissionForm from "../components/QuoteSubmissionForm";
import ActivityLogView from "../components/ActivityLogView";
import SimulationTestBench from "../components/SimulationTestBench";
import Neo4jGraphModal from "../components/Neo4jGraphModal";

export default function AuctionDetailPage({ rfqId, onBack, role, onToggleRole }) {
  const [rfq, setRfq] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [activeSupplierId, setActiveSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [latestExtensionAlert, setLatestExtensionAlert] = useState(null);

  const fetchRfqDetails = async () => {
    try {
      const data = await api.getRfq(rfqId);
      setRfq(data);
    } catch (err) {
      setError(err.message || "Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const sups = await api.listSuppliers();
      setSuppliers(sups);
      if (sups.length > 0 && !activeSupplierId) {
        setActiveSupplierId(sups[0].id);
      }
    } catch (err) {
      console.error("Failed to load suppliers", err);
    }
  };

  useEffect(() => {
    fetchRfqDetails();
    fetchSuppliers();

    // WebSocket connection for live British Auction updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/auctions/${rfqId}`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "NEW_BID_PLACED" || msg.type === "SIMULATION_UPDATE") {
            fetchRfqDetails();

            if (msg.extension_triggered) {
              setLatestExtensionAlert({
                minutes: msg.extension_minutes,
                reason: msg.trigger_reason,
                capped: msg.capped_at_forced,
              });
              setTimeout(() => setLatestExtensionAlert(null), 8000);
            }
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };
    } catch (e) {
      console.warn("WebSocket fallback to polling", e);
    }

    const interval = setInterval(fetchRfqDetails, 4000);

    return () => {
      clearInterval(interval);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [rfqId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs font-mono text-zinc-500">
        Loading British Auction Console for {rfqId}...
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-xs font-mono text-rose-400">{error || "RFQ not found"}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-mono bg-zinc-800 text-zinc-200"
        >
          Back to Listings
        </button>
      </div>
    );
  }

  // Calculate sorted bids and L1 winner
  const sortedBids = rfq.bids ? [...rfq.bids].sort((a, b) => a.total_charges - b.total_charges) : [];
  const currentL1 = sortedBids[0];
  
  // Buyer savings calculation
  const savingsAmount = rfq.baseline_price && currentL1 ? Math.max(0, rfq.baseline_price - currentL1.total_charges) : 0;
  const savingsPercent = rfq.baseline_price && currentL1 ? ((savingsAmount / rfq.baseline_price) * 100).toFixed(1) : 0;

  // Supplier current rank
  const activeSupplier = suppliers.find(s => s.id === activeSupplierId);
  const activeSupplierBid = sortedBids.find(b => b.supplier_id === activeSupplierId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Auctions</span>
        </button>

        {/* Toolbar: Graph, Mode toggle, Refresh */}
        <div className="flex items-center space-x-2">
          
          <button
            onClick={() => setShowGraphModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111116] border border-white/[0.08] hover:border-emerald-500/40 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
            title="Inspect Neo4j Cypher Graph"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Neo4j Graph Network</span>
          </button>
          
          <button
            onClick={fetchRfqDetails}
            className="p-1.5 rounded-lg bg-[#111116] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Auction Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role Context Notification Bar */}
      <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c0c10] flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-3">
        {role === "buyer" ? (
          <div className="flex items-center space-x-2 text-emerald-300">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Buyer Mode Active: Viewing procurement margins, full carrier bids, and extension audit log.</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-blue-300">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>
              Supplier Bidding Mode:{" "}
              <strong className="text-white">{activeSupplier?.name || "Select Carrier"}</strong>
              {activeSupplierBid ? (
                <span className="ml-1 text-zinc-400">
                  (Your Rank: <strong className={activeSupplierBid.rank_assigned === "L1" ? "text-emerald-400" : "text-amber-400"}>{activeSupplierBid.rank_assigned}</strong> at ₹{activeSupplierBid.total_charges?.toLocaleString()})
                </span>
              ) : (
                <span className="ml-1 text-zinc-500">(No bid submitted yet)</span>
              )}
            </span>
          </div>
        )}

        {/* Identity switch in supplier mode */}
        {role === "supplier" && suppliers.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-zinc-500">Act as:</span>
            <select
              value={activeSupplierId}
              onChange={(e) => setActiveSupplierId(e.target.value)}
              className="px-2 py-1 rounded bg-[#16161c] border border-white/[0.1] text-xs font-mono text-zinc-200 focus:outline-none"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name.split(' ')[0]}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* RFQ Header Card */}
      <div className="p-6 rounded-xl border border-white/[0.08] bg-[#0d0d11] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {rfq.rfq_code}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                Created: {new Date(rfq.created_at).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {rfq.title}
            </h1>

            {rfq.description && (
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed font-sans">
                {rfq.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-300 font-mono">
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  {rfq.origin_location} → {rfq.destination_location}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>
                  Pickup: {new Date(rfq.pickup_service_date).toLocaleDateString()}
                </span>
              </div>
              {rfq.baseline_price && (
                <div className="flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                  <span>
                    Baseline Budget: ₹{rfq.baseline_price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick L1 Leader & Savings Box */}
          {currentL1 && (
            <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] min-w-[210px] shrink-0 text-left lg:text-right font-mono">
              <span className="text-[10px] uppercase text-zinc-500">
                Current Winning L1 Quote
              </span>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                ₹{currentL1.total_charges.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-white truncate max-w-[200px]">
                {currentL1.supplier_name}
              </div>
              {rfq.baseline_price && savingsAmount > 0 && (
                <div className="mt-1 text-[11px] text-emerald-400 flex items-center justify-start lg:justify-end space-x-1">
                  <TrendingDown className="w-3 h-3" />
                  <span>Saving ₹{savingsAmount.toLocaleString()} ({savingsPercent}%)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Countdown Timer with British Trigger Window Alert */}
      <AuctionCountdown rfq={rfq} latestExtensionAlert={latestExtensionAlert} />

      {/* Visual Chronological Timeline */}
      <TimelineVisualizer rfq={rfq} />

      {/* Interactive Simulation / Test Bench Bar */}
      <SimulationTestBench rfqId={rfq.id} onActionComplete={fetchRfqDetails} />

      {/* Main Grid: Left (Leaderboard & Submission) + Right (Config & Activity Log) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Supplier Leaderboard Table */}
          <LeaderboardTable 
            bids={rfq.bids} 
            baselinePrice={rfq.baseline_price}
            activeSupplierId={role === "supplier" ? activeSupplierId : null}
            role={role}
          />

          {/* Supplier Quote Submission Console */}
          <QuoteSubmissionForm 
            rfq={rfq} 
            suppliers={suppliers} 
            onQuoteSubmitted={fetchRfqDetails} 
            currentLowestPrice={currentL1?.total_charges}
            activeSupplierId={role === "supplier" ? activeSupplierId : null}
            onSelectSupplier={(id) => setActiveSupplierId(id)}
          />

        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          
          {/* British Auction Configuration Card */}
          <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0d0d11] shadow-xl space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-white/[0.06]">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                British Auction Configuration
              </h3>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-black/50 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-400">Trigger Window (X):</span>
                <span className="text-amber-400 font-bold">{rfq.trigger_window_minutes} Minutes</span>
              </div>

              <div className="p-2.5 rounded bg-black/50 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-400">Extension Duration (Y):</span>
                <span className="text-emerald-400 font-bold">+{rfq.extension_duration_minutes} Minutes</span>
              </div>

              <div className="p-2.5 rounded bg-black/50 border border-white/[0.06]">
                <div className="text-zinc-500 text-[10px] uppercase">Active Extension Trigger:</div>
                <div className="text-zinc-200 font-medium mt-0.5">
                  {rfq.extension_trigger_type === "L1_RANK_CHANGE"
                    ? "Lowest Bidder (L1) Rank Change"
                    : rfq.extension_trigger_type === "ANY_RANK_CHANGE"
                    ? "Any Supplier Rank Change"
                    : "Any Bid Received in Window"}
                </div>
              </div>

              <div className="p-2.5 rounded bg-black/50 border border-white/[0.06]">
                <div className="text-zinc-500 text-[10px] uppercase">Forced Close Hard Ceiling:</div>
                <div className="text-rose-400 font-semibold mt-0.5">
                  {new Date(rfq.forced_close_time).toLocaleTimeString()} UTC
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  *Extensions strictly capped at this timestamp.
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-emerald-300">Extensions Awarded:</span>
                <span className="text-emerald-400 font-bold">
                  ⚡ {rfq.extension_count} (+{rfq.total_extended_minutes}m)
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log Component */}
          <ActivityLogView logs={rfq.activity_logs} />

        </div>

      </div>

      {/* Neo4j Graph Modal */}
      {showGraphModal && (
        <Neo4jGraphModal rfqId={rfq.id} onClose={() => setShowGraphModal(false)} />
      )}

    </div>
  );
}
