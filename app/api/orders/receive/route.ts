import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { PONumber } from '@/lib/poNumber';
import { calculateEscrowSettlement } from '@/lib/math';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import { Supplier } from '@/models/Supplier';
import { Product } from '@/models/Product';
import { AgentAuditLog } from '@/models/AgentAuditLog';
import { sendSettlementConfirmation } from '@/services/notification';
import { verifyDeliveryWithSam } from '@/services/visionVerifier';
import { logger } from '@/lib/logger';

const ReceiveBody = z
  .object({
    poNumber: PONumber,
    receivedQuantity: z.number().int().min(0).max(100000),
    deliveryNotes: z.string().trim().max(1000).optional(),
    slaBreached: z.boolean().optional(),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = ReceiveBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const { poNumber, receivedQuantity, deliveryNotes, slaBreached } = parsed.data;
    await dbConnect();

    // Guard: only DISPATCHED/DELIVERED may settle. Settle-once enforced atomically below.
    const po = await PurchaseOrder.findOne({ poNumber }).lean();
    if (!po) return fail(`PO not found: ${poNumber}`, 404);
    if (po.status === 'SETTLED' || po.status === 'PARTIAL_SETTLED') {
      return fail(`PO already settled (status ${po.status}) — refusing duplicate stock increment`, 400);
    }
    if (po.status !== 'DISPATCHED' && po.status !== 'DELIVERED') {
      return fail(`Cannot receive PO in status ${po.status} (must be DISPATCHED)`, 400);
    }

    const [supplier, product] = await Promise.all([
      Supplier.findById(po.supplierId).lean(),
      Product.findOne({ sku: po.items[0]?.sku }).lean(),
    ]);
    if (!supplier) return fail('Supplier missing for PO (data integrity)', 500);
    if (!product) return fail(`SKU missing for PO item: ${po.items[0]?.sku}`, 500);

    // All money math server-side from the locked DB record — never client-supplied.
    const orderedQty = po.items.reduce((a, i) => a + i.quantity, 0);
    const unitPrice = po.items[0]?.unitPrice ?? 0;
    const escrow = calculateEscrowSettlement({
      orderedQty,
      receivedQty: receivedQuantity,
      unitPrice,
      slaBreached: slaBreached === true,
    });
    const newStatus = escrow.settlementStatus === 'FULL_SETTLEMENT' ? 'SETTLED' : 'PARTIAL_SETTLED';

    // Atomic settle-once: filter on still-unsettled status so a racing duplicate gets no match.
    const settled = await PurchaseOrder.findOneAndUpdate(
      { poNumber, status: { $in: ['DISPATCHED', 'DELIVERED'] } },
      {
        $set: {
          status: newStatus,
          receivedQuantity: escrow.billableQty,
          settledAmount: escrow.supplierPayout,
          settledAt: new Date(),
          deliveryNotes: deliveryNotes?.slice(0, 1000) ?? '',
          escrowBreakdown: {
            orderedQty: escrow.orderedQty,
            billableQty: escrow.billableQty,
            shortfallQty: escrow.shortfallQty,
            originalLockedEscrow: escrow.originalLockedEscrow,
            supplierPayout: escrow.supplierPayout,
            buyerRefundSaved: escrow.buyerRefundSaved,
            slaPenaltyAmount: escrow.slaPenaltyAmount,
            slaBreached: escrow.slaBreached,
          },
        },
      },
      { new: true },
    ).lean();
    if (!settled) {
      return fail('PO was settled concurrently — refusing duplicate stock increment', 409);
    }

    // Vision verification (server-side only; auto-fallback < 4s, never blocks settlement).
    let vision: Awaited<ReturnType<typeof verifyDeliveryWithSam>> | null = null;
    try {
      const scenario = escrow.shortfallQty === 0 ? 'FULL' : 'PARTIAL';
      vision = await verifyDeliveryWithSam({ sku: product.sku, expectedBoxes: 6, simulatedScenario: scenario });
      await PurchaseOrder.updateOne({ poNumber }, { $set: { deliveryProofBoxesDetected: vision.detectedBoxes } });
    } catch (e) {
      logger.warn('vision', 'PoD verification skipped:', e instanceof Error ? e.message : e);
    }

    // Atomic restock by verified receipt only. Zero delivery → no stock movement.
    if (escrow.billableQty > 0) {
      await Product.updateOne({ sku: product.sku }, { $inc: { currentStock: escrow.billableQty } });
    }

    await AgentAuditLog.create({
      triggerSku: product.sku,
      initialStock: product.currentStock,
      timestamp: new Date(),
      reasoningTrace: [
        `Operator VERIFIED receipt ${escrow.billableQty}/${escrow.orderedQty} — 3-way match ${escrow.settlementStatus}`,
        `Escrow: payout Rp${escrow.supplierPayout.toLocaleString('id-ID')}, buyer refund Rp${escrow.buyerRefundSaved.toLocaleString('id-ID')}`,
      ],
      selectedSupplierCode: supplier.code,
      proposalPoNumber: po.poNumber,
      status: newStatus,
    });

    const notification = sendSettlementConfirmation(po.poNumber, supplier, escrow.supplierPayout, escrow.billableQty);
    return ok({ po: settled, escrow, vision, notificationSentTo: notification.to });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
