'use client';

import { PackageX } from 'lucide-react';
import type { InventoryItem } from './inventoryApi';
import { stockStatus } from './inventoryApi';

const BADGE: Record<string, string> = {
  HEALTHY: 'border-[#4CAF50] bg-[#E8F5E9] text-[#2E7D32]',
  CRITICAL_BREACH: 'border-[#DC2626]/40 bg-[#FEF2F2] text-[#B91C1C]',
  REORDER_IN_PROGRESS: 'border-[#FBC02D] bg-[#FFFDE7] font-bold text-[#212121]',
};

const BAR: Record<string, string> = {
  HEALTHY: 'bg-[#4CAF50]',
  CRITICAL_BREACH: 'bg-[#DC2626]',
  REORDER_IN_PROGRESS: 'bg-[#FBC02D]',
};

function barPct(it: InventoryItem): number {
  const span = Math.max(it.safetyStock, it.reorderPoint, 1);
  return Math.min(100, Math.max(4, Math.round((it.currentStock / span) * 100)));
}

export default function InventoryTable({
  items, pendingSkus, loading,
}: {
  items: InventoryItem[];
  pendingSkus: Set<string>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-label="Loading inventory">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-[#F4F6F8]" />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center">
        <PackageX size={28} className="text-[#4B5563]" />
        <p className="text-sm font-semibold text-[#212121]">No products found</p>
        <p className="font-mono text-xs text-[#4B5563]">Run `npm run seed` to populate demo SKUs.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
      <table className="telemetry w-full min-w-[720px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider text-[#4B5563]">
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2 text-right">Stock Telemetry</th>
            <th className="px-3 py-2 text-right">Unit Cost</th>
            <th className="px-3 py-2 text-right">Velocity/day</th>
            <th className="px-3 py-2 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const st = stockStatus(it, pendingSkus);
            const pct = barPct(it);
            return (
              <tr
                key={it.sku}
                className={`border-t border-[#E2E8F0] transition-colors hover:bg-[#F8FAFC] ${st === 'CRITICAL_BREACH' ? 'bg-[#FEF2F2]/50' : ''} ${st === 'REORDER_IN_PROGRESS' ? 'bg-[#FFFDE7]/50' : ''}`}
              >
                <td className="px-3 py-2 font-mono text-[12px] font-semibold text-[#212121]">{it.sku}</td>
                <td className="max-w-[220px] truncate px-3 py-2 font-medium text-[#212121]" title={it.name}>{it.name}</td>
                <td className="px-3 py-2 text-[#4B5563]">{it.category}</td>
                <td className="px-3 py-2 text-right">
                  <div className="ml-auto w-44">
                    <div className="flex items-baseline justify-end gap-1 font-mono">
                      <span className={`text-[13px] font-bold ${it.isBelowSafetyStock ? 'text-[#B91C1C]' : 'text-[#2E7D32]'}`}>{it.currentStock}</span>
                      <span className="text-[11px] text-[#4B5563]">/ {it.safetyStock} · ROP {it.reorderPoint}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F4F6F8]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${it.sku} stock level`}>
                      <div className={`h-full rounded-full transition-[width] duration-300 ${BAR[st]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-[#212121]">Rp{it.unitCost.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right font-mono text-[#4B5563]">{it.avgDailyDemand ?? 0}</td>
                <td className="px-3 py-2 text-right">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${BADGE[st]}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st === 'HEALTHY' ? 'bg-[#4CAF50]' : st === 'REORDER_IN_PROGRESS' ? 'bg-[#FBC02D]' : 'breach-pulse bg-[#DC2626]'}`} aria-hidden />
                    {st}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
