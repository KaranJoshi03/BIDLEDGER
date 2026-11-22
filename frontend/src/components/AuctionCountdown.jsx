import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, ShieldAlert, Zap, Lock } from "lucide-react";

export default function AuctionCountdown({ rfq, latestExtensionAlert }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
  const [forcedTimeLeft, setForcedTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
  const [isInTriggerWindow, setIsInTriggerWindow] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isForceClosed, setIsForceClosed] = useState(false);

  useEffect(() => {
    if (!rfq) return;

    const calculateTimes = () => {
      const now = new Date().getTime();
      const closeTime = new Date(rfq.bid_close_time).getTime();
      const forcedCloseTime = new Date(rfq.forced_close_time).getTime();

      const diffClose = Math.max(0, Math.floor((closeTime - now) / 1000));
      const diffForced = Math.max(0, Math.floor((forcedCloseTime - now) / 1000));

      const h = Math.floor(diffClose / 3600);
      const m = Math.floor((diffClose % 3600) / 60);
      const s = diffClose % 60;

      const fh = Math.floor(diffForced / 3600);
      const fm = Math.floor((diffForced % 3600) / 60);
      const fs = diffForced % 60;

      setTimeLeft({ hours: h, minutes: m, seconds: s, totalSeconds: diffClose });
      setForcedTimeLeft({ hours: fh, minutes: fm, seconds: fs, totalSeconds: diffForced });

      const triggerWindowSeconds = (rfq.trigger_window_minutes || 10) * 60;
      setIsInTriggerWindow(diffClose > 0 && diffClose <= triggerWindowSeconds);

      setIsClosed(diffClose <= 0 || rfq.status === "closed");
      setIsForceClosed(diffForced <= 0 || rfq.status === "force_closed");
    };

    calculateTimes();
    const interval = setInterval(calculateTimes, 1000);
    return () => clearInterval(interval);
  }, [rfq]);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="space-y-3">
      {/* Extension Alert Banner */}
      {latestExtensionAlert && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 transition-all shadow-md">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono">
            <span className="font-semibold text-amber-300">
              ⚡ British Auction Extended by +{latestExtensionAlert.minutes} mins!
            </span>
            <p className="text-amber-200/80 text-[11px] mt-0.5">
              {latestExtensionAlert.reason}
              {latestExtensionAlert.capped && (
                <span className="ml-1 text-rose-300 font-medium">(Capped at Forced Bid Close Time)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Main Countdown Display */}
      <div 
        className={`p-5 rounded-xl border transition-all duration-300 ${
          isForceClosed
            ? "bg-[#140c0e] border-rose-900/60"
            : isClosed
            ? "bg-[#0d0d11] border-white/[0.06]"
            : isInTriggerWindow
            ? "bg-[#16120b] border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.1)]"
            : "bg-[#0d0d11] border-white/[0.08]"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Status & Timestamps */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Current Bid Close Timer
              </span>

              {isForceClosed ? (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Force Closed</span>
                </span>
              ) : isClosed ? (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Auction Closed</span>
                </span>
              ) : isInTriggerWindow ? (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse font-semibold">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                  <span>Trigger Window Active ({rfq.trigger_window_minutes}m)</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Active Bidding</span>
                </span>
              )}
            </div>

            <div className="text-xs text-zinc-400 font-mono mt-1.5 space-x-2">
              <span>Dynamic Close: <strong className="text-white">{new Date(rfq.bid_close_time).toLocaleTimeString()} UTC</strong></span>
              {rfq.extension_count > 0 && (
                <span className="text-amber-400">
                  (⚡ {rfq.extension_count} Extension{rfq.extension_count > 1 ? "s" : ""}, +{rfq.total_extended_minutes}m)
                </span>
              )}
            </div>
          </div>

          {/* Right: Digital Countdown Boxes */}
          <div className="flex items-center space-x-1.5 font-mono">
            <div className="text-center px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] min-w-[58px]">
              <div className={`text-xl font-bold tabular-nums tracking-tight ${
                isClosed ? "text-zinc-600" : isInTriggerWindow ? "text-amber-400" : "text-white"
              }`}>
                {pad(timeLeft.hours)}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Hrs</div>
            </div>
            <span className="text-lg font-bold text-zinc-700">:</span>
            <div className="text-center px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] min-w-[58px]">
              <div className={`text-xl font-bold tabular-nums tracking-tight ${
                isClosed ? "text-zinc-600" : isInTriggerWindow ? "text-amber-400" : "text-white"
              }`}>
                {pad(timeLeft.minutes)}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Min</div>
            </div>
            <span className="text-lg font-bold text-zinc-700">:</span>
            <div className="text-center px-3 py-2 rounded-lg bg-black/60 border border-white/[0.08] min-w-[58px]">
              <div className={`text-xl font-bold tabular-nums tracking-tight ${
                isClosed ? "text-zinc-600" : isInTriggerWindow ? "text-amber-400" : "text-emerald-400"
              }`}>
                {pad(timeLeft.seconds)}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Sec</div>
            </div>
          </div>

        </div>

        {/* Forced Close Hard Stop Indicator Bar */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 gap-2 font-mono">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              Forced Bid Close:{" "}
              <strong className="text-zinc-200">
                {new Date(rfq.forced_close_time).toLocaleTimeString()} UTC
              </strong>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-rose-400/90">
              Hard stop in: {pad(forcedTimeLeft.hours)}h {pad(forcedTimeLeft.minutes)}m {pad(forcedTimeLeft.seconds)}s
            </span>
          </div>

          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            *British Rule: Extensions capped at forced close
          </div>
        </div>

      </div>
    </div>
  );
}
