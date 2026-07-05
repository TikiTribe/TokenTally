import { describe, it, expect } from 'vitest';
import { tiktokenCount, tiktokenSegments, tiktokenAdapter } from '@/tokenizer/tiktokenAdapter';
import type { TokenizerResolution } from '@/types/tokenizer';

const res = (over: Partial<TokenizerResolution>): TokenizerResolution => ({
  family: 'openai',
  engine: 'tiktoken',
  encoding: 'o200k_base',
  tier: 'exact_unverified',
  flagForReview: false,
  ...over,
});

describe('tiktokenCount (exact OpenAI counts via lite + rank subpaths)', () => {
  it('matches the known o200k counts', () => {
    expect(tiktokenCount('Hello, world!', 'o200k_base')).toBe(4);
    expect(tiktokenCount('The quick brown fox jumps over the lazy dog.', 'o200k_base')).toBe(10);
  });
  it('counts every encoding positively and empty as 0', () => {
    for (const enc of ['o200k_base', 'cl100k_base', 'p50k_base', 'r50k_base'] as const) {
      expect(tiktokenCount('tokenize this', enc)).toBeGreaterThan(0);
      expect(tiktokenCount('', enc)).toBe(0);
    }
  });
});

describe('tiktokenAdapter', () => {
  it('is available and counts via the resolution encoding', () => {
    expect(tiktokenAdapter.engine).toBe('tiktoken');
    expect(tiktokenAdapter.available).toBe(true);
    expect(tiktokenAdapter.count('hello world', res({}))).toBe(tiktokenCount('hello world', 'o200k_base'));
  });
  it('throws on a null encoding so the dispatcher degrades', () => {
    expect(() => tiktokenAdapter.count('x', res({ encoding: null }))).toThrow();
  });
});

describe('B9: zero network egress during tokenization', () => {
  it('never touches fetch / XMLHttpRequest / WebSocket for any encoding', () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const saved = { fetch: g.fetch, XMLHttpRequest: g.XMLHttpRequest, WebSocket: g.WebSocket };
    const boom = (): never => {
      throw new Error('network egress attempted during tokenization');
    };
    g.fetch = boom;
    g.XMLHttpRequest = boom;
    g.WebSocket = boom;
    try {
      for (const enc of ['o200k_base', 'cl100k_base', 'p50k_base', 'r50k_base'] as const) {
        expect(() => tiktokenCount('the quick brown fox 12345 def foo()', enc)).not.toThrow();
      }
    } finally {
      g.fetch = saved.fetch;
      g.XMLHttpRequest = saved.XMLHttpRequest;
      g.WebSocket = saved.WebSocket;
    }
  });
});

describe('tiktokenSegments (per-token pieces for the token stream)', () => {
  it('reconstructs the input and has one piece per token (uncapped)', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const segs = tiktokenSegments(text, 'cl100k_base', 4000);
    expect(segs.join('')).toBe(text);
    expect(segs.length).toBe(tiktokenCount(text, 'cl100k_base'));
  });
  it('caps at the requested number of pieces', () => {
    const long = 'a b c d e '.repeat(200); // ~800 tokens
    expect(tiktokenSegments(long, 'o200k_base', 400)).toHaveLength(400);
  });
  it('empty text yields no pieces', () => {
    expect(tiktokenSegments('', 'o200k_base', 400)).toEqual([]);
  });
  it('reconstructs multibyte text with no replacement-character garbage (merges split code points)', () => {
    for (const text of ['a🎉b', 'hi 🚀🎊 x', '🇺🇸 flag', '👨‍👩‍👧 family', 'café 你好世界']) {
      const segs = tiktokenSegments(text, 'o200k_base', 4000);
      expect(segs.join('')).toBe(text); // no data loss
      expect(segs.some((s) => s.includes('�'))).toBe(false); // no U+FFFD garbage
    }
  });
});
