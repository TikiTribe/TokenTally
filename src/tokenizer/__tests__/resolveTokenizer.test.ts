import { describe, it, expect } from 'vitest';
import { resolveTokenizer, openaiEncoding } from '@/tokenizer/resolveTokenizer';

describe('resolveTokenizer (B2 oracle-driven)', () => {
  it('uses the js-tiktoken oracle for correct per-model encodings', () => {
    expect(resolveTokenizer('gpt-4o').encoding).toBe('o200k_base');
    expect(resolveTokenizer('gpt-4.1').encoding).toBe('o200k_base');
    expect(resolveTokenizer('gpt-5').encoding).toBe('o200k_base');
    expect(resolveTokenizer('o1-preview').encoding).toBe('o200k_base');
    expect(resolveTokenizer('gpt-4').encoding).toBe('cl100k_base');
    expect(resolveTokenizer('gpt-4-turbo').encoding).toBe('cl100k_base');
    expect(resolveTokenizer('gpt-3.5-turbo').encoding).toBe('cl100k_base');
    expect(resolveTokenizer('text-embedding-3-small').encoding).toBe('cl100k_base');
    expect(resolveTokenizer('davinci-002').encoding).toBe('p50k_base');
    expect(resolveTokenizer('text-davinci-003').encoding).toBe('p50k_base');
  });

  it('B2: fixes the premortem misroutes - babbage-002->r50k, gpt-4.5-preview->o200k', () => {
    expect(resolveTokenizer('babbage-002').encoding).toBe('r50k_base'); // NOT p50k
    expect(resolveTokenizer('gpt-4.5-preview').encoding).toBe('o200k_base'); // NOT cl100k
    expect(resolveTokenizer('davinci').encoding).toBe('r50k_base');
  });

  it('B2: a known OpenAI id is tiktoken and not flagged', () => {
    const r = resolveTokenizer('gpt-4o');
    expect(r.engine).toBe('tiktoken');
    expect(r.family).toBe('openai');
    expect(r.flagForReview).toBe(false);
  });

  it('B2: a novel/unrecognized gpt-* id is flagged for review, best-effort o200k, never silent', () => {
    for (const id of ['gpt-6', 'super-gpt-turbo-9000']) {
      const r = resolveTokenizer(id);
      expect(r.family).toBe('openai');
      expect(r.engine).toBe('tiktoken');
      expect(r.encoding).toBe('o200k_base'); // best-effort
      expect(r.flagForReview).toBe(true); // NOT silently trusted
    }
  });

  it('B2: strips a provider/deployment prefix before the oracle lookup', () => {
    const r = resolveTokenizer('azure/gpt-4o');
    expect(r.encoding).toBe('o200k_base');
    expect(r.flagForReview).toBe(false);
  });

  it('routes open families to the transformers engine (not flagged - known family)', () => {
    const r = resolveTokenizer('meta-llama/llama-3-8b-instruct');
    expect(r.engine).toBe('transformers');
    expect(r.family).toBe('llama');
    expect(r.encoding).toBeNull();
    expect(r.flagForReview).toBe(false);
  });

  it('routes claude to the heuristic engine as estimate, not flagged', () => {
    const r = resolveTokenizer('claude-3-5-sonnet-20240620');
    expect(r.engine).toBe('heuristic');
    expect(r.tier).toBe('estimate');
    expect(r.flagForReview).toBe(false);
  });

  it('flags a genuinely unknown id and routes it to the heuristic', () => {
    const r = resolveTokenizer('totally-made-up-model');
    expect(r).toEqual({
      family: 'unknown',
      engine: 'heuristic',
      encoding: null,
      tier: 'estimate',
      flagForReview: true,
    });
  });

  it('does not misroute a Llama finetune with gpt in its name', () => {
    const r = resolveTokenizer('deepinfra/jondurbin/airoboros-l2-70b-gpt4-1.4.1');
    expect(r.family).toBe('llama');
    expect(r.engine).toBe('transformers');
  });

  it('openaiEncoding returns null for an unknown id (drives the flag)', () => {
    expect(openaiEncoding('gpt-6')).toBeNull();
    expect(openaiEncoding('gpt-4o')).toBe('o200k_base');
  });

  it('B2: narrows an unsupported oracle encoding (p50k_edit for the edit model) to a flag', () => {
    // getEncodingNameForModel('text-davinci-edit-001') returns p50k_edit, which is NOT one of our
    // four supported encodings, so it is treated as an oracle-miss: flagged, best-effort o200k.
    expect(openaiEncoding('text-davinci-edit-001')).toBeNull();
    const r = resolveTokenizer('text-davinci-edit-001');
    expect(r.family).toBe('openai');
    expect(r.encoding).toBe('o200k_base');
    expect(r.flagForReview).toBe(true);
  });
});
