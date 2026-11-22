import React, { useState } from "react";
import { History, Zap, ArrowDownCircle, CheckCircle, ShieldAlert, Award } from "lucide-react";

export default function ActivityLogView({ logs = [] }) {
  const [filter, setFilter] = useState("all");

  const filteredLogs = logs.filter((log) => {
    if (filter === "extensions") return log.event_type === "TIME_EXTENDED";
    if (filter === "bids") return log.event_type === "BID_SUBMITTED";
    if (filter === "l1") return log.event_type === "L1_CHANGED";
    return true;
  });

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-zinc-800 gap-2">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">
            Audit Activity & Extension Log
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            {logs.length} Event{logs.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1 text-[11px] font-mono">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "all" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("extensions")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "extensions" ? "bg-amber-500/20 text-amber-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            ⚡ Extensions
          </button>
          <button
            onClick={() => setFilter("bids")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "bids" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Bids
          </button>
          <button
            onClick={() => setFilter("l1")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === "l1" ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            🏆 L1 Flips
          </button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          No events match the selected filter.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
          {filteredLogs.map((log, idx) => {
            const isExtension = log.event_type === "TIME_EXTENDED";
            const isL1 = log.event_type === "L1_CHANGED";
            const isForceClosed = log.event_type === "AUCTION_FORCE_CLOSED";
            const isClosed = log.event_type === "AUCTION_CLOSED";

            return (
              <div key={log.id || idx} className="relative group">
                
                {/* Timeline node icon */}
                <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${
                  isExtension
                    ? "bg-amber-950 border-amber-500 text-amber-400"
                    : isL1
                    ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                    : isForceClosed
                    ? "bg-rose-950 border-rose-500 text-rose-400"
                    : isClosed
                    ? "bg-zinc-900 border-zinc-700 text-zinc-400"
                    : "bg-zinc-900 border-zinc-700 text-zinc-500"
                }`}>
                  {isExtension ? (
                    <Zap className="w-2.5 h-2.5" />
                  ) : isL1 ? (
                    <Award className="w-2.5 h-2.5" />
                  ) : isForceClosed ? (
                    <ShieldAlert className="w-2.5 h-2.5" />
                  ) : (
                    <ArrowDownCircle className="w-2.5 h-2.5" />
                  )}
                </div>

                {/* Content Card */}
                <div className={`p-3 rounded-xl border text-xs transition-all ${
                  isExtension
                    ? "bg-amber-500/5 border-amber-500/20 text-amber-200/90"
                    : isL1
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-200/90"
                    : "bg-black/30 border-zinc-800/80 text-zinc-300"
                }`}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold tracking-wider text-zinc-400">
                      {log.event_type.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-zinc-500">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""} UTC
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-200">
                    {log.summary}
                  </p>

                  {/* Reason snippet for extensions */}
                  {isExtension && log.details?.reason && (
                    <div className="mt-2 pt-2 border-t border-amber-500/10 text-[11px] font-mono text-amber-400">
                      Trigger Reason: <span className="text-amber-200">{log.details.reason}</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
