import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { PurchaseOrder } from '@/models/PurchaseOrder';
import '@/models/Supplier'; // register Supplier schema for populate()

export async function GET(): Promise<Response> {
  try {
    await dbConnect();
    const t0 = Date.now();
    const orders = await PurchaseOrder.find({})
      .sort({ createdAt: -1 })
      .populate('supplierId', 'name code contactPhone leadTimeHours')
      .lean();
    const res = ok(orders);
    res.headers.set('X-Query-Ms', String(Date.now() - t0));
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
