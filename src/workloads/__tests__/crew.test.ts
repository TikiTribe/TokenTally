import { describe, it, expect } from 'vitest';
import { crewForecast, MAX_CREW_MEMBERS } from '@/workloads/crew';
import { agentForecast } from '@/workloads/agent';
import type { AgentConfig, CrewConfig } from '@/types/workload';
import type { ModelRecord } from '@/types/registry';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai',
  underlyingFamily: 'openai', mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10,
  reasoningPerMToken: null,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 1.25, cacheWritePerMToken: 2.5, rateUnavailable: false, readUnavailable: false },
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'exact_unverified', freeTier: false, deprecated: false,
};
const member = (over: Partial<AgentConfig> = {}): AgentConfig => ({
  model, toolSchemaTokens: 1500, systemTokens: 300, perStepUserSeedTokens: 80,
  observationGrowthPerStep: 300, actionOutputTokens: 120, stepsPerRun: 5, runsPerMonth: 2000, ...over,
});

describe('crewForecast', () => {
  it('sums member costs at the crew run count', () => {
    const cfg: CrewConfig = { agents: [member(), member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 2000 };
    const f = crewForecast(cfg);
    const oneMember = agentForecast(member({ runsPerMonth: 2000 })).monthlyCost;
    expect(f.monthlyCost).toBeCloseTo(2 * oneMember, 4);
    expect(f.kind).toBe('crew');
  });

  it('shared transcript growth raises cost above zero-growth', () => {
    const zero = crewForecast({ agents: [member(), member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 2000 });
    const grow = crewForecast({ agents: [member(), member()], sharedTranscriptGrowthPerStep: 500, runsPerMonth: 2000 });
    expect(grow.monthlyCost).toBeGreaterThan(zero.monthlyCost);
  });

  it('crew runsPerMonth overrides each member run count', () => {
    const f = crewForecast({ agents: [member({ runsPerMonth: 999999 })], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 1000 });
    expect(f.arrivalsPerMonth).toBe(5000); // 1000 runs * 5 steps
  });

  it('confidence sums across members (additive); mid ≈ monthlyCost', () => {
    const f = crewForecast({ agents: [member(), member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 2000 });
    expect(f.cost.confidence.high).toBeGreaterThanOrEqual(f.cost.confidence.mid);
    expect(f.cost.confidence.mid).toBeCloseTo(f.monthlyCost, 4);
  });

  // P1-A30: the additive band is labeled a conservative fully-correlated bound, not a percentile interval.
  it('A30: accuracy note flags the conservative correlated bound', () => {
    const f = crewForecast({ agents: [member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 100 });
    expect(f.accuracyNote).toMatch(/correlated|conservative/i);
  });

  // P1-A12: a hostile crew size must not iterate unboundedly.
  it('A12: caps the member count', () => {
    const agents = Array.from({ length: 5000 }, () => member({ runsPerMonth: 10 }));
    const f = crewForecast({ agents, sharedTranscriptGrowthPerStep: 0, runsPerMonth: 10 });
    expect(Number.isFinite(f.monthlyCost)).toBe(true);
    expect(f.accuracyNote).toContain(`capped at ${MAX_CREW_MEMBERS}`);
  });

  it('kill switch returns inert forecast', () => {
    const f = crewForecast({ agents: [member()], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 10, enabled: false });
    expect(f.cost.applicable).toBe(false);
  });
});
