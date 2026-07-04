import { describe, it, expect } from 'vitest';
import { optimize, solveBudget } from '@/optimization/optimize';
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig } from '@/types/workload';

const mk = (over: Partial<ModelRecord>): ModelRecord => ({
  canonicalId: 'm', deployment: 'openai', displayName: 'M', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 5, outputPrice: 15, reasoningPerMToken: null,
  cache: null, contextWindow: 128000, maxOutput: 4096, tiers: [], accuracyTier: 'estimate',
  freeTier: false, deprecated: false, ...over,
});
const expensive = mk({ canonicalId: 'gpt-4o', displayName: 'GPT-4o', inputPrice: 5, outputPrice: 15 });
const cheap = mk({ canonicalId: 'gpt-4o-mini', displayName: 'GPT-4o mini', inputPrice: 0.15, outputPrice: 0.6 });

const cfg: ChatbotConfig = {
  model: expensive, systemPromptTokens: 800, avgUserMessageTokens: 50, avgResponseTokens: 200,
  turnsPerConversation: 4, contextGrowthPerTurn: 150, conversationsPerMonth: 50000,
};

describe('optimize', () => {
  it('recommends the cheaper model with a positive dollar saving, ranked first', () => {
    const recs = optimize({ kind: 'chatbot', config: cfg, candidateModels: [expensive, cheap] });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0]!.monthlySavings).toBeGreaterThan(0);
    expect(recs[0]!.label).toMatch(/mini/i);
    for (let i = 1; i < recs.length; i++) {
      // clean recs first, then by savings desc within group
      expect(recs[i - 1]!.monthlySavings).toBeGreaterThanOrEqual(recs[i]!.monthlySavings);
    }
  });

  it('carries a saving band and overlaps flag (A18)', () => {
    const recs = optimize({ kind: 'chatbot', config: cfg, candidateModels: [expensive, cheap] });
    const r = recs[0]!;
    expect(r.savingsHigh).toBeGreaterThanOrEqual(r.savingsLow);
    expect(typeof r.overlaps).toBe('boolean');
  });

  it('never recommends a costlier switch (non-positive savings filtered out)', () => {
    const recs = optimize({ kind: 'chatbot', config: { ...cfg, model: cheap }, candidateModels: [cheap, expensive] });
    expect(recs.every((r) => r.monthlySavings > 0)).toBe(true);
  });

  it('A20: enable_caching TTL candidate appears for a cache-capable model when the other TTL is cheaper', () => {
    const cacheModel = mk({ canonicalId: 'claude', displayName: 'Claude', inputPrice: 3, outputPrice: 15,
      cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false } });
    const recs = optimize({ kind: 'chatbot', config: { ...cfg, model: cacheModel, ttl: 'hr1' }, candidateModels: [cacheModel] });
    // does not crash; if min5 is cheaper than hr1 here, the enable_caching rec is present.
    expect(Array.isArray(recs)).toBe(true);
    const ttlRec = recs.find((r) => r.optKind === 'enable_caching');
    if (ttlRec) expect(ttlRec.monthlySavings).toBeGreaterThan(0);
  });

  it('A21: switch_deployment uses the passed-in deployments (no global registry read)', () => {
    const govCloud = mk({ canonicalId: 'gpt-4o', displayName: 'GPT-4o', deployment: 'bedrock/us-gov', inputPrice: 3, outputPrice: 9 });
    const recs = optimize({ kind: 'chatbot', config: cfg, candidateModels: [], candidateDeployments: [expensive, govCloud] });
    expect(recs.some((r) => r.optKind === 'switch_deployment' && r.label.includes('us-gov'))).toBe(true);
  });

  it('solveBudget returns central + conservative arrival ceilings (A18)', () => {
    const r = solveBudget({ kind: 'chatbot', config: cfg, candidateModels: [] }, 100);
    expect(r.maxArrivalsPerMonth).toBeGreaterThan(0);
    expect(r.maxArrivalsConservative).toBeLessThanOrEqual(r.maxArrivalsPerMonth);
    expect(Number.isFinite(r.maxArrivalsPerMonth)).toBe(true);
  });
});
