// P2-A12: non-React tokenizer worker client. Lazily constructs the shared ES-module worker, keeps a
// monotonic request id + pending-callback map, and RESOLVES tokenize() with the worker response. If the
// worker cannot be constructed (CSP block, unsupported env) or a request times out (1.5s), it degrades to a
// synchronous main-thread fallback (countTokens returns the heuristic Estimate, since no adapter is
// registered on the main thread) so the UI never hangs. Owner: TokenTally UI. Version: Phase 2B.
import { countTokens } from '@/tokenizer';
import type { TokenizeRequest, TokenizeResponse } from '@/tokenizer/worker';

const REQUEST_TIMEOUT_MS = 1500;

let worker: Worker | null = null;
let degraded = false;
let nextId = 1;
const pending = new Map<number, { resolve: (r: TokenizeResponse) => void; timer: ReturnType<typeof setTimeout> }>();

function degrade(): void {
  degraded = true;
  worker = null;
  for (const p of pending.values()) clearTimeout(p.timer);
  pending.clear();
}

function ensureWorker(): Worker | null {
  if (degraded) return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL('./tokenizer.worker.ts', import.meta.url), { type: 'module' });
    w.addEventListener('message', (e: MessageEvent) => {
      const res = e.data as TokenizeResponse;
      const p = pending.get(res.id);
      if (p) {
        clearTimeout(p.timer);
        pending.delete(res.id);
        p.resolve(res);
      }
    });
    w.addEventListener('error', () => degrade());
    worker = w;
    return w;
  } catch {
    degrade();
    return null;
  }
}

function fallback(id: number, modelId: string, text: string): TokenizeResponse {
  const r = countTokens(modelId, text);
  return {
    id, count: r.count, badge: r.badge, engine: r.engine,
    flagForReview: r.flagForReview, awaitingAdapter: r.awaitingAdapter, errorBand: r.errorBand, truncated: r.truncated,
  };
}

export function tokenize(modelId: string, text: string): Promise<TokenizeResponse> {
  const id = nextId++;
  const w = ensureWorker();
  if (!w) return Promise.resolve(fallback(id, modelId, text));
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.delete(id)) resolve(fallback(id, modelId, text));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    w.postMessage({ id, modelId, text } satisfies TokenizeRequest);
  });
}

// Test/reset hook.
export function _resetWorkerClient(): void {
  degrade();
  degraded = false;
  nextId = 1;
}
