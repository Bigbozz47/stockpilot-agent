import { beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

function loadLocalEnv(): void {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
  }
}

beforeAll(async () => {
  loadLocalEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing — is MongoDB running?');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const { resetDemoData } = await import('../src/lib/demoSeed');
  await resetDemoData();
}, 15000);

describe('GET /api/inventory', () => {
  it('returns 200 with valid product schema', async () => {
    const { GET } = await import('../app/api/inventory/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: any[] };
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(10);
    for (const p of json.data) {
      expect(typeof p.sku).toBe('string');
      expect(typeof p.currentStock).toBe('number');
      expect(typeof p.isBelowSafetyStock).toBe('boolean');
      expect(typeof p.deficit).toBe('number');
      expect(p.currentStock).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects invalid upsert payloads with 400 and no stack trace', async () => {
    const { POST } = await import('../app/api/inventory/route');
    const bad = new Request('http://localhost/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'X', name: 'x', category: 'x', currentStock: -5, safetyStock: 1, reorderPoint: 1, unitCost: 1 }),
    });
    const res = await POST(bad as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).not.toMatch(/at |node_modules|stack/i);
  });
});

describe('POST /api/inventory/deplete', () => {
  it('drains stock and flags breach deterministically', async () => {
    const { Product } = await import('../src/models/Product');
    await Product.updateOne({ sku: 'MLK-FULL-1L' }, { $set: { currentStock: 30 } });
    const { POST } = await import('../app/api/inventory/deplete/route');
    const req = new Request('http://localhost/api/inventory/deplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MLK-FULL-1L', quantityToDeduct: 25 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { currentStock: number; breached: boolean; deficit: number } };
    expect(json.data.currentStock).toBe(5);
    expect(json.data.breached).toBe(true);
    expect(json.data.deficit).toBe(25);
  });

  it('clamps at zero on over-depletion (never negative)', async () => {
    const { Product } = await import('../src/models/Product');
    await Product.updateOne({ sku: 'CF-BEAN-1KG' }, { $set: { currentStock: 8 } });
    const { POST } = await import('../app/api/inventory/deplete/route');
    const req = new Request('http://localhost/api/inventory/deplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'CF-BEAN-1KG', quantityToDeduct: 100000 }),
    });
    const json = (await (await POST(req as never)).json()) as { success: boolean; data: { currentStock: number; breached: boolean } };
    expect(json.data.currentStock).toBe(0);
    expect(json.data.breached).toBe(true);
  });

  it('returns 404 for unknown SKU and 400 for malformed input', async () => {
    const { POST } = await import('../app/api/inventory/deplete/route');
    const mk = (body: unknown) =>
      new Request('http://localhost/api/inventory/deplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await POST(mk({ sku: 'NOPE-001', quantityToDeduct: 1 }) as never)).status).toBe(404);
    expect((await POST(mk({ sku: '', quantityToDeduct: -3 }) as never)).status).toBe(400);
    expect((await POST(mk({ sku: '"; DROP TABLE x; --', quantityToDeduct: 1 }) as never)).status).toBe(404);
  });
});

describe('POST /api/orders/approve + /reject', () => {
  it('rejects non-existent POs with 404', async () => {
    const { POST } = await import('../app/api/orders/approve/route');
    const req = new Request('http://localhost/api/orders/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poNumber: 'PO-20200101-NOPE' }),
    });
    expect((await POST(req as never)).status).toBe(404);
  });

  it('rejects duplicate approval on the same PO with 400', async () => {
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const { Supplier } = await import('../src/models/Supplier');
    const supB = await Supplier.findOne({ code: 'SUP-B' }).lean();
    const poNumber = `PO-20200101-TST${Date.now() % 10000}`;
    await PurchaseOrder.create({
      poNumber,
      supplierId: supB!._id,
      items: [{ sku: 'MLK-FULL-1L', name: 'Full Cream Milk 1L', quantity: 10, unitPrice: 23100, subtotal: 231000 }],
      totalAmount: 231000,
      status: 'DRAFT',
      agentReasoningSummary: 'test',
    });
    const { POST } = await import('../app/api/orders/approve/route');
    const mk = () =>
      new Request('http://localhost/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber }),
      });
    expect((await POST(mk() as never)).status).toBe(200);
    const second = await POST(mk() as never);
    expect(second.status).toBe(400);
    const json = (await second.json()) as { error: string };
    expect(json.error).toMatch(/DISPATCHED/i);
  });

  it('returns 400 for malformed poNumber without stack traces', async () => {
    const { POST } = await import('../app/api/orders/reject/route');
    const req = new Request('http://localhost/api/orders/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poNumber: '../../etc/passwd' }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).not.toMatch(/at |node_modules/i);
  });

  it('rejects an already-dispatched PO with 400', async () => {
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const dispatched = await PurchaseOrder.findOne({ status: 'DISPATCHED' }).lean();
    if (!dispatched) return;
    const { POST } = await import('../app/api/orders/reject/route');
    const req = new Request('http://localhost/api/orders/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poNumber: dispatched.poNumber, reason: 'too late' }),
    });
    expect((await POST(req as never)).status).toBe(400);
  });
});

