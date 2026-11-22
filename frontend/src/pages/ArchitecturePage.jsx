import React from "react";
import { 
  Layers, 
  Server, 
  Database, 
  Share2, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  GitBranch,
  Repeat
} from "lucide-react";

export default function ArchitecturePage({ onNavigateToAuctions, onNavigateToTests }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Enterprise System Blueprint</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            System Architecture & Technical Design
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl font-mono leading-relaxed">
            High-concurrency dual-database architecture engineered for British Auction reverse bidding, sub-second WebSocket broadcasts, and tamper-proof forced close ceilings.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={onNavigateToTests}
            className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#111116] hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Test Scenarios (21/21)</span>
          </button>
        </div>
      </div>

      {/* Visual Layer Architecture Diagram */}
      <div className="p-6 rounded-xl border border-white/[0.08] bg-[#0c0c10] shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Interactive Layered Architectural Diagram
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Full Stack Data & Execution Flow
          </span>
        </div>

        {/* 4 Architectural Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          
          {/* Tier 1: Client Layer */}
          <div className="p-4 rounded-lg bg-[#111116] border border-white/[0.06] space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1">
                [Tier 1] Client Layer
              </div>
              <h4 className="text-white font-semibold text-xs mb-2">ReactJS 19 + Vite</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mb-3">
                Obsidian dark mode interface inspired by modern design systems.
              </p>
              <div className="space-y-1.5 text-[10px] text-zinc-300">
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Live Bidding Console</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Digital Clock & Pulse</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Leaderboard Table</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Simulation Test Bench</div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] text-zinc-500">
              Protocol: HTTPS & WSS
            </div>
          </div>

          {/* Tier 2: API & Engine Gateway */}
          <div className="p-4 rounded-lg bg-[#111116] border border-white/[0.06] space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-1">
                [Tier 2] API & Rules Gateway
              </div>
              <h4 className="text-white font-semibold text-xs mb-2">Python (FastAPI)</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mb-3">
                Asynchronous event loop for quote intake and sub-second evaluation.
              </p>
              <div className="space-y-1.5 text-[10px] text-zinc-300">
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">British Rules Engine</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Trigger Evaluator (X/Y)</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Forced Close Hard Cap</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">WebSocket Hub (/ws)</div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] text-zinc-500">
              Pydantic v2 + Starlette
            </div>
          </div>

          {/* Tier 3: Async & Scheduler */}
          <div className="p-4 rounded-lg bg-[#111116] border border-white/[0.06] space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1">
                [Tier 3] Background Jobs
              </div>
              <h4 className="text-white font-semibold text-xs mb-2">Celery + Redis</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mb-3">
                Distributed task queue and scheduled timers for auto-closures.
              </p>
              <div className="space-y-1.5 text-[10px] text-zinc-300">
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Celery Beat Scheduler</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Periodic Close Monitor</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Async Graph Sync Queue</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Redis Broker (6379)</div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] text-zinc-500">
              RabbitMQ / Redis Broker
            </div>
          </div>

          {/* Tier 4: Dual Persistence Layer */}
          <div className="p-4 rounded-lg bg-[#111116] border border-white/[0.06] space-y-3 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-1">
                [Tier 4] Dual Data Layer
              </div>
              <h4 className="text-white font-semibold text-xs mb-2">Postgres + Neo4j</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mb-3">
                ACID transactional ledger paired with Cypher property graph analytics.
              </p>
              <div className="space-y-1.5 text-[10px] text-zinc-300">
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">PostgreSQL (Bids, RFQs)</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Immutable Audit Logs</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Neo4j Graph (L1 Flips)</div>
                <div className="px-2 py-1 rounded bg-black/50 border border-white/[0.04]">Carrier Route Topology</div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/[0.04] text-[10px] text-zinc-500">
              SQLAlchemy 2.0 + Cypher
            </div>
          </div>

        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
        
        {/* Pillar 1: British Rules Engine */}
        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0d0d11] space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Zap className="w-4 h-4" />
            <h4 className="text-white font-semibold text-xs uppercase">British Rules Engine</h4>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Evaluates remaining time in milliseconds upon quote submission. If <span className="text-emerald-400 font-mono">$\Delta t \le X$</span>, evaluates trigger criteria (Any Bid, Any Rank Shift, or L1 Takeover). Extends close time by <span className="text-emerald-400 font-mono">$+Y$</span> minutes up to the forced close ceiling.
          </p>
          <div className="pt-2 border-t border-white/[0.06] text-[10px] text-zinc-500">
            Mathematical Constraint: new_close = min(current_close + Y, forced_close)
          </div>
        </div>

        {/* Pillar 2: Forced Close Hard Cap */}
        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0d0d11] space-y-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <ShieldCheck className="w-4 h-4" />
            <h4 className="text-white font-semibold text-xs uppercase">Forced Close Hard Cap</h4>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Guarantees procurement predictability. No matter how active the bidding war becomes in the final seconds, bidding strictly terminates at Forced Bid Close Time, preventing indefinite extensions.
          </p>
          <div className="pt-2 border-t border-white/[0.06] text-[10px] text-zinc-500">
            Validation: forced_close_time &gt; original_bid_close_time
          </div>
        </div>

        {/* Pillar 3: Dual Database Strategy */}
        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0d0d11] space-y-3">
          <div className="flex items-center space-x-2 text-purple-400">
            <Share2 className="w-4 h-4" />
            <h4 className="text-white font-semibold text-xs uppercase">Graph Intelligence</h4>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            PostgreSQL handles high-frequency ACID bid insertions, while Neo4j maps supplier underbidding relationships, competitor clusters, and route dominance graphs across domestic logistics corridors.
          </p>
          <div className="pt-2 border-t border-white/[0.06] text-[10px] text-zinc-500">
            Relationship: (:Supplier)-[:UNDERBIDS {delta}]-&gt;(:Supplier)
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08] font-mono text-xs">
        <button
          onClick={onNavigateToAuctions}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          ← Return to Live Auctions
        </button>
        <button
          onClick={onNavigateToTests}
          className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
        >
          Explore 21 Automated Test Scenarios →
        </button>
      </div>

    </div>
  );
}
