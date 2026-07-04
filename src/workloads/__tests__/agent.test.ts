import { describe, it, expect } from 'vitest';
import { agentForecast, MAX_PLOTTED_STEPS } from '@/workloads/agent';
import type { AgentConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

const gpt4o: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai',
  underlyingFamily: 'openai', mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10,
  reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false },
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'exact_unverified', freeTier: false, deprecated: false,
};
// A cache-null model so the step-profile dollars reconcile exactly to the monthly total (P1-A11).
const flat: ModelRecord = { ...gpt4o, cache: null };

const base: AgentConfig = {
  model: gpt4o, toolSchemaTokens: 2000, systemTokens: 500, perStepUserSeedTokens: 100,
  observationGrowthPerStep: 400, actionOutputTokens: 150, stepsPerRun: 8, runsPerMonth: 5000,
};

describe('agentForecast', () => {
  it('arrivals = runs * steps', () => {
    expect(agentForecast(base).arrivalsPerMonth).toBe(40000);
    expect(agentForecast(base).kind).toBe('agent');
  });

  it('emits a per-step accumulation profile: step 1 seed-only, later steps carry observations', () => {
    const steps = agentForecast(base).steps!;
    expect(steps).toHaveLength(8);
    expect(steps[0]!.inputTokens).toBe(100); // step 1: seed only
    expect(steps[7]!.inputTokens).toBe(100 + 7 * 400); // step 8: seed + 7 growths
    expect(steps[7]!.cost).toBeGreaterThan(steps[0]!.cost); // accumulation raises per-step cost
  });

  // P1-A11: for a cache-null model the step-profile dollars must foot to the headline (§5.7).
  it('A11: step-profile dollars reconcile to the monthly total (cache-null, within 1%)', () => {
    const f = agentForecast({ ...base, model: flat });
    const perRun = f.steps!.reduce((s, x) => s + x.cost, 0);
    expect(perRun * base.runsPerMonth).toBeCloseTo(f.monthlyCost, 2);
  });

  it('token conservation: sum(step input)*runs === arrivals*perArrivalInput', () => {
    const f = agentForecast(base);
    const sumStepInput = f.steps!.reduce((s, x) => s + x.inputTokens, 0);
    const perArrival = 100 + (400 * (8 - 1)) / 2; // meanAccumulated
    expect(sumStepInput * base.runsPerMonth).toBeCloseTo(f.arrivalsPerMonth * perArrival, 2);
  });

  it('doubling steps more than doubles per-run cost (super-linear accumulation)', () => {
    const perRun4 = agentForecast({ ...base, model: flat, stepsPerRun: 4 }).monthlyCost / base.runsPerMonth;
    const perRun8 = agentForecast({ ...base, model: flat, stepsPerRun: 8 }).monthlyCost / base.runsPerMonth;
    expect(perRun8).toBeGreaterThan(2 * perRun4);
  });

  // P1-A12: a hostile stepsPerRun must not build a billion-element array or hang.
  it('A12: stepsPerRun 1e9 returns fast with a bounded downsampled profile', () => {
    const t0 = performance.now();
    const f = agentForecast({ ...base, model: flat, stepsPerRun: 1e9 });
    const elapsed = performance.now() - t0;
    expect(f.steps!.length).toBeLessThanOrEqual(MAX_PLOTTED_STEPS);
    expect(Number.isFinite(f.monthlyCost)).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });

  // P1-A13: hostile magnitudes never overflow to $Infinity.
  it('A13: Infinity/huge inputs yield a finite, non-Infinity cost', () => {
    const f = agentForecast({ ...base, model: flat, runsPerMonth: 1e300, stepsPerRun: 1e6 });
    expect(Number.isFinite(f.monthlyCost)).toBe(true);
  });

  it('kill switch returns inert forecast with null steps', () => {
    const f = agentForecast({ ...base, enabled: false });
    expect(f.cost.applicable).toBe(false);
    expect(f.steps).toBeNull();
  });

  // C1 review fix: step-profile dollars must reconcile to the headline even for a cache-null TIERED model
  // that straddles a price tier (the prefix must be banded, not left at the mean tier).
  it('C1: cache-null tiered straddle still reconciles Σ(step)·runs to monthlyCost within 1%', () => {
    const tiered: ModelRecord = {
      ...flat, inputPrice: 3, outputPrice: 9, cache: null, contextWindow: 1_000_000,
      tiers: [{ thresholdTokens: 200000, inputPrice: 6, outputPrice: 18 }],
    };
    const f = agentForecast({ model: tiered, toolSchemaTokens: 50000, systemTokens: 0, perStepUserSeedTokens: 2000, observationGrowthPerStep: 40000, actionOutputTokens: 100, stepsPerRun: 8, runsPerMonth: 100 });
    expect(f.tierStraddle).toBe(true);
    const perRun = f.steps!.reduce((s, x) => s + x.cost, 0);
    expect(perRun * 100).toBeCloseTo(f.monthlyCost, 2);
  });

  // P2-A1 review fix: the waterfall must foot to the corrected headline for a tiered straddle (a UI
  // waterfall renders cost.waterfall.components and must sum to cost.centralTotal).
  it('P2-A1: cost.waterfall.total === centralTotal under a tier straddle (cache-null AND cache)', () => {
    const tieredNoCache: ModelRecord = {
      ...flat, inputPrice: 3, outputPrice: 9, cache: null, contextWindow: 1_000_000,
      tiers: [{ thresholdTokens: 200000, inputPrice: 6, outputPrice: 18 }],
    };
    const tieredCache: ModelRecord = {
      ...tieredNoCache,
      cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.5, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false },
    };
    for (const model of [tieredNoCache, tieredCache]) {
      const f = agentForecast({ model, toolSchemaTokens: 50000, systemTokens: 0, perStepUserSeedTokens: 2000, observationGrowthPerStep: 40000, actionOutputTokens: 100, stepsPerRun: 8, runsPerMonth: 100 });
      expect(f.tierStraddle).toBe(true);
      expect(f.cost.waterfall.total).toBeCloseTo(f.cost.centralTotal, 4);
      const sum = f.cost.waterfall.components.reduce((s, c) => s + (c.cost ?? 0), 0);
      expect(sum).toBeCloseTo(f.cost.centralTotal, 4);
    }
  });

  // C2 review fix: no plotted step may exceed the context window, and the forecast stays finite.
  it('C2: step inputs are clamped to the context window when accumulation overflows it', () => {
    const f = agentForecast({ ...base, model: flat, toolSchemaTokens: 2000, systemTokens: 500, perStepUserSeedTokens: 100, observationGrowthPerStep: 50000, stepsPerRun: 8, runsPerMonth: 100 });
    const cap = 128000 - 2500; // contextWindow - prefix
    expect(f.contextTruncated).toBe(true);
    for (const s of f.steps!) expect(s.inputTokens).toBeLessThanOrEqual(cap);
    expect(Number.isFinite(f.monthlyCost)).toBe(true);
  });
});
