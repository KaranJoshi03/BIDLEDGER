import React from "react";
import { 
  Zap, 
  PlusCircle, 
  Briefcase, 
  UserCheck, 
  Users, 
  Layers, 
  ShieldCheck
} from "lucide-react";

export default function Navbar({ 
  onOpenCreateModal, 
  onOpenSuppliersModal,
  currentView, 
  onViewChange, 
  role, 
  onToggleRole 
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070709]/90 backdrop-blur-md font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={() => onViewChange("listing")}
        >
          <div className="w-8 h-8 rounded-lg bg-[#141418] border border-white/[0.1] flex items-center justify-center text-emerald-400 font-mono font-bold shadow-sm group-hover:border-emerald-500/50 transition-colors">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold tracking-wider text-white uppercase font-mono">
                BID<span className="text-emerald-400">LEDGER</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.08] uppercase tracking-wider">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono -mt-0.5">
              British Auction RFQ Engine
            </p>
          </div>
        </div>

        {/* Primary Page Navigation Tabs (Auctions, Architecture, Test Scenarios) */}
        <nav className="hidden md:flex items-center space-x-1 font-mono text-xs">
          <button
            onClick={() => onViewChange("listing")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentView === "listing" || currentView === "detail"
                ? "bg-[#14141a] text-white font-medium border border-white/[0.08]"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            Live Auctions
          </button>

          <button
            onClick={() => onViewChange("architecture")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
              currentView === "architecture"
                ? "bg-[#14141a] text-white font-medium border border-white/[0.08]"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => onViewChange("tests")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 ${
              currentView === "tests"
                ? "bg-[#14141a] text-emerald-300 font-medium border border-emerald-500/30"
                : "text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.03]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Matrix (21/21)</span>
          </button>
        </nav>

        {/* Right Navigation & Mode Toggle */}
        <div className="flex items-center space-x-2">
          
          {/* Supplier Directory Button */}
          <button
            onClick={onOpenSuppliersModal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors bg-[#111116] border-white/[0.08] hover:border-zinc-600 text-zinc-300 cursor-pointer"
            title="View 7 verified logistics carriers"
          >
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Suppliers</span>
          </button>

          {/* Mode Switcher: Buyer vs Supplier */}
          <button
            onClick={onToggleRole}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-150 cursor-pointer ${
              role === "buyer"
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30"
                : "bg-blue-950/20 border-blue-500/30 text-blue-300 hover:bg-blue-950/30"
            }`}
            title="Toggle between Buyer Management and Supplier Bidding mode"
          >
            {role === "buyer" ? (
              <>
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Buyer Mode</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Supplier Mode</span>
              </>
            )}
          </button>

          {/* Create RFQ Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New RFQ</span>
          </button>

        </div>

      </div>
    </header>
  );
}
