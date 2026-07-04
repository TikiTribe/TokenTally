import { describe, it, expect } from 'vitest';
import { parseKey } from '@/registry/normalize';

describe('parseKey (A1 provider-aware)', () => {
  it('region route: gov-cloud region stays in the deployment', () => {
    expect(parseKey('bedrock/us-gov-east-1/anthropic.claude-3-5-sonnet', { litellm_provider: 'bedrock' }))
      .toEqual({ canonicalId: 'anthropic.claude-3-5-sonnet', deployment: 'bedrock/us-gov-east-1', provider: 'bedrock' });
  });
  it('region route: single-segment bedrock prefix', () => {
    expect(parseKey('bedrock/anthropic.claude-3-5-sonnet', { litellm_provider: 'bedrock' }))
      .toEqual({ canonicalId: 'anthropic.claude-3-5-sonnet', deployment: 'bedrock', provider: 'bedrock' });
  });
  it('region route: vertex_ai prefix', () => {
    expect(parseKey('vertex_ai/gemini-1.5-pro', { litellm_provider: 'vertex_ai' }))
      .toEqual({ canonicalId: 'gemini-1.5-pro', deployment: 'vertex_ai', provider: 'vertex_ai' });
  });
  it('aggregator route: openrouter keeps the org-namespaced model as canonical id', () => {
    expect(parseKey('openrouter/deepseek/deepseek-r1', { litellm_provider: 'openrouter' }))
      .toEqual({ canonicalId: 'deepseek/deepseek-r1', deployment: 'openrouter', provider: 'openrouter' });
  });
  it('bare key uses litellm_provider as deployment', () => {
    expect(parseKey('gpt-4o', { litellm_provider: 'openai' }))
      .toEqual({ canonicalId: 'gpt-4o', deployment: 'openai', provider: 'openai' });
  });
  it('missing litellm_provider falls back to unknown', () => {
    expect(parseKey('mystery-model', {}))
      .toEqual({ canonicalId: 'mystery-model', deployment: 'unknown', provider: 'unknown' });
  });
});
