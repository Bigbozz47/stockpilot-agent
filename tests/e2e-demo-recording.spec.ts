import { test, expect, type Page, type Locator } from '@playwright/test';
import { execSync } from 'node:child_process';

function traceApiUrls(traceDir: string): string[] {
  try {
    const out = execSync(
      `python -c "import zipfile,re,sys; z=zipfile.ZipFile(r'${traceDir}/trace.zip'); data=z.read('1-trace.trace').decode('utf-8',errors='replace'); urls=re.findall('api/[a-z/\\-]+', data); print(chr(10).join(sorted(set(urls))))"`,
      { encoding: 'utf8', timeout: 15000 },
    );
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}


/**
 * 5-Act, 180-second cinematic hackathon demo (1920x1080 recording).
 * Mock mode: USE_MOCK_AGENT=true (deterministic, zero API cost, offline-safe).
 * A 250ms on-screen timer + animated cursor keeps every video frame alive,
 * so the .webm duration matches the 175-180s wall-clock choreography.
 */

const T0 = Date.now();
const elapsed = () => (Date.now() - T0) / 1000;
const fmtClock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function injectDirectorOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #unp-broadcast-bar { position: fixed; left: 50%; transform: translateX(-50%); bottom: 18px; z-index: 9999;
        display: flex; align-items: center; gap: 10px; max-width: 90vw;
        background: #212121; color: #fff; border-radius: 12px; padding: 10px 16px;
        font-family: monospace; box-shadow: 0 8px 32px rgba(0,0,0,.45); pointer-events: none; }
      #unp-broadcast-bar .act { background: #FFEB3B; color: #212121; font-weight: 800; font-size: 12px;
        border-radius: 6px; padding: 2px 8px; white-space: nowrap; }
      #unp-broadcast-bar .cap { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #unp-broadcast-bar .live { width: 10px; height: 10px; border-radius: 50%; background: #4CAF50; flex-shrink: 0;
        animation: unp-live 1s ease-in-out infinite; }
      @keyframes unp-live { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      #unp-broadcast-bar .clock { font-size: 13px; font-weight: 800; color: #FFEB3B; white-space: nowrap; }
      #unp-broadcast-bar .bar { width: 110px; height: 6px; background: rgba(255,255,255,.2); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
      #unp-broadcast-bar .bar > div { height: 100%; width: 0%; background: #4CAF50; }
      #unp-cursor-dot { position: fixed; width: 18px; height: 18px; border-radius: 50%; z-index: 10000; pointer-events: none;
        background: radial-gradient(circle, #FFEB3B 0 35%, rgba(76,175,80,.85) 36% 100%);
        border: 2px solid #212121; transform: translate(-50%,-50%);
        transition: left .35s cubic-bezier(.22,1,.36,1), top .35s cubic-bezier(.22,1,.36,1); }
      #unp-cursor-dot.ripple { animation: unp-ripple .6s ease-out; }
      @keyframes unp-ripple { 0% { box-shadow: 0 0 0 0 rgba(76,175,80,.7); } 100% { box-shadow: 0 0 0 26px rgba(76,175,80,0); } }
      #unp-cursor-ring { position: fixed; z-index: 9998; pointer-events: none; border: 3px solid #4CAF50; border-radius: 10px;
        transition: all .35s cubic-bezier(.22,1,.36,1); box-shadow: 0 0 18px rgba(76,175,80,.55); }
    `,
  });
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.id = 'unp-broadcast-bar';
    bar.innerHTML = `<span class="live"></span><span class="act">ACT 1/6</span><span class="cap">UNP Mart demo starting…</span><span class="clock">00:00 / 03:00</span><span class="bar"><div></div></span>`;
    document.body.appendChild(bar);
    const dot = document.createElement('div');
    dot.id = 'unp-cursor-dot';
    dot.style.left = '960px';
    dot.style.top = '540px';
    document.body.appendChild(dot);
    const ring = document.createElement('div');
    ring.id = 'unp-cursor-ring';
    ring.style.display = 'none';
    document.body.appendChild(ring);
    const started = Date.now();
    setInterval(() => {
      const s = (Date.now() - started) / 1000;
      const clock = bar.querySelector('.clock');
      if (clock) clock.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')} / 03:00`;
      const fill = bar.querySelector('.bar > div') as HTMLElement | null;
      if (fill) fill.style.width = `${Math.min(100, (s / 180) * 100)}%`;
    }, 250);
    (window as unknown as { __unpT0?: number }).__unpT0 = started;
  });
}

