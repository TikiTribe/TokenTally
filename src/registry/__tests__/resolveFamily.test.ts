import { describe, it, expect } from 'vitest';
import { resolveFamily } from '@/registry/resolveFamily';

describe('resolveFamily', () => {
  it('routes OpenAI ids to openai/exact_unverified', () => {
    expect(resolveFamily('gpt-4o')).toEqual({ family: 'openai', tier: 'exact_unverified' });
  });
  it('routes claude to estimate (Option A)', () => {
    expect(resolveFamily('claude-3-5-sonnet-20240620')).toEqual({ family: 'claude', tier: 'estimate' });
  });
  it('routes gemini to gemini_gemma/approx (proxy)', () => {
    expect(resolveFamily('gemini/gemini-1.5-pro')).toEqual({ family: 'gemini_gemma', tier: 'approx' });
  });
  it('does NOT misroute a Llama-2 finetune with gpt in its name to openai', () => {
    expect(resolveFamily('deepinfra/jondurbin/airoboros-l2-70b-gpt4-1.4.1').family).toBe('llama');
  });
  it('falls back to unknown/estimate', () => {
    expect(resolveFamily('some/brand-new-model')).toEqual({ family: 'unknown', tier: 'estimate' });
  });
});
