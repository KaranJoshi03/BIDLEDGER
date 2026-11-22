import React from "react";
import { Clock, ShieldAlert, Zap, AlertTriangle } from "lucide-react";

export default function TimelineVisualizer({ rfq }) {
  if (!rfq) return null;

  const start = new Date(rfq.bid_start_time).getTime();
  const close = new Date(rfq.bid_close_time).getTime();
  const forced = new Date(rfq.forced_close_time).getTime();
  const now = new Date().getTime();

  const totalSpan = Math.max(1, forced - start);
  const nowPct = Math.min(100, Math.max(0, ((now - start) / totalSpan) * 100));
  const closePct = Math.min(100, Math.max(0, ((close - start) / totalSpan) * 100));
  
  const triggerWindowMs = (rfq.trigger_window_minutes || 10) * 60 * 1000;
  const triggerStartMs = Math.max(start, close - triggerWindowMs);
  const triggerStartPct = Math.min(100, Math.max(0, ((triggerStartMs - start) / totalSpan) * 100));
  const triggerWidthPct = Math.max(2, closePct - triggerStartPct);

  const isInWindow = now >= triggerStartMs && now < close;

  return (
    <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0d0d11] space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold">
            Chronological British Auction Timeline
          </span>
        </div>
        <span className="font-mono text-[11px] text-zinc-500">
          Rule: Forced Close &ge; Dynamic Close &gt; Start
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        
        {/* Trigger Window Zone (Amber highlighted slice) */}
        <div
          className={`absolute top-0 bottom-0 bg-amber-500/25 border-x border-amber-500/40 ${
            isInWindow ? "animate-pulse" : ""
          }`}
          style={{ left: `${triggerStartPct}%`, width: `${triggerWidthPct}%` }}
          title={`Trigger Window (Last ${rfq.trigger_window_minutes}m before close)`}
        />

        {/* Elapsed Progress Bar */}
        <div
          className="h-full bg-emerald-500/70 transition-all duration-500"
          style={{ width: `${nowPct}%` }}
        />

        {/* Dynamic Close Marker Line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] z-10"
          style={{ left: `${closePct}%` }}
          title="Current Dynamic Close Time"
        />
      </div>

      {/* Timeline Labels */}
      <div className="grid grid-cols-4 text-[10px] font-mono text-zinc-400 pt-1">
        <div>
          <span className="text-zinc-500 block uppercase">Start</span>
          <span className="text-zinc-300">{new Date(rfq.bid_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="text-center">
          <span className="text-amber-400/90 block uppercase flex items-center justify-center space-x-1">
            <Zap className="w-2.5 h-2.5" />
            <span>Window ({rfq.trigger_window_minutes}m)</span>
          </span>
          <span className="text-amber-200">{new Date(triggerStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="text-center">
          <span className="text-amber-400 block uppercase font-bold">Dynamic Close</span>
          <span className="text-zinc-200 font-semibold">{new Date(rfq.bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="text-right">
          <span className="text-rose-400 block uppercase font-bold flex items-center justify-end space-x-1">
            <ShieldAlert className="w-2.5 h-2.5" />
            <span>Hard Stop Cap</span>
          </span>
          <span className="text-rose-300 font-semibold">{new Date(rfq.forced_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
