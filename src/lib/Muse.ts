import OpenAI from 'openai';

if (!process.env.MUSE_API_KEY) {
  throw new Error(
    '❌ [StockPilot] MUSE_API_KEY is not defined. ' +
      'Please add it to .env.local (get from https://dev.meta.ai → API keys → Create)',
  );
}

/**
 * Muse Spark client — Meta Model API (OpenAI-compatible).
 *
 * The Meta Model API at https://api.meta.ai/v1 is drop-in compatible with the
 * OpenAI SDK, supporting tool calling, structured outputs (json_schema),
 * parallel tool calls, and streaming via the Responses API.
 */
export const muse = new OpenAI({
  apiKey: process.env.MUSE_API_KEY,
  baseURL: 'https://api.meta.ai/v1',
});

export type MuseClient = typeof muse;