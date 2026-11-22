import React, { useEffect, useState } from "react";
import { Share2, X, RefreshCw, Layers, ShieldCheck, Zap } from "lucide-react";
import { api } from "../services/api";

export default function Neo4jGraphModal({ rfqId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await api.getRfqAnalytics(rfqId);
      setData(res);
    } catch (err) {
      console.error("Failed to load Neo4j graph", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [rfqId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100 font-mono">
              Neo4j Graph Intelligence & Supplier Network
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Cypher Graph Topology
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchGraph}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Refresh Graph"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Analytics Summary */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase">Baseline Target</span>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">
                  ₹{data.baseline_price ? data.baseline_price.toLocaleString() : "N/A"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase">Winning L1 Quote</span>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  ₹{data.lowest_price ? data.lowest_price.toLocaleString() : "N/A"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase">Buyer Savings</span>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  ₹{data.savings_amount.toLocaleString()} ({data.savings_percent}%)
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase">British Extensions</span>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  ⚡ {data.extension_count} (+{data.total_extended_minutes}m)
                </div>
              </div>
            </div>
          )}

          {/* Graph Visual Canvas */}
          <div className="rounded-xl border border-zinc-800 bg-black/60 p-4 min-h-[320px] flex flex-col justify-between">
            <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              <span>Graph Node & Edge Topology</span>
              <div className="flex items-center space-x-3 text-[10px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>RFQ</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  <span>Supplier</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                  <span>Carrier</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Lane</span>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-zinc-500 text-xs font-mono">
                Computing Neo4j graph relationships...
              </div>
            ) : data?.graph ? (
              <div className="py-6 space-y-4">
                
                {/* Visual Representation of Active Nodes */}
                <div className="flex flex-wrap gap-2.5">
                  {data.graph.nodes.map((node) => {
                    const colorMap = {
                      RFQ: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                      SUPPLIER: "border-blue-500/40 bg-blue-500/10 text-blue-300",
                      CARRIER: "border-purple-500/40 bg-purple-500/10 text-purple-300",
                      LANE: "border-amber-500/40 bg-amber-500/10 text-amber-300",
                    };
                    return (
                      <div
                        key={node.id}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center space-x-1.5 ${
                          colorMap[node.group] || "border-zinc-700 bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span className="font-semibold">{node.label}</span>
                        <span className="text-[10px] opacity-60 uppercase">[{node.group}]</span>
                      </div>
                    );
                  })}
                </div>

                {/* Relationship Links */}
                <div className="mt-4 pt-4 border-t border-zinc-800/80">
                  <h4 className="text-[11px] font-mono uppercase text-zinc-400 mb-2">
                    Active Graph Relationships (:SUBMITTED_BID, :UNDERBIDS, :OPERATES_WITH)
                  </h4>
                  <div className="space-y-1.5 text-xs font-mono text-zinc-300">
                    {data.graph.links.map((link, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-300">{link.source}</span>
                          <span className="text-zinc-500">─[:{link.type}]─▶</span>
                          <span className="text-emerald-300">{link.target}</span>
                        </div>
                        {link.price && (
                          <span className="text-emerald-400 font-bold">
                            ₹{link.price.toLocaleString()} ({link.rank})
                          </span>
                        )}
                        {link.delta && (
                          <span className="text-rose-400">
                            -₹{link.delta.toLocaleString()} delta
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : null}

            <div className="text-[11px] text-zinc-500 font-mono text-right">
              Powered by Neo4j Graph Algorithms (Cypher Connected)
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
          >
            Close Explorer
          </button>
        </div>

      </div>
    </div>
  );
}
