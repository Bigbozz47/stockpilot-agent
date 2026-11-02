'use client';

import { useEffect, useState } from 'react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Client-only clock: null on first paint, so SSR and hydration render identically. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** UNP Mart brand cart: charcoal frame + wheels, green leaf panels, yellow sun wedge. */
function UnpMartMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-label="UNP Mart logo" role="img">
      <rect x="2" y="2" width="36" height="36" rx="6" fill="#FFFFFF" stroke="#E2E8F0" />
      <path d="M32 7 L27.5 11.5 L32.5 12.5 L33 7.5 Z" fill="#FFEB3B" />
      <g stroke="#212121" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M9 12 H27 L24.5 25 H11.5 Z" />
        <circle cx="14" cy="29.5" r="2.2" fill="#212121" stroke="none" />
        <circle cx="23" cy="29.5" r="2.2" fill="#212121" stroke="none" />
      </g>
      <path d="M12 14.5 C14 19, 17 22, 21 23.5 C18 20, 15.5 17, 12 14.5 Z" fill="#4CAF50" />
      <path d="M17 14.5 C19 18.5, 22 21, 24.5 22.5 C22 19.5, 19.5 16.5, 17 14.5 Z" fill="#2E7D32" />
    </svg>
  );
}

export default function Navbar({ mockMode }: { mockMode: boolean }) {
  const now = useNow();
  const day = now ? DAYS[now.getDay()] : '...';
  const weekend = day === 'Friday' || day === 'Saturday' || day === 'Sunday';
  const time = now ? now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  return (
    <header className="border-b border-[#E2E8F0] bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <UnpMartMark />
          <div>
            <div className="flex items-baseline gap-1 text-xl font-black tracking-tight">
              <span className="text-[#FBC02D]">UNP</span>
              <span className="text-[#212121]">MART</span>
            </div>
            <div className="mt-0.5 space-y-[2px]" aria-hidden>
              <div className="h-[2px] w-24 bg-[#FBC02D]" />
              <div className="h-[2px] w-24 bg-[#FFEB3B]" />
              <div className="h-[2px] w-24 bg-[#FBC02D]" />
            </div>
            <p className="telemetry mt-1 font-mono text-[10px] tracking-wide text-[#4B5563]" suppressHydrationWarning>
              StockPilot Telemetry &amp; Procurement Monitor
            </p>
          </div>
          <div className="mx-1 hidden h-10 w-px bg-[#E2E8F0] sm:block" aria-hidden />
          <p className="telemetry hidden font-mono text-[11px] text-[#4B5563] sm:block" suppressHydrationWarning>
            UNP Mart Flagship · {day} {time} WIB · {weekend ? 'Weekend Surge Window' : 'Steady Demand Window'}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="telemetry rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 font-mono text-[10px] font-semibold text-[#212121]">
            muse-spark-1.3 · sam-3.1 · muse-voice-transcribe-1.0
          </span>
          <span
            className={
              mockMode
                ? 'rounded-md border border-[#FBC02D] bg-[#FFFDE7] px-2.5 py-1 font-mono text-[10px] font-bold text-[#212121]'
                : 'rounded-md border border-[#4CAF50] bg-[#E8F5E9] px-2.5 py-1 font-mono text-[10px] font-bold text-[#2E7D32]'
            }
          >
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${mockMode ? 'bg-[#FBC02D]' : 'breach-pulse bg-[#4CAF50]'}`} aria-hidden />
            {mockMode ? 'OFFLINE DETERMINISTIC MOCK' : 'LIVE ENGINE'}
          </span>
        </div>
      </div>
      <div className="h-1 bg-[#FFEB3B]" aria-hidden />
    </header>
  );
}
