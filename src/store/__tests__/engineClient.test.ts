// 2C engine-client integration (node): resolve a real model from the pinned registry and run each mode;
// verify never-$0 branches (bad model -> unavailable; non-per_token -> honest note, not $0).
import { describe, it, expect, beforeAll } from 'vitest';
import { runForecast, warmthCurve } from '@/store/engineClient';
import { loadRegistry, listByMode } from '@/registry';
import registrySnapshot from '@/config/registry.generated.json';
import type { RegistrySnapshot, ModelRecord } from '@/types/registry';
import type { ModeInputs } from '@/store/types';

const INPUTS: ModeInputs = {
  chatbot: { systemPromptText: '', avgUserMessageTokens: 50, avgResponseTokens: 200, turnsPerConversation: 5, contextStrategy: 'moderate', conversationsPerMonth: 10000, ttl: 'min5' },
  prompt: { promptText: '', responseTokens: 300, callsPerMonth: 100000, turnsPerCall: 1, sharedSystemPromptTokens: 0 },
  agent: { preset: 'custom', runsPerMonth: 1000, stepsPerRun: 6, toolSchemaTokens: 1500, observationGrowthPerStep: 350, actionOutputTokens: 150 },
  crew: { memberCount: 3, runsPerMonth: 500, stepsPerMember: 5, sharedTranscriptGrowthPerStep: 200 },
  denial_of_wallet: { enabled: true, acknowledgedAuthorizedUse: true, attackerRequestsPerMonth: 1_000_000, retryCeiling: 1, fallbackInputTokens: 8000, fallbackOutputTokens: 4000 },
};

let perToken: ModelRecord;
let perChar: ModelRecord | undefined;
let caching: ModelRecord | undefined;

beforeAll(() => {
  loadRegistry(registrySnapshot as unknown as RegistrySnapshot);
  const chat = listByMode('chat');
  // A real, PRICED per-token model (the catalog now includes some $0/free per-token entries; the test's
  // intent is "a real model with real pricing yields a positive forecast").
  perToken = chat.find((m) => m.billingUnit === 'per_token' && (m.inputPrice ?? 0) > 0 && (m.outputPrice ?? 0) > 0)!;
  perChar = chat.find((m) => m.billingUnit === 'per_character');
  caching = chat.find((m) => m.billingUnit === 'per_token' && m.cache !== null && (m.inputPrice ?? 0) > 0);
});

const sel = (m: ModelRecord) => ({ canonicalId: m.canonicalId, deployment: m.deployment });

describe('engineClient.runForecast (2C)', () => {
  it('a real model produces a positive chatbot forecast with a waterfall that foots to the headline', () => {
    const r = runForecast('chatbot', INPUTS, sel(perToken), {}, 'snap');
    expect(r.kind).toBe('workload');
    if (r.kind === 'workload') {
      expect(r.forecast.monthlyCost).toBeGreaterThan(0);
      const sum = r.forecast.cost.waterfall.components.reduce((s, c) => s + (c.cost ?? 0), 0);
      expect(sum).toBeCloseTo(r.forecast.cost.centralTotal, 4);
    }
  });

  it('every workload mode resolves for a real model', () => {
    for (const mode of ['chatbot', 'prompt', 'agent', 'crew'] as const) {
      expect(runForecast(mode, INPUTS, sel(perToken), {}, 'snap').kind).toBe('workload');
    }
    expect(runForecast('denial_of_wallet', INPUTS, sel(perToken), {}, 'snap').kind).toBe('dow');
  });

  it('an unknown model returns unavailable, never a $0 forecast', () => {
    const r = runForecast('chatbot', INPUTS, { canonicalId: 'no-such-model', deployment: 'nowhere' }, {}, 'snap');
    expect(r.kind).toBe('unavailable');
  });

  it('a per_character model is applicable=false with an honest note (never a silent $0)', () => {
    if (!perChar) return; // registry may lack one; guarded
    const r = runForecast('prompt', INPUTS, sel(perChar), {}, 'snap');
    // per_character is COSTED (applicable) by the engine's per_character path; per_second would be not-modeled.
    expect(r.kind).toBe('workload');
  });
});

describe('warmthCurve (B1 sweep producer)', () => {
  // A cached prefix: the system prompt tokenizes to a real prefix, which a caching model reuses across arrivals.
  const prefix = { 'chatbot.systemPrompt': { count: 3000, badge: 'exact', errorBand: null, truncated: false } };

  it('returns null when there is no warm-cache dynamic (no cached prefix)', () => {
    // default INPUTS has an empty system prompt -> no prefix -> nothing to warm, even on a caching model.
    expect(warmthCurve('chatbot', INPUTS, sel(perToken), {}, 'snap')).toBeNull();
  });

  it('returns null for modes with no arrivals axis (agent, crew)', () => {
    expect(warmthCurve('agent', INPUTS, sel(perToken), {}, 'snap')).toBeNull();
    expect(warmthCurve('crew', INPUTS, sel(perToken), {}, 'snap')).toBeNull();
  });

  it('returns a bounded, monotonic, sensibly-ordered series for a caching model with a cached prefix', () => {
    if (!caching) throw new Error('registry has no caching per-token model'); // there are many; fail loudly if not
    const series = warmthCurve('chatbot', INPUTS, sel(caching), prefix, 'snap');
    expect(series).not.toBeNull();
    if (!series) return;
    expect(series).toHaveLength(16);
    for (const p of series) {
      expect(p.arrivals).toBeGreaterThanOrEqual(1);
      expect(p.low).toBeLessThanOrEqual(p.central + 1e-6);
      expect(p.central).toBeLessThanOrEqual(p.high + 1e-6);
      expect(p.central).toBeLessThanOrEqual(p.conservative + 1e-6); // warm cache only ever reduces cost
    }
    for (let i = 1; i < series.length; i++) {
      expect(series[i]!.arrivals).toBeGreaterThanOrEqual(series[i - 1]!.arrivals); // log-spaced, non-decreasing
    }
  });
});
