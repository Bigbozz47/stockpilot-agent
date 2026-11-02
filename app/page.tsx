'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import InventoryTable from '@/components/InventoryTable';
import DepletionSlider from '@/components/DepletionSlider';
import AgentTerminal, { useAgentStream } from '@/components/AgentTerminal';
import VendorCompare from '@/components/VendorCompare';
import ActionCard from '@/components/ActionCard';
import VoiceCommandBar, { type VoiceDispatch } from '@/components/VoiceCommandBar';
import LivePosAndReceiptScanner, { type PosCheckout } from '@/components/LivePosAndReceiptScanner';
import WhatsAppSupplierSimulator from '@/components/WhatsAppSupplierSimulator';
import PdfPreviewModal, { type PdfCertificateData } from '@/components/PdfPreviewModal';
import DemoStoryboardDirector from '@/components/DemoStoryboardDirector';
import DemoPresetBar, { type ScenarioRun } from '@/components/DemoPresetBar';
import { fetchInventory, fetchPendingSkus, type InventoryItem } from '@/components/inventoryApi';

const spring = { type: 'spring', stiffness: 400, damping: 30 } as const;

function KpiCard({ accent, title, value, sub, extra }: {
  accent: string; title: string; value: string; sub: string; extra?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm transition-all duration-300">
      <div className={`h-1 ${accent}`} aria-hidden />
      <div className="px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#4B5563]">{title}</p>
        <p className="telemetry mt-1 text-xl font-black tracking-tight text-[#212121]">{value}</p>
        <p className="telemetry mt-0.5 font-mono text-[11px] text-[#4B5563]">{sub}</p>
        {extra}
      </div>
    </div>
  );
}

const TICKER = 'Cycle Time: 5s (Manual: 2.5h)  |  Stockout Risk Prevented: 100%  |  Working Capital Protected: Rp 14.500.000';

