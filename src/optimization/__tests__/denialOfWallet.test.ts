import { describe, it, expect } from 'vitest';
import { denialOfWallet, DOW_DISCLAIMER, DOW_VDP_URL } from '@/optimization/denialOfWallet';
import type { ModelRecord } from '@/types/registry';

const gpt4o: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10, reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false },
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

describe('denialOfWallet', () => {
  it('is opt-in: default/disabled returns an inert labeled result that still carries the disclaimer + VDP', () => {
    const r = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 1_000_000 });
    expect(r.enabled).toBe(false);
    expect(r.worstCaseMonthly).toBe(0);
    expect(r.note).toMatch(/disabled|opt-in|kill switch/i);
    expect(r.disclaimer.length).toBeGreaterThan(0);
    expect(r.vdpUrl).toMatch(/^https:\/\//); // A1
  });

  it('when enabled, fills context + maxes output for a bounded worst case with a range (no warm cache)', () => {
    const r = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 1_000_000, enabled: true });
    expect(r.worstCaseMonthly).toBeGreaterThan(0);
    expect(r.confidence.high).toBeGreaterThanOrEqual(r.confidence.mid);
    expect(r.note).toMatch(/worst case|conservative|no warm/i);
    // A1 / F-SEC-2: the guardrail travels with the number.
    expect(r.disclaimer.length).toBeGreaterThan(0);
    expect(r.vdpUrl).toMatch(/^https:\/\//);
  });

  it('flags Estimate-tier underlying cost, never false-precise', () => {
    const r = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 1000, enabled: true });
    expect(r.note).toMatch(/estimate/i);
  });

  // P1-A2: no $0-saving mitigation; each strictly reduces cost, sorted by impact.
  it('A2: mitigations each remove dollars and are sorted; no degenerate retry mitigation at default', () => {
    const r = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 1_000_000, enabled: true });
    expect(r.mitigations.length).toBeGreaterThan(0);
    for (const m of r.mitigations) {
      expect(m.savedMonthly).toBeGreaterThan(0);
      expect(m.reducedMonthly).toBeLessThan(r.worstCaseMonthly);
    }
    for (let i = 1; i < r.mitigations.length; i++) {
      expect(r.mitigations[i - 1]!.savedMonthly).toBeGreaterThanOrEqual(r.mitigations[i]!.savedMonthly);
    }
    // no retry mitigation when retryCeiling defaults to 1
    expect(r.mitigations.some((m) => /retry/i.test(m.control))).toBe(false);
  });

  it('A2: with retryCeiling > 1 the retry mitigation appears with a positive saving', () => {
    const r = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 100000, enabled: true, retryCeiling: 3 });
    const retry = r.mitigations.find((m) => /retry/i.test(m.control));
    expect(retry).toBeDefined();
    expect(retry!.savedMonthly).toBeGreaterThan(0);
  });

  // P1-A14: reasoning models must not have their reasoning-token blow-up dropped.
  it('A14: a reasoning model has a strictly higher worst case than the same config with no reasoning rate', () => {
    const reasoning: ModelRecord = { ...gpt4o, reasoningPerMToken: 60 };
    const withReason = denialOfWallet({ model: reasoning, attackerRequestsPerMonth: 100000, enabled: true }).worstCaseMonthly;
    const noReason = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 100000, enabled: true }).worstCaseMonthly;
    expect(withReason).toBeGreaterThan(noReason);
  });

  // P1-A15: non-per_token billing must not be a silent $0.
  it('A15: per_second billing is not a silent $0 exposure', () => {
    const audio: ModelRecord = { ...gpt4o, billingUnit: 'per_second', inputPrice: 0.1, outputPrice: null, cache: null, contextWindow: null, maxOutput: null };
    const r = denialOfWallet({ model: audio, attackerRequestsPerMonth: 1000, enabled: true });
    expect(r.note).toMatch(/per_second|not modeled|do not read as \$0/i);
  });

  it('exposes a dual-use disclaimer and an absolute VDP link', () => {
    expect(DOW_DISCLAIMER).toMatch(/defen|abuse|authoriz/i);
    expect(DOW_VDP_URL).toMatch(/^https:\/\//);
  });

  it('falls back to explicit caps when contextWindow/maxOutput are null', () => {
    const noCaps: ModelRecord = { ...gpt4o, contextWindow: null, maxOutput: null };
    const r = denialOfWallet({ model: noCaps, attackerRequestsPerMonth: 1000, enabled: true, fallbackInputTokens: 8000, fallbackOutputTokens: 4000 });
    expect(r.worstCaseMonthly).toBeGreaterThan(0);
    expect(r.note).toMatch(/fallback|explicit cap/i);
  });

  it('A13: hostile request magnitude yields a finite, non-Infinity worst case', () => {
    const r = denialOfWallet({ model: gpt4o, attackerRequestsPerMonth: 1e300, enabled: true, retryCeiling: 1e10 });
    expect(Number.isFinite(r.worstCaseMonthly)).toBe(true);
  });

  // Review fix (security F-3): a non-finite FALLBACK token count must clamp to a large finite exposure,
  // not silently collapse to $0 via the engine's nonNeg(Infinity)=0 guard.
  it('F-3: Infinity fallback tokens do not silently zero the worst case', () => {
    const noCaps: ModelRecord = { ...gpt4o, contextWindow: null, maxOutput: null };
    const r = denialOfWallet({ model: noCaps, attackerRequestsPerMonth: 1000, enabled: true, fallbackInputTokens: Infinity, fallbackOutputTokens: 4000 });
    expect(Number.isFinite(r.worstCaseMonthly)).toBe(true);
    expect(r.worstCaseMonthly).toBeGreaterThan(0); // NOT a silent $0
  });
});
