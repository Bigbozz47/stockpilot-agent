import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/apiResponse';
import { TranscribeVoiceInput, transcribeWarehouseAudio } from '@/services/voiceTranscriber';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail('Invalid JSON body', 400);
    }
    const parsed = TranscribeVoiceInput.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join('; '), 400);
    const t0 = Date.now();
    const result = await transcribeWarehouseAudio(parsed.data);
    const res = ok({ ...result, latencyMs: Date.now() - t0 });
    res.headers.set('X-Transcribe-Ms', String(Date.now() - t0));
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Transcription failed', 500);
  }
}
