import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { Supplier } from '@/models/Supplier';

export async function GET(): Promise<Response> {
  try {
    await dbConnect();
    const t0 = Date.now();
    const suppliers = await Supplier.find({}).lean();
    const res = ok(suppliers);
    res.headers.set('X-Query-Ms', String(Date.now() - t0));
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Database error', 500);
  }
}
