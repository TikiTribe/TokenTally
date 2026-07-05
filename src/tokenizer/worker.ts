// Tokenizer web-worker boundary. The pure message handler is unit-tested; the listener is installed
// ONLY inside a real worker global. `self instanceof WorkerGlobalScope` is false on the browser main
// thread (self===window) and in jsdom/node, so importing this module off-worker is a genuine no-op
// (B4) - the earlier `typeof self.postMessage === 'function'` guard was true on the main thread and
// would have hijacked window.onmessage into a cross-window tokenization oracle. Uses addEventListener,
// not onmessage=, so it never clobbers another listener. Adapters are registered by the worker
// bootstrap (bootstrap.ts) in Phase 2; debounce lives at the UI call site, not here.
import { countTokens } from '@/tokenizer';
import type { AccuracyTier } from '@/types/registry';
import type { TokenizerEngine } from '@/types/tokenizer';

export interface TokenizeRequest {
  id: number;
  modelId: string;
  text: string;
}
export interface TokenizeResponse {
  id: number;
  count: number;
  badge: AccuracyTier;
  engine: TokenizerEngine;
  flagForReview: boolean;
  awaitingAdapter: boolean;
  errorBand: { relLow: number; relHigh: number } | null;
  truncated: boolean;
  segments: string[] | null;
}

export function handleTokenizeMessage(req: TokenizeRequest): TokenizeResponse {
  const r = countTokens(req.modelId, req.text);
  return {
    id: req.id,
    count: r.count,
    badge: r.badge,
    engine: r.engine,
    flagForReview: r.flagForReview,
    awaitingAdapter: r.awaitingAdapter,
    errorBand: r.errorBand,
    truncated: r.truncated,
    segments: r.segments,
  };
}

// B4: read both globals off globalThis (WorkerGlobalScope is not in this project's DOM lib set).
// `instanceof` short-circuits to false when WorkerGlobalScope is absent (node) or when self is a
// Window (main thread), so importing this module off-worker is a genuine no-op.
const glob = globalThis as {
  self?: object;
  WorkerGlobalScope?: new () => object;
};
if (glob.WorkerGlobalScope !== undefined && glob.self instanceof glob.WorkerGlobalScope) {
  const scope = glob.self as unknown as {
    addEventListener(type: 'message', cb: (e: { data: TokenizeRequest }) => void): void;
    postMessage(message: TokenizeResponse): void;
  };
  scope.addEventListener('message', (e) => scope.postMessage(handleTokenizeMessage(e.data)));
}
