'use client';

import { motion } from 'framer-motion';
import { FileCheck2, Printer, X } from 'lucide-react';

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;

export interface PdfCertificateData {
  poNumber: string;
  supplierCode: string;
  supplierName?: string;
  sku: string;
  productName?: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  supplierPayout: number;
  buyerRefundSaved: number;
  escrowStatus: string;
  visionBoxes: string;
  failoverChild?: string | null;
  auditHash: string;
}

const fmtIDR = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/** On-screen Official PO & 3-Way Match Escrow Certificate (printable, no hidden downloads). */
export default function PdfPreviewModal({
  data, onClose,
}: {
  data: PdfCertificateData;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="pdf-preview-modal"
      className="modal-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#212121]/60 p-4 pt-[6vh]"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="modal-slide-down w-full max-w-2xl overflow-hidden rounded-xl border-2 border-[#4CAF50] bg-white shadow-2xl"
        role="dialog" aria-modal="true" aria-labelledby="pdf-cert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#212121] px-5 py-3">
          <p id="pdf-cert-title" className="text-[14px] font-bold text-white">UNP MART — Official Purchase Order &amp; Escrow Audit Certificate</p>
          <p className="telemetry mt-0.5 font-mono text-[11px] text-white/70">{data.poNumber} · {data.supplierCode} · {data.sku}</p>
          <div className="mt-1.5 space-y-[2px]" aria-hidden>
            <div className="h-[2px] w-full bg-[#FFEB3B]" />
            <div className="h-[2px] w-3/4 bg-[#FBC02D]" />
            <div className="h-[2px] w-1/2 bg-[#FFEB3B]" />
          </div>
        </div>
        <div className="telemetry max-h-[55vh] overflow-y-auto p-5 text-[12px] text-[#212121]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-black tracking-tight">UNP <span className="text-[#FBC02D]">MART</span></p>
            <p className="font-mono text-[10px] text-[#4B5563]">Flagship Store · Jakarta · {new Date().toLocaleDateString('en-GB')}</p>
          </div>
          <table className="mt-3 w-full">
            <tbody>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Supplier</td><td className="py-1 text-right font-semibold">{data.supplierName} [{data.supplierCode}]</td></tr>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Product</td><td className="py-1 text-right">{data.productName} [{data.sku}]</td></tr>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Ordered (locked)</td><td className="py-1 text-right font-mono">{data.orderedQty} units × {fmtIDR(data.unitPrice)}</td></tr>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">SAM 3.1 verified receipt</td><td className="py-1 text-right font-mono font-bold">{data.receivedQty} units · {data.visionBoxes}</td></tr>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Supplier payout (fair)</td><td className="py-1 text-right font-mono font-bold text-[#2E7D32]">{fmtIDR(data.supplierPayout)}</td></tr>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Buyer refund saved</td><td className="py-1 text-right font-mono font-bold">{fmtIDR(data.buyerRefundSaved)}</td></tr>
              <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Escrow status</td><td className="py-1 text-right font-mono font-bold">{data.escrowStatus}</td></tr>
              {data.failoverChild && (
                <tr className="border-b border-[#F4F6F8]"><td className="py-1 text-[#4B5563]">Split-order failover</td><td className="py-1 text-right font-mono font-bold">{data.failoverChild}</td></tr>
              )}
              <tr><td className="py-1 text-[#4B5563]">Audit hash (SHA)</td><td className="py-1 text-right font-mono text-[10px]">{data.auditHash}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#E8F5E9] px-2.5 py-2 text-[11px] font-bold text-[#2E7D32]">
            <FileCheck2 size={13} /> Deterministic math · 0% LLM hallucination · Human-approved dispatch
          </p>
        </div>
        <div className="flex gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <a
            href={`/api/orders/export-pdf?poNumber=${encodeURIComponent(data.poNumber)}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4CAF50] px-3 py-2 text-[12px] font-bold text-white shadow-sm transition-all duration-300 hover:bg-[#388E3C]"
          >
            <Printer size={13} /> Download PDF File
          </a>
          <button
            onClick={onClose}
            data-testid="close-pdf-modal-btn"
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-[12px] font-semibold text-[#212121] transition-all duration-300 hover:bg-[#F4F6F8]"
          >
            <X size={13} /> Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