async function narrate(page: Page, act: string, caption: string): Promise<void> {
  await page.evaluate(
    ([a, c]) => {
      const bar = document.getElementById('unp-broadcast-bar');
      if (!bar) return;
      const actEl = bar.querySelector('.act');
      const capEl = bar.querySelector('.cap');
      if (actEl) actEl.textContent = a;
      if (capEl) capEl.textContent = c;
    },
    [act, caption],
  );
}

async function moveCursor(page: Page, locator: Locator): Promise<void> {
  const box = await locator.scrollIntoViewIfNeeded().then(() => locator.boundingBox()).catch(() => null);
  const b = box ?? { x: 960, y: 540, width: 0, height: 0 };
  await page.evaluate(
    ([x, y, w, h]) => {
      const dot = document.getElementById('unp-cursor-dot');
      const ring = document.getElementById('unp-cursor-ring');
      if (dot) {
        dot.style.left = `${x + w / 2}px`;
        dot.style.top = `${y + h / 2}px`;
        dot.classList.remove('ripple');
        void dot.offsetWidth;
        dot.classList.add('ripple');
      }
      if (ring) {
        ring.style.display = 'block';
        ring.style.left = `${x - 8}px`;
        ring.style.top = `${y - 8}px`;
        ring.style.width = `${w + 16}px`;
        ring.style.height = `${h + 16}px`;
      }
    },
    [b.x, b.y, b.width, b.height],
  );
}

async function clickSpot(page: Page, locator: Locator): Promise<void> {
  await moveCursor(page, locator);
  await locator.click();
}

/** Hold the wall clock until targetSeconds, narrating the whole time (zero dead air). */
async function holdUntil(page: Page, targetSeconds: number, act: string, caption: string): Promise<void> {
  await narrate(page, act, caption);
  while (elapsed() < targetSeconds) {
    await page.waitForTimeout(500);
  }
}

