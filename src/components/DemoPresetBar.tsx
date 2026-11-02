'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Eye, EyeOff, Milk, RotateCcw } from 'lucide-react';
import { DEMO_SCENARIOS, type DemoScenario } from '@/lib/demoScenarios';
import { logger } from '@/lib/logger';
import type { InventoryItem } from './inventoryApi';

export type ScenarioRun = { scenario: DemoScenario; staged: boolean };

const ICONS: Record<DemoScenario['id'], typeof Coffee> = {
  'friday-coffee-rush': Coffee,
  'bulk-milk-restock': Milk,
};

/** Simulation & Stress-Test Control Toolbar — white surface, charcoal buttons. */
export default function DemoPresetBar({
  items, visible, onToggle, onScenario, onReset,
}: {
  items: InventoryItem[];
  visible: boolean;
  onToggle: () => void;
  onScenario: (run: ScenarioRun) => void;
  onReset: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function runScenario(s: DemoScenario) {
    if (busy) return;
    setBusy(s.id);
    try {
      const item = items.find((i) => i.sku === s.sku);
      if (!item) {
        onScenario({ scenario: s, staged: false });
        return;
      }
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: item.sku,
          name: item.name,
          category: item.category,
          currentStock: s.presetStock,
          safetyStock: item.safetyStock,
          reorderPoint: item.reorderPoint,
          unitCost: item.unitCost,
          avgDailyDemand: item.avgDailyDemand ?? 0,
          unit: 'unit' in item ? (item as unknown as { unit: string }).unit : 'pcs',
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      onScenario({ scenario: s, staged: json.success });
      if (!json.success) logger.warn('demo', `stage failed for ${s.sku}:`, json.error);
    } catch (e) {
      logger.warn('demo', 'stage network error:', e instanceof Error ? e.message : e);
      onScenario({ scenario: s, staged: false });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    if (busy) return;
    setBusy('reset');
    try {
      await fetch('/api/inventory/reset', { method: 'POST' });
    } finally {
      setBusy(null);
      onReset();
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="telemetry mr-1 font-mono text-[10px] uppercase tracking-widest text-[#4B5563]">Simulation Controls</span>
        {visible && DEMO_SCENARIOS.map((s) => {
          const Icon = ICONS[s.id];
          const primary = s.id === 'friday-coffee-rush';
          return (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={() => runScenario(s)}
              disabled={!!busy}
              title={`${s.title} — ${s.description}`}
              className={
                primary
                  ? 'flex items-center gap-1.5 rounded-lg border border-[#FBC02D] bg-[#FFEB3B] px-3 py-1.5 text-[11px] font-bold text-[#212121] hover:bg-[#FDD835] disabled:opacity-40'
                  : 'flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#212121] hover:bg-[#F8FAFC] disabled:opacity-40'
              }
            >
              <Icon size={12} />
              {busy === s.id ? 'Staging…' : `Run ${s.pillLabel}`}
            </motion.button>
          );
        })}
        {visible && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={reset}
            disabled={!!busy}
            className="flex items-center gap-1.5 rounded-lg bg-[#212121] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black disabled:opacity-40"
          >
            <RotateCcw size={12} className={busy === 'reset' ? 'animate-spin' : ''} />
            {busy === 'reset' ? 'Resetting…' : 'Reset All Data'}
          </motion.button>
        )}
        <button
          onClick={onToggle}
          aria-label={visible ? 'Hide demo presets' : 'Show demo presets'}
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-1.5 font-mono text-[10px] text-[#4B5563] hover:text-[#212121]"
        >
          {visible ? <EyeOff size={12} /> : <Eye size={12} />}
          {visible ? 'hide' : 'show'}
        </button>
      </div>
      {visible && (
        <p className="telemetry mt-1 font-mono text-[10px] text-[#4B5563]">
          Scenario 1 → Friday surge, SUP-B express (6h). Scenario 2 → calm Monday, SUP-A bulk (48h, MOQ 50).
        </p>
      )}
    </div>
  );
}
