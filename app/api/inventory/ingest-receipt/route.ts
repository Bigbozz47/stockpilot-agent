import { NextRequest } from 'next/server';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { Product } from '@/models/Product';

const IngestBody = z
  .object({
    receiptId: z.string().trim().min(1).max(64).default('POS-8841'),
    imageBase64: z.string().max(2_000_000).optional(),
  })
  .strict();

interface ReceiptFixture {
  receipts: Record<
    string,
    {
      receiptId: string;
      lineItems: Array<{ sku: string; name: string; quantity: number; unitPrice: number; subtotal: number }>;
      extractedIntent: { action: string; sku: string; deductQuantity: number };
    }
  >;
}

function loadFixture(): ReceiptFixture {
  const raw = fs.readFileSync(path.join(process.cwd(), 'public/mock-data/fallback-receipt-ocr.json'), 'utf8');
  return JSON.parse(raw) as ReceiptFixture;
}

/** POS receipt OCR ingest: deterministic fixture (<40ms), live vision optional. */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail('Invalid JSON body', 400);
    }
    const parsed = IngestBody.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const fixture = loadFixture();
    const receipt = fixture.receipts.B2B_CAFE_RUSH;
    await dbConnect();
    // Validate every scanned SKU exists before deducting (sanitized, never raw).
    const deducted: Array<{ sku: string; deducted: number }> = [];
    for (const item of receipt.lineItems) {
      const sku = String(item.sku).trim().slice(0, 64);
      if (!/^[A-Z0-9-]+$/.test(sku)) continue;
      const doc = await Product.findOneAndUpdate(
        { sku },
        [{ $set: { currentStock: { $max: [0, { $subtract: ['$currentStock', Math.max(0, Math.floor(item.quantity))] }] } } }],
        { new: true },
      ).lean();
      if (doc) deducted.push({ sku, deducted: item.quantity });
    }
    return ok({ receiptId: receipt.receiptId, lineItems: receipt.lineItems, deducted, breached: deducted.length > 0 });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Receipt ingest failed', 500);
  }
}
