import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { VoicePresetId, VoiceTranscriptionResult } from '@/types/index';
import { logger } from '@/lib/logger';

export const VOICE_BIAS_KEYWORDS = [
  'COF-001',
  'MLK-002',
  'MTC-003',
  'UNP Mart',
  'Safety Stock',
  'Escrow',
  'Arabica',
  'Carton',
];

export const TranscribeVoiceInput = z.object({
  presetId: z.enum(['URGENT_RESTOCK_VOICE', 'PARTIAL_POD_VOICE']).optional(),
  audioBase64: z.string().max(2_000_000).optional(),
});

interface VoiceFixture {
  model: 'muse-voice-transcribe-1.0';
  language: 'id-en';
  estimatedCostUsd: number;
  vocabularyBias: string[];
  presets: Record<
    VoicePresetId,
    {
      transcript: string;
      speakerLabel: string;
      turnTiming: string;
      biasedKeywordsMatched: string[];
      extractedIntent: VoiceTranscriptionResult['extractedIntent'];
    }
  >;
}

function loadFixture(): VoiceFixture {
  const raw = fs.readFileSync(path.join(process.cwd(), 'public/mock-data/fallback-voice-transcribe.json'), 'utf8');
  return JSON.parse(raw) as VoiceFixture;
}

/** Sanitize: keep letters, numbers, IV/common punctuation for ID/EN code-switch text. */
function sanitizeTranscript(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s.,!?()%\-/]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

const SKU_RE = /\b([A-Z]{2,4}-\d{2,4}[A-Z]?)\b/;

function matchedBias(transcript: string): string[] {
  const lower = transcript.toLowerCase();
  return VOICE_BIAS_KEYWORDS.filter((k) => lower.includes(k.toLowerCase()));
}

function shape(
  presetId: VoicePresetId,
  p: VoiceFixture['presets'][VoicePresetId],
  fixture: VoiceFixture,
  fallbackActive: boolean,
  latencyMs: number,
): VoiceTranscriptionResult {
  const transcript = sanitizeTranscript(p.transcript);
  const skuMatch = transcript.match(SKU_RE)?.[1];
  const intent = { ...p.extractedIntent };
  // Clamp extracted SKU to a sane pattern; never trust raw ASR output for DB queries.
  if (skuMatch && /^[A-Z]{2,4}-\d{2,4}[A-Z]?$/.test(skuMatch)) intent.sku = skuMatch;
  return {
    presetId,
    transcript,
    language: 'id-en',
    speakerLabel: p.speakerLabel,
    turnTiming: p.turnTiming,
    biasedKeywordsMatched: matchedBias(transcript),
    modelUsed: 'muse-voice-transcribe-1.0',
    estimatedCostUsd: fixture.estimatedCostUsd,
    latencyMs,
    fallbackActive,
    extractedIntent: intent,
  };
}

/**
 * Muse Voice Transcribe. Server-side only — MODEL_API_KEY never reaches the
 * browser. Presets resolve deterministically from fixture (<40ms); live audio
 * posts to /v1/asr/transcribe with 4s timeout, diarization + bias, else falls back.
 */
export async function transcribeWarehouseAudio(
  params: z.infer<typeof TranscribeVoiceInput>,
): Promise<VoiceTranscriptionResult> {
  const input = TranscribeVoiceInput.parse(params);
  const key = process.env.MODEL_API_KEY ?? process.env.MUSE_API_KEY;
  const presetId: VoicePresetId = input.presetId ?? 'URGENT_RESTOCK_VOICE';
  const t0 = Date.now();
  const fixture = loadFixture();

  if (process.env.USE_MOCK_AGENT === 'true' || !key || !input.audioBase64) {
    return shape(presetId, fixture.presets[presetId], fixture, true, Date.now() - t0);
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const form = new FormData();
    const buf = Buffer.from(input.audioBase64.slice(0, 2_000_000), 'base64');
    form.append('file', new Blob([new Uint8Array(buf)], { type: 'audio/webm' }), 'dock-note.webm');
    form.append('model', 'muse-voice-transcribe-1.0');
    form.append('diarize', 'true');
    form.append('vocabulary_bias', VOICE_BIAS_KEYWORDS.join(', '));
    const res = await fetch('https://api.meta.ai/v1/asr/transcribe', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    clearTimeout(timer);
    if (res.status === 429) throw new Error('transcribe rate limited (429)');
    if (!res.ok) throw new Error(`transcribe HTTP ${res.status}`);
    const live = (await res.json().catch(() => ({}))) as { text?: string; transcript?: string };
    const text = typeof live.text === 'string' ? live.text : typeof live.transcript === 'string' ? live.transcript : '';
    if (!text) throw new Error('empty live transcript');
    const base = fixture.presets[presetId];
    return shape(
      presetId,
      { ...base, transcript: text, biasedKeywordsMatched: matchedBias(text) },
      fixture,
      false,
      Date.now() - t0,
    );
  } catch (err) {
    logger.warn('voice', 'transcribe fallback:', err instanceof Error ? err.message : err);
    return shape(presetId, fixture.presets[presetId], fixture, true, Date.now() - t0);
  }
}
