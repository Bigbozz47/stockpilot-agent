# 🛒 StockPilot Agent™ — UNP Mart Autonomous Supply-Chain & Procurement Console

> **Target Event:** Meta Global AI Developer Hackathon  
> **Category:** Autonomous Enterprise Agent · Multimodal Retail Operations · Closed-Loop Spend Governance  
> **Design Identity:** UNP Mart Enterprise Monitoring Dashboard (Promax & 21st.dev UX — Zero "AI Slop")  
> **Status:** 🟢 Production-Ready Prototype (Live Meta Model API + 100% Offline Mock Fallback)

---

## 📌 1. Executive Summary

**StockPilot Agent™** is an autonomous inventory replenishment and procurement orchestration engine custom-built for multi-branch retail, F&B franchise operators, and high-velocity convenience stores like **UNP Mart** in Southeast Asia.

Rather than functioning as a passive ledger or a generic conversational chatbot wrapper, **StockPilot Agent™** operates as an **Autonomous Action-Oriented Agent** executing a continuous **Observe → Reason → Plan → Act → Verify** control loop. It proactively detects inventory depletion anomalies from point-of-sale (POS) checkouts, evaluates multi-supplier constraints (unit pricing, Minimum Order Quantities [MOQ], and delivery lead times), generates a verified Purchase Order (PO) in under **5 seconds** via a secure 1-click human approval gate, inspects physical delivery cartons at the warehouse dock using computer vision, and automatically settles escrow payments.

### 🎯 Core Objectives & Metrics

| Operational Goal | Measurement Metric | Target Achievement |
| :--- | :--- | :--- |
| **Stockout Mitigation** | Revenue lost to stockouts during demand spikes | Reduced from 12% to **< 2%** |
| **Procurement Velocity** | Time from stockout trigger to dispatch-ready PO | Cut from 2–3 hours to **< 5 seconds** |
| **Financial & Math Accuracy** | Arithmetic calculation errors or LLM token hallucinations | **0%** (enforced by deterministic code in `src/lib/math.ts`) |
| **Spend Governance** | Rogue or unauthorized purchase orders | **0%** (100% guarded via 1-Click Approval & Escrow) |
| **Decision Explainability** | Transparent auditability of supplier selection logic | 100% observable via Server-Sent Events (SSE) reasoning streams |

---

## 🧠 2. Meta Model API Ecosystem Leverage (Multimodal Architecture)

The project heavily utilizes native multimodal capabilities from the **Meta Model API** (`https://api.meta.ai/v1`) under a unified `MODEL_API_KEY`:

1. **Meta Muse Wonder (`muse-wonder-1.0`) & Muse Spark (`muse-spark-1.3`):**
   * Acts as the core reasoning engine with a 1M-token context window, parallel tool calling, and **Strict Structured Outputs** (`response_format: json_schema` with `strict: true`).
   * Evaluates complex trade-offs between wholesale bulk pricing and express delivery speed during weekend demand surges.
2. **Meta Segment Anything Model 3.1 (`sam-3.1`):**
   * Powers the **Smart Warehouse Camera Dock (Proof-of-Delivery)** module to segment and count physical delivery cartons (`bounding boxes` & `masks`) arriving at the loading bay.
   * Differentiates intact cartons from crushed or missing goods before releasing escrow funds.
3. **Meta Muse Voice Transcribe (`muse-voice-transcribe-1.0`):**
   * Powers the **Hands-Free Warehouse Voice Ops** module for speech-to-text reporting with bilingual code-switching (Indonesian & English) and custom SKU keyword biasing (`COF-001`, `MLK-002`, `UNP Mart`).
4. **Meta Muse Image (`muse-image-1.0`) & Image Understanding:**
   * Facilitates invoice/receipt OCR ingestion and visual asset verification.

---

## ✨ 3. Key Features & Real-World Modules

To achieve a **100% Closed-Loop Procurement Lifecycle**, **StockPilot Agent™** incorporates 8 integrated modules:

### 3.1 🛒 Live Store POS Checkout & Physical Receipt Scanner
* Simulates real-world store transactions (e.g., weekend bulk cafe orders) or lets operators scan physical supplier invoices / daily sales CSVs.
* Atomically decrements stock via `/api/inventory/deplete` and flags safety stock breaches (`CRITICAL_BREACH`).

### 3.2 ⚡ Live Agent Reasoning Terminal (SSE Stream)
* Streams the agent's internal thought process in real-time via Server-Sent Events (`/api/agent/stream`) with color-coded OODA trace tags: `[OBSERVE]` (Cyan), `[REASON]` (Amber), `[TOOL]` (Purple), and `[VERIFY]` (Emerald).

### 3.3 ⚖️ Multi-Vendor Trade-Off Scorecard (`VendorCompare.tsx`)
* Evaluates three competing supplier profiles side-by-side:
  * **Supplier A (Local Bulk Wholesaler):** Lowest unit price, high MOQ (50 units), slow lead time (**48 hours**) — *Automatically rejected during weekend crises to prevent stockouts*.
  * **Supplier B (Express Logistics Hub):** 5% price premium, low MOQ (10 units), express lead time (**6 hours**) — *AI-selected to protect weekend revenue*.
  * **Supplier C (Regional Distributor):** Standard pricing, 24h lead time — *Reserved for split-order failover*.