export default function DashboardPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastBreach, setLastBreach] = useState<string | null>(null);
  const [presetsVisible, setPresetsVisible] = useState(true);
  const [activeScenario, setActiveScenario] = useState<ScenarioRun | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [savedViaEscrow, setSavedViaEscrow] = useState(0);
  const [pdfData, setPdfData] = useState<PdfCertificateData | null>(null);
  const [supplierReply, setSupplierReply] = useState<'accepted' | 'partial' | null>(null);
  const [waPoNumber, setWaPoNumber] = useState<string | null>(null);
  const [storyAct, setStoryAct] = useState('act1');
  const [workbenchPo, setWorkbenchPo] = useState<string | null>(null);
  const agent = useAgentStream();
  // Workbench lock: once a proposal lands, polling refreshes must NEVER clear it.
  const workbenchOpen = agent.proposal !== null || workbenchPo !== null;

  const refresh = useCallback(async () => {
    try {
      const [inv, pend] = await Promise.all([fetchInventory(), fetchPendingSkus()]);
      setItems(inv);
      setPending(pend);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll only while the workbench is closed — never re-render over a live workbench.
    if (workbenchOpen) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh, workbenchOpen]);

  function handleDepleted(result: { sku: string; breached: boolean }) {
    if (result.breached) {
      setLastBreach(result.sku);
      setActiveScenario(null);
      setStoryAct('act2');
      setWorkbenchPo(result.sku);
      agent.start(result.sku);
    }
    refresh();
  }

  function handleScenario(run: ScenarioRun) {
    if (!run.staged) {
      setActiveScenario(run);
      refresh();
      return;
    }
    setLastBreach(run.scenario.sku);
    setActiveScenario(run);
    setStoryAct('act2');
    setWorkbenchPo(run.scenario.sku);
    agent.start(run.scenario.sku, run.scenario.simulatedDay);
    refresh();
  }

  function handleReset() {
    agent.stop();
    setActiveScenario(null);
    setLastBreach(null);
    setVoiceNote(null);
    setSavedViaEscrow(0);
    setPdfData(null);
    setSupplierReply(null);
    setWaPoNumber(null);
    setWorkbenchPo(null);
    setStoryAct('act1');
    refresh();
  }

  /** POS checkout → breach → frozen workbench anchor → agent stream. */
  function handlePosCheckout(result: PosCheckout) {
    setActiveScenario(null);
    if (result.breached) {
      const sku = result.deducted[0]?.sku ?? 'CF-BEAN-1KG';
      setLastBreach(sku);
      setStoryAct('act2');
      setWorkbenchPo(sku);
      agent.start(sku);
    }
    refresh();
  }

  /** Voice intent → pipeline: restock trigger opens depletion+stream; PoD intent stages note. */
  function handleVoice(dispatch: VoiceDispatch) {
    const intent = dispatch.result.extractedIntent;
    if (intent.action === 'TRIGGER_DEPLETION_AND_AGENT') {
      setVoiceNote(`Voice: ${dispatch.result.speakerLabel} — depleting ${intent.sku} to ${intent.reportedStock ?? 6}.`);
      setActiveScenario(null);
      setLastBreach(intent.sku);
      setStoryAct('act2');
      setWorkbenchPo(intent.sku);
      agent.start(intent.sku);
      refresh();
    } else {
      setVoiceNote(`Voice PoD: ${dispatch.result.speakerLabel} reports ${intent.receivedQuantity ?? 25} received for ${intent.sku} — confirm on the Action Card.`);
      refresh();
    }
  }

  /** Settlement: saved amount accumulates; PDF + WhatsApp state attach to the workbench. */
  function handleSettled(savedAmount: number) {
    setSavedViaEscrow((c) => c + savedAmount);
    setStoryAct('act5');
    refresh();
  }

  const breached = items.filter((i) => i.isBelowSafetyStock).length;
  const healthy = items.length - breached;
  const healthyPct = items.length ? Math.round((healthy / items.length) * 100) : 0;

  return (
    <div className="telemetry min-h-screen bg-[#F8FAFC] text-[#212121]">
      <Navbar mockMode={false} />
      <div className="border-b border-[#FBC02D] bg-[#212121] px-4 py-1.5" role="status" aria-live="polite">
        <p className="telemetry mx-auto max-w-[1440px] truncate text-center font-mono text-[11px] font-bold tracking-wide text-[#FFEB3B]">
          {TICKER}
        </p>
      </div>
      <main className="mx-auto max-w-[1440px] space-y-4 p-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Telemetry KPIs">
          <KpiCard accent="bg-[#4CAF50]" title="Procurement Cycle Velocity" value="< 5.0s" sub="vs 2.5h manual spreadsheet" />
          <KpiCard
            accent="bg-[#4CAF50]" title="Fleet Inventory Health" value={`${healthy}/${items.length || 10} healthy`}
            sub={`${breached} breached · ${healthyPct}% coverage`}
          />
          <KpiCard
            accent="bg-[#212121]" title="Working Capital & Escrow Shield" value={`Rp ${savedViaEscrow.toLocaleString('id-ID')}`} sub="SAVED VIA ESCROW GUARDRAIL"
            extra={<span data-testid="kpi-escrow-saved" className="telemetry hidden">escrow-saved-{savedViaEscrow}</span>}
          />
          <KpiCard accent="bg-[#FBC02D]" title="Multimodal Verification" value="sam-3.1 + voice" sub="6/6 cartons · ID/EN transcripts" />
        </section>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[60%_40%]">
          <section className="min-w-0 space-y-4">
            <DemoStoryboardDirector activeAct={storyAct} onSelect={setStoryAct} />
            <DemoPresetBar
              items={items}
              visible={presetsVisible}
              onToggle={() => setPresetsVisible((v) => !v)}
              onScenario={handleScenario}
              onReset={handleReset}
            />
            <LivePosAndReceiptScanner busy={loading} onCheckout={handlePosCheckout} />
            <VoiceCommandBar busy={loading} onVoice={handleVoice} />
            {voiceNote && (
              <div className="rounded-xl border border-[#4CAF50] bg-[#E8F5E9] px-4 py-2.5">
                <p className="telemetry text-[11px] font-bold text-[#2E7D32]">{voiceNote}</p>
              </div>
            )}
            {activeScenario && (
              <div className="rounded-xl border border-[#FBC02D] bg-[#FFFDE7] px-4 py-2.5 transition-all duration-300">
                <p className="text-[12px] font-bold text-[#212121]">{activeScenario.scenario.title}</p>
                <p className="telemetry mt-0.5 text-[11px] leading-relaxed text-[#4B5563]">
                  {activeScenario.staged
                    ? `${activeScenario.scenario.description} Expecting ${activeScenario.scenario.expect.supplierCode} × ${activeScenario.scenario.expect.quantity} = Rp${activeScenario.scenario.expect.totalAmount.toLocaleString('id-ID')}.`
                    : `Staging failed for ${activeScenario.scenario.sku} — is the dev server running?`}
                </p>
              </div>
            )}
            {breached > 0 && !loading && (
              <div className="banner-pulse-amber rounded-xl border-2 border-[#FBC02D] bg-[#FFFDE7] px-4 py-3 text-[13px] font-bold text-[#212121] transition-all duration-300" role="alert">
                CRITICAL STOCKOUT RISK — {breached} SKU{breached > 1 ? 's' : ''} below safety stock
                {lastBreach ? ` (latest: ${lastBreach})` : ''}. Agent reasoning dispatched.
              </div>
            )}
            <DepletionSlider items={items} onDepleted={handleDepleted} />
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-bold text-[#212121]">Live Inventory Telemetry</h2>
                <span className="telemetry font-mono text-[11px] text-[#4B5563]">{loading ? '…' : `${items.length} SKUs`}</span>
              </div>
              <InventoryTable items={items} pendingSkus={pending} loading={loading} />
            </div>
          </section>
          <section className="min-w-0 space-y-4">
            <AgentTerminal lines={agent.lines} status={agent.status} onStop={agent.stop} />
            <VendorCompare proposal={agent.proposal} />
            {workbenchOpen && agent.proposal ? (
              <ActionCard
                key={`workbench-${agent.proposal.poNumber}`}
                proposal={agent.proposal}
                onDone={refresh}
                onSettled={handleSettled}
                onApprove={(poNumber) => {
                  setWaPoNumber(poNumber);
                  setStoryAct('act3');
                }}
                onWhatsAppReply={(reply) => {
                  setSupplierReply(reply);
                  setStoryAct(reply === 'partial' ? 'act4' : 'act3');
                }}
                onVisionMode={() => undefined}
                onOpenPdf={(data) => setPdfData(data)}
                supplierReply={supplierReply}
              />
            ) : workbenchOpen && !agent.proposal ? (
              <div className="rounded-xl border border-[#4CAF50] bg-[#E8F5E9] p-6 text-center">
                <p className="text-[13px] font-bold text-[#2E7D32]">Reasoning live — proposal materializing…</p>
                <p className="telemetry mt-1 font-mono text-[11px] text-[#2E7D32]/80">Workbench locked open · stream in progress</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#4CAF50] bg-[#E8F5E9] p-6 text-center">
                <p className="text-[13px] font-bold text-[#2E7D32]">All 10 SKUs Operating Within Safety Thresholds</p>
                <p className="telemetry mt-1 font-mono text-[11px] text-[#2E7D32]/80">Standby — trigger a stock breach to open a proposal.</p>
              </div>
            )}
            {waPoNumber && agent.proposal && (
              <WhatsAppSupplierSimulator
                key={`wa-${waPoNumber}`}
                poNumber={waPoNumber}
                sku={agent.proposal.sku}
                quantity={agent.proposal.quantity}
                total={agent.proposal.totalAmount}
                onReply={(reply) => {
                  setSupplierReply(reply);
                  setStoryAct(reply === 'partial' ? 'act4' : 'act3');
                }}
              />
            )}
            {pdfData && <PdfPreviewModal data={pdfData} onClose={() => setPdfData(null)} />}
          </section>
        </div>
      </main>
    </div>
  );
}
