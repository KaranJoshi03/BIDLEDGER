import React, { useState } from "react";
import Navbar from "./components/Navbar";
import AuctionListingPage from "./pages/AuctionListingPage";
import AuctionDetailPage from "./pages/AuctionDetailPage";
import ArchitecturePage from "./pages/ArchitecturePage";
import TestScenariosPage from "./pages/TestScenariosPage";
import CreateRFQModal from "./components/CreateRFQModal";
import SuppliersModal from "./components/SuppliersModal";

export default function App() {
  const [currentView, setCurrentView] = useState("listing"); // "listing" | "detail" | "architecture" | "tests"
  const [selectedRfqId, setSelectedRfqId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [role, setRole] = useState("buyer"); // "buyer" | "supplier"

  const handleSelectRfq = (rfqId) => {
    setSelectedRfqId(rfqId);
    setCurrentView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToListing = () => {
    setSelectedRfqId(null);
    setCurrentView("listing");
  };

  const handleToggleRole = () => {
    setRole((prev) => (prev === "buyer" ? "supplier" : "buyer"));
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-200 antialiased">
      
      {/* Sticky Top Header */}
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenSuppliersModal={() => setIsSuppliersModalOpen(true)}
        currentView={currentView}
        onViewChange={(view) => {
          if (view === "listing") {
            handleBackToListing();
          } else {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        role={role}
        onToggleRole={handleToggleRole}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === "listing" && (
          <AuctionListingPage
            onSelectRfq={handleSelectRfq}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            role={role}
          />
        )}

        {currentView === "detail" && (
          <AuctionDetailPage
            rfqId={selectedRfqId}
            onBack={handleBackToListing}
            role={role}
            onToggleRole={handleToggleRole}
          />
        )}

        {currentView === "architecture" && (
          <ArchitecturePage
            onNavigateToAuctions={handleBackToListing}
            onNavigateToTests={() => setCurrentView("tests")}
          />
        )}

        {currentView === "tests" && (
          <TestScenariosPage
            onNavigateToAuctions={handleBackToListing}
            onNavigateToArchitecture={() => setCurrentView("architecture")}
          />
        )}
      </main>

      {/* Create RFQ Modal */}
      {isCreateModalOpen && (
        <CreateRFQModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newRfq) => {
            handleSelectRfq(newRfq.id);
          }}
        />
      )}

      {/* Suppliers Directory Modal */}
      {isSuppliersModalOpen && (
        <SuppliersModal
          onClose={() => setIsSuppliersModalOpen(false)}
          onSelectSupplierForBidding={(supId) => {
            setRole("supplier");
          }}
        />
      )}

      {/* Minimal Architectural Footer */}
      <footer className="border-t border-white/[0.08] bg-black/60 py-6 px-4 sm:px-6 lg:px-8 mt-12 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 gap-3">
          <div className="flex items-center space-x-2.5">
            <span className="font-semibold text-zinc-400">BIDLEDGER</span>
            <span>•</span>
            <span>British Auction RFQ Engine</span>
            <span>•</span>
            <span className="text-zinc-600">Dynamic Extensions & Hard Forced Close</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <button 
              onClick={() => setCurrentView("architecture")} 
              className="px-2 py-0.5 rounded bg-[#101014] hover:bg-zinc-800 border border-white/[0.06] text-zinc-400 transition-colors cursor-pointer"
            >
              Architecture Blueprint
            </button>
            <button 
              onClick={() => setCurrentView("tests")} 
              className="px-2 py-0.5 rounded bg-[#101014] hover:bg-zinc-800 border border-white/[0.06] text-emerald-400 transition-colors cursor-pointer"
            >
              21/21 Tests Passed
            </button>
            <span className="px-2 py-0.5 rounded bg-[#101014] border border-white/[0.06] text-zinc-400">Python FastAPI</span>
            <span className="px-2 py-0.5 rounded bg-[#101014] border border-white/[0.06] text-zinc-400">ReactJS Vite</span>
            <span className="px-2 py-0.5 rounded bg-[#101014] border border-white/[0.06] text-zinc-400">PostgreSQL</span>
            <span className="px-2 py-0.5 rounded bg-[#101014] border border-white/[0.06] text-zinc-400">Neo4j Cypher</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
