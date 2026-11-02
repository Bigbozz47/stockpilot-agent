import { NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { PONumber } from '@/lib/poNumber';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import { AgentAuditLog } from '@/models/AgentAuditLog';

const RejectBody = z
  .object({
    poNumber: PONumber,
    reason: z.string().trim().max(500).default('Rejected by operator'),
  })
  .strict();

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = RejectBody.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const { poNumber, reason } = parsed.data;
    await dbConnect();
    // Guarded: only DRAFT may be rejected; APPROVED/DISPATCHED/REJECTED → 400.
    const po = await PurchaseOrder.findOneAndUpdate(
      { poNumber, status: 'DRAFT' },
      { $set: { status: 'REJECTED' } },
      { new: true },
    ).lean();
    if (!po) {
      const existing = await PurchaseOrder.findOne({ poNumber }).lean();
      if (!existing) return fail(`PO not found: ${poNumber}`, 404);
      return fail(`Cannot reject PO in status ${existing.status} (must be DRAFT)`, 400);
    }
    await AgentAuditLog.create({
      triggerSku: po.items[0]?.sku ?? 'UNKNOWN',
      initialStock: 0,
      reasoningTrace: [`Operator REJECTED: ${reason}`],
      selectedSupplierCode: '',
      proposalPoNumber: po.poNumber,
      status: 'REJECTED',
    });
    return ok(po);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
