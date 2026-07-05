// Honest accuracy note + inert kill-switch result, shared by every workload adapter so the labeling rule
// lives in one tested place. A model's accuracyTier plus the tokenizer band decide the base wording; a
// preset-seeded config appends its provenance (P1-A17) so "exact (unverified)" from the tokenizer never
// hides that the token INPUTS are unvalidated seeds. A disabled workload returns an applicable=false
// forecast, never a throw (spec §9). Owner: engine. Version: Phase 1.
import type { ModelRecord } from '@/types/registry';
import type { TokenizerBand, WorkloadForecast, WorkloadKind } from '@/types/workload';

export function accuracyNoteFor(model: ModelRecord, band: TokenizerBand, assumptionsSource?: string): string {
  // relLow is already signed negative (e.g. -0.3), so DON'T prefix another '-' (that rendered "--30%").
  const bandStr =
    band && (band.relLow !== 0 || band.relHigh !== 0)
      ? ` (token band ${Math.round(band.relLow * 100)}%/+${Math.round(band.relHigh * 100)}%)`
      : '';
  let base: string;
  switch (model.accuracyTier) {
    case 'exact':
      base = `exact: real tokenizer, matches API billing${bandStr}`;
      break;
    case 'exact_unverified':
      base = `exact (unverified): proxy tokenizer, not spot-checked${bandStr}`;
      break;
    case 'approx':
      base = `approx: proxy tokenizer${bandStr}`;
      break;
    default:
      base = `estimate: token counts are heuristic${bandStr}`;
      break;
  }
  // P1-A17: preset-seeded inputs are unvalidated defaults regardless of the tokenizer tier.
  return assumptionsSource ? `${base}; inputs are ${assumptionsSource} - tune to your workload` : base;
}

export function disabledForecast(kind: WorkloadKind): WorkloadForecast {
  return {
    kind,
    monthlyCost: 0,
    cost: {
      applicable: false,
      warmth: null,
      centralTotal: 0,
      conservativeTotal: 0,
      savingsUpTo: { central: 0, conservativeReference: 0, qualifier: 'up_to' },
      writesPerMonth: 0,
      waterfall: { components: [], total: 0 },
      confidence: { low: 0, mid: 0, high: 0, unmodeled: true },
      breakEvenArrivals: null,
    },
    arrivalsPerMonth: 0,
    accuracyNote: `disabled: ${kind} workload kill switch is off`,
    snapshotVersion: 'unknown',
    formula: 'disabled',
    tierStraddle: false,
    contextTruncated: false,
    steps: null,
  };
}
