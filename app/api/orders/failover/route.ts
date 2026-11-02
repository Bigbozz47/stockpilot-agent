import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { PONumber } from '@/lib/poNumber';
import { calculateSplitOrderFailover } from '@/lib/math';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import { Supplier } from '@/models/Supplier';
import { Product } from '@/models/Product';
import { AgentAuditLog } from '@/models/AgentAuditLog';
import { sendFailoverDispatchNotification } from '@/services/notification';

const FailoverBody = z
  .object({
    parentPoNumber: PONumber,
    deliveredQuantity: z.number().int().min(0).max(100000),
    backupSupplierCode: z.string().trim().min(1).max(16).toUpperCase().optional(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = FailoverBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const { parentPoNumber, deliveredQuantity, backupSupplierCode } = parsed.data;
    await dbConnect();

    // Idempotent: a parent spawns at most one -F2 child.
    const existingChild = await PurchaseOrder.findOne({ parentPoNumber }).lean();
    if (existingChild) {
      return ok({ child: existingChild, idempotent: true });
    }

    const parent = await PurchaseOrder.findOne({ poNumber: parentPoNumber }).lean();
    if (!parent) return fail(`Parent PO not found: ${parentPoNumber}`, 404);
    const orderedQty = parent.items.reduce((a, i) => a + i.quantity, 0);
    if (deliveredQuantity >= orderedQty) {
      return fail('No shortfall — failover not required (delivered >= ordered)', 400);
    }
    const primaryUnitPrice = parent.items[0]?.unitPrice ?? 0;
    const sku = parent.items[0]?.sku ?? '';
    const productName = parent.items[0]?.name ?? sku;

    const backup =
      (backupSupplierCode ? await Supplier.findOne({ code: backupSupplierCode }).lean() : null) ??
      (await Supplier.findOne({ code: 'SUP-C' }).lean());
    if (!backup) return fail('Backup supplier unavailable (SUP-C missing)', 500);

    // All recovery math deterministic — never LLM-derived.
    const backupUnitPrice = Math.round((await unitCostOf(sku)) * backup.priceMultiplier * 100) / 100;
    const failover = calculateSplitOrderFailover({
      primaryOrderedQty: orderedQty,
      primaryDeliveredQty: deliveredQuantity,
      primaryUnitPrice,
      backupUnitPrice,
      backupMinOrderQty: backup.minOrderQty,
    });

    if (!failover.failoverRequired) return fail('No shortfall — failover not required', 400);

    const childPoNumber = `${parentPoNumber}-F2`;
    const childSubtotal = Math.round(failover.failoverOrderQty * backupUnitPrice * 100) / 100;

    const child = await PurchaseOrder.create({
      poNumber: childPoNumber,
      supplierId: backup._id,
      items: [{ sku, name: productName, quantity: failover.failoverOrderQty, unitPrice: backupUnitPrice, subtotal: childSubtotal }],
      totalAmount: childSubtotal,
      status: 'DISPATCHED',
      agentReasoningSummary: `Failover for ${parentPoNumber}: ${failover.unfulfilledDeficit} shortfall → ${failover.failoverOrderQty} via ${backup.code}.`,
      parentPoNumber,
      isFailoverOrder: true,
      supplierAckStatus: 'ACK_PARTIAL_CAPACITY',
    });

    await PurchaseOrder.updateOne({ poNumber: parentPoNumber }, { $set: { failoverChildPoNumber: childPoNumber } });

    // Recovery stock lands immediately: backup express courier tops up to full coverage.
    await Product.updateOne({ sku }, { $inc: { currentStock: failover.failoverOrderQty } });

    await AgentAuditLog.create({
      triggerSku: sku,
      initialStock: 0,
      timestamp: new Date(),
      reasoningTrace: [
        `BILATERAL RESOLUTION ${parentPoNumber}: primary paid pro-rata, buyer reclaim Rp${failover.primaryEscrowRefunded.toLocaleString('id-ID')}`,
        `Failover ${childPoNumber} → ${backup.code} × ${failover.failoverOrderQty} (Rp${failover.failoverTotalCost.toLocaleString('id-ID')}), revenue protected Rp${failover.protectedRevenueValue.toLocaleString('id-ID')}`,
      ],
      selectedSupplierCode: backup.code,
      proposalPoNumber: childPoNumber,
      status: 'DISPATCHED',
    });

    const notification = sendFailoverDispatchNotification(
      childPoNumber, parentPoNumber, backup, failover.failoverOrderQty, failover.failoverTotalCost,
    );

    return ok({ child: child.toObject(), failover, backupSupplierCode: backup.code, notificationSentTo: notification.to }, 201);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}

async function unitCostOf(sku: string): Promise<number> {
  const { Product } = await import('@/models/Product');
  const p = await Product.findOne({ sku }).lean();
  return p?.unitCost ?? 0;
}
