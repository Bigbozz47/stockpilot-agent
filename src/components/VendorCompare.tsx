'use client';

import { AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import type { AgentProposal } from './AgentTerminal';

const fmtIDR = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export default function VendorCompare({ proposal }: { proposal: AgentProposal | null }) {
  const pick = proposal?.supplierCode ?? 'SUP-B';
  const rows = [
    { code: 'SUP-A', name: 'Local Bulk Wholesaler', price: 'x1.00 · cheapest', lead: '48h', moq: 'MOQ 50', verdict: '48h Lead Time — Fails Weekend Surge Protection', win: false, icon: 'warn' as const },
    { code: 'SUP-B', name: 'Express Logistics Hub', price: 'x1.05 · +5% premium', lead: '6h', moq: 'MOQ 10', verdict: '6h Express Delivery — AI Selected (Prevents $2,400 Lost Sales)', win: true, icon: 'bolt' as const },
    { code: 'SUP-C', name: 'Regional Distributor', price: 'x1.02 · standard', lead: '24h', moq: 'MOQ 25', verdict: 'Viable fallback', win: false, icon: 'none' as const },
  ];
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-[13px] font-bold text-[#212121]">Vendor Trade-off Scorecard</h2>
      <div className="space-y-2">
        {rows.map((r) => {
          const active = proposal ? r.code === pick : r.win;
          const rejected = r.code === 'SUP-A';
          return (
            <div
              key={r.code}
              className={`rounded-lg border px-3 py-2 ${active ? 'border-2 border-[#4CAF50] bg-[#E8F5E9]/40' : rejected ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-[#E2E8F0] bg-white'}`}
            >
              {active && (
                <div className="mb-1.5 inline-block rounded bg-[#4CAF50] px-1.5 py-px font-mono text-[10px] font-bold text-white">
                  WINNER
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="telemetry truncate font-mono text-[11px] font-bold text-[#212121]" title={`${r.code} · ${r.name}`}>{r.code} · {r.name}</span>
                {active ? <CheckCircle2 size={14} className="shrink-0 text-[#4CAF50]" /> : rejected ? <XCircle size={14} className="shrink-0 text-[#4B5563]" /> : null}
              </div>
              <div className={`telemetry mt-1 font-mono text-[11px] ${rejected ? 'text-[#4B5563] line-through' : 'text-[#4B5563]'}`}>
                {r.price} · {r.lead} lead · {r.moq}
              </div>
              <div
                className={`mt-1.5 flex items-center gap-1.5 rounded px-1.5 py-1 font-mono text-[10px] transition-all duration-300 ${active ? 'bg-[#4CAF50] font-bold text-white' : rejected ? 'border border-[#FBC02D] bg-[#FFFDE7] text-[#212121]' : 'bg-[#F4F6F8] text-[#4B5563]'}`}
              >
                {r.icon === 'warn' && <AlertTriangle size={12} className="shrink-0" />}
                {r.icon === 'bolt' && <Zap size={12} className="shrink-0" />}
                <span>{active && proposal ? `${r.verdict} — ${fmtIDR(proposal.totalAmount)} / ${proposal.quantity} units` : r.verdict}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
