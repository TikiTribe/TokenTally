import { describe, it, expect } from 'vitest';
import type {
  TokenizerResolution,
  TokenCount,
  TokenizerAdapter,
  SpotCheckCase,
} from '@/types/tokenizer';

describe('tokenizer types (0B amendments)', () => {
  it('accepts a populated resolution', () => {
    const res: TokenizerResolution = {
      family: 'openai',
      engine: 'tiktoken',
      encoding: 'o200k_base',
      tier: 'exact_unverified',
      flagForReview: false,
    };
    expect(res.encoding).toBe('o200k_base');
  });

  it('TokenCount carries an error band, awaitingAdapter, and truncated flags (B5/B10/B11)', () => {
    const exact: TokenCount = {
      count: 3,
      badge: 'exact_unverified',
      engine: 'tiktoken',
      family: 'openai',
      flagForReview: false,
      awaitingAdapter: false,
      errorBand: null, // null only for an exact tiktoken content count (B5)
      truncated: false,
      segments: ['The', ' world', '!'],
    };
    const estimate: TokenCount = {
      count: 100,
      badge: 'estimate',
      engine: 'heuristic',
      family: 'claude',
      flagForReview: false,
      awaitingAdapter: false,
      errorBand: { relLow: -0.3, relHigh: 0.3 },
      truncated: false,
      segments: null, // heuristic path exposes no real token pieces
    };
    expect(exact.errorBand).toBeNull();
    expect(estimate.errorBand?.relHigh).toBe(0.3);
    expect(estimate.awaitingAdapter).toBe(false);
  });

  it('SpotCheckCase requires capture provenance (B1)', () => {
    const c: SpotCheckCase = {
      modelId: 'gpt-4o',
      text: 'Hello, world!',
      expectedTokens: 11,
      capturedAt: '2026-07-04',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiModelSnapshot: 'gpt-4o-2024-08-06',
      rawUsage: { prompt_tokens: 11 },
    };
    expect(c.apiModelSnapshot).toContain('gpt-4o');
  });

  it('TokenizerAdapter is a minimal count interface', () => {
    const a: TokenizerAdapter = { engine: 'tiktoken', available: true, count: () => 0 };
    expect(a.available).toBe(true);
  });
});
