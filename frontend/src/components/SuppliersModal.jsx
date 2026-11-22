import React, { useState, useEffect } from "react";
import { Users, X, Star, ShieldCheck, Mail, Phone, ExternalLink } from "lucide-react";
import { api } from "../services/api";

export default function SuppliersModal({ onClose, onSelectSupplierForBidding }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await api.listSuppliers();
        setSuppliers(data);
      } catch (err) {
        console.error("Failed to load suppliers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#0c0c10] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#101014]">
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Verified Logistics Suppliers & Carrier Network
              </h3>
              <p className="text-[11px] text-zinc-400">
                Authorized freight carriers participating in BidLedger British Auctions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Supplier List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Loading verified supplier directory...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-lg border border-white/[0.06] bg-[#121217] hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {s.supplier_code}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-amber-400 font-mono">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{s.rating?.toFixed(2) || "4.90"}</span>
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-white flex items-center space-x-1.5">
                      <span>{s.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </h4>

                    <div className="mt-2 space-y-1 text-[11px] text-zinc-400 font-mono">
                      <div className="flex items-center space-x-1.5 truncate">
                        <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{s.contact_email}</span>
                      </div>
                      {s.phone && (
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {onSelectSupplierForBidding && (
                    <button
                      onClick={() => {
                        onSelectSupplierForBidding(s.id);
                        onClose();
                      }}
                      className="mt-3 w-full py-1.5 rounded text-[11px] font-mono font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
                    >
                      Bid as {s.name.split(" ")[0]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#101014] flex justify-between items-center text-xs text-zinc-500 font-mono">
          <span>{suppliers.length} Verified Suppliers Active</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
          >
            Close Directory
          </button>
        </div>

      </div>
    </div>
  );
}
