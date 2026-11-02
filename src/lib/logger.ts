/**
 * Structured logger — single funnel for all operational logs.
 * Server (Node): prefixed console output. Browser: silent by design so the
 * DevTools console stays 100% clean during the live demo; surface user-facing
 * failures through UI state instead.
 */
type Args = unknown[];

function emit(level: 'info' | 'warn' | 'error', tag: string, args: Args): void {
  if (typeof window !== 'undefined') return;
  const prefix = `[${tag}]`;
  if (level === 'info') console.log(prefix, ...args);
  else if (level === 'warn') console.warn(prefix, ...args);
  else console.error(prefix, ...args);
}

export const logger = {
  info: (tag: string, ...args: unknown[]): void => emit('info', tag, args),
  warn: (tag: string, ...args: unknown[]): void => emit('warn', tag, args),
  error: (tag: string, ...args: unknown[]): void => emit('error', tag, args),
};
