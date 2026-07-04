import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleTokenizeMessage } from '@/tokenizer/worker';
import {
  countTokens,
  registerAdapter,
  resetAdapters,
  resetExactKeys,
  clearForceHeuristic,
} from '@/tokenizer';
import { tiktokenAdapter } from '@/tokenizer/tiktokenAdapter';

const reset = (): void => {
  resetAdapters();
  resetExactKeys();
  clearForceHeuristic();
};

describe('handleTokenizeMessage', () => {
  beforeEach(() => {
    reset();
    registerAdapter(tiktokenAdapter);
  });
  afterEach(reset);

  it('echoes the request id and returns the full dispatcher result', () => {
    const res = handleTokenizeMessage({ id: 7, modelId: 'gpt-4o', text: 'hello world' });
    const direct = countTokens('gpt-4o', 'hello world');
    expect(res).toEqual({
      id: 7,
      count: direct.count,
      badge: direct.badge,
      engine: direct.engine,
      flagForReview: direct.flagForReview,
      awaitingAdapter: direct.awaitingAdapter,
      errorBand: direct.errorBand,
      truncated: direct.truncated,
    });
  });
});

describe('B4: the worker installs a handler ONLY in a real worker global', () => {
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = { WorkerGlobalScope: g.WorkerGlobalScope, self: g.self };
  afterEach(() => {
    g.WorkerGlobalScope = saved.WorkerGlobalScope;
    g.self = saved.self;
    vi.resetModules();
  });

  it('does NOT register a handler when self is a window (main-thread misfire)', async () => {
    class FakeWorkerGlobalScope {}
    let registered = false;
    const fakeWindow = {
      onmessage: null as unknown,
      postMessage: (): void => {},
      addEventListener: (type: string): void => {
        if (type === 'message') registered = true;
      },
    };
    g.WorkerGlobalScope = FakeWorkerGlobalScope; // exists on the main thread...
    g.self = fakeWindow; // ...but self is a Window, NOT a WorkerGlobalScope
    vi.resetModules();
    await import('@/tokenizer/worker');
    expect(registered).toBe(false);
    expect(fakeWindow.onmessage).toBeNull();
  });

  it('DOES register a handler in a real worker global, and the handler posts the dispatcher response', async () => {
    class FakeWorkerGlobalScope {}
    type Req = { id: number; modelId: string; text: string };
    type Resp = { id: number; count: number };
    let cb: ((e: { data: Req }) => void) | null = null;
    let posted: Resp | null = null;
    const workerSelf = Object.assign(new FakeWorkerGlobalScope(), {
      postMessage: (m: Resp): void => {
        posted = m;
      },
      addEventListener: (type: string, handler: (e: { data: Req }) => void): void => {
        if (type === 'message') cb = handler;
      },
    });
    g.WorkerGlobalScope = FakeWorkerGlobalScope;
    g.self = workerSelf; // instanceof FakeWorkerGlobalScope -> true
    vi.resetModules();
    const mod = (await import('@/tokenizer/worker')) as typeof import('@/tokenizer/worker');
    expect(cb).not.toBeNull();
    // Deliver a message; the wiring must pass e.data to handleTokenizeMessage and post its result.
    const req: Req = { id: 42, modelId: 'gpt-4o', text: 'hi' };
    cb!({ data: req });
    expect(posted).not.toBeNull();
    expect(posted!.id).toBe(42);
    expect(posted).toEqual(mod.handleTokenizeMessage(req));
  });
});
