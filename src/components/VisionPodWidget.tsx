'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { VisionVerificationResult } from '@/types/index';

function BoxOverlay({ box, index }: { box: VisionVerificationResult['boxes'][number]; index: number }) {
  const [x, y, w, h] = box.bbox;
  const missing = box.status === 'MISSING';
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.12 + index * 0.08, type: 'spring', stiffness: 400, damping: 30 }}
      style={{ transformOrigin: `${(x + w / 2) * 100}% ${(y + h / 2) * 100}%` }}
    >
      <rect
        x={`${x * 100}%`} y={`${y * 100}%`} width={`${w * 100}%`} height={`${h * 100}%`}
        fill="none"
        stroke={missing ? '#DC2626' : '#4CAF50'}
        strokeWidth={missing ? 1.5 : 1.25}
        strokeDasharray={missing ? '5 3' : undefined}
        rx="2"
      />
      {[0, 1, 2, 3].map((i) => {
        const corners: Array<[number, number]> = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
        const [cx, cy] = corners[i];
        return (
          <g key={i}>
            <line x1={`${cx * 100}%`} y1={`${cy * 100}%`} x2={`${(cx + (cx < 0.5 ? 0.035 : -0.035)) * 100}%`} y2={`${cy * 100}%`} stroke={missing ? '#DC2626' : '#4CAF50'} strokeWidth={2.5} />
            <line x1={`${cx * 100}%`} y1={`${cy * 100}%`} x2={`${cx * 100}%`} y2={`${(cy + (cy < 0.5 ? 0.06 : -0.06)) * 100}%`} stroke={missing ? '#DC2626' : '#4CAF50'} strokeWidth={2.5} />
          </g>
        );
      })}
      {missing && (
        <g>
          <line x1={`${(x + w * 0.2) * 100}%`} y1={`${y * 100}%`} x2={`${(x + w * 0.8) * 100}%`} y2={`${(y + h) * 100}%`} stroke="#DC2626" strokeWidth={2} />
          <line x1={`${(x + w * 0.8) * 100}%`} y1={`${y * 100}%`} x2={`${(x + w * 0.2) * 100}%`} y2={`${(y + h) * 100}%`} stroke="#DC2626" strokeWidth={2} />
        </g>
      )}
      {missing ? (
        <foreignObject x={`${x * 100}%`} y={`${(y + h + 0.01) * 100}%`} width={`${w * 100}%`} height="9%">
          <div style={{ background: '#FFEB3B', border: '1px solid #DC2626', borderRadius: 2, color: '#212121', fontFamily: 'monospace', fontSize: 7, fontWeight: 800, textAlign: 'center' }}>
            MISSING / CRUSHED −5 kg
          </div>
        </foreignObject>
      ) : (
        <text x={`${Math.min(x * 100, 62)}%`} y={`${Math.max(y * 100 - 2, 4)}%`} fill="#2E7D32" fontSize={9} fontFamily="monospace" fontWeight={700}>
          {box.label} · {(box.confidence * 100).toFixed(1)}%
        </text>
      )}
    </motion.g>
  );
}