### 3.4 📐 Deterministic Math & 3-Way Match Escrow Engine (`src/lib/math.ts`)
* **Strict Anti-Hallucination Guardrail:** The LLM is strictly forbidden from performing arithmetic inside prompts. All calculations (deficits, MOQ rounding, package sizing, total costs, escrow refunds) execute in pure TypeScript.

### 3.5 🎙️ Hands-Free Warehouse Voice Ops (`muse-voice-transcribe-1.0`)
* Allows warehouse supervisors to report stock levels hands-free using natural bilingual voice memos.

### 3.6 📱 Interactive Two-Way WhatsApp Business Supplier Emulator
* Upon clicking `[Approve & Dispatch PO]`, the system dispatches an official WhatsApp message to **Supplier B** containing the PO number, MOQ quantity, locked escrow funds, and 6-hour SLA timer.
* Supports interactive supplier responses: full acceptance (`[✅ Order Accepted — En Route]`) or partial shortage alerts (`[⚠️ Shipping 25kg, 1 Carton Short]`).

### 3.7 📷 Smart Warehouse Camera Dock (`sam-3.1`) & Escrow Guardrail
* **Buyer & Supplier Protection:**
  * **Full Delivery (30/30 kg):** Escrow funds (**$450**) are fully released to Supplier B, stock for `COF-001` atomically increases from `6 kg` to `36 kg`, returning the SKU status to `HEALTHY`.
  * **Partial Delivery / Damaged Goods (25/30 kg):** The system automatically releases a fair pro-rata payout of **$375** to Supplier B for verified goods, refunds **$75** to UNP Mart's working capital (updating the `SAVED VIA ESCROW GUARDRAIL` counter), and **autonomously spawns a Split-Order Failover Child PO (`-F2`) for the remaining 5 kg to Supplier C**.

### 3.8 📄 Official Purchase Order & Escrow Audit PDF Generator
* Generates audit-ready PDF documents via `/api/orders/export-pdf` and features an in-app `PdfPreviewModal` displaying itemized 3-way match ledgers.

---

## 🎨 4. Design Philosophy: UNP Mart Enterprise Monitoring Dashboard

Designed following **Promax UX & 21st.dev** standards (Zero "AI Slop"), the UI mirrors the official **UNP Mart** brand identity:
* **Canvas Background:** Crisp Pure White (`#FFFFFF`) and Cool Alabaster (`#F8FAFC`).
* **UNP Mart Primary Green (`#4CAF50`):** Indicates healthy stock (`HEALTHY`), verified actions, and settled escrows.
* **UNP Mart Signature Yellow (`#FFEB3B` / `#FBC02D` with `#212121` text):** Highlights active alerts and escrow-locked funds.
* **UNP Mart Deep Charcoal (`#212121`):** Provides high-contrast typography and terminal headers.

---

## 🛠️ 5. Technical Stack

| Layer | Technology | Primary Function |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14+ (App Router) + React 19 | Responsive operator console & split-screen layout |
| **Language** | TypeScript 5+ | End-to-end static type safety & schema validation |
| **Styling** | Tailwind CSS v4 + Framer Motion | High-density data layout & 60 FPS micro-interactions |
| **Realtime Stream** | Server-Sent Events (SSE) | Live agent thought streaming |
| **Backend API** | Node.js / Next.js Route Handlers | REST API orchestrator for inventory, suppliers, and orders |
| **Database** | MongoDB + Mongoose ODM (`.lean()` optimized) | Relational document store for products, vendors, and POs |
| **AI / Multimodal Core** | Meta Model API (`muse-wonder-1.0`, `sam-3.1`, `muse-voice-transcribe-1.0`) | Contextual reasoning, visual segmentation, and voice transcription |
| **Validation** | Zod v3 + Mongoose Validators | Strict request validation & structured JSON schemas |
| **Testing & QA** | Vitest / Jest + Playwright (Chromium 1080p) | Unit testing, API integration tests, and 3-minute E2E video recording |

---

## 🚀 6. Installation & Quickstart

### Prerequisites
* **Node.js:** v20.x or higher
* **Database:** Local MongoDB (`mongodb://127.0.0.1:27017/stockpilot`) or MongoDB Atlas
* **API Key:** `MODEL_API_KEY` from **Meta Model API** (Optional when running in offline mock mode)

### Setup Steps

1. **Clone repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables (`.env.local`):**
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/stockpilot
   MODEL_API_KEY=your_meta_model_api_key_here
   MUSE_MODEL_ID=muse-spark-1.3
   USE_MOCK_AGENT=false
   PORT=3000
   ```
   > *Tip:* Set `USE_MOCK_AGENT=true` to run completely offline without internet or API credit consumption.

3. **Start MongoDB & seed initial store data:**
   ```bash
   npm run seed
   ```

4. **Launch development server:**
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 7. Quality Assurance & Automated Demo Recording

1. **Type Checking:** `npx tsc --noEmit`
2. **Run Unit & API Tests:** `npm test`
3. **Production Build:** `npm run build`
4. **Record 3-Minute E2E Demo Video (Playwright):**
   ```bash
   npx playwright test tests/e2e-demo-recording.spec.ts
   ```
```

Let me know if you need any further adjustments to the documentation or additional sections!
