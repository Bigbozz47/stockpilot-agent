'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Square } from 'lucide-react';

export interface TermLine {
  id: number;
  time: string;
  kind: 'thought' | 'tool' | 'verify' | 'error' | 'info';
  prefix: string;
  text: string;
}

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

const KIND_PILL: Record<TermLine['kind'], string> = {
  thought: 'bg-[#212121] text-white',
  tool: 'bg-[#334155] text-white',
  verify: 'bg-[#4CAF50] text-white',
  error: 'bg-[#DC2626] text-white',
  info: 'bg-[#F4F6F8] text-[#4B5563]',
};

export interface AgentProposal {
  poNumber: string;
  sku: string;
  supplierCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  supplierName?: string;
  leadTimeHours?: number;
  reasoning?: string;
  productName?: string;
  mock?: boolean;
  [k: string]: unknown;
}

let lineId = 0;
const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function classify(text: string): { kind: TermLine['kind']; prefix: string } {
  if (/^\[OBSERVE\]/i.test(text)) return { kind: 'thought', prefix: 'OBSERVE' };
  if (/^\[REASON\]/i.test(text)) return { kind: 'thought', prefix: 'REASON' };
  if (/^\[(PLAN|ACT)\]/i.test(text)) return { kind: 'tool', prefix: 'TOOL' };
  if (/^\[VERIFY\]|MOCK|FALLBACK/i.test(text)) return { kind: 'verify', prefix: 'VERIFY' };
  return { kind: 'thought', prefix: 'TRACE' };
}

/** Consumes the SSE agent stream; batches DOM appends via rAF to avoid frame drops. */
export function useAgentStream() {
  const [lines, setLines] = useState<TermLine[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const queueRef = useRef<TermLine[]>([]);
  const rafRef = useRef(0);

  const flush = () => {
    rafRef.current = 0;
    if (!queueRef.current.length) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    setLines((prev) => [...prev.slice(-300), ...batch]);
  };
  const push = (kind: TermLine['kind'], prefix: string, text: string) => {
    queueRef.current.push({ id: ++lineId, time: now(), kind, prefix, text: text.slice(0, 400) });
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
  };

  const stop = () => {
    esRef.current?.close();
    esRef.current = null;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  const start = (sku: string, simulatedDay = 'Friday') => {
    stop();
    setProposal(null);
    setStatus('connecting');
    push('info', 'TRACE', `Opening reasoning stream for ${sku}...`);
    const es = new EventSource(`/api/agent/stream?sku=${encodeURIComponent(sku)}&simulatedDay=${encodeURIComponent(simulatedDay)}`);
    esRef.current = es;

    es.addEventListener('thought', (e) => {
      setStatus('streaming');
      const { text } = JSON.parse((e as MessageEvent).data) as { text: string };
      const { kind, prefix } = classify(text);
      push(kind, prefix, text.replace(/^\[[^\]]+\]\s*/, ''));
    });
    es.addEventListener('tool_call', (e) => {
      setStatus('streaming');
      const { tool, args } = JSON.parse((e as MessageEvent).data) as { tool: string; args: unknown };
      push('tool', 'TOOL', `${tool} ${JSON.stringify(args).slice(0, 160)}`);
    });
    es.addEventListener('proposal_ready', (e) => {
      const p = JSON.parse((e as MessageEvent).data) as AgentProposal;
      push('verify', 'VERIFY', `Draft ${p.poNumber} ready — awaiting approval.`);
      setProposal(p);
      setStatus('done');
      stop();
    });
    es.addEventListener('error', (e) => {
      const raw = (e as MessageEvent).data;
      if (raw) {
        try {
          push('error', 'ERROR', (JSON.parse(raw) as { error: string }).error);
        } catch {
          push('error', 'ERROR', 'Stream interrupted.');
        }
        setStatus('error');
        stop();
      }
    });
    es.onerror = () => setStatus((s) => (s === 'connecting' ? 'error' : s));
  };

  useEffect(() => stop, []);
  return { lines, status, proposal, start, stop, clearProposal: () => setProposal(null) };
}

export default function AgentTerminal({
  lines, status, onStop,
}: {
  lines: TermLine[];
  status: StreamStatus;
  onStop: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="bg-[#212121] px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold tracking-wide text-white">
            LIVE AGENT TELEMETRY TRACE (SSE)
          </span>
          <div className="flex items-center gap-2">
            <span className="telemetry font-mono text-[10px] uppercase tracking-wider text-white/70">{status}</span>
            {(status === 'streaming' || status === 'connecting') && (
              <button onClick={onStop} className="rounded border border-white/30 p-1 text-white/80 hover:text-white" aria-label="Stop stream">
                <Square size={10} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1.5 space-y-[2px]" aria-hidden>
          <div className="h-[2px] w-20 bg-[#FFEB3B]" />
          <div className="h-[2px] w-14 bg-[#FBC02D]" />
          <div className="h-[2px] w-8 bg-[#FFEB3B]" />
        </div>
      </div>
      <div ref={boxRef} className="slim-scroll telemetry h-64 space-y-1.5 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed">
        {lines.length === 0 && (
          <p className="text-[#4B5563]">Idle — trigger a POS rush to open the reasoning trace.</p>
        )}
        {lines.map((l) => (
          <div key={l.id} className="flex items-start gap-2 border-b border-[#F4F6F8] pb-1.5">
            <span className="shrink-0 text-[#4B5563]">{l.time}</span>
            <span className={`shrink-0 rounded px-1.5 py-px text-[10px] font-bold ${KIND_PILL[l.kind]}`}>{l.prefix}</span>
            <span className="break-words text-[#212121]">{l.text}</span>
          </div>
        ))}
        {(status === 'streaming' || status === 'connecting') && (
          <span className="stream-caret inline-block h-3.5 w-2 bg-[#4CAF50]" aria-hidden />
        )}
      </div>
    </div>
  );
}
