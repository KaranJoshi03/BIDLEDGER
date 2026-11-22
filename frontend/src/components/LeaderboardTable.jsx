import React from "react";
import { Trophy, Truck, Clock, Calendar, Download, Zap } from "lucide-react";

export default function LeaderboardTable({ bids = [], baselinePrice, activeSupplierId, role }) {
  if (!bids || bids.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-[#0d0d11] border border-white/[0.08]">
        <p className="text-xs font-mono text-zinc-400">No quotes submitted yet for this RFQ.</p>
        <p className="text-[11px] text-zinc-600 mt-1 font-mono">First supplier to submit will secure the initial L1 ranking.</p>
      </div>
    );
  }

  // Sort bids by total_charges ASC
  const sortedBids = [...bids].sort((a, b) => a.total_charges - b.total_charges);
  const l1Price = sortedBids[0]?.total_charges;

  const handleExportCSV = () => {
    const headers = ["Rank,Supplier,Carrier,Freight,Origin,Destination,Total,Transit_Days,Validity,Caused_Extension,Timestamp"];
    const rows = sortedBids.map((b, i) => [
      `L${i+1}`,
      `"${b.supplier_name || 'Supplier'}"`,
      `"${b.carrier_name}"`,
      b.freight_charges,
      b.origin_charges,
      b.destination_charges,
      b.total_charges,
      b.transit_time_days,
      b.quote_validity_date ? new Date(b.quote_validity_date).toISOString().split('T')[0] : '',
      b.caused_extension ? 'YES' : 'NO',
      b.submitted_at || ''
    ].join(","));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BidLedger_Leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d0d11] overflow-hidden shadow-lg">
      <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#101014]">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
            Live Supplier Leaderboard
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {bids.length} Quote{bids.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Export Button for Buyer */}
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 transition-colors border border-zinc-700/60 cursor-pointer"
          title="Download full bid ledger as CSV"
        >
          <Download className="w-3 h-3 text-zinc-400" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-black/40 text-zinc-500 font-mono uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-4">Rank</th>
              <th className="py-2.5 px-4">Supplier</th>
              <th className="py-2.5 px-4">Carrier</th>
              <th className="py-2.5 px-4">Charges Breakdown</th>
              <th className="py-2.5 px-4 text-right">Total Quote</th>
              <th className="py-2.5 px-4">Transit</th>
              <th className="py-2.5 px-4">Validity</th>
              <th className="py-2.5 px-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-sans">
            {sortedBids.map((b, index) => {
              const isL1 = index === 0;
              const isL2 = index === 1;
              const isUserBid = activeSupplierId && b.supplier_id === activeSupplierId;
              const savingsFromL1 = !isL1 && l1Price ? b.total_charges - l1Price : 0;
              
              return (
                <tr 
                  key={b.id || index}
                  className={`transition-colors duration-150 ${
                    isUserBid
                      ? "bg-blue-500/10 hover:bg-blue-500/15"
                      : isL1 
                      ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]" 
                      : "hover:bg-zinc-800/20"
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                    {isL1 ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                        <Trophy className="w-3 h-3 text-emerald-400" />
                        <span>L1</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[11px]">
                        L{index + 1}
                      </span>
                    )}
                  </td>

                  {/* Supplier */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-white flex items-center space-x-1.5">
                      <span>{b.supplier_name || "Verified Carrier"}</span>
                      {isUserBid && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          YOU
                        </span>
                      )}
                    </div>
                    {b.caused_extension && (
                      <span className="inline-flex items-center space-x-1 text-[10px] text-amber-400 font-mono mt-0.5">
                        <Zap className="w-2.5 h-2.5" />
                        <span>Awarded +{b.extension_minutes_awarded || 5}m extension</span>
                      </span>
                    )}
                  </td>

                  {/* Carrier */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5 text-zinc-300 text-xs">
                      <Truck className="w-3 h-3 text-zinc-500" />
                      <span>{b.carrier_name}</span>
                    </div>
                    {b.notes && (
                      <p className="text-[10px] text-zinc-500 truncate max-w-[170px] mt-0.5" title={b.notes}>
                        {b.notes}
                      </p>
                    )}
                  </td>

                  {/* Line Item Breakdown */}
                  <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-zinc-400">
                    <div>Freight: <span className="text-zinc-200">₹{b.freight_charges?.toLocaleString()}</span></div>
                    <div className="text-[10px] text-zinc-500">
                      Origin: ₹{b.origin_charges?.toLocaleString()} | Dest: ₹{b.destination_charges?.toLocaleString()}
                    </div>
                  </td>

                  {/* Total Quote */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                    <div className={`text-xs font-bold tabular-nums ${isL1 ? "text-emerald-400" : "text-white"}`}>
                      ₹{b.total_charges?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {!isL1 && (
                      <div className="text-[9px] text-rose-400/80 font-mono">
                        +₹{savingsFromL1.toLocaleString()} vs L1
                      </div>
                    )}
                  </td>

                  {/* Transit Time */}
                  <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap text-xs">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      <span>{b.transit_time_days}d</span>
                    </div>
                  </td>

                  {/* Quote Validity */}
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span>{b.quote_validity_date ? new Date(b.quote_validity_date).toLocaleDateString() : "Valid"}</span>
                    </div>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-4 text-right font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                    {b.submitted_at ? new Date(b.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
