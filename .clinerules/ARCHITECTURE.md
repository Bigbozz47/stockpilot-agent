\# StockPilot Technical Architecture

\> \*\*Last Updated:\*\* 2026-09-25  
\> \*\*Framework:\*\* MERN Stack (Next.js 14+ App Router, Node.js, Express.js API, MongoDB / Mongoose, Tailwind CSS v4)  
\> \*\*AI Architecture:\*\* Muse Spark 1.3 Agent with Strict Tool Calling & Server-Sent Events (SSE)

\---

\#\# 1\. Tech Stack Overview

| Layer | Technology | Purpose |  
| :--- | :--- | :--- |  
| \*\*Frontend UI\*\* | Next.js 14+ (App Router) \+ React 19 | Reactive user interface & operator console layout |  
| \*\*Language\*\* | TypeScript 5+ | End-to-end static type safety & schema validation |  
| \*\*Styling\*\* | Tailwind CSS v4 | High-density, responsive operational dark theme styling |  
| \*\*Icons & Visuals\*\* | Lucide React | Systematic status icons for stock levels, suppliers, and agent traces |  
| \*\*Realtime Stream\*\* | Server-Sent Events (SSE) | Real-time streaming of agent reasoning thoughts to the client |  
| \*\*Backend API\*\* | Node.js \+ Express.js Router / Next.js Route Handlers | API orchestrator for inventory, suppliers, and order execution |  
| \*\*Database\*\* | MongoDB (via Mongoose ODM) | Relational document store for products, stock logs, vendors, and POs |  
| \*\*AI / Agent Engine\*\* | Muse Spark Node.js SDK (muse-spark-1.3) | Multi-attribute contextual reasoning across pricing, lead times, and MOQs |  
| \*\*Data Validation\*\* | Zod v3 / Mongoose Schema Validators | Strict request validation & structured JSON outputs |  
| \*\*Document Export\*\* | PDFKit / jsPDF | Generation of print-ready Purchase Order (PO) PDF documents |

\---

\#\# 2\. Project Directory Structure

