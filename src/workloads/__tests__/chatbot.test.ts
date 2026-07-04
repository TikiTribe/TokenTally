import { describe, it, expect } from 'vitest';
import { chatbotForecast } from '@/workloads/chatbot';
import type { ChatbotConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

// Claude 3.5 Sonnet: breakpoint-TTL cache (deterministic warmth), 1000-token cached system prefix.
const claude: ModelRecord = {
  canonicalId: 'claude-3-5-sonnet', deployment: 'anthropic', displayName: 'Claude 3.5 Sonnet',
  provider: 'anthropic', underlyingFamily: 'claude', mode: 'chat', billingUnit: 'per_token',
  inputPrice: 3, outputPrice: 15, reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false },
  contextWindow: 200000, maxOutput: 8192, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

const base: ChatbotConfig = {
  model: claude, systemPromptTokens: 1000, avgUserMessageTokens: 50, avgResponseTokens: 200,
  turnsPerConversation: 5, contextGrowthPerTurn: 150, conversationsPerMonth: 10000,
};

describe('chatbotForecast', () => {
  it('derives arrivals = conversations * turns and carries snapshot/formula', () => {
    const f = chatbotForecast({ ...base, snapshotVersion: 'snap-1' });
    expect(f.arrivalsPerMonth).toBe(50000);
    expect(f.kind).toBe('chatbot');
    expect(f.snapshotVersion).toBe('snap-1');
    expect(f.formula.length).toBeGreaterThan(0);
  });

  it('produces a positive cost, a confidence range, and monthlyCost === centralTotal', () => {
    const f = chatbotForecast(base);
    expect(f.monthlyCost).toBeGreaterThan(0);
    expect(f.cost.confidence.high).toBeGreaterThanOrEqual(f.cost.confidence.mid);
    expect(f.monthlyCost).toBe(f.cost.centralTotal);
  });

  it('caching lowers cost vs the conservative (p_warm=0) reference', () => {
    const f = chatbotForecast(base);
    expect(f.cost.conservativeTotal).toBeGreaterThan(f.cost.centralTotal);
    expect(f.cost.savingsUpTo.central).toBeGreaterThan(0);
  });

  it('more context growth raises cost (accumulation is modeled)', () => {
    const lo = chatbotForecast({ ...base, contextGrowthPerTurn: 50 }).monthlyCost;
    const hi = chatbotForecast({ ...base, contextGrowthPerTurn: 300 }).monthlyCost;
    expect(hi).toBeGreaterThan(lo);
  });

  // P1-A6: at SPARSE volume, within-conversation turns 2+ must be warm (writes ≈ conversations),
  // NOT billed cold (which the old activeFraction=1 default did -> ~4x too many writes).
  it('A6: sparse 500 conv/mo -> writesPerMonth ≈ conversations, not ≈ arrivals', () => {
    const f = chatbotForecast({ ...base, conversationsPerMonth: 500 });
    // 500 conv * 5 turns = 2500 arrivals; MVP-correct writes ≈ 500 (one cold write per conversation).
    expect(f.cost.writesPerMonth).toBeLessThan(600);
    expect(f.cost.writesPerMonth).toBeGreaterThan(450);
  });

  it('A6: saturated 100k conv/mo -> writes ≈ conversations (conservative upper bound at saturation)', () => {
    const f = chatbotForecast({ ...base, conversationsPerMonth: 100000 });
    // 100k conv * 5 = 500k arrivals; writes ≈ 100k (not 500k).
    expect(f.cost.writesPerMonth).toBeLessThan(120000);
    expect(f.cost.writesPerMonth).toBeGreaterThan(90000);
  });

  // P1-A10: K distinct system prompts must not multiply cold onsets by K.
  it('A10: K=3 distinct prompts -> writes still ≈ conversations, not K*conversations', () => {
    const f = chatbotForecast({ ...base, conversationsPerMonth: 500, distinctSystemPrompts: 3 });
    expect(f.cost.writesPerMonth).toBeLessThan(600); // NOT ~1500
  });

  it('kill switch returns an inert, applicable=false forecast', () => {
    const f = chatbotForecast({ ...base, enabled: false });
    expect(f.monthlyCost).toBe(0);
    expect(f.cost.applicable).toBe(false);
    expect(f.accuracyNote).toMatch(/disabled/i);
  });

  it('labels the accuracy tier of the model', () => {
    expect(chatbotForecast(base).accuracyNote).toMatch(/estimate/i);
  });

  // P1-A9: accumulation beyond the context window is clamped, flagged.
  it('A9: huge context growth clamps to the window and sets contextTruncated', () => {
    const f = chatbotForecast({ ...base, contextGrowthPerTurn: 100000, turnsPerConversation: 10 });
    expect(f.contextTruncated).toBe(true);
  });
});
