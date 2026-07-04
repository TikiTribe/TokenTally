// P1-A26: the dist-scanning honest-claims CI gate is blind to Phase-1 note strings (they tree-shake out of
// dist). Catch a dishonest claim where the strings actually live: run every note producer across tiers and
// assert none emits an unqualified "±5%" accuracy claim or a "100% test/coverage" claim.
import { describe, it, expect } from 'vitest';
import { accuracyNoteFor, disabledForecast } from '@/workloads/note';
import { crewForecast, AGENT_PRESETS } from '@/workloads';
import { denialOfWallet, DOW_DISCLAIMER } from '@/optimization';
import type { ModelRecord } from '@/types/registry';
import type { AccuracyTier } from '@/types/registry';

const BANNED = [
  { re: /±\s?5(?:\.\d)?\s?(%|percent)/i, why: 'unqualified ±5% accuracy claim' },
  { re: /\+\s?\/?\s?-\s?5(?:\.\d)?\s?(%|percent)/i, why: 'unqualified +/-5% accuracy claim' },
  { re: /100\s*%[^.]{0,30}(test|cover)/i, why: '100% test-coverage claim' },
];

function assertHonest(label: string, text: string): void {
  for (const { re, why } of BANNED) {
    expect(re.test(text), `${label} makes a ${why}: "${text}"`).toBe(false);
  }
}

const model = (tier: AccuracyTier): ModelRecord => ({
  canonicalId: 'm', deployment: 'x', displayName: 'M', provider: 'x', underlyingFamily: 'openai', mode: 'chat',
  billingUnit: 'per_token', inputPrice: 3, outputPrice: 15, reasoningPerMToken: 60,
  cache: { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false },
  contextWindow: 200000, maxOutput: 8192, tiers: [], accuracyTier: tier, freeTier: false, deprecated: false,
});

describe('Phase-1 note strings make no dishonest accuracy claim (A26)', () => {
  it('accuracyNoteFor across all tiers + bands + preset provenance', () => {
    const tiers: AccuracyTier[] = ['exact', 'exact_unverified', 'approx', 'estimate'];
    for (const t of tiers) {
      assertHonest(`accuracyNoteFor(${t})`, accuracyNoteFor(model(t), { relLow: -0.1, relHigh: 0.1 }, 'langchain preset seed defaults'));
    }
  });

  it('disabled, crew, DoW, and preset source strings', () => {
    for (const k of ['chatbot', 'prompt', 'agent', 'crew', 'denial_of_wallet'] as const) {
      assertHonest(`disabled:${k}`, disabledForecast(k).accuracyNote);
    }
    const crew = crewForecast({ agents: [], sharedTranscriptGrowthPerStep: 0, runsPerMonth: 10 });
    assertHonest('crew note', crew.accuracyNote);
    const dow = denialOfWallet({ model: model('estimate'), attackerRequestsPerMonth: 1000, enabled: true });
    assertHonest('dow note', dow.note);
    assertHonest('dow disclaimer', DOW_DISCLAIMER);
    for (const p of AGENT_PRESETS) assertHonest(`preset:${p.name}`, p.source);
  });
});
