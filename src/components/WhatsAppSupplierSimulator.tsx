'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, MessageCircle, Truck } from 'lucide-react';

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;

export type SupplierReply = 'accepted' | 'partial';

interface ChatMsg {
  id: number;
  from: 'mart' | 'supplier';
  text: string;
}

let msgId = 0;
const push = (msgs: ChatMsg[], from: ChatMsg['from'], text: string): ChatMsg[] => [
  ...msgs.slice(-30),
  { id: ++msgId, from, text },
];

/** Two-way WhatsApp Business supplier emulator — judges drive real vendor replies. */
export default function WhatsAppSupplierSimulator({
  poNumber, sku, quantity, total, onReply,
}: {
  poNumber: string;
  sku: string;
  quantity: number;
  total: number;
  onReply: (reply: SupplierReply) => void;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: ++msgId,
      from: 'mart',
      text: `Halo Supplier B [Express Logistics Hub], pesanan baru dari UNP Mart StockPilot: PO ${poNumber} — ${quantity}x ${sku} = Rp${total.toLocaleString('id-ID')}. SLA 6 jam. Mohon konfirmasi!`,
    },
  ]);
  const [status, setStatus] = useState<string>('Message delivered · awaiting supplier');

  function reply(kind: SupplierReply) {
    if (kind === 'accepted') {
      setMsgs((m) =>
        push(
          m,
          'supplier',
          `Siap! Order ${poNumber} ACCEPTED — kurir berangkat sekarang. Full 6/6 karton (${quantity} kg) meluncur, ETA 6 jam. Terima kasih!`,
        ),
      );
      setStatus('IN TRANSIT (6/6 Cartons) — full delivery confirmed');
    } else {
      setMsgs((m) =>
        push(
          m,
          'supplier',
          `Mohon maaf! Gudang cek ulang: hanya 5/6 karton (${Math.max(0, quantity - 5)} kg) yang intact — 1 karton rusak/pecah di rak (-5 kg). Tetap kirim 25 kg sekarang?`,
        ),
      );
      setStatus('SUPPLIER PARTIAL ALERT — 5/6 cartons, 1 damaged');
    }
    onReply(kind);
  }

  return (
    <div data-testid="whatsapp-supplier-emulator" className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="flex items-center gap-2.5 bg-[#075E54] px-3 py-2 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-mono text-[11px] font-bold">SB</span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold">Supplier B — Express Logistics Hub</p>
          <p className="telemetry font-mono text-[10px] text-white/80">+62 812-9000-4411 · Verified Business ✓</p>
        </div>
        <MessageCircle size={15} className="ml-auto shrink-0 text-white/70" />
      </div>
      <div className="space-y-1.5 bg-[#ECE5DD] p-3 font-mono text-[11px] leading-relaxed">
        {msgs.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className={`max-w-[85%] rounded-lg px-2.5 py-1.5 shadow-sm ${
              m.from === 'mart' ? 'ml-auto bg-[#DCF8C6] text-[#212121]' : 'mr-auto bg-white text-[#212121]'
            }`}
          >
            {m.text}
          </motion.div>
        ))}
        <p className="telemetry pt-1 text-center text-[10px] font-bold text-[#4B5563]">{status}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-[#E2E8F0] bg-white p-2.5">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}
          onClick={() => reply('accepted')}
          data-testid="wa-supplier-accept-btn"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-[#4CAF50] px-2 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-[#388E3C]"
        >
          <Truck size={12} /> Supplier Reply: Order Accepted — Truck En Route
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}
          onClick={() => reply('partial')}
          data-testid="wa-supplier-partial-btn"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-[#FBC02D] bg-[#FFEB3B] px-2 py-2 text-[11px] font-bold text-[#212121] hover:bg-[#FDD835]"
        >
          <BadgeCheck size={12} /> Supplier Reply: 5 Cartons Intact, 1 Damaged
        </motion.button>
      </div>
    </div>
  );
}