\`\`\`text  
stockpilot-agent/  
├── app/  
│   ├── layout.tsx              \# Root layout (Navbar, theme provider, global state)  
│   ├── page.tsx                \# Main Operator Console (Dashboard split-screen)  
│   ├── globals.css             \# Tailwind v4 styles & custom terminal scrollbars  
│   └── api/  
│       ├── inventory/  
│       │   ├── route.ts        \# GET stock list & POST new SKU  
│       │   └── deplete/  
│       │       └── route.ts    \# POST simulated depletion event (Trigger test)  
│       ├── suppliers/  
│       │   └── route.ts        \# GET supplier catalog (Lead times, pricing, MOQ)  
│       ├── agent/  
│       │   └── route.ts        \# POST trigger autonomous reasoning loop (SSE stream)  
│       └── orders/  
│           ├── approve/  
│           │   └── route.ts    \# POST human-in-the-loop approval & finalize PO  
│           └── export-pdf/  
│               └── route.ts    \# GET generate print-ready PO PDF  
├── src/  
│   ├── components/  
│   │   ├── InventoryTable.tsx  \# Real-time SKU stock level monitor with warning badges  
│   │   ├── DepletionSlider.tsx \# Interactive simulation controls for live demo  
│   │   ├── AgentTerminal.tsx   \# Live streaming feed of Observe-Reason-Plan-Act logs  
│   │   ├── ActionCard.tsx      \# 1-Click Human Approval Gate with financial summary  
│   │   └── VendorCompare.tsx   \# Side-by-side trade-off matrix (Speed vs Cost)  
│   ├── models/  
│   │   ├── Product.ts          \# SKU, name, currentStock, safetyStock, reorderPoint  
│   │   ├── Supplier.ts         \# Vendor name, contact, leadTimeHours, pricingTier, minOrderQty  
│   │   ├── PurchaseOrder.ts    \# PO Number, items, supplierId, totalCost, status (DRAFT/DISPATCHED)  
│   │   └── AgentAuditLog.ts    \# Timestamp, triggerSku, reasoningSteps, approvedBy  
│   ├── services/  
│   │   ├── agentRunner.ts      \# Core OODA loop orchestrator calling Muse SPark Tools  
│   │   ├── supplierRanker.ts   \# Multi-attribute decision scoring logic  
│   │   └── notification.ts     \# Mock WhatsApp/Webhook notification dispatcher  
│   ├── lib/  
│   │   ├── db.ts               \# Mongoose connection handler with caching  
│   │   ├── muse.ts             \# Muse Spark client initialization  
│   │   └── math.ts             \# Deterministic Safety Stock, ROP, and Cost calculator  
│   └── types/  
│       └── index.ts            \# Shared TypeScript interfaces & Zod schemas  
└── public/  
    └── mock-data/              \# Seed fixtures for offline/isolated demo fallback  
\`\`\`

\---

\#\# 3\. Data Flow & Agentic State Machine

\`\`\`text  
                  \[1. TRIGGER EVENT\]  
       POS Checkout Simulator / Stock falls \< Safety Stock Threshold  
                            │  
                            ▼  
              ┌───────────────────────────┐  
              │     STOCKPILOT AGENT      │  
              │ (muse-spark-1.3 Tool Loop) │  
              └─────────────┬─────────────┘  
                            │  
          ┌─────────────────┴─────────────────┐  
          │ Tool Calls                        │  
          ▼                                   ▼  
┌──────────────────┐                ┌──────────────────┐  
│ checkInventory() │                │ getSuppliers()   │  
│ Fetch SKU data   │                │ Pull lead times, │  
│ & burn rate      │                │ unit costs, MOQs │  
└─────────┬────────┘                └─────────┬────────┘  
          │                                   │  
          └─────────────────┬─────────────────┘  
                            │  
                            ▼  
                  \[2. REASONING & PLAN\]  
     Comparative evaluation: Supplier A (\$ cheap, 48h) vs Supplier B (\$\$ express, 6h).  
     Context: Friday surge coming up. Plan: Select Supplier B for express replenishment.  
                            │  
                            ▼  
               \[3. DETERMINISTIC VERIFY\]  
     Node.js Math Engine: Total \= Quantity \* UnitPrice \+ ShippingFee.  
     Strict 0% arithmetic hallucination.  
                            │  
                            ▼  
              \[4. HUMAN-IN-THE-LOOP GATE\]  
     Render "Action Card" in Next.js UI:  
     PO Total: \$750.00 | Selected Vendor: Supplier B | Lead Time: 6 Hours.  
                            │  
              ┌─────────────┴─────────────┐  
              │ User Clicks \[APPROVE\]     │ User Clicks \[REJECT/EDIT\]  
              ▼                           ▼  
    ┌────────────────────┐      ┌────────────────────┐  
    │  \[5. AUTO EXECUTE\] │      │  \[ROLLBACK / LOG\]  │  
    │  • Persist PO      │      │  Cancel proposal,  │  
    │  • Update MongoDB  │      │  record operator   │  
    │  • Send WA Webhook │      │  feedback to log   │  
    └────────────────────┘      └────────────────────┘  
\`\`\`

\---

\#\# 4\. Mongoose Database Schema Specifications

\#\#\# 4.1 Product Schema (\`src/models/Product.ts\`)  
\* \`sku\`: String (Indexed, Unique, Required)  
\* \`name\`: String (Required)  
\* \`category\`: String (Required)  
\* \`currentStock\`: Number (Default: 0\)  
\* \`safetyStock\`: Number (Required)  
\* \`reorderPoint\`: Number (Required)  
\* \`unitCost\`: Number (Required)  
\* \`avgDailyDemand\`: Number (Default: 0\)

\#\#\# 4.2 PurchaseOrder Schema (\`src/models/PurchaseOrder.ts\`)  
\* \`poNumber\`: String (Auto-generated: \`PO-YYYYMMDD-XXXX\`, Unique)  
\* \`supplierId\`: ObjectId (Ref: \`Supplier\`, Required)  
\* \`items\`: Array of \`\[{ sku: String, quantity: Number, unitPrice: Number, subtotal: Number }\]\`  
\* \`totalAmount\`: Number (Deterministic calculation)  
\* \`status\`: String (Enum: \`DRAFT\`, \`APPROVED\`, \`DISPATCHED\`, \`DELIVERED\`, \`SETTLED\`, \`PARTIAL_SETTLED\`, \`REJECTED\`)  
\* \`agentReasoningSummary\`: String  
\* \`approvedAt\`: Date  
\* \`receivedQuantity\`: Number · \`settledAmount\`: Number · \`settledAt\`: Date · \`deliveryNotes\`: String  
\* \`deliveryProofBoxesDetected\`: Number (sam-3.1 PoD count)  
\* \`parentPoNumber\`: String (Indexed) · \`failoverChildPoNumber\`: String · \`isFailoverOrder\`: Boolean · \`supplierAckStatus\`: Enum (\`PENDING_ACK\`, \`ACK_FULL_CAPACITY\`, \`ACK_PARTIAL_CAPACITY\`)  
\* \`escrowBreakdown\`: Sub-document (\`orderedQty\`, \`billableQty\`, \`shortfallQty\`, \`originalLockedEscrow\`, \`supplierPayout\`, \`buyerRefundSaved\`, \`slaPenaltyAmount\`, \`slaBreached\`) — server-computed by \`calculateEscrowSettlement\`, never client-supplied

\---

\#\# 5\. Deterministic 3-Way Match Escrow Formulas (\`src/lib/math.ts\`)

> AGENTS.md guardrail: 0% arithmetic inside LLM prompts. Every dollar below is pure TypeScript.

\`\`\`text
billableQty            = min(orderedQty, receivedQty)            // over-shipment capped at approval ceiling
shortfallQty           = orderedQty - billableQty
verifiedSubtotal       = round2(billableQty × unitPrice)
originalLockedEscrow   = round2(orderedQty × unitPrice + shippingFee)
slaPenalty             = slaBreached ? round2(verifiedSubtotal × 0.05) : 0   // + shipping waived
supplierPayout         = max(0, verifiedSubtotal − slaPenalty + effectiveShipping)
buyerRefundSaved       = max(0, originalLockedEscrow − supplierPayout)
status                 = billable==0 ? ZERO_DELIVERY_REFUND
                       : shortfall==0 && !sla ? FULL_SETTLEMENT : PARTIAL_SETTLEMENT
\`\`\`

\#\# 6\. Bilateral Split-Order Failover State Machine (\`POST /api/orders/failover\`)

\`\`\`text
PARTIAL_SETTLED (25/30, $375 paid, $75 reclaimed)
        │  POST /api/orders/failover { parentPoNumber, deliveredQuantity: 25 }
        ▼
calculateSplitOrderFailover: deficit = 5 → emergencyLot = min(backupMOQ, 10) = 10
        │  failover qty 10 × backup unitPrice → child total
        ▼
Child PO-…-F2 [DISPATCHED, isFailoverOrder, ACK_PARTIAL_CAPACITY]
  → WhatsApp → SUP-C → Product.$inc(+10) → parent.failoverChildPoNumber linked
Idempotent: second call returns existing -F2 without re-incrementing stock.
\`\`\`

\#\# 7\. Meta Multimodal Trifecta Pipeline (single MODEL_API_KEY)

| Stage | Model | Surface |
| :--- | :--- | :--- |
| Reasoning | \`muse-spark-1.3\` | SSE agent stream → DRAFT PO |
| Physical PoD | \`sam-3.1\` | \`verifyDeliveryWithSam\` (4s timeout → fixture) → box counts into \`/receive\` settlement |
| Hands-free ops | \`muse-voice-transcribe-1.0\` | \`transcribeWarehouseAudio\` (4s timeout → fixture) → \`VoiceCommandBar\` 1-click intents |
| Offline guarantee | fixtures | \`fallback-sam-delivery.json\`, \`fallback-voice-transcribe.json\` — widgets render with zero network |

\---

\#\# 8\. Real-World Storefront Loop (anti dead-air architecture)

\`\`\`text
POS-8841 / Receipt OCR → deplete CF-BEAN-1KG −14 → breach → workbenchPo anchor set
        │  5s poller PAUSES (workbenchOpen) — ActionCard keyed by poNumber, never unmounts
        ▼
Voice / scenario → agent.start(sku) → SSE → proposal → approve → WhatsApp emulator
        ▼
receive (escrow math) → vision dock (5/6 + damaged) → failover -F2 → PDF modal
        ▼
savedViaEscrow accumulates buyerRefundSaved → KPI kpi-escrow-saved → reset clears all
\`\`\`

State-reset guard: \`refresh()\` only touches \`items\`/\`pending\`; proposal, logs, phases,
supplierReply, pdfData, and savedViaEscrow survive every re-fetch until explicit reset.
