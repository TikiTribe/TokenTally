import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  countTokens,
  registerAdapter,
  resetAdapters,
  markFamilyExact,
  resetExactKeys,
  forceHeuristic,
  clearForceHeuristic,
  listFlaggedFamilies,
  listAwaitingAdapter,
  MAX_TOKENIZE_CHARS,
} from '@/tokenizer';
import { tiktokenAdapter, tiktokenCount } from '@/tokenizer/tiktokenAdapter';
import type { SpotCheckResult, TokenizerAdapter } from '@/types/tokenizer';

const passing: SpotCheckResult = { passed: true, cases: [] };
const failing: SpotCheckResult = { passed: false, cases: [] };

// B14 hermeticity: reset all module singletons before AND after every test.
const reset = (): void => {
  resetAdapters();
  resetExactKeys();
  clearForceHeuristic();
};

describe('countTokens (dispatcher, B2/B3/B10/B11/B12)', () => {
  beforeEach(() => {
    reset();
    registerAdapter(tiktokenAdapter);
  });
  afterEach(reset);

  it('returns an exact_unverified OpenAI count from tiktoken with no error band', () => {
    const r = countTokens('gpt-4o', 'the quick brown fox');
    expect(r.engine).toBe('tiktoken');
    expect(r.badge).toBe('exact_unverified');
    expect(r.count).toBe(tiktokenCount('the quick brown fox', 'o200k_base'));
    expect(r.errorBand).toBeNull();
    expect(r.flagForReview).toBe(false);
    expect(r.awaitingAdapter).toBe(false);
  });

  it('B3: promotes only the spot-checked (family, encoding), not the whole family', () => {
    markFamilyExact('openai', 'o200k_base', passing);
    expect(countTokens('gpt-4o', 'hello').badge).toBe('exact'); // o200k promoted
    expect(countTokens('gpt-4', 'hello').badge).toBe('exact_unverified'); // cl100k NOT promoted
    expect(countTokens('davinci-002', 'hello').badge).toBe('exact_unverified'); // p50k NOT promoted
  });

  it('B3: markFamilyExact throws unless the spot-check passed', () => {
    expect(() => markFamilyExact('openai', 'o200k_base', failing)).toThrow();
  });

  it('B2: a flagged novel gpt-* id never reads exact even if its encoding was promoted', () => {
    markFamilyExact('openai', 'o200k_base', passing);
    const r = countTokens('gpt-6', 'hello');
    expect(r.flagForReview).toBe(true);
    expect(r.badge).not.toBe('exact');
    expect(r.badge).toBe('exact_unverified');
  });

  it('B11: an open family with no transformers adapter degrades to heuristic + estimate + awaitingAdapter', () => {
    const r = countTokens('meta-llama/llama-3-8b-instruct', 'the quick brown fox');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
    expect(r.awaitingAdapter).toBe(true);
    expect(r.flagForReview).toBe(false); // known family, NOT an unrecognized id
    expect(r.errorBand).not.toBeNull();
  });

  it('counts claude via the heuristic as estimate, not awaiting an adapter', () => {
    const r = countTokens('claude-3-5-sonnet-20240620', 'hello world');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
    expect(r.awaitingAdapter).toBe(false);
    expect(r.flagForReview).toBe(false);
    expect(r.errorBand).not.toBeNull();
  });

  it('flags a genuinely unknown id for review (not awaitingAdapter)', () => {
    const r = countTokens('made-up-model-xyz', 'hello');
    expect(r.badge).toBe('estimate');
    expect(r.flagForReview).toBe(true);
    expect(r.awaitingAdapter).toBe(false);
  });

  it('degrades to heuristic if the resolved adapter throws', () => {
    const boom: TokenizerAdapter = { engine: 'tiktoken', available: true, count: () => { throw new Error('boom'); } };
    registerAdapter(boom);
    const r = countTokens('gpt-4o', 'hello');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
    expect(r.awaitingAdapter).toBe(true);
  });

  it('B12: degrades when an adapter count is wildly out of sanity vs the heuristic', () => {
    const rogue: TokenizerAdapter = { engine: 'tiktoken', available: true, count: () => 1_000_000 };
    registerAdapter(rogue);
    const r = countTokens('gpt-4o', 'the quick brown fox');
    expect(r.engine).toBe('heuristic'); // 1e6 tokens for 4 words is insane -> degrade
    expect(r.badge).toBe('estimate');
  });

  it('B12: forceHeuristic routes an OpenAI model through the heuristic', () => {
    forceHeuristic('tiktoken');
    const r = countTokens('gpt-4o', 'the quick brown fox');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
  });

  it('B10: clamps an oversized input and flags it truncated', () => {
    const huge = 'a '.repeat(MAX_TOKENIZE_CHARS); // ~2x the cap in chars
    const r = countTokens('gpt-4o', huge);
    expect(r.truncated).toBe(true);
    expect(Number.isFinite(r.count)).toBe(true);
  });

  it('B15: once a transformers adapter is registered, Gemini reads approx (not estimate)', () => {
    const fakeTransformers: TokenizerAdapter = {
      engine: 'transformers',
      available: true,
      count: (t) => Math.max(1, Math.ceil(t.length / 4)), // sane vs the heuristic
    };
    registerAdapter(fakeTransformers);
    const r = countTokens('gemini/gemini-1.5-pro', 'the quick brown fox');
    expect(r.engine).toBe('transformers');
    expect(r.badge).toBe('approx'); // §12 requires Gemini labeled Approx
    expect(r.awaitingAdapter).toBe(false);
    expect(r.errorBand).not.toBeNull(); // a proxy tokenizer carries a band, not null
  });

  it('B11: listFlaggedFamilies is unknown-ids only; listAwaitingAdapter is known-no-adapter', () => {
    const ids = ['gpt-4o', 'claude-3-5-sonnet', 'meta-llama/llama-3-8b', 'made-up-xyz'];
    expect(listFlaggedFamilies(ids)).toEqual(['unknown']);
    expect(listAwaitingAdapter(ids)).toContain('llama');
    expect(listAwaitingAdapter(ids)).not.toContain('openai');
  });
});
