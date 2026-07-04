import { describe, it, expect } from 'vitest';
import { tornado } from '@/optimization/tornado';
import type { ModelRecord } from '@/types/registry';
import type { ChatbotConfig } from '@/types/workload';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10, reasoningPerMToken: null, cache: null,
  contextWindow: 128000, maxOutput: 4096, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};
const cfg: ChatbotConfig = {
  model, systemPromptTokens: 800, avgUserMessageTokens: 50, avgResponseTokens: 200,
  turnsPerConversation: 5, contextGrowthPerTurn: 150, conversationsPerMonth: 50000,
};

describe('tornado', () => {
  it('varies each factor and sorts by swing desc; volume has the biggest leverage', () => {
    const bars = tornado({ kind: 'chatbot', config: cfg, candidateModels: [] },
      ['conversationsPerMonth', 'avgResponseTokens', 'contextGrowthPerTurn'], 0.2);
    expect(bars).toHaveLength(3);
    for (let i = 1; i < bars.length; i++) expect(bars[i - 1]!.swing).toBeGreaterThanOrEqual(bars[i]!.swing);
    expect(bars[0]!.factor).toBe('conversationsPerMonth');
    expect(bars[0]!.high).toBeGreaterThan(bars[0]!.low);
  });

  // P1-A28: hostile factor names are rejected (zero-swing) and the prototype is not mutated.
  it('A28: rejects __proto__/constructor/unknown factors and does not pollute Object.prototype', () => {
    const bars = tornado({ kind: 'chatbot', config: cfg, candidateModels: [] },
      ['__proto__', 'constructor', 'prototype', 'polluted', 'notAField'], 0.2);
    expect(bars.every((b) => b.swing === 0)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });
});
