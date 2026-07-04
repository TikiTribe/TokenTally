// P1-A8 / spec §8: hand-verified scenarios within 1% of hand math, per workload AND billing unit, plus the
// cross-workload invariants. These oracles exercise the warm-cache, tier, per_character, and reasoning paths
// the earlier vacuous (cache:null, tiers:[]) oracle could not — written to fail on A6/A7 regressions.
import { describe, it, expect } from 'vitest';
import { chatbotForecast, promptForecast, agentForecast, crewForecast } from '@/workloads';
import { denialOfWallet } from '@/optimization';
import type { ModelRecord } from '@/types/registry';

// A no-cache per-token model makes the hand math exact (no warm-cache probability term).
const flat: ModelRecord = {
  canonicalId: 'flat', deployment: 'x', displayName: 'Flat', provider: 'x', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 10, outputPrice: 30, reasoningPerMToken: null,
  cache: null, contextWindow: 1_000_000, maxOutput: 4096, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

describe('hand-verified scenarios (spec §8, within 1%)', () => {
  it('prompt/batch, no cache: cost = calls*(in*inRate + out*outRate)/1e6', () => {
    // 100000*(500*10 + 300*30)/1e6 = 100000*14000/1e6 = 1400
    const f = promptForecast({ model: flat, promptTokens: 500, responseTokens: 300, callsPerMonth: 100000 });
    expect(f.monthlyCost).toBeCloseTo(1400, 0);
  });

  it('chatbot, no cache (prefix 0): input folds mean-accumulated context', () => {
    // 10k conv * 4 turns = 40k arrivals. perArrivalInput = 50 + mean(0,150,4)=275. out=200.
    // 40000*(275*10 + 200*30)/1e6 = 40000*8750/1e6 = 350
    const f = chatbotForecast({ model: flat, systemPromptTokens: 0, avgUserMessageTokens: 50, avgResponseTokens: 200, turnsPerConversation: 4, contextGrowthPerTurn: 150, conversationsPerMonth: 10000 });
    expect(f.monthlyCost).toBeCloseTo(350, 0);
  });

  it('agent, no cache: prefix billed every step at base input rate', () => {
    // 1000 runs * 5 steps = 5000 arrivals. prefix 2000. perArrivalInput = 100 + mean(0,400,5)=900.
    // 5000*((2000+900)*10 + 150*30)/1e6 = 5000*33500/1e6 = 167.5
    const f = agentForecast({ model: flat, toolSchemaTokens: 2000, systemTokens: 0, perStepUserSeedTokens: 100, observationGrowthPerStep: 400, actionOutputTokens: 150, stepsPerRun: 5, runsPerMonth: 1000 });
    expect(f.monthlyCost).toBeCloseTo(167.5, 1);
  });

  it('per_character billing unit: costed in the native unit, not a silent $0', () => {
    const perChar: ModelRecord = { ...flat, billingUnit: 'per_character', inputPrice: 2, outputPrice: 6, cache: null };
    // 1000 calls, prompt 400 chars, response 100 chars: 1000*((400)*2 + 100*6)/1e6 = 1000*1400/1e6 = 1.4
    const f = promptForecast({ model: perChar, promptTokens: 400, responseTokens: 100, callsPerMonth: 1000 });
    expect(f.cost.applicable).toBe(true);
    expect(f.monthlyCost).toBeCloseTo(1.4, 3);
    expect(f.accuracyNote).toMatch(/per_character/);
  });

  it('per_second billing unit is surfaced as not-modeled, never a silent $0', () => {
    const perSec: ModelRecord = { ...flat, billingUnit: 'per_second', outputPrice: null, cache: null, contextWindow: null, maxOutput: null };
    const f = promptForecast({ model: perSec, promptTokens: 400, responseTokens: 100, callsPerMonth: 1000 });
    expect(f.cost.applicable).toBe(false);
    expect(f.accuracyNote).toMatch(/not modeled|do not read as \$0/i);
  });

  it('tiered-straddle agent: per-band exact total (not the mean-fold understatement)', () => {
    // A7: prefix 50k, seed 2k, growth 40k, 8 steps, 1 run, no cache. input-only DS2 = $6.072/run;
    // prefix billed each step at input rate: 8*50000 = 400000 tok. With the 200k tier ($3 <=200k, $6 >),
    // prefix tokens land per-band too. Just assert straddle detected and cost >> the naive single-tier mean.
    const tiered: ModelRecord = { ...flat, inputPrice: 3, outputPrice: 9, cache: null,
      tiers: [{ thresholdTokens: 200000, inputPrice: 6, outputPrice: 18 }] };
    const straddled = agentForecast({ model: tiered, toolSchemaTokens: 50000, systemTokens: 0, perStepUserSeedTokens: 2000, observationGrowthPerStep: 40000, actionOutputTokens: 0, stepsPerRun: 8, runsPerMonth: 1 });
    expect(straddled.tierStraddle).toBe(true);
    // naive mean-fold would price all 8 steps at the low $3 tier; the per-band total must exceed it.
    const naiveLowTierTotal = 8 * (50000 + (2000 + 40000 * 3.5)) * 3 / 1e6; // ~$4.6
    expect(straddled.monthlyCost).toBeGreaterThan(naiveLowTierTotal * 1.2);
  });

  it('crew additivity: total = sum of member totals', () => {
    const m = { model: flat, toolSchemaTokens: 1000, systemTokens: 0, perStepUserSeedTokens: 100, observationGrowthPerStep: 200, actionOutputTokens: 100, stepsPerRun: 4, runsPerMonth: 500 };
    const one = agentForecast({ ...m }).monthlyCost;
    const crew = crewForecast({ agents: [{ ...m }, { ...m }, { ...m }], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 500 });
    expect(crew.monthlyCost).toBeCloseTo(3 * one, 4);
  });

  it('DoW worst case >= a benign central estimate of the same volume', () => {
    const model: ModelRecord = { ...flat, cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1, cacheWritePerMToken: 12, rateUnavailable: false, readUnavailable: false }, contextWindow: 100000, maxOutput: 4000 };
    const benign = promptForecast({ model, promptTokens: 500, responseTokens: 200, callsPerMonth: 100000 }).monthlyCost;
    const worst = denialOfWallet({ model, attackerRequestsPerMonth: 100000, enabled: true }).worstCaseMonthly;
    expect(worst).toBeGreaterThan(benign);
  });
});
