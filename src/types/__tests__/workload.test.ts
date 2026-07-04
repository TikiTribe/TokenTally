import { describe, it, expect } from 'vitest';
import type { WorkloadForecast, StepProfile } from '@/types/workload';
import { WORKLOAD_KINDS } from '@/types/workload';

describe('workload types', () => {
  it('enumerates the four workloads plus denial-of-wallet', () => {
    expect(WORKLOAD_KINDS).toEqual(['chatbot', 'prompt', 'agent', 'crew', 'denial_of_wallet']);
  });

  it('a forecast carries cost, arrivals, an accuracy note, a snapshotVersion + formula trace (A16), and straddle/truncation flags', () => {
    const f: WorkloadForecast = {
      kind: 'chatbot',
      monthlyCost: 12.5,
      cost: {
        applicable: true,
        warmth: 0.5,
        centralTotal: 12.5,
        conservativeTotal: 20,
        savingsUpTo: { central: 7.5, conservativeReference: 20, qualifier: 'up_to' },
        writesPerMonth: 1,
        waterfall: { components: [], total: 12.5 },
        confidence: { low: 11, mid: 12.5, high: 14, unmodeled: false },
        breakEvenArrivals: null,
      },
      arrivalsPerMonth: 100,
      accuracyNote: 'estimate: token counts are heuristic',
      snapshotVersion: 'abc123',
      formula: 'chatbot: cacheWrite+cacheReads+input+output',
      tierStraddle: false,
      contextTruncated: false,
      steps: null,
    };
    expect(f.monthlyCost).toBe(12.5);
    expect(f.snapshotVersion).toBe('abc123');
    expect(f.formula.length).toBeGreaterThan(0);

    const s: StepProfile = { step: 1, inputTokens: 10, outputTokens: 5, reasoningTokens: 0, cost: 0.01 };
    expect(s.step).toBe(1);
  });
});
