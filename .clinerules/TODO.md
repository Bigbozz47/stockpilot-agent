\# TODO.md — StockPilot Task Backlog

\> \*\*Last Updated:\*\* 2026-09-25  
\> \*\*Status Legend:\*\* \`\[ \]\` Todo · \`\[/\]\` In Progress · \`\[x\]\` Done · \`\[\~\]\` Blocked · \`\[-\]\` Cancelled

\---

\#\# 🔥 High Priority (MVP Core & Hackathon Deliverables)

\- \[ \] \*\*Database & Schemas:\*\* Initialize Mongoose schemas for \`Product\`, \`Supplier\`, \`PurchaseOrder\`, and \`AgentAuditLog\` in \`src/models/\`  
\- \[ \] \*\*Seed Data Fixtures:\*\* Create \`src/lib/seed.ts\` with 10 realistic retail SKUs and 3 competing supplier profiles with explicit cost vs. lead-time trade-offs  
\- \[ \] \*\*Deterministic Math Engine:\*\* Implement \`src/lib/math.ts\` for computing Safety Stock, ROP, order deficits, and total costs without LLM token dependence  
\- \[ \] \*\*Muse Spark Agent Tools Implementation:\*\* Implement tool definitions (\`checkStock\`, \`getSuppliers\`, \`proposeOrder\`) using Muse Spark function calling with strict Zod schemas  
\- \[ \] \*\*Real-time SSE Stream Endpoint:\*\* Build \`/api/agent/route.ts\` emitting live server-sent events for agent thought traces to the frontend  
\- \[ \] \*\*Action Card Component:\*\* Create \`src/components/ActionCard.tsx\` with financial breakdown, \`\[Approve & Dispatch\]\` and \`\[Modify\]\` buttons, and status badges  
\- \[ \] \*\*Deterministic Offline Fallback:\*\* Prepare local mock response fixtures in \`public/mock-data/\` to guarantee demo continuity if internet latency occurs during judging

\---

\#\# 🟡 Medium Priority (UI Polish & Live Demo Experience)

\#\#\# Console Sections  
\- \[ \] \`src/components/DepletionSlider.tsx\` \- Interactive simulation slider triggering rapid stock burn down past safety stock thresholds  
\- \[ \] \`src/components/AgentTerminal.tsx\` \- Hacker-style terminal console featuring a smooth typewriter stream of agent reasoning  
\- \[ \] \`src/components/VendorCompare.tsx\` \- Side-by-side trade-off matrix visualizing why AI selected Supplier B over Supplier A  
\- \[ \] \`src/components/InventoryTable.tsx\` \- Add pulsating warning badges when stock falls below critical Safety Stock levels

\#\#\# Deliverables & Export  
\- \[ \] Implement instant Purchase Order PDF generator endpoint at \`/api/orders/export-pdf\`  
\- \[ \] Build mock WhatsApp webhook simulator showing automated purchase order message dispatch to vendor phone number  
\- \[ \] Add subtle success chime sound effect when the human-in-the-loop approval button is clicked

\---

\#\# 🟢 Low Priority (Technical Cleanliness & Post-Hackathon)

\#\#\# Technical  
\- \[ \] Create \`src/types/index.ts\` centralizing all TypeScript interfaces and Zod schemas  
\- \[ \] Audit codebase to ensure no stray \`console.log\` statements remain in production components  
\- \[ \] Run \`npm run lint\` and \`tsc \--noEmit\` to verify 0 errors before live presentation  
\- \[ \] Record a 90-second high-resolution backup screencast video as insurance against live hardware glitches

\#\#\# Content & Pitch Rehearsal  
\- \[ \] Rehearse 2-minute stage pitch flow (0:00 Problem \-\> 0:30 Gap \-\> 1:15 Live Autonomous Demo \-\> 2:00 Scale)

\---

\#\# ✅ Shipped — Full Procurement Loop + Multimodal Trifecta

\- \[x\] **Receive & auto-restock** (`POST /api/orders/receive`): DISTPATCHED → SETTLED / PARTIAL_SETTLED with settle-once guard, atomic `$inc` restock, escrow ledger, settlement WhatsApp.
\- \[x\] **Deterministic escrow** (`calculateEscrowSettlement`): 3-way match, SLA 5% penalty + shipping waiver, cent rounding; server-recalculated only.
\- \[x\] **Bilateral failover** (`POST /api/orders/failover` + `calculateSplitOrderFailover`): linked `-F2` child, emergency micro-lot, idempotent re-call, dual-vendor WhatsApp.
\- \[x\] **SAM 3.1 PoD vision** (`visionVerifier` + `VisionPodWidget`): 4s timeout → fixture, box counts persisted to PO, 60 FPS SVG HUD.
\- \[x\] **Voice ops** (`voiceTranscriber` + `/api/voice/transcribe` + `VoiceCommandBar`): dual presets, diarization + bias pills, 1-click pipeline dispatch.
\- \[x\] **UNP Mart light dashboard**: white/alabaster + green/yellow/charcoal tokens, KPI ribbon, OODA trace monitor, standby card; 0 dark-slop.
\- \[x\] 49/49 Vitest green · `tsc` clean · `next build` clean.

\---

\#\# ✅ Shipped — Real-World Storefront Loop (no more abstract sim-only demo)

\- \[x\] **State-reset fix** (`app/page.tsx`): `workbenchPo` anchor + `workbenchOpen` lock; 5s poller pauses while the workbench is live; ActionCard keyed by `poNumber` — proposal/workbench persist through all 4 lifecycle steps until explicit reset.
\- \[x\] **Live POS & receipt OCR** (`LivePosAndReceiptScanner` + `POST /api/inventory/ingest-receipt` + `fallback-receipt-ocr.json`): POS-8841 ticket depletes CF-BEAN-1KG −14; OCR path validates SKUs server-side.
\- \[x\] **WhatsApp supplier emulator** (`WhatsAppSupplierSimulator`): outbound PO message + two-way accept/partial replies driving `supplierReply` state into ActionCard copy.
\- \[x\] **SAM dock upgrade** (`VisionPodWidget`): damaged pallet rendering, MISSING cross-hatch + yellow ESCROW HOLD tag, `data-testid="sam-vision-dock"`.
\- \[x\] **PDF modal** (`PdfPreviewModal` + `open-pdf-modal-btn`/`close-pdf-modal-btn`): on-screen PO + 3-way match + failover lineage + audit hash; no hidden-download dependence.
\- \[x\] **Storyboard director** (`DemoStoryboardDirector`): 5 acts, persistent subtitle bar, `SAVED VIA ESCROW GUARDRAIL` KPI (`kpi-escrow-saved`) accumulates real refund amounts.
\- \[x\] All interactive controls carry `data-testid` hooks for deterministic Playwright choreography.
