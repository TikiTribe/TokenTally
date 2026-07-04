// P2-A12: in a non-Worker environment (node/jsdom), constructing the worker throws, so tokenize() must
// degrade to the synchronous main-thread fallback and still resolve with a count — never hang. (The worker
// happy-path is covered by the E2E CSP/egress specs in a real browser.)
import { describe, it, expect, beforeEach } from 'vitest';
import { tokenize, _resetWorkerClient } from '@/tokenizer/workerClient';

describe('workerClient fallback (no Worker in test env)', () => {
  beforeEach(() => _resetWorkerClient());

  it('resolves with a token count via the main-thread heuristic fallback', async () => {
    const r = await tokenize('gpt-4o', 'the quick brown fox jumps over the lazy dog');
    expect(r.count).toBeGreaterThan(0);
    // no adapter is registered on the main thread -> heuristic Estimate badge (honest degradation)
    expect(r.badge).toBe('estimate');
  });

  it('handles many concurrent calls independently (monotonic ids, all resolve)', async () => {
    const texts = ['a', 'bb ccc', 'dddd eeeee ffffff'];
    const results = await Promise.all(texts.map((t) => tokenize('gpt-4o', t)));
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.count >= 0)).toBe(true);
    expect(results[2]!.count).toBeGreaterThanOrEqual(results[0]!.count); // more text -> >= tokens
  });

  it('empty text resolves to 0', async () => {
    expect((await tokenize('gpt-4o', '')).count).toBe(0);
  });
});
