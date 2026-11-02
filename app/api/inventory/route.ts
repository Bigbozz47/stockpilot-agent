import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { calculateDeficit } from '@/lib/math';
import { Product } from '@/models/Product';

const ProductBody = z
  .object({
    sku: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(100),
    currentStock: z.number().min(0),
    safetyStock: z.number().min(0),
    reorderPoint: z.number().min(0),
    unitCost: z.number().min(0),
    avgDailyDemand: z.number().min(0).default(0),
    unit: z.string().trim().max(16).default('pcs'),
  })
  .strict();

export async function GET(): Promise<Response> {
  try {
    await dbConnect();
    const t0 = Date.now();
    const products = await Product.find({}).lean();
    const data = products.map((p) => {
      const deficit = calculateDeficit(p.currentStock, p.safetyStock, p.avgDailyDemand ?? 0, 0);
      return { ...p, isBelowSafetyStock: p.currentStock < p.safetyStock, deficit };
    });
    const res = ok(data);
    res.headers.set('X-Query-Ms', String(Date.now() - t0));
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = ProductBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    await dbConnect();
    const doc = await Product.findOneAndUpdate(
      { sku: parsed.data.sku },
      { $set: parsed.data },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    return ok(doc, 200);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
