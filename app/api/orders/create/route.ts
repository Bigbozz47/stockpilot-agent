import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { calculateDeficit, calculateOrderQuantity, calculateTotalCost } from '@/lib/math';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import { Supplier } from '@/models/Supplier';
import { Product } from '@/models/Product';

const CreateBody = z
  .object({
    sku: z.string().trim().min(1).max(64),
    supplierCode: z.string().trim().min(1).max(16).toUpperCase(),
  })
  .strict();

function genPoNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `PO-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = CreateBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const { sku, supplierCode } = parsed.data;
    await dbConnect();
    const [product, supplier] = await Promise.all([
      Product.findOne({ sku }).lean(),
      Supplier.findOne({ code: supplierCode }).lean(),
    ]);
    if (!product) return fail(`SKU not found: ${sku}`, 404);
    if (!supplier) return fail(`Supplier not found: ${supplierCode}`, 404);
    // Deterministic proposal: deficit → MOQ-snapped qty → cent-rounded total.
    const deficit = calculateDeficit(
      product.currentStock, product.safetyStock, product.avgDailyDemand ?? 0,
      supplier.leadTimeHours / 24,
    );
    const quantity = calculateOrderQuantity(deficit, supplier.minOrderQty);
    const unitPrice = Math.round(product.unitCost * supplier.priceMultiplier * 100) / 100;
    const subtotal = calculateTotalCost(quantity, unitPrice);
    const po = await PurchaseOrder.create({
      poNumber: genPoNumber(),
      supplierId: supplier._id,
      items: [{ sku: product.sku, name: product.name, quantity, unitPrice, subtotal }],
      totalAmount: subtotal,
      status: 'DRAFT',
      agentReasoningSummary: `Deficit ${deficit} → qty ${quantity} @ Rp${unitPrice} from ${supplier.code} (${supplier.leadTimeHours}h lead)`,
    });
    return ok(po.toObject(), 201);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
