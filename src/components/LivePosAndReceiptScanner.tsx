'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ReceiptText, ScanLine, ShoppingCart } from 'lucide-react';

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;

export interface PosCheckout {
  receiptId: string;
  deducted: Array<{ sku: string; deducted: number }>;
  breached: boolean;
}

/** Live Cashier POS + Receipt OCR Scanner — real-world store trigger panel. */
export default function LivePosAndReceiptScanner({
  busy, onCheckout,
}: {
  busy: boolean;
  onCheckout: (result: PosCheckout) => void;
}) {
  const [tab, setTab] = useState<'pos' | 'ocr'>('pos');
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [note, setNote] = useState<string | null>(null);

  async function checkout() {
    if (busy || phase === 'working') return;
    setPhase('working');
    setNote(null);
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await fetch('/api/inventory/deplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: 'CF-BEAN-1KG', quantityToDeduct: 14 }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; data?: { breached: boolean } };
      if (!json.success) {
        setNote(json.error ?? 'Checkout failed');
        setPhase('idle');
        return;
      }
      setPhase('done');
      onCheckout({ receiptId: 'POS-8841', deducted: [{ sku: 'CF-BEAN-1KG', deducted: 14 }], breached: !!json.data?.breached });
    } catch {
      setNote('Network error — is the dev server running?');
      setPhase('idle');
    }
  }

  async function scanReceipt() {
    if (busy || phase === 'working') return;
    setPhase('working');
    setNote(null);
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await fetch('/api/inventory/ingest-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: 'POS-8841' }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; data?: PosCheckout };
      if (!json.success || !json.data) {
        setNote(json.error ?? 'OCR scan failed');
        setPhase('idle');
        return;
      }
      setPhase('done');
      onCheckout({ receiptId: json.data.receiptId, deducted: json.data.deducted, breached: json.data.breached });
    } catch {
      setNote('Network error — is the dev server running?');
      setPhase('idle');
    }
  }

  return (
    <div data-testid="pos-checkout-card" className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart size={14} className="text-[#4CAF50]" />
          <h2 className="text-[13px] font-bold text-[#212121]">UNP Mart Live Cashier POS &amp; Receipt Scanner</h2>
        </div>
        <div className="flex rounded-lg bg-[#F4F6F8] p-0.5" role="tablist" aria-label="Trigger mode">
          {(['pos', 'ocr'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-2.5 py-1 font-mono text-[10px] font-bold transition-all duration-200 ${tab === t ? 'bg-white text-[#212121] shadow-sm' : 'text-[#4B5563]'}`}
            >
              {t === 'pos' ? 'POS TERMINAL' : 'RECEIPT OCR'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'pos' ? (
        <div className="mt-3">
          <div className="telemetry rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-[11px] leading-relaxed text-[#212121]">
            <p className="font-bold">Receipt #POS-8841 — B2B Bulk Cafe Order</p>
            <p>14x Premium Coffee Beans 1kg [COF-001] · Rp 145.000</p>
            <p>5x Oat Milk 1L [OAT-004] · Rp 35.000</p>
            <p className="mt-1 font-bold">TOTAL: Rp 2.205.000 — Kasir 03 (Dewi) · Fri 16:45 WIB</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}
            onClick={checkout} disabled={busy || phase === 'working'}
            data-testid="pos-checkout-btn"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#4CAF50] px-3 py-2 text-[12px] font-bold text-white shadow-sm transition-all duration-300 hover:bg-[#388E3C] disabled:opacity-40"
          >
            <ShoppingCart size={13} />
            {phase === 'working' ? 'Printing Receipt…' : 'Process Cashier Checkout & Deduct Stock (-14kg COF-001)'}
          </motion.button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="telemetry rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-3 font-mono text-[11px] leading-relaxed text-[#212121]">
            <p className="font-bold">Meta Vision OCR — Physical Invoice Scan</p>
            <p className="mt-1 text-[#4B5563]">POS-8841 · 14x COF-001 + 5x OAT-004 · conf 98.7%</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}
            onClick={scanReceipt} disabled={busy || phase === 'working'}
            data-testid="scan-receipt-ocr-btn"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#FBC02D] bg-[#FFEB3B] px-3 py-2 text-[12px] font-bold text-[#212121] transition-all duration-300 hover:bg-[#FDD835] disabled:opacity-40"
          >
            {phase === 'working' ? <ScanLine size={13} className="animate-pulse" /> : <ReceiptText size={13} />}
            {phase === 'working' ? 'Scanning Invoice…' : 'Scan Physical Invoice via Meta Vision OCR'}
          </motion.button>
        </div>
      )}
      {note && <p className="telemetry mt-2 font-mono text-[11px] text-[#B91C1C]">{note}</p>}
    </div>
  );
}
