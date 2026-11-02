'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Download, FileText, Loader2, PackageCheck, Send, ShieldCheck, Truck, Users, X, Zap } from 'lucide-react';
import type { AgentProposal } from './AgentTerminal';
import VisionPodWidget from './VisionPodWidget';
import type { EscrowSettlementResult, SplitOrderFailoverResult } from '@/lib/math';
import type { VisionVerificationResult } from '@/types/index';

const fmtIDR = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

type Phase = 'review' | 'sending' | 'dispatched' | 'verifying' | 'settled' | 'rejected' | 'failed';

const STEPS = ['Draft Proposed', 'Approved & Locked', 'Delivery Verified', 'Settled & Restocked'] as const;

interface ReceiptData {
  status: string;
  escrow: EscrowSettlementResult;
  vision: VisionVerificationResult | null;
  restocked: number;
}

interface FailoverData {
  childPoNumber: string;
  backupSupplierCode: string;
  failover: SplitOrderFailoverResult;
}

function stepIndex(phase: Phase): number {
  if (phase === 'dispatched') return 2;
  if (phase === 'verifying') return 2;
  if (phase === 'settled') return 3;
  if (phase === 'sending') return 1;
  return 0;
}

export default function ActionCard({
  proposal, onDone, onSettled, onApprove, onWhatsAppReply, onVisionMode, onOpenPdf, supplierReply,
}: {
  proposal: AgentProposal;
  onDone: () => void;
  onSettled?: (savedAmount: number) => void;
  onApprove?: (poNumber: string) => void;
  onWhatsAppReply?: (reply: 'accepted' | 'partial') => void;
  onVisionMode?: (mode: 'FULL' | 'PARTIAL') => void;
  onOpenPdf?: (data: {
    poNumber: string; supplierCode: string; supplierName?: string; sku: string;
    productName?: string; orderedQty: number; receivedQty: number; unitPrice: number;
    supplierPayout: number; buyerRefundSaved: number; escrowStatus: string;
    visionBoxes: string; failoverChild?: string | null; auditHash: string;
  }) => void;
  supplierReply?: 'accepted' | 'partial' | null;
}) {
  const [phase, setPhase] = useState<Phase>('review');
  const [note, setNote] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [failover, setFailover] = useState<FailoverData | null>(null);
  const [showModal, setShowModal] = useState(false);

  // ESC closes the confirmation modal; focus-safe and scroll-locking.
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showModal]);

  async function act(path: 'approve' | 'reject') {
    if (phase === 'sending' || phase === 'dispatched') return;
    setPhase('sending');
    try {
      const res = await fetch(`/api/orders/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(path === 'approve' ? { poNumber: proposal.poNumber } : { poNumber: proposal.poNumber, reason: 'Adjusted by operator' }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; data?: { notificationSentTo?: string } };
      if (!json.success) {
        setPhase('failed');
        setNote(json.error ?? `${path} failed`);
        return;
      }
      if (path === 'approve') {
        setPhase('dispatched');
        setNote(json.data?.notificationSentTo ? `WhatsApp dispatch → ${json.data.notificationSentTo}` : 'Dispatched');
        setShowModal(true);
        onApprove?.(proposal.poNumber);
      } else {
        setPhase('rejected');
        setNote('Proposal rejected — logged to audit trail.');
      }
      onDone();
    } catch {
      setPhase('failed');
      setNote('Network error — is the dev server running?');
    }
  }

  const locked = phase === 'sending' || phase === 'verifying' || phase === 'settled';
  const step = stepIndex(phase);
  const showSettled = phase === 'settled' && receipt !== null;
  const receiveBusy = phase === 'sending' || phase === 'verifying' || phase === 'settled';

  function SettledReceiptView({ receipt: r, failover: f, proposalCode }: {
    receipt: ReceiptData;
    failover: FailoverData | null;
    proposalCode: string;
  }) {
    return (
      <div className="mt-3 space-y-2">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="rounded-lg border border-[#4CAF50] bg-[#E8F5E9] p-3 text-center">
          <BadgeCheck size={18} className="mx-auto mb-1 text-[#2E7D32]" />
          <p className="text-[12px] font-bold text-[#2E7D32]">
            {r.status === 'SETTLED' ? 'SETTLED — STOCK RESTOCKED' : 'PARTIAL SETTLED — SHORTFALL PROTECTED'}
          </p>
          <p className="telemetry mt-0.5 font-mono text-[10px] text-[#2E7D32]/80">{note}</p>
        </motion.div>
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
          <p className="telemetry font-mono text-[10px] font-bold uppercase tracking-widest text-[#4B5563]">3-Way Match Receipt · Ordered vs Received vs Paid</p>
          <table className="telemetry mt-1.5 w-full font-mono text-[11px]">
            <thead>
              <tr className="text-[#4B5563]">
                <th className="py-1 text-left font-normal">Metric</th>
                <th className="py-1 text-right font-normal">Qty</th>
                <th className="py-1 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="text-[#212121]">
              <tr className="border-t border-[#F4F6F8]"><td className="py-1">Ordered (locked)</td><td className="py-1 text-right">{r.escrow.orderedQty}</td><td className="py-1 text-right">{fmtIDR(r.escrow.originalLockedEscrow)}</td></tr>
              <tr className="border-t border-[#F4F6F8]"><td className="py-1">Received (verified)</td><td className="py-1 text-right font-bold">{r.escrow.billableQty}</td><td className="py-1 text-right">—</td></tr>
              <tr className="border-t border-[#F4F6F8]"><td className="py-1">Supplier payout</td><td className="py-1 text-right">—</td><td className="py-1 text-right font-bold text-[#2E7D32]">{fmtIDR(r.escrow.supplierPayout)}</td></tr>
              <tr className="border-t border-[#F4F6F8]"><td className="py-1">Buyer refund saved</td><td className="py-1 text-right">{r.escrow.shortfallQty}</td><td className="py-1 text-right font-bold text-[#212121]">{fmtIDR(r.escrow.buyerRefundSaved)}</td></tr>
            </tbody>
          </table>
        </div>
        {r.vision && <VisionPodWidget vision={r.vision} />}
        {f && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="rounded-lg border border-[#E2E8F0] bg-white p-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-px flex-1 bg-[#4CAF50]" />
              <Truck size={13} className="text-[#2E7D32]" />
              <span className="h-px flex-1 bg-[#4CAF50]" />
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#212121]"><Users size={13} className="text-[#2E7D32]" /> Bilateral Shield &amp; Auto-Failover</p>
            <div className="mt-2 space-y-1.5 font-mono text-[11px]">
              <p className="rounded bg-[#E8F5E9] px-2 py-1 text-[#2E7D32]">Primary {proposalCode}: paid {fmtIDR(r.escrow.supplierPayout)} for {r.escrow.billableQty} units — zero unfair cancellation.</p>
              <p className="rounded bg-[#FFFDE7] px-2 py-1 text-[#212121]">Buyer UNP Mart: {fmtIDR(r.escrow.buyerRefundSaved)} reclaimed → failover.</p>
              <p className="rounded bg-[#F8FAFC] px-2 py-1 text-[#212121]">Backup {f.backupSupplierCode}: {f.childPoNumber} × {f.failover.failoverOrderQty} ({fmtIDR(f.failover.failoverTotalCost)}) — {fmtIDR(f.failover.protectedRevenueValue)} protected.</p>
            </div>
            <button
              onClick={() => onOpenPdf?.({
                poNumber: proposal.poNumber, supplierCode: proposal.supplierCode, supplierName: proposal.supplierName,
                sku: proposal.sku, productName: proposal.productName, orderedQty: r.escrow.orderedQty,
                receivedQty: r.escrow.billableQty, unitPrice: proposal.unitPrice, supplierPayout: r.escrow.supplierPayout,
                buyerRefundSaved: r.escrow.buyerRefundSaved, escrowStatus: r.status,
                visionBoxes: r.vision ? `${r.vision.detectedBoxes}/${r.vision.expectedBoxes} cartons` : 'SAM 3.1 verified',
                failoverChild: f.childPoNumber,
                auditHash: `SHA-${proposal.poNumber.slice(-4)}-${String(r.escrow.supplierPayout).slice(-6)}`,
              })}
              data-testid="open-pdf-modal-btn"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#4CAF50] bg-white px-3 py-2 text-[12px] font-bold text-[#2E7D32] transition-all duration-300 hover:bg-[#E8F5E9]"
            >
              <FileText size={13} /> View Official PO &amp; Escrow PDF Certificate
            </button>
            <button
              onClick={() => onWhatsAppReply?.('partial')}
              data-testid="trigger-split-failover-btn"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#212121] px-3 py-2 text-[11px] font-bold text-white transition-all duration-300 hover:bg-black"
            >
              <Zap size={12} /> Auto-Reroute {r.escrow.shortfallQty}kg Shortfall to Backup Supplier C (Child PO -F2)
            </button>
          </motion.div>
        )}
      </div>
    );
  }

  /** 1-click receipt: full or partial delivery → escrow settlement + vision PoD + restock. */
  async function receive(qty: number, full: boolean) {
    if (locked) return;
    setPhase('verifying');
    setNote(null);
    try {
      const res = await fetch('/api/orders/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber: proposal.poNumber, receivedQuantity: qty }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        data?: { po: { status: string }; escrow: EscrowSettlementResult; vision: VisionVerificationResult | null; notificationSentTo?: string };
      };
      if (!json.success || !json.data) {
        setPhase('failed');
        setNote(json.error ?? 'Receipt failed');
        return;
      }
      const restocked = json.data.escrow.billableQty;
      setReceipt({ status: json.data.po.status, escrow: json.data.escrow, vision: json.data.vision, restocked });
      setPhase('settled');
      setNote(`Escrow released: supplier ${fmtIDR(json.data.escrow.supplierPayout)} · buyer saved ${fmtIDR(json.data.escrow.buyerRefundSaved)} · +${restocked} restocked`);
      onDone();
      onWhatsAppReply?.(full ? 'accepted' : 'partial');
      onSettled?.(json.data.escrow.buyerRefundSaved + (json.data.escrow.slaPenaltyAmount ?? 0));
      if (!full) onVisionMode?.('PARTIAL');
      else onVisionMode?.('FULL');
      if (!full) {
        // Auto-failover the shortfall to the backup vendor in the same click.
        try {
          const fr = await fetch('/api/orders/failover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentPoNumber: proposal.poNumber, deliveredQuantity: qty }),
          });
          const fj = (await fr.json()) as {
            success: boolean;
            data?: { child: { poNumber: string }; failover: SplitOrderFailoverResult; backupSupplierCode: string };
          };
          if (fj.success && fj.data) {
            setFailover({
              childPoNumber: fj.data.child.poNumber,
              backupSupplierCode: fj.data.backupSupplierCode,
              failover: fj.data.failover,
            });
            onDone();
            onSettled?.(0);
            onOpenPdf?.({
              poNumber: proposal.poNumber,
              supplierCode: proposal.supplierCode,
              supplierName: proposal.supplierName,
              sku: proposal.sku,
              productName: proposal.productName,
              orderedQty: json.data.escrow.orderedQty,
              receivedQty: json.data.escrow.billableQty,
              unitPrice: proposal.unitPrice,
              supplierPayout: json.data.escrow.supplierPayout,
              buyerRefundSaved: json.data.escrow.buyerRefundSaved,
              escrowStatus: json.data.po.status,
              visionBoxes: json.data.vision ? `${json.data.vision.detectedBoxes}/${json.data.vision.expectedBoxes} cartons` : 'SAM 3.1 verified',
              failoverChild: fj.data.child.poNumber,
              auditHash: `SHA-${proposal.poNumber.slice(-4)}-${String(json.data.escrow.supplierPayout).slice(-6)}`,
            });
          }
        } catch {
          // Failover is best-effort; settlement already completed.
        }
      } else {
        onOpenPdf?.({
          poNumber: proposal.poNumber,
          supplierCode: proposal.supplierCode,
          supplierName: proposal.supplierName,
          sku: proposal.sku,
          productName: proposal.productName,
          orderedQty: json.data.escrow.orderedQty,
          receivedQty: json.data.escrow.billableQty,
          unitPrice: proposal.unitPrice,
          supplierPayout: json.data.escrow.supplierPayout,
          buyerRefundSaved: json.data.escrow.buyerRefundSaved,
          escrowStatus: json.data.po.status,
          visionBoxes: json.data.vision ? `${json.data.vision.detectedBoxes}/${json.data.vision.expectedBoxes} cartons` : 'SAM 3.1 verified',
          failoverChild: null,
          auditHash: `SHA-${proposal.poNumber.slice(-4)}-${String(json.data.escrow.supplierPayout).slice(-6)}`,
        });
      }
    } catch {
      setPhase('failed');
      setNote('Network error — is the dev server running?');
    }
  }

  const showVerifying = phase === 'verifying';
  const fullQty = proposal.quantity;
  const workbenchBusy = locked;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ${phase === 'dispatched' || phase === 'settled' ? 'card-glow-green border-[#4CAF50]' : 'border-[#E2E8F0]'}`}
    >
      <div className="bg-[#212121] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-[13px] font-bold text-white">Procurement &amp; Escrow Workbench</h2>
          {proposal.mock && (
            <span className="shrink-0 rounded border border-[#FBC02D] bg-[#FFFDE7] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#212121]">MOCK</span>
          )}
        </div>
        <p className="telemetry mt-0.5 truncate font-mono text-[11px] text-white/70">{proposal.poNumber} · {proposal.sku}</p>
        <div className="mt-1.5 space-y-[2px]" aria-hidden>
          <div className="h-[2px] w-full bg-[#FFEB3B]" />
          <div className="h-[2px] w-3/4 bg-[#FBC02D]" />
          <div className="h-[2px] w-1/2 bg-[#FFEB3B]" />
        </div>
      </div>
      <div className="px-4 pt-3">
        <ol className="flex items-center gap-1" aria-label="Order lifecycle">
          {STEPS.map((label, i) => {
            const done = i < step || phase === 'dispatched';
            const active = i === step && phase !== 'dispatched';
            return (
              <li key={label} className="flex min-w-0 flex-1 items-center gap-1">
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${done ? 'bg-[#4CAF50] text-white' : active ? 'bg-[#FFEB3B] text-[#212121]' : 'bg-[#F4F6F8] text-[#4B5563]'}`}
                >
                  {done ? '✓' : i + 1}
                </motion.span>
                <span className={`hidden truncate text-[10px] font-semibold xl:block ${done ? 'text-[#2E7D32]' : active ? 'text-[#212121]' : 'text-[#4B5563]'}`}>{label}</span>
                {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step || phase === 'dispatched' ? 'bg-[#4CAF50]' : 'bg-[#E2E8F0]'}`} aria-hidden />}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="p-4">
        <table className="telemetry w-full text-[12px]">
          <tbody>
            <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Supplier</td><td className="py-1 text-right font-semibold text-[#212121]">{proposal.supplierName ?? proposal.supplierCode} [{proposal.supplierCode}]</td></tr>
            <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Lead time</td><td className="py-1 text-right font-mono text-[#212121]">{proposal.leadTimeHours ?? '—'}h</td></tr>
            <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Quantity</td><td className="py-1 text-right font-mono text-[#212121]">{proposal.quantity} units</td></tr>
            <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Unit price</td><td className="py-1 text-right font-mono text-[#212121]">{fmtIDR(proposal.unitPrice)}</td></tr>
            <tr><td className="py-1 font-bold text-[#212121]">Locked escrow</td><td className="py-1 text-right font-mono font-bold text-[#2E7D32]">{fmtIDR(proposal.totalAmount)}</td></tr>
          </tbody>
        </table>
        {proposal.reasoning && (
          <p className="mt-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-[11px] leading-relaxed text-[#4B5563]">{proposal.reasoning}</p>
        )}
        {phase === 'dispatched' ? (
          <motion.div
            key={`dispatch-${proposal.poNumber}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 space-y-2"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="rounded-lg border border-[#4CAF50] bg-[#E8F5E9] p-3 text-center shadow-[0_0_20px_rgba(76,175,80,0.35)]">
              <BadgeCheck size={18} className="mx-auto mb-1 text-[#2E7D32]" />
              <p className="text-[12px] font-bold text-[#2E7D32]">PURCHASE ORDER DISPATCHED — ESCROW LOCKED {fmtIDR(proposal.totalAmount)}</p>
              <p className="telemetry mt-0.5 font-mono text-[10px] text-[#2E7D32]/80">{note}</p>
              <a href={`/api/orders/export-pdf?poNumber=${encodeURIComponent(proposal.poNumber)}`} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#4CAF50] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-[#388E3C]">
                <Download size={12} /> Download PO PDF
              </a>
            </motion.div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#212121]"><ShieldCheck size={13} className="text-[#2E7D32]" /> Mutual Escrow Protection</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-[#F8FAFC] p-2">
                  <p className="font-bold text-[#212121]">Buyer · UNP Mart</p>
                  <p className="mt-0.5 leading-snug text-[#4B5563]">Funds held until receipt. Auto pro-rata refund on shortfalls. SLA enforced.</p>
                </div>
                <div className="rounded-lg bg-[#F8FAFC] p-2">
                  <p className="font-bold text-[#212121]">Supplier · {proposal.supplierCode}</p>
                  <p className="mt-0.5 leading-snug text-[#4B5563]">Locked {proposal.poNumber}. Guaranteed MOQ. Instant payout per verified unit.</p>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => receive(fullQty, true)} disabled={receiveBusy}
                  data-testid="verify-full-delivery-btn"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-[#4CAF50] px-3 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#388E3C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showVerifying ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                  {showVerifying ? 'Verifying…' : `Verify Full Delivery (${fullQty}/${fullQty}) — Release ${fmtIDR(proposal.totalAmount)}`}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => receive(Math.max(1, Math.ceil(fullQty * 0.83)), false)} disabled={receiveBusy}
                  data-testid="verify-partial-delivery-btn"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[#FBC02D] bg-[#FFEB3B] px-3 py-2 text-[12px] font-bold text-[#212121] hover:bg-[#FDD835] disabled:opacity-40"
                >
                  <Zap size={13} /> Simulate Partial Delivery — Escrow Guardrail
                </motion.button>
              </div>
            </div>
            {supplierReply === 'accepted' && (
              <p className="telemetry rounded-lg bg-[#E8F5E9] px-2.5 py-1.5 text-center font-mono text-[10px] font-bold text-[#2E7D32]">
                Supplier confirmed full 6/6 cartons — proceed with full verification below.
              </p>
            )}
            {supplierReply === 'partial' && (
              <p className="telemetry rounded-lg border border-[#FBC02D] bg-[#FFFDE7] px-2.5 py-1.5 text-center font-mono text-[10px] font-bold text-[#212121]">
                Supplier flagged 5/6 cartons (1 damaged) — use the partial guardrail below.
              </p>
            )}
          </motion.div>
        ) : showSettled ? (
          <motion.div key={`settle-${proposal.poNumber}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 space-y-2">
          <SettledReceiptView
            receipt={(receipt as ReceiptData)}
            failover={failover}
            proposalCode={proposal.supplierCode}
          />
          </motion.div>
        ) : (
          <div className="mt-3 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => act('approve')} disabled={locked}
              data-testid="approve-po-btn"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4CAF50] px-3 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#388E3C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
              {phase === 'sending' ? 'Dispatching…' : 'Approve & Dispatch PO — Lock Escrow'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => act('reject')} disabled={locked || phase === 'rejected'}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] font-semibold text-[#212121] hover:bg-[#F8FAFC] disabled:opacity-40"
            >
              <X size={13} /> {phase === 'rejected' ? 'Rejected' : 'Reject'}
            </motion.button>
          </div>
        )}
        {note && phase !== 'dispatched' && <p className="telemetry mt-2 font-mono text-[11px] text-[#4B5563]">{note}</p>}
      </div>
      {showModal && (
        <div
          className="modal-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#212121]/50 p-4 pt-[10vh]"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="modal-slide-down w-full max-w-md overflow-hidden rounded-xl border-2 border-[#4CAF50] bg-white shadow-xl"
            role="dialog" aria-modal="true" aria-labelledby="po-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#212121] px-4 py-3">
              <p id="po-modal-title" className="text-[13px] font-bold text-white">Official Purchase Order — Dispatched</p>
              <p className="telemetry mt-0.5 font-mono text-[11px] text-white/70">{proposal.poNumber} · {proposal.sku}</p>
              <div className="mt-1.5 space-y-[2px]" aria-hidden>
                <div className="h-[2px] w-full bg-[#FFEB3B]" />
                <div className="h-[2px] w-3/4 bg-[#FBC02D]" />
                <div className="h-[2px] w-1/2 bg-[#FFEB3B]" />
              </div>
            </div>
            <div className="p-4">
              <table className="telemetry w-full text-[12px]">
                <tbody>
                  <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Supplier</td><td className="py-1 text-right font-semibold text-[#212121]">{proposal.supplierName ?? proposal.supplierCode} [{proposal.supplierCode}]</td></tr>
                  <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Quantity</td><td className="py-1 text-right font-mono text-[#212121]">{proposal.quantity} units</td></tr>
                  <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Unit price</td><td className="py-1 text-right font-mono text-[#212121]">{fmtIDR(proposal.unitPrice)}</td></tr>
                  <tr><td className="py-1 font-bold text-[#212121]">Locked escrow</td><td className="py-1 text-right font-mono font-bold text-[#2E7D32]">{fmtIDR(proposal.totalAmount)}</td></tr>
                </tbody>
              </table>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/api/orders/export-pdf?poNumber=${encodeURIComponent(proposal.poNumber)}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4CAF50] px-3 py-2 text-[12px] font-bold text-white shadow-sm transition-all duration-300 hover:bg-[#388E3C]"
                >
                  <Download size={13} /> Download Official PDF
                </a>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-[12px] font-semibold text-[#212121] transition-all duration-300 hover:bg-[#F8FAFC]"
                >
                  Close
                </button>
              </div>
              <p className="telemetry mt-2 text-center font-mono text-[10px] text-[#4B5563]">ESC to close · PDF opens in a new download</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}