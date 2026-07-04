import { describe, it, expect } from 'vitest';
import { AGENT_PRESETS, applyPreset } from '@/workloads/presets';
import type { ModelRecord } from '@/types/registry';

const model: ModelRecord = {
  canonicalId: 'gpt-4o', deployment: 'openai', displayName: 'GPT-4o', provider: 'openai', underlyingFamily: 'openai',
  mode: 'chat', billingUnit: 'per_token', inputPrice: 2.5, outputPrice: 10, reasoningPerMToken: null, cache: null,
  contextWindow: 128000, maxOutput: 16384, tiers: [], accuracyTier: 'estimate', freeTier: false, deprecated: false,
};

describe('agent presets', () => {
  it('exposes the five framework presets, each tunable and labeled', () => {
    expect(AGENT_PRESETS.map((p) => p.name)).toEqual(['langchain', 'crewai', 'autogen', 'llamaindex', 'custom']);
    for (const p of AGENT_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.source).toMatch(/seed|typical|default/i); // provenance note, not measured truth
    }
  });

  it('applyPreset seeds an AgentConfig that overrides cleanly and stamps provenance (A17)', () => {
    const cfg = applyPreset('crewai', model, { runsPerMonth: 1234 });
    expect(cfg.model).toBe(model);
    expect(cfg.runsPerMonth).toBe(1234); // caller override wins over the seed
    expect(cfg.stepsPerRun).toBeGreaterThan(0);
    expect(cfg.assumptionsSource).toMatch(/crewai/i); // provenance stamped for the accuracy note
  });

  it('unknown preset falls back to custom (A4: standalone const, no undefined deref)', () => {
    // @ts-expect-error deliberate bad name — now validated by typecheck:tests (P1-A24)
    const cfg = applyPreset('nope', model, {});
    expect(cfg.stepsPerRun).toBeGreaterThan(0);
  });
});
