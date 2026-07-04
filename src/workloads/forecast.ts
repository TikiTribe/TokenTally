// Shared forecast assembly: run one WarmScenario through monthlyWarmCost, and when the accumulation
// straddles a 128k/200k price tier (P1-A7), correct the input/output/reasoning dollars via exact per-band
// pricing while keeping the warm-cache prefix cost from the engine. The IOR cost is identical in the central
// and conservative (p_warm=0) worlds — only the prefix cache differs — so the conservative correction is the
// same additive warm-cache delta, and the confidence band recomposes exactly. Pure. Owner: engine.
// Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import { composeConfidence } from '@/engine/cost/confidence';
import { buildWaterfall } from '@/engine/cost/costCore';
import { effectiveInputRate, effectiveOutputRate } from '@/engine/cost/rates';
import { detectStraddle, bandedAccumulatedCost, type BandedCost } from '@/workloads/tiers';
import type { WarmScenario, WarmCostResult, WaterfallBarInput, CostComponentEntry } from '@/types/engine';
import type { WorkloadForecast, WorkloadKind, StepProfile } from '@/types/workload';

// P2-A1: build waterfall components from a banded breakdown so their sum foots to the corrected total.
function bandedComponents(b: BandedCost, cacheBars: CostComponentEntry[]): CostComponentEntry[] {
  const out: CostComponentEntry[] = [...cacheBars, { label: 'input', cost: b.input }];
  if (b.output > 0) out.push({ label: 'output', cost: b.output });
  if (b.reasoning > 0) out.push({ label: 'reasoning', cost: b.reasoning });
  return out;
}

export interface AssembleParams {
  kind: WorkloadKind;
  scenario: WarmScenario;
  // Accumulation descriptor for the straddle correction: input_k = base + (k-1)*growth over `units` units,
  // each recurring `arrivalsPerCycle` times/month (= conversations/runs).
  accum: { base: number; growth: number; units: number; arrivalsPerCycle: number };
  accuracyNote: string;
  snapshotVersion: string;
  formula: string;
  contextTruncated: boolean;
  steps: StepProfile[] | null;
}

// A non-token-modeled forecast that SURFACES the gap instead of showing a silent $0 (C9 / DoW A15 parity).
function notModeled(p: AssembleParams, unit: string): WorkloadForecast {
  return {
    kind: p.kind,
    monthlyCost: 0,
    cost: {
      applicable: false, warmth: null, centralTotal: 0, conservativeTotal: 0,
      savingsUpTo: { central: 0, conservativeReference: 0, qualifier: 'up_to' },
      writesPerMonth: 0, waterfall: { components: [], total: 0 },
      confidence: { low: 0, mid: 0, high: 0, unmodeled: true }, breakEvenArrivals: null,
    },
    arrivalsPerMonth: p.scenario.arrivalsPerMonth,
    accuracyNote: `not modeled: ${unit} billing is duration/DBU-based — do not read as $0. Size it in its native unit.`,
    snapshotVersion: p.snapshotVersion,
    formula: `unmodeled:${unit}`,
    tierStraddle: false,
    contextTruncated: p.contextTruncated,
    steps: null,
  };
}

// Non-warm cost for a per_character SKU: no prompt cache, the prefix is re-sent as input each arrival, and
// dollars come straight from buildWaterfall in the native (character) unit (C3/C9). Owner: engine.
function perCharacterForecast(p: AssembleParams): WorkloadForecast {
  const scn = p.scenario;
  const chars = scn.prefixTokens + scn.perArrivalInputTokens; // "tokens" are characters for this SKU
  const inRate = effectiveInputRate(scn.model, chars);
  const outRate = effectiveOutputRate(scn.model, chars) ?? 0;
  const reasonRate = scn.model.reasoningPerMToken ?? 0;
  const bars: WaterfallBarInput[] = [
    { label: 'input', quantity: scn.arrivalsPerMonth * chars, rate: inRate, unit: 'per_character' },
    { label: 'output', quantity: scn.arrivalsPerMonth * scn.perArrivalOutputTokens, rate: outRate, unit: 'per_character' },
  ];
  if (scn.perArrivalReasoningTokens > 0 && reasonRate > 0) {
    bars.push({ label: 'reasoning', quantity: scn.arrivalsPerMonth * scn.perArrivalReasoningTokens, rate: reasonRate, unit: 'per_character' });
  }
  const waterfall = buildWaterfall(bars);
  return {
    kind: p.kind,
    monthlyCost: waterfall.total,
    cost: {
      applicable: true, warmth: null, centralTotal: waterfall.total, conservativeTotal: waterfall.total,
      savingsUpTo: { central: 0, conservativeReference: waterfall.total, qualifier: 'up_to' },
      writesPerMonth: 0, waterfall,
      confidence: composeConfidence(waterfall.total, scn.tokenizerBand ?? null, null), breakEvenArrivals: null,
    },
    arrivalsPerMonth: scn.arrivalsPerMonth,
    accuracyNote: `${p.accuracyNote} (per_character billing; no prompt cache)`,
    snapshotVersion: p.snapshotVersion,
    formula: `${p.formula} [per_character, no cache]`,
    tierStraddle: false,
    contextTruncated: p.contextTruncated,
    steps: p.steps,
  };
}

