import { NextRequest } from 'next/server';
import { z } from 'zod';
import { runAgentStream, StreamInput } from '@/services/agentRunner';

const QuerySchema = z.object({
  sku: z.string().trim().min(1).max(64),
  simulatedDay: z.string().trim().max(16).default('Friday'),
});

function sse(event: string, data: unknown): string {
  const payload = JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

async function handle(input: z.infer<typeof StreamInput>): Promise<Response> {
  const encoder = new TextEncoder();
  let first = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Client already disconnected (refresh mid-stream) — nothing to flush.
          }
        }
      };
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          safeClose();
        }
      };
      try {
        for await (const evt of runAgentStream(input)) {
          if (closed) break;
          if (first) {
            first = false;
            send(`: stream-open sku=${input.sku}\n\n`);
          }
          if (evt.event === 'thought') send(sse('thought', { text: evt.text }));
          else if (evt.event === 'tool_call') send(sse('tool_call', { tool: evt.tool, args: evt.args }));
          else if (evt.event === 'proposal_ready') send(sse('proposal_ready', evt.proposal));
          else send(sse('error', { error: evt.error }));
          if (evt.event === 'proposal_ready' || evt.event === 'error') break;
        }
      } catch (err) {
        // Sanitize: never leak server paths or stack traces to the client.
        const msg = err instanceof Error ? err.message.split('\n')[0].slice(0, 200) : 'Stream failed';
        send(sse('error', { error: msg }));
      } finally {
        safeClose();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  const parsed = QuerySchema.safeParse({
    sku: req.nextUrl.searchParams.get('sku') ?? '',
    simulatedDay: req.nextUrl.searchParams.get('simulatedDay') ?? 'Friday',
  });
  if (!parsed.success) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: parsed.error.issues.map((i) => i.message).join('; ') })}\n\n`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
      },
    );
  }
  return handle(parsed.data);
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const parsed = StreamInput.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error: parsed.error.issues.map((i) => i.message).join('; ') })}\n\n`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
        },
      );
    }
    return handle(parsed.data);
  } catch {
    return new Response(`event: error\ndata: ${JSON.stringify({ error: 'Invalid JSON body' })}\n\n`, {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
    });
  }
}
