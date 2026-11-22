import React, { useState } from "react";
import { Play, FastForward, UserMinus, ShieldAlert, Zap, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

export default function SimulationTestBench({ rfqId, onActionComplete }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const runSimulation = async (action, label) => {
    setLoadingAction(action);
    setStatusMessage(null);
    try {
      const res = await api.simulateAction(rfqId, action);
      setStatusMessage({
        type: "success",
        text: res.message || `${label} executed successfully!`,
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.message || "Simulation failed",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider">
            Interactive Test Bench & British Auction Simulation
          </h4>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          One-click evaluation tools
        </span>
      </div>

      <p className="text-xs text-zinc-400 mb-3">
        Test real-time British Auction rules instantly without waiting hours:
      </p>

      {/* Button Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Fast forward into Trigger Window */}
        <button
          onClick={() => runSimulation("FAST_FORWARD_TO_TRIGGER_WINDOW", "Fast-Forward")}
          disabled={loadingAction !== null}
          className="p-2.5 rounded-xl border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-800 hover:border-amber-500/50 text-left transition-all duration-150 cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-semibold">
            <FastForward className="w-3.5 h-3.5" />
            <span>1. Enter Trigger Window</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Fast-forwards clock so only 3 minutes remain before close.
          </p>
        </button>

        {/* Simulate L1 Flip inside Window */}
        <button
          onClick={() => runSimulation("SIMULATE_L1_TAKEOVER", "Simulate L1 Flip")}
          disabled={loadingAction !== null}
          className="p-2.5 rounded-xl border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-800 hover:border-emerald-500/50 text-left transition-all duration-150 cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>2. Simulate L1 Flip (+Y min)</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Submits lower quote to trigger rank change & time extension.
          </p>
        </button>

        {/* Test Forced Close Boundary */}
        <button
          onClick={() => runSimulation("SIMULATE_FORCED_CLOSE_BOUNDARY", "Test Forced Close Hard Cap")}
          disabled={loadingAction !== null}
          className="p-2.5 rounded-xl border border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-800 hover:border-rose-500/50 text-left transition-all duration-150 cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center space-x-1.5 text-rose-400 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>3. Test Hard Forced Cap</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Moves close 1m before forced close to verify hard-stop capping.
          </p>
        </button>
      </div>

      {statusMessage && (
        <div className={`mt-3 p-2.5 rounded-lg text-xs font-mono flex items-center space-x-2 ${
          statusMessage.type === "success" 
            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
