// §5.8: the CSV builder must sanitize every cell (a hostile model label / accuracy note cannot inject a
// formula) and reflect the forecast.
import { describe, it, expect } from 'vitest';
import { forecastToCsv } from '@/export/csv';
import type { EngineResult } from '@/store/engineClient';

const workload: EngineResult = {
  kind: 'workload',
  tornado: [],
  forecast: {
    kind: 'chatbot', monthlyCost: 123.45, arrivalsPerMonth: 1000,
    accuracyNote: 'estimate: heuristic', snapshotVersion: 'abc123def456', formula: 'chatbot: ...',
    tierStraddle: false, contextTruncated: false, steps: null,
    cost: {
      applicable: true, warmth: 0.5, centralTotal: 123.45, conservativeTotal: 200,
      savingsUpTo: { central: 76.55, conservativeReference: 200, qualifier: 'up_to' },
      writesPerMonth: 1, waterfall: { components: [{ label: 'input', cost: 100 }, { label: 'output', cost: 23.45 }] , total: 123.45 },
      confidence: { low: 110, mid: 123.45, high: 140, unmodeled: false }, breakEvenArrivals: null,
    },
  },
};

describe('forecastToCsv (§5.8)', () => {
  it('includes the headline cost + components', () => {
    const csv = forecastToCsv(workload, 'chatbot', 'gpt-4o (openai)', '2025-09-01');
    expect(csv).toContain('123.45');
    expect(csv).toContain('input');
    expect(csv).toContain('2025-09-01');
  });

  it('sanitizes an injection payload in the model label (no leading =)', () => {
    const csv = forecastToCsv(workload, 'chatbot', '=cmd|calc', '2025-09-01');
    // the "=cmd|calc" cell must be neutralized (prefixed), never a bare leading =
    const modelLine = csv.split('\r\n').find((l) => l.includes('cmd'))!;
    const cell = modelLine.split(',')[1] ?? '';
    expect(cell.startsWith('=')).toBe(false);
  });
});
