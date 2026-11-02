'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import type { InventoryItem } from './inventoryApi';

export default function DepletionSlider({
  items, onDepleted,
}: {
  items: InventoryItem[];
  onDepleted: (result: { sku: string; breached: boolean }) => void;
}) {
  const [sku, setSku] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function drain() {
    if (!sku || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inventory/deplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, quantityToDeduct: 25 }),
      });
      const json = (await res.json()) as { success: boolean; data?: { breached: boolean }; error?: string };
      if (!json.success) {
        setMsg(json.error ?? 'Depletion failed');
      } else {
        setMsg(`Drained 25 units from ${sku}${json.data?.breached ? ' — BREACH, agent dispatched' : ''}`);
        onDepleted({ sku, breached: !!json.data?.breached });
      }
    } catch {
      setMsg('Network error — is the dev server running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Zap size={14} className="text-[#FBC02D]" />
        <h2 className="text-[13px] font-bold text-[#212121]">POS Rush Simulator</h2>
      </div>
      <p className="telemetry mb-3 font-mono text-[11px] text-[#4B5563]">
        Drain 25 units past safety stock to trigger the agent.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="telemetry min-w-0 flex-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-mono text-[12px] text-[#212121] outline-none focus:border-[#4CAF50]"
          aria-label="Select SKU to deplete"
        >
          <option value="">— Select SKU —</option>
          {items.map((it) => (
            <option key={it.sku} value={it.sku}>
              {it.sku} · {it.currentStock} in stock
            </option>
          ))}
        </select>
        <button
          onClick={drain}
          disabled={!sku || busy}
          className="rounded-lg bg-[#4CAF50] px-4 py-2 text-[12px] font-bold text-white shadow-sm transition-opacity hover:bg-[#388E3C] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Draining…' : 'Simulate POS Rush / Drain 25'}
        </button>
      </div>
      {msg && <p className="telemetry mt-2 font-mono text-[11px] text-[#4B5563]">{msg}</p>}
    </div>
  );
}
