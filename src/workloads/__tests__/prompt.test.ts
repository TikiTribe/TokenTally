import { describe, it, expect } from 'vitest';
import { promptForecast } from '@/workloads/prompt';
import type { PromptConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

const gpt: ModelRecord = {
  canonicalId: 'gpt-4o-mini', deployment: 'openai', displayName: 'GPT-4o mini', provider: 'openai',
  underlyingFamily: 'openai', mode: 'chat', billingUnit: 'per_token', inputPrice: 0.15, outputPrice: 0.6,
  reasoningPerMToken: null, cache: null, contextWindow: 128000, maxOutput: 16384, tiers: [],
  accuracyTier: 'exact_unverified', freeTier: false, deprecated: false,
};
const base: PromptConfig = { model: gpt, promptTokens: 500, responseTokens: 300, callsPerMonth: 100000 };

describe('promptForecast', () => {
  it('single-turn batch: arrivals = calls', () => {
    expect(promptForecast(base).arrivalsPerMonth).toBe(100000);
    expect(promptForecast(base).kind).toBe('prompt');
  });

  it('cost scales linearly with call volume', () => {
    const a = promptForecast(base).monthlyCost;
    const b = promptForecast({ ...base, callsPerMonth: 200000 }).monthlyCost;
    expect(b).toBeCloseTo(2 * a, 4);
  });

  it('a shared cacheable system prompt does not increase cost vs none', () => {
    const cacheModel: ModelRecord = { ...gpt, cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.075, cacheWritePerMToken: 0.1875, rateUnavailable: false, readUnavailable: false } };
    const shared = promptForecast({ ...base, model: cacheModel, sharedSystemPromptTokens: 2000 });
    expect(shared.cost.savingsUpTo.central).toBeGreaterThanOrEqual(0);
  });

  it('multi-turn raises arrivals and cost', () => {
    const mt = promptForecast({ ...base, turnsPerCall: 3 });
    expect(mt.arrivalsPerMonth).toBe(300000);
    expect(mt.monthlyCost).toBeGreaterThan(promptForecast(base).monthlyCost);
  });

  it('kill switch returns inert forecast', () => {
    expect(promptForecast({ ...base, enabled: false }).cost.applicable).toBe(false);
  });

  it('hand-verified no-cache cost: calls*(in*inRate + out*outRate)/1e6', () => {
    // 100000*(500*0.15 + 300*0.6)/1e6 = 100000*(75+180)/1e6 = 100000*255/1e6 = 25.5
    expect(promptForecast(base).monthlyCost).toBeCloseTo(25.5, 4);
  });
});
