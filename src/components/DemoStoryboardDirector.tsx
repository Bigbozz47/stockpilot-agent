'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clapperboard } from 'lucide-react';

export interface StoryAct {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
}

export const STORY_ACTS: StoryAct[] = [
  { id: 'act1', badge: 'ACT 1/5', title: 'UNP Mart Flagship — Live Store Telemetry', subtitle: 'Friday 16:45 WIB — a bulk cafe order at the POS drains Arabica Coffee (COF-001) to 6 kg, breaching the 20 kg safety stock.' },
  { id: 'act2', badge: 'ACT 2/5', title: 'Voice Ops + OODA Reasoning (muse-voice + muse-spark-1.3)', subtitle: 'Hands-free bilingual voice alert triggers the agent; watch OBSERVE → REASON → TOOL → VERIFY stream live.' },
  { id: 'act3', badge: 'ACT 3/5', title: 'Human Governance + WhatsApp Supplier Handshake', subtitle: 'Approve the PO to lock escrow, then drive the real vendor chat — full acceptance or 25/30 kg partial alert.' },
  { id: 'act4', badge: 'ACT 4/5', title: 'SAM 3.1 Dock Vision + Escrow Guardrail + Failover', subtitle: 'sam-3.1 segments cartons: 5/6 green verified, 1 red damaged. $375 pays out, $75 refunds, -F2 child reroutes the deficit.' },
  { id: 'act5', badge: 'ACT 5/5', title: 'Official PDF Certificate + Bulk Finale', subtitle: 'Read the on-screen PO & escrow certificate, then run the weekday bulk-milk scenario to close 10/10 HEALTHY.' },
];

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;

/** 5-act storyboard director + persistent cinematic subtitle bar. */
export default function DemoStoryboardDirector({
  activeAct, onSelect,
}: {
  activeAct: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const act = STORY_ACTS.find((a) => a.id === activeAct) ?? STORY_ACTS[0];
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <Clapperboard size={14} className="text-[#4CAF50]" />
        <span className="text-[13px] font-bold text-[#212121]">3-Minute Hackathon Demo Storyboard</span>
        <span className="ml-auto text-[#4B5563]">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && (
        <motion.ol
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={spring}
          className="grid grid-cols-1 gap-1.5 px-4 pb-3 sm:grid-cols-5"
        >
          {STORY_ACTS.map((a) => {
            const live = a.id === act.id;
            return (
              <li key={a.id}>
                <button
                  onClick={() => onSelect(a.id)}
                  aria-current={live ? 'true' : undefined}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition-all duration-300 ${
                    live ? 'border-[#4CAF50] bg-[#E8F5E9]' : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white'
                  }`}
                >
                  <span className={`inline-block rounded px-1 py-px font-mono text-[9px] font-bold ${live ? 'bg-[#212121] text-[#FFEB3B]' : 'bg-[#E2E8F0] text-[#4B5563]'}`}>
                    {a.badge}
                  </span>
                  <p className={`mt-1 text-[11px] font-bold leading-snug ${live ? 'text-[#2E7D32]' : 'text-[#212121]'}`}>{a.title}</p>
                </button>
              </li>
            );
          })}
        </motion.ol>
      )}
      <div className="border-t border-[#E2E8F0] bg-[#212121] px-4 py-2" role="status" aria-live="polite">
        <p className="telemetry truncate text-center font-mono text-[12px] font-bold text-white">
          <span className="mr-2 rounded bg-[#FFEB3B] px-1.5 py-px text-[10px] text-[#212121]">{act.badge}</span>
          {act.subtitle}
        </p>
      </div>
    </div>
  );
}