/** Industrial dock-cam HUD: pallet illustration + sam-3.1 reticle overlays. */
export default function VisionPodWidget({ vision }: { vision: VisionVerificationResult | null }) {
  if (!vision) {
    return (
      <div className="rounded-lg border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
        <p className="font-mono text-[11px] font-bold text-[#4B5563]">SAM-3.1 DOCK CAM — STANDBY</p>
        <p className="mt-1 font-mono text-[10px] text-[#4B5563]/80">Verify a delivery to segment cartons.</p>
      </div>
    );
  }
  const pct = Math.round(vision.avgConfidence * 1000) / 10;
  const damaged = vision.boxes.filter((b) => b.status === 'MISSING').length;
  return (
    <div data-testid="sam-vision-dock" className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-[#212121] px-3 py-1.5 font-mono text-[10px] text-white">
        <span className="font-bold">META SAM-3.1 VISION ENGINE</span>
        <span className="text-white/50">|</span>
        <span className="text-white/80">PROMPT: &quot;{vision.prompt}&quot;</span>
        <span className="text-white/50">|</span>
        <span className="font-bold text-[#4CAF50]">BOXES {vision.detectedBoxes}/{vision.expectedBoxes} ({vision.verifiedKg} kg)</span>
        {damaged > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-[#FFEB3B] px-1 py-px font-bold text-[#212121]">
            <AlertTriangle size={10} /> {damaged} DAMAGED/MISSING
          </span>
        )}
        <span className="text-white/50">|</span>
        <span className="text-[#FFEB3B]">CONF {pct}%</span>
        {vision.fallbackActive && (
          <span className="rounded border border-[#FBC02D] bg-[#FFFDE7] px-1 py-px font-bold text-[#212121]">MOCK FIXTURE</span>
        )}
      </div>
      <div className="relative">
        <svg viewBox="0 0 100 46" className="block h-36 w-full bg-[#F4F6F8]" role="img" aria-label={`Dock camera: ${vision.detectedBoxes} of ${vision.expectedBoxes} cartons verified`}>
          <rect x="0" y="36" width="100" height="10" fill="#E2E8F0" />
          {[10, 30, 50, 70, 90].map((x) => (
            <line key={x} x1={x} y1="36" x2={x - 3} y2="46" stroke="#CBD5E1" strokeWidth="0.6" />
          ))}
          <rect x="4" y="38.5" width="92" height="2.4" rx="0.6" fill="#94A3B8" />
          {[14, 32, 50, 68, 86].map((x, palletIdx) => {
            const damagedPallet = damaged > 0 && palletIdx === 5;
            return (
              <g key={x} opacity={damagedPallet ? 0.45 : 0.85}>
                <rect x={x} y={30} width={4.6} height={8.5} rx="0.4" fill={damagedPallet ? '#94A3B8' : '#C9A227'} />
                <rect x={x} y={30} width={4.6} height={2} rx="0.4" fill={damagedPallet ? '#64748B' : '#A8841C'} opacity="0.6" />
                {damagedPallet && (
                  <g stroke="#DC2626" strokeWidth="0.7">
                    <line x1={x} y1={30} x2={x + 4.6} y2={38.5} />
                    <line x1={x + 4.6} y1={30} x2={x} y2={38.5} />
                  </g>
                )}
              </g>
            );
          })}
          <rect x="2.5" y="8" width="16" height="7" rx="1" fill="none" stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="1.5 1" />
          <text x="4" y="12.5" fontSize="3" fontFamily="monospace" fill="#64748B">DOCK-CAM 01</text>
          <circle cx="93" cy="11" r="1.6" fill="#DC2626" />
          <text x="88" y="15.5" fontSize="2.6" fontFamily="monospace" fill="#64748B">REC</text>
          <text x="52" y="11" fontSize="3" fontFamily="monospace" fill="#64748B">PALLET-A · ARABICA 5kg</text>
        </svg>
        <svg viewBox="0 0 100 46" className="absolute inset-0 h-36 w-full" aria-hidden>
          {vision.boxes.map((b, i) => (
            <BoxOverlay key={b.id} box={b} index={i} />
          ))}
        </svg>
      </div>
      <div className="telemetry grid grid-cols-4 divide-x divide-[#E2E8F0] border-t border-[#E2E8F0] font-mono text-center">
        {[
          [`${vision.detectedBoxes}/${vision.expectedBoxes}`, 'BOXES'],
          [`${vision.verifiedKg} kg`, 'VERIFIED'],
          [`${pct}%`, 'CONF'],
          [`${vision.latencyMs}ms`, 'LATENCY'],
        ].map(([v, l]) => (
          <div key={l} className="px-2 py-1.5">
            <p className="text-[13px] font-black text-[#212121]">{v}</p>
            <p className="text-[9px] tracking-widest text-[#4B5563]">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
