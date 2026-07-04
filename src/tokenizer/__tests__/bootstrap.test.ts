import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bootstrapTokenizer } from '@/tokenizer/bootstrap';
import { countTokens, resetAdapters, resetExactKeys, clearForceHeuristic } from '@/tokenizer';

const reset = (): void => {
  resetAdapters();
  resetExactKeys();
  clearForceHeuristic();
};

describe('bootstrapTokenizer (B13)', () => {
  beforeEach(reset);
  afterEach(reset);

  it('registers the tiktoken adapter so OpenAI runs through it', () => {
    // before bootstrap: no adapters registered -> OpenAI degrades to the heuristic
    expect(countTokens('gpt-4o', 'hello').engine).toBe('heuristic');
    bootstrapTokenizer();
    const r = countTokens('gpt-4o', 'hello');
    expect(r.engine).toBe('tiktoken');
  });

  it('leaves OpenAI at exact_unverified (B1: no Exact without a real capture)', () => {
    bootstrapTokenizer();
    expect(countTokens('gpt-4o', 'hello world').badge).toBe('exact_unverified');
  });
});
