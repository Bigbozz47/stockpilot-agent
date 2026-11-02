import { dbConnect } from '@/lib/db';
import { fail, ok } from '@/lib/apiResponse';
import { resetDemoData } from '@/lib/demoSeed';

/** Demo-only fast reset. Blocked in production unless explicitly enabled. */
export async function POST(): Promise<Response> {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_RESET !== 'true') {
      return fail('Demo reset is disabled in production', 403);
    }
    const t0 = Date.now();
    const counts = await resetDemoData();
    const ms = Date.now() - t0;
    const res = ok({ ...counts, ms });
    res.headers.set('X-Reset-Ms', String(ms));
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Reset failed', 500);
  }
}
