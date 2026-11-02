import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { PONumber } from '@/lib/poNumber';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import { Supplier } from '@/models/Supplier';
import { AgentAuditLog } from '@/models/AgentAuditLog';
import { sendVendorWhatsAppNotification } from '@/services/notification';

const ApproveBody = z.object({ poNumber: PONumber }).strict();

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = ApproveBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const { poNumber } = parsed.data;
    await dbConnect();
    // Guarded transition: only DRAFT may move to DISPATCHED (single atomic op, race-safe).
    const po = await PurchaseOrder.findOneAndUpdate(
      { poNumber, status: 'DRAFT' },
      { $set: { status: 'DISPATCHED', approvedAt: new Date() } },
      { new: true },
    ).lean();
    if (!po) {
      const existing = await PurchaseOrder.findOne({ poNumber }).lean();
      if (!existing) return fail(`PO not found: ${poNumber}`, 404);
      return fail(`Cannot approve PO in status ${existing.status} (must be DRAFT)`, 400);
    }
    const supplier = await Supplier.findById(po.supplierId).lean();
    if (!supplier) return fail('Supplier missing for approved PO (data integrity)', 500);
    await AgentAuditLog.create({
      triggerSku: po.items[0]?.sku ?? 'UNKNOWN',
      initialStock: 0,
      reasoningTrace: ['Operator APPROVED — PO dispatched'],
      selectedSupplierCode: supplier.code,
      proposalPoNumber: po.poNumber,
      status: 'DISPATCHED',
    });
    const notification = sendVendorWhatsAppNotification(po, supplier);
    return ok({ po, notificationSentTo: notification.to });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
