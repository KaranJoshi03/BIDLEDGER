import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Clock, 
  ShieldAlert, 
  Zap, 
  ArrowRight, 
  Search, 
  Lock, 
  TrendingDown,
  Layers,
  MapPin,
  Calendar,
  DollarSign
} from "lucide-react";
import { api } from "../services/api";

export default function AuctionListingPage({ onSelectRfq, onOpenCreateModal, role }) {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRfqs = async () => {
    try {
      const data = await api.listRfqs(selectedStatus);
      setRfqs(data);
    } catch (err) {
      console.error("Failed to load RFQs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
    const interval = setInterval(fetchRfqs, 4000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  // Client-side search filtering
  const filteredRfqs = rfqs.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.rfq_code.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.origin_location.toLowerCase().includes(q) ||
      r.destination_location.toLowerCase().includes(q)
    );
  });

  // Calculate platform metrics
  const activeCount = rfqs.filter((r) => r.status === "active").length;
  const closedCount = rfqs.filter((r) => r.status === "closed" || r.status === "force_closed").length;
  const totalExtensions = rfqs.reduce((acc, r) => acc + (r.extension_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
      
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>British Auction RFQ Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Freight Reverse Auctions & Procurement
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-mono leading-relaxed">
            Multi-carrier procurement engine with algorithmic trigger-window extensions and hard forced close ceilings.
          </p>
        </div>

        {/* Global Metric Cards (Minimalist Dark Design) */}
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#0e0e12] border border-white/[0.08] min-w-[105px]">
            <span className="text-[10px] text-zinc-500 uppercase">Active RFQs</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{activeCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0e0e12] border border-white/[0.08] min-w-[105px]">
            <span className="text-[10px] text-zinc-500 uppercase">Extensions</span>
            <div className="text-sm font-bold text-amber-400 mt-0.5">⚡ {totalExtensions}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0e0e12] border border-white/[0.08] min-w-[105px]">
            <span className="text-[10px] text-zinc-500 uppercase">Completed</span>
            <div className="text-sm font-bold text-zinc-400 mt-0.5">{closedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-[#0e0e12] border border-white/[0.08] text-xs font-mono">
          {["all", "active", "upcoming", "closed", "force_closed"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded transition-all capitalize ${
                selectedStatus === st
                  ? "bg-[#181820] text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {st === "force_closed" ? "Force Closed" : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter by RFQ ID, corridor, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-mono pl-9 pr-3 py-2 rounded-lg bg-[#0e0e12] border border-white/[0.08] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

      </div>

      {/* RFQ Grid */}
      {loading ? (
        <div className="py-20 text-center font-mono text-zinc-500 text-xs">
          Loading British Auction instances...
        </div>
      ) : filteredRfqs.length === 0 ? (
        <div className="py-16 text-center rounded-xl bg-[#0d0d11] border border-white/[0.08]">
          <p className="text-xs font-mono text-zinc-400">No auctions match the criteria.</p>
          <button
            onClick={onOpenCreateModal}
            className="mt-3 px-3.5 py-1.5 rounded text-xs font-mono font-medium bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer"
          >
            Create New RFQ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRfqs.map((rfq) => {
            const isClosed = rfq.status === "closed";
            const isForceClosed = rfq.status === "force_closed";
            const isUpcoming = rfq.status === "upcoming";
            const isActive = rfq.status === "active";

            return (
              <div
                key={rfq.id}
                onClick={() => onSelectRfq(rfq.id)}
                className="group relative rounded-xl border border-white/[0.08] bg-[#0c0c10] hover:bg-[#101015] hover:border-zinc-700 transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer shadow-lg"
              >
                <div>
                  
                  {/* Top Badges */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-mono text-xs font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors">
                      {rfq.rfq_code}
                    </span>

                    {/* Status badge */}
                    {isForceClosed ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Force Closed</span>
                      </span>
                    ) : isClosed ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Closed</span>
                      </span>
                    ) : isUpcoming ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Upcoming</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Corridor */}
                  <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">
                    {rfq.title}
                  </h3>

                  <div className="mt-2 text-[11px] text-zinc-400 font-mono flex items-center space-x-1.5">
                    <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">{rfq.origin_location} → {rfq.destination_location}</span>
                  </div>

                  {/* Price & Winning L1 Box */}
                  <div className="mt-4 p-3 rounded-lg bg-black/50 border border-white/[0.06] flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-zinc-500">
                        Current Lowest Bid (L1)
                      </span>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {rfq.current_lowest_bid ? (
                          <span className="text-emerald-400">
                            ₹{rfq.current_lowest_bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-xs font-normal">Awaiting Quotes</span>
                        )}
                      </div>
                    </div>

                    {rfq.l1_supplier_name && (
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 uppercase">Leader</span>
                        <div className="text-xs font-medium text-white truncate max-w-[100px]">
                          {rfq.l1_supplier_name}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline Indicators */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] text-zinc-400 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span>Dynamic Close:</span>
                      </span>
                      <span className="text-zinc-200 font-medium">
                        {new Date(rfq.bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-rose-400/80">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Forced Cap:</span>
                      </span>
                      <span className="text-rose-300">
                        {new Date(rfq.forced_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                      </span>
                    </div>
                  </div>

                </div>

                {/* Card Footer: Extensions & Enter Room */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                  {rfq.extension_count > 0 ? (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 font-mono">
                      <Zap className="w-3 h-3" />
                      <span>⚡ {rfq.extension_count} Ext (+{rfq.total_extended_minutes}m)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">
                      X={rfq.trigger_window_minutes}m, Y={rfq.extension_duration_minutes}m
                    </span>
                  )}

                  <span className="flex items-center space-x-1 text-emerald-400 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Enter Room</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