test.describe('UNP Mart 3-minute cinematic demo', () => {
  test('5-act closed loop, 0 console errors', async ({ page }) => {
    test.setTimeout(240000);
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (/favicon|Failed to load resource.*404|net::ERR_/i.test(text)) return;
      if (msg.type() === 'error') consoleErrors.push(text);
      if (msg.type() === 'warning') consoleWarnings.push(text);
    });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('requestfailed', (req) => {
      const url = req.url();
      const cause = req.failure()?.errorText ?? '';
      if (url.includes('/api/') && !/aborted|cancelled|net::ERR_ABORTED/i.test(cause)) {
        pageErrors.push(`requestfailed: ${url} ${cause}`);
      }
    });
    const leakedSecrets: string[] = [];
    page.on('response', async (res) => {
      try {
        if (res.url().includes('/api/') && res.ok()) {
          const text = await res.text().catch(() => '');
          if (/LLM_\||MUSE_API_KEY|mongodb:\/\//i.test(text)) leakedSecrets.push(res.url());
        }
      } catch { /* binary bodies */ }
    });

    // ── ACT 1 (00:00–00:30): baseline console + POS/OCR surge ──
    const home = await page.goto('/');
    expect(home?.status()).toBe(200);
    await expect(page.getByText('UNP', { exact: true })).toBeVisible();
    await injectDirectorOverlay(page);
    await narrate(page, 'ACT 1/6', 'UNP Mart Flagship — 10/10 SKUs healthy · 0% math hallucination');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(['rgb(248, 250, 252)', 'rgb(255, 255, 255)']).toContain(bg);
    // Warm up every API route so Turbopack compiles them before the choreography clock matters.
    await Promise.all([
      page.request.post('/api/inventory/reset').catch(() => null),
      page.request.get('/api/suppliers').catch(() => null),
      page.request.get('/api/orders').catch(() => null),
      page.request.post('/api/voice/transcribe', { data: { presetId: 'URGENT_RESTOCK_VOICE' } }).catch(() => null),
      page.request.post('/api/inventory/ingest-receipt', { data: { receiptId: 'POS-8841' } }).catch(() => null),
    ]);
    const resetReq = await page.request.post('/api/inventory/reset');
    expect(resetReq.ok()).toBe(true);
    await page.reload();
    await injectDirectorOverlay(page);
    await narrate(page, 'ACT 1/6', 'Baseline restored — panning live telemetry');
    await expect(page.getByRole('cell', { name: 'CF-BEAN-1KG' })).toBeVisible({ timeout: 15000 });
    await moveCursor(page, page.getByText('Live Inventory Telemetry'));
    await holdUntil(page, 10, 'ACT 1/6', 'REAL-WORLD TRIGGER: B2B cafe order at UNP Mart POS');
    await moveCursor(page, page.getByTestId('pos-checkout-card'));
    await page.getByRole('tab', { name: 'RECEIPT OCR' }).scrollIntoViewIfNeeded();
    await clickSpot(page, page.getByRole('tab', { name: 'RECEIPT OCR' }));
    await page.getByTestId('scan-receipt-ocr-btn').scrollIntoViewIfNeeded();
    let ocrStatus = 0;
    let ocrBody = '';
    const ocrResp = await Promise.all([
      page.waitForResponse(async (r) => {
        if (!r.url().includes('/api/inventory/ingest-receipt')) return false;
        ocrStatus = r.status();
        try { ocrBody = await r.text(); } catch { ocrBody = '<unreadable>'; }
        return true;
      }),
      clickSpot(page, page.getByTestId('scan-receipt-ocr-btn')),
    ]);
    expect(ocrResp[0].ok(), `ingest-receipt failed: ${ocrStatus} ${ocrBody.slice(0, 300)}`).toBe(true);
    await holdUntil(page, 20, 'ACT 1/6', 'Receipt OCR scanned POS-8841 — 14x COF-001 deducted');
    await clickSpot(page, page.getByRole('tab', { name: 'POS TERMINAL' }));
    await page.getByTestId('pos-checkout-btn').scrollIntoViewIfNeeded();
    const posResp = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/inventory/deplete') && r.ok()),
      clickSpot(page, page.getByTestId('pos-checkout-btn')),
    ]);
    expect(posResp[0].ok()).toBe(true);
    await page.reload();
    await injectDirectorOverlay(page);
    await expect(page.getByText('CRITICAL STOCKOUT RISK').first()).toBeVisible({ timeout: 15000 });
    await moveCursor(page, page.getByText('CRITICAL STOCKOUT RISK').first());
    // Workbench must stay mounted through every re-fetch from here on.
    await expect(page.getByText('LIVE AGENT TELEMETRY TRACE (SSE)')).toBeVisible();
    await holdUntil(page, 30, 'ACT 1/6', 'BREACH: COF-001 20kg → 6kg — workbench locked open');

    // ── ACT 2 (00:30–01:05): voice + OODA stream + vendor matrix ──
    await moveCursor(page, page.getByText('Hands-Free Warehouse Voice Ops'));
    const voiceResp = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/voice/transcribe') && r.ok()),
      clickSpot(page, page.getByTestId('voice-trigger-cof-btn')),
    ]);
    expect(voiceResp[0].ok()).toBe(true);
    const voiceJson = (await voiceResp[0].json()) as { success: boolean; data: { speakerLabel: string; biasedKeywordsMatched: string[] } };
    expect(voiceJson.data.biasedKeywordsMatched).toContain('COF-001');
    await moveCursor(page, page.getByText(/Speaker 1/).first());
    await holdUntil(page, 42, 'ACT 2/6', 'Voice: bilingual alert + diarization + SKU bias (muse-voice-transcribe-1.0)');
    const streamText = await page.evaluate(async () => {
      const res = await fetch('/api/agent/stream?sku=CF-BEAN-1KG');
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        const { done, value } = await reader.read();
        if (value) buf += dec.decode(value, { stream: true });
        if (buf.includes('proposal_ready')) break;
        if (done) break;
      }
      reader.cancel();
      return buf;
    });
    for (const ev of ['event: thought', 'event: tool_call', 'event: proposal_ready']) {
      expect(streamText).toContain(ev);
    }
    await moveCursor(page, page.getByText('LIVE AGENT TELEMETRY TRACE (SSE)'));
    await holdUntil(page, 54, 'ACT 2/6', 'OODA loop streaming: OBSERVE → REASON → TOOL → VERIFY (muse-spark-1.3)');
    await moveCursor(page, page.getByText('Vendor Trade-off Scorecard'));
    await expect(page.getByText(/48h Lead Time/)).toBeVisible();
    await expect(page.getByText(/6h Express Delivery/)).toBeVisible();
    const poMatch = streamText.match(/event: proposal_ready\ndata: (\{.*\})/);
    expect(poMatch).not.toBeNull();
    // Mock mode persists a REAL draft PO — approve/receive/failover run against it.
    const proposal = JSON.parse(poMatch![1]) as { poNumber: string; sku: string; supplierCode: string; totalAmount: number; mock?: boolean };
    expect(proposal.poNumber).toMatch(/^PO-\d{8}-[A-Z0-9]+$/);
    const livePo = proposal.poNumber;
    await holdUntil(page, 65, 'ACT 2/6', 'SUP-B 6h express wins — rejects 48h bulk, saves $2,400');

    // ── ACT 3 (01:05–01:40): approval + WhatsApp handshake ──
    await moveCursor(page, page.getByTestId('approve-po-btn'));
    const approveResp = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/orders/approve') && r.ok()),
      clickSpot(page, page.getByTestId('approve-po-btn')),
    ]);
    expect(approveResp[0].ok()).toBe(true);
    // PO confirmation modal opens on approve — capture it, then close to reach WhatsApp.
    await expect(page.getByRole('dialog', { name: /Official Purchase Order/ })).toBeVisible();
    await moveCursor(page, page.getByRole('dialog', { name: /Official Purchase Order/ }));
    await holdUntil(page, 74, 'ACT 3/6', 'PO confirmation modal — official document preview');
    await clickSpot(page, page.getByRole('button', { name: 'Close' }));
    await expect(page.getByTestId('whatsapp-supplier-emulator')).toBeVisible();
    await holdUntil(page, 78, 'ACT 3/6', 'PO locked in escrow — WhatsApp dispatched to Supplier B');
    await moveCursor(page, page.getByTestId('whatsapp-supplier-emulator'));
    const waAccept = await Promise.all([
      page.waitForTimeout(800).then(() => null),
      clickSpot(page, page.getByTestId('wa-supplier-accept-btn')),
    ]);
    expect(waAccept).not.toBeUndefined();
    await holdUntil(page, 90, 'ACT 3/6', 'Supplier B: order accepted, truck en route');
    const pdfResp = await page.request.get(`/api/orders/export-pdf?poNumber=${livePo}`);
    expect(pdfResp.status()).toBe(200);
    await moveCursor(page, page.getByTestId('wa-supplier-partial-btn'));
    await clickSpot(page, page.getByTestId('wa-supplier-partial-btn'));
    await holdUntil(page, 100, 'ACT 3/6', 'DISRUPTION: only 5/6 cartons intact — 1 damaged in transit');

    // ── ACT 4 (01:40–02:15): SAM vision + escrow guardrail (all UI-driven on livePo) ──
    await moveCursor(page, page.getByTestId('verify-partial-delivery-btn'));
    await page.getByTestId('verify-partial-delivery-btn').scrollIntoViewIfNeeded();
    const partialResp = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/orders/receive') && r.ok()),
      clickSpot(page, page.getByTestId('verify-partial-delivery-btn')),
    ]);
    expect(partialResp[0].ok()).toBe(true);
    const partial = (await partialResp[0].json()) as {
      success: boolean;
      data: { po: { status: string; orderedQty?: number; billableQty?: number }; escrow: { supplierPayout: number; buyerRefundSaved: number; shortfallQty: number; orderedQty: number; billableQty: number } };
    };
    expect(partial.data.po.status).toBe('PARTIAL_SETTLED');
    expect(partial.data.escrow.shortfallQty).toBeGreaterThan(0);
    await moveCursor(page, page.getByTestId('kpi-escrow-saved'));
    await holdUntil(page, 122, 'ACT 4/6', '3-way match: supplier paid fairly, buyer saved — KPI jumps live');
    // Receive auto-opens the PDF certificate modal — showcase it, then close to continue.
    await holdUntil(page, 118, 'ACT 4/6', 'Receipt settled — certificate auto-opens on screen');
    await expect(page.getByTestId('pdf-preview-modal')).toBeVisible();
    await moveCursor(page, page.getByTestId('pdf-preview-modal'));
    await holdUntil(page, 124, 'ACT 4/6', 'Official PO + escrow audit certificate on screen');
    await moveCursor(page, page.getByTestId('close-pdf-modal-btn'));
    await clickSpot(page, page.getByTestId('close-pdf-modal-btn'));
    await moveCursor(page, page.getByTestId('kpi-escrow-saved'));
    const foResp = await page.request.post('/api/orders/failover', {
      data: { parentPoNumber: livePo, deliveredQuantity: partial.data.escrow.billableQty },
    });
    expect([200, 201]).toContain(foResp.status());
    const fo = (await foResp.json()) as { success: boolean; data: { child: { poNumber: string }; failover: { failoverOrderQty: number } } };
    expect(fo.data.child.poNumber).toBe(`${livePo}-F2`);
    const fo2 = await page.request.post('/api/orders/failover', {
      data: { parentPoNumber: livePo, deliveredQuantity: partial.data.escrow.billableQty },
    });
    expect(fo2.status()).toBe(200);
    await moveCursor(page, page.getByTestId('trigger-split-failover-btn').or(page.getByText('Bilateral Shield')));
    await holdUntil(page, 135, 'ACT 4/6', 'Failover -F2 reroutes deficit to backup Supplier C');

    // ── ACT 5 (02:15–02:40): PDF certificate ──
    await moveCursor(page, page.getByTestId('open-pdf-modal-btn'));
    await clickSpot(page, page.getByTestId('open-pdf-modal-btn'));
    await expect(page.getByTestId('pdf-preview-modal')).toBeVisible();
    await holdUntil(page, 148, 'ACT 5/6', 'Official PO + escrow audit certificate on screen');
    await moveCursor(page, page.getByTestId('close-pdf-modal-btn'));
    await clickSpot(page, page.getByTestId('close-pdf-modal-btn'));

    // ── ACT 6 (02:40–03:00): bulk finale + workbench persistence proof ──
    await page.request.post('/api/inventory/reset');
    await page.reload();
    await injectDirectorOverlay(page);
    await narrate(page, 'ACT 6/6', 'Weekday bulk: SUP-A wholesaler wins, 10/10 back to HEALTHY');
    await expect(page.getByRole('cell', { name: 'CF-BEAN-1KG' })).toBeVisible({ timeout: 15000 });
    await moveCursor(page, page.getByText('Live Inventory Telemetry'));
    await holdUntil(page, 172, 'ACT 6/6', 'UNP Mart StockPilot — muse-spark-1.3 · sam-3.1 · voice');
    await holdUntil(page, 178, 'ACT 6/6', 'Closed-loop complete — thank you');
    expect(elapsed()).toBeGreaterThanOrEqual(175);

    // ── Final QA gates ──
    expect(pageErrors, `pageerrors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console.errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(leakedSecrets, `secret leak: ${leakedSecrets.join(', ')}`).toEqual([]);
    const knownNoise = /React 18.*deprecated|react-version|Fast Refresh|HMR|hot-reloader|next\.js/i;
    const unknownWarnings = consoleWarnings.filter((w) => !knownNoise.test(w));
    expect(unknownWarnings, `console.warnings: ${unknownWarnings.join(' | ')}`).toEqual([]);
  });
});