describe('POST /api/orders/receive', () => {
  it('settles a DISPATCHED PO and restocks inventory', async () => {
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const { Supplier } = await import('../src/models/Supplier');
    const { Product } = await import('../src/models/Product');
    const supB = await Supplier.findOne({ code: 'SUP-B' }).lean();
    const poNumber = `PO-20200102-RCV${Date.now() % 10000}`;
    await PurchaseOrder.create({
      poNumber,
      supplierId: supB!._id,
      items: [{ sku: 'CF-BEAN-1KG', name: 'Premium Coffee Beans 1kg', quantity: 15, unitPrice: 152250, subtotal: 2283750 }],
      totalAmount: 2283750,
      status: 'DISPATCHED',
      agentReasoningSummary: 'test receive',
    });
    await Product.updateOne({ sku: 'CF-BEAN-1KG' }, { $set: { currentStock: 6 } });
    const { POST } = await import('../app/api/orders/receive/route');
    const mk = (qty: number) =>
      new Request('http://localhost/api/orders/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber, receivedQuantity: qty }),
      });
    const res = await POST(mk(15) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { po: { status: string }; escrow: { supplierPayout: number; buyerRefundSaved: number } } };
    expect(json.data.po.status).toBe('SETTLED');
    expect(json.data.escrow.supplierPayout).toBe(2283750);
    expect(json.data.escrow.buyerRefundSaved).toBe(0);
    const after = await Product.findOne({ sku: 'CF-BEAN-1KG' }).lean();
    expect(after?.currentStock).toBe(21);
    expect((await POST(mk(15) as never)).status).toBe(400);
    const after2 = await Product.findOne({ sku: 'CF-BEAN-1KG' }).lean();
    expect(after2?.currentStock).toBe(21);
  });

  it('partially settles with pro-rata escrow', async () => {
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const { Supplier } = await import('../src/models/Supplier');
    const supB = await Supplier.findOne({ code: 'SUP-B' }).lean();
    const poNumber = `PO-20200102-PRT${Date.now() % 10000}`;
    await PurchaseOrder.create({
      poNumber,
      supplierId: supB!._id,
      items: [{ sku: 'MLK-FULL-1L', name: 'Full Cream Milk 1L', quantity: 10, unitPrice: 23100, subtotal: 231000 }],
      totalAmount: 231000,
      status: 'DISPATCHED',
      agentReasoningSummary: 'test partial',
    });
    const { POST } = await import('../app/api/orders/receive/route');
    const res = await POST(
      new Request('http://localhost/api/orders/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber, receivedQuantity: 6 }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { po: { status: string }; escrow: { supplierPayout: number; buyerRefundSaved: number } } };
    expect(json.data.po.status).toBe('PARTIAL_SETTLED');
    expect(json.data.escrow.supplierPayout).toBe(138600);
    expect(json.data.escrow.buyerRefundSaved).toBe(92400);
  });

  it('rejects DRAFT POs and unknown POs', async () => {
    const { POST } = await import('../app/api/orders/receive/route');
    const mk = (body: unknown) =>
      new Request('http://localhost/api/orders/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await POST(mk({ poNumber: 'PO-20200102-NOPE', receivedQuantity: 5 }) as never)).status).toBe(404);
    expect((await POST(mk({ poNumber: 'bad-format', receivedQuantity: 5 }) as never)).status).toBe(400);
    expect((await POST(mk({ poNumber: 'PO-20200102-NOPE', receivedQuantity: -1 }) as never)).status).toBe(400);
  });
});

describe('POST /api/orders/failover', () => {
  it('spawns a linked -F2 child and prevents duplicates', async () => {
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const { Supplier } = await import('../src/models/Supplier');
    const supB = await Supplier.findOne({ code: 'SUP-B' }).lean();
    const poNumber = `PO-20200102-FO${Date.now() % 10000}`;
    await PurchaseOrder.create({
      poNumber,
      supplierId: supB!._id,
      items: [{ sku: 'CF-BEAN-1KG', name: 'Premium Coffee Beans 1kg', quantity: 30, unitPrice: 152250, subtotal: 4567500 }],
      totalAmount: 4567500,
      status: 'PARTIAL_SETTLED',
      agentReasoningSummary: 'test failover',
    });
    const { POST } = await import('../app/api/orders/failover/route');
    const mk = () =>
      new Request('http://localhost/api/orders/failover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPoNumber: poNumber, deliveredQuantity: 25 }),
      });
    const first = await POST(mk() as never);
    expect(first.status).toBe(201);
    const fj = (await first.json()) as { success: boolean; data: { child: { poNumber: string }; failover: { failoverOrderQty: number } } };
    expect(fj.data.child.poNumber).toBe(`${poNumber}-F2`);
    expect(fj.data.failover.failoverOrderQty).toBeGreaterThanOrEqual(5);
    const second = await POST(mk() as never);
    expect(second.status).toBe(200);
    const sj = (await second.json()) as { success: boolean; data: { idempotent: boolean } };
    expect(sj.data.idempotent).toBe(true);
  });

  it('rejects failover when no shortfall exists', async () => {
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const parent = await PurchaseOrder.findOne({ status: 'PARTIAL_SETTLED' }).lean();
    if (!parent) return;
    const { POST } = await import('../app/api/orders/failover/route');
    const res = await POST(
      new Request('http://localhost/api/orders/failover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPoNumber: parent.poNumber, deliveredQuantity: 99999 }),
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /api/voice/transcribe', () => {
  it('returns URGENT_RESTOCK preset with bias keywords', async () => {
    const { POST } = await import('../app/api/voice/transcribe/route');
    const res = await POST(
      new Request('http://localhost/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId: 'URGENT_RESTOCK_VOICE' }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { transcript: string; modelUsed: string; extractedIntent: { action: string; sku: string } } };
    expect(json.data.modelUsed).toBe('muse-voice-transcribe-1.0');
    expect(json.data.transcript).toMatch(/COF-001/);
    expect(json.data.extractedIntent.action).toBe('TRIGGER_DEPLETION_AND_AGENT');
  });

  it('returns PARTIAL_POD preset with receipt quantity', async () => {
    const { POST } = await import('../app/api/voice/transcribe/route');
    const res = await POST(
      new Request('http://localhost/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId: 'PARTIAL_POD_VOICE' }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { extractedIntent: { receivedQuantity: number } } };
    expect(json.data.extractedIntent.receivedQuantity).toBe(25);
  });
});

describe('GET /api/orders', () => {
  it('returns desc-sorted list with populated supplier', async () => {
    const { GET } = await import('../app/api/orders/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: any[] };
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    const times = json.data.map((o) => new Date(o.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
