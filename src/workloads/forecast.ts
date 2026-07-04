// Shared forecast assembly: run one WarmScenario through monthlyWarmCost, and when the accumulation
// straddles a 128k/200k price tier (P1-A7), correct the input/output/reasoning dollars via exact per-band
// pricing while keeping the warm-cache prefix cost from the engine. The IOR cost is identical in the central
// and conservative (p_warm=0) worlds — only the prefix cache differs — so the conservative correction is the
// same additive warm-cache delta, and the confidence band recomposes exactly. Pure. Owner: engine.
// Version: Phase 1.
import { monthlyWarmCost } from '@/engine';
import { composeConfidence } from '@/engine/cost/confidence';
import { detectStraddle, bandedAccumulatedCost } from '@/workloads/tiers';
import type { WarmScenario, WarmCostResult } from '@/types/engine';
import type { WorkloadForecast, WorkloadKind, StepProfile } from '@/types/workload';

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

export function assembleForecast(p: AssembleParams): WorkloadForecast {
  const scn = p.scenario;
  const wc = monthlyWarmCost(scn);
  const straddle =
    wc.applicable && detectStraddle(scn.model, scn.prefixTokens, p.accum.base, p.accum.growth, p.accum.units);

  let cost: WarmCostResult = wc;
  if (straddle) {
    const prefixCacheCentral = wc.waterfall.components
      .filter((c) => c.label === 'cacheWrite' || c.label === 'cacheReads')
      .reduce((s, c) => s + (c.cost ?? 0), 0);
    const ior = bandedAccumulatedCost(
      scn.model,
      scn.prefixTokens,
      p.accum.base,
      p.accum.growth,
      p.accum.units,
      p.accum.arrivalsPerCycle,
      scn.perArrivalOutputTokens,
      scn.perArrivalReasoningTokens,
    );
    const centralCorrected = prefixCacheCentral + ior;
    const delta = wc.conservativeTotal - wc.centralTotal; // pure prefix warm-cache saving (IOR cancels)
    const conservativeCorrected = centralCorrected + delta;
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
      confidence: composeConfidence(centralCorrected, scn.tokenizerBand ?? null, { relLow: 0, relHigh }),
    };
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
