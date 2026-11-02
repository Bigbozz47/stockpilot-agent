import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { calculateDeficit } from '@/lib/math';
import { Product } from '@/models/Product';

const DepleteBody = z
  .object({
    sku: z.string().trim().min(1).max(64),
    quantityToDeduct: z.number().int().min(1).max(100000),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = DepleteBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const { sku, quantityToDeduct } = parsed.data;
    await dbConnect();
    // Atomic decrement clamped at 0 via pipeline update (single round-trip, race-safe).
    const doc = await Product.findOneAndUpdate(
      { sku },
      [{ $set: { currentStock: { $max: [0, { $subtract: ['$currentStock', quantityToDeduct] }] } } }],
      { new: true },
    ).lean();
    if (!doc) return fail(`SKU not found: ${sku}`, 404);
    const deficit = calculateDeficit(doc.currentStock, doc.safetyStock, doc.avgDailyDemand ?? 0, 0);
    const breached = doc.currentStock < doc.safetyStock;
    return ok({ sku: doc.sku, currentStock: doc.currentStock, safetyStock: doc.safetyStock, deficit, breached });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