export function assembleForecast(p: AssembleParams): WorkloadForecast {
  const scn = p.scenario;
  // Dispatch on billing unit: per_token gets the full warm-cache path; per_character a non-warm char-based
  // cost; per_second/dbu are duration/DBU-shaped and surfaced as not-modeled (never a silent $0).
  if (scn.model.billingUnit === 'per_character') return perCharacterForecast(p);
  if (scn.model.billingUnit !== 'per_token') return notModeled(p, scn.model.billingUnit);

  const wc = monthlyWarmCost(scn);
  // C2 review fix: when the context window truncated the accumulation, the window cap already bounds the
  // cost and the accumulation plateaus at the cap (no real per-band straddle) — skip the correction.
  const straddle =
    wc.applicable &&
    !p.contextTruncated &&
    detectStraddle(scn.model, scn.prefixTokens, p.accum.base, p.accum.growth, p.accum.units);

  let cost: WarmCostResult = wc;
  if (straddle) {
    let centralCorrected: number;
    let conservativeCorrected: number;
    // P2-A1: rebuild the waterfall from the banded breakdown so waterfall.total === centralCorrected by
    // construction (a UI waterfall must foot to the headline). Cache bars carry over unchanged.
    let components: CostComponentEntry[];
    if (scn.model.cache === null) {
      // C1 review fix: with no cache the prefix is billed as INPUT every arrival, so band (prefix + input)
      // together at each band's rate. This reconciles exactly to the per-step chart (A11) even under a
      // straddle; the earlier code left the prefix at the single mean tier and diverged ~7.6%.
      const b = bandedAccumulatedCost(
        scn.model, 0, scn.prefixTokens + p.accum.base, p.accum.growth, p.accum.units,
        p.accum.arrivalsPerCycle, scn.perArrivalOutputTokens, scn.perArrivalReasoningTokens,
      );
      centralCorrected = b.total;
      conservativeCorrected = b.total; // no warm cache to save
      components = bandedComponents(b, []);
    } else {
      // Cache model: keep the warm-cache prefix cost at the mean tier (second-order; the probabilistic
      // warm/cold split makes exact per-band prefix pricing moot) and band the non-prefix input/output.
      const cacheBars = wc.waterfall.components.filter((c) => c.label === 'cacheWrite' || c.label === 'cacheReads');
      const prefixCacheCentral = cacheBars.reduce((s, c) => s + (c.cost ?? 0), 0);
      const b = bandedAccumulatedCost(
        scn.model, scn.prefixTokens, p.accum.base, p.accum.growth, p.accum.units,
        p.accum.arrivalsPerCycle, scn.perArrivalOutputTokens, scn.perArrivalReasoningTokens,
      );
      centralCorrected = prefixCacheCentral + b.total;
      conservativeCorrected = centralCorrected + (wc.conservativeTotal - wc.centralTotal);
      components = bandedComponents(b, cacheBars);
    }
    // F-1 review fix: if the banded correction overflowed (hostile magnitudes), keep the engine-guarded
    // finite wc values rather than shipping $Infinity.
    if (Number.isFinite(centralCorrected) && Number.isFinite(conservativeCorrected)) {
      const delta = conservativeCorrected - centralCorrected;
      const relHigh = centralCorrected > 0 ? Math.max(0, delta / centralCorrected) : 0;
      cost = {
        ...wc,
        centralTotal: centralCorrected,
        conservativeTotal: conservativeCorrected,
        savingsUpTo: {
          central: Math.max(0, delta),
          conservativeReference: conservativeCorrected,
          qualifier: 'up_to',
        },
        waterfall: { components, total: centralCorrected },
        confidence: composeConfidence(centralCorrected, scn.tokenizerBand ?? null, { relLow: 0, relHigh }),
      };
    }
  }

  return {
    kind: p.kind,
    monthlyCost: cost.centralTotal,
    cost,
    arrivalsPerMonth: scn.arrivalsPerMonth,
    accuracyNote: p.accuracyNote,
    snapshotVersion: p.snapshotVersion,
    formula: p.formula,
    tierStraddle: straddle,
    contextTruncated: p.contextTruncated,
    steps: p.steps,
  };
}
