// P2-A13: the debounced hook reports a token count after the debounce, and drops stale responses so the
// latest edit wins (jsdom). Uses the worker-client fallback (no Worker in jsdom).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTokenizer } from '@/hooks/useTokenizer';
import { useAppStore } from '@/store/useAppStore';

describe('useTokenizer (2B)', () => {
  beforeEach(() => {
    useAppStore.setState({ tokenCounts: {} });
  });

  it('reports a count for the field after the debounce settles', async () => {
    vi.useFakeTimers();
    renderHook(() => useTokenizer('f1', 'gpt-4o', 'hello world here is some text'));
    await vi.advanceTimersByTimeAsync(200); // past the 120ms debounce + fallback microtask
    vi.useRealTimers();
    const tc = useAppStore.getState().tokenCounts['f1'];
    expect(tc).toBeDefined();
    expect(tc!.count).toBeGreaterThan(0);
  });

  it('a rapid text change drops the earlier in-flight result (latest wins)', async () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(({ text }) => useTokenizer('f2', 'gpt-4o', text), {
      initialProps: { text: 'short' },
    });
    rerender({ text: 'a much much much longer piece of text than before with more tokens' });
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();
    const tc = useAppStore.getState().tokenCounts['f2'];
    expect(tc).toBeDefined();
    // the settled count reflects the LONGER (latest) text, not the short one
    expect(tc!.count).toBeGreaterThan(5);
  });
});
