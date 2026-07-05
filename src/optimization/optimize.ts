// Provider-agnostic optimizer: price the base workload, price each candidate transform, and rank the
// strictly-positive dollar savings. P1-A18: each recommendation carries a saving BAND (propagated from both
// forecasts' confidence) and a structured `overlaps` flag, and a rec whose saving band straddles zero is
// down-ranked - so a "saving" between two wide Estimate ranges is disclosed, never headlined as precise.
// solveBudget returns BOTH a central and a conservative arrival ceiling. Pure. Owner: engine. Version: Phase 1.
//
// SECURITY (P1-A29): label/rationale are display-as-text-only (DOM text nodes, never innerHTML).
import { candidates, type OptimizationBase, type OptKind, type WorkloadConfig } from '@/optimization/candidates';
import { priceWorkload } from '@/optimization/price';

export interface Recommendation {
  id: string;
  optKind: OptKind;
  label: string;
  monthlyCost: number;
  monthlySavings: number; // central (mid - mid)
  savingsLow: number; // worst-case saving (baseline low - candidate high)
  savingsHigh: number; // best-case saving (baseline high - candidate low)
  savingsPct: number;
  overlaps: boolean; // the two confidence ranges overlap -> saving is directional, not precise
  rationale: string;
}

const price = (base: OptimizationBase, config: WorkloadConfig) => priceWorkload(base.kind, config);

export function optimize(base: OptimizationBase): Recommendation[] {
  const baseline = price(base, base.config);
  if (!Number.isFinite(baseline.monthlyCost)) return [];

  const recs: Recommendation[] = [];
  for (const c of candidates(base)) {
    const f = price(base, c.config);
    const savings = baseline.monthlyCost - f.monthlyCost;
    if (!(savings > 0)) continue; // only surface a real central saving

    const savingsLow = baseline.cost.confidence.low - f.cost.confidence.high;
    const savingsHigh = baseline.cost.confidence.high - f.cost.confidence.low;
    const overlaps = f.cost.confidence.high >= baseline.cost.confidence.low;
    recs.push({
      id: c.id, optKind: c.optKind, label: c.label,
      monthlyCost: f.monthlyCost, monthlySavings: savings,
      savingsLow, savingsHigh,
      savingsPct: baseline.monthlyCost > 0 ? (savings / baseline.monthlyCost) * 100 : 0,
      overlaps,
      rationale: overlaps
        ? `${c.rationale}. Note: confidence ranges overlap - saving is directional, not precise.`
        : c.rationale,
    });
  }

  // Clean (band clears zero) recs first, then straddling ones; each group by central savings desc.
  return recs.sort((a, b) => {
    const aStraddle = a.savingsLow <= 0 ? 1 : 0;
    const bStraddle = b.savingsLow <= 0 ? 1 : 0;
    if (aStraddle !== bStraddle) return aStraddle - bStraddle;
    return b.monthlySavings - a.monthlySavings;
  });
}

export function solveBudget(
  base: OptimizationBase,
  monthlyBudget: number,
): { maxArrivalsPerMonth: number; maxArrivalsConservative: number; note: string } {
  const f = price(base, base.config);
  if (!(f.monthlyCost > 0) || !(f.arrivalsPerMonth > 0)) {
    return { maxArrivalsPerMonth: 0, maxArrivalsConservative: 0, note: 'base cost or volume is zero; cannot inverse-solve' };
  }
  const budget = Math.max(0, monthlyBudget);
  const centralPerArrival = f.monthlyCost / f.arrivalsPerMonth;
  // P1-A18: also solve at the high-confidence cost so a wide band does not blow the budget.
  const highPerArrival = (f.cost.confidence.high > 0 ? f.cost.confidence.high : f.monthlyCost) / f.arrivalsPerMonth;
  return {
    maxArrivalsPerMonth: Math.floor(budget / centralPerArrival),
    maxArrivalsConservative: Math.floor(budget / highPerArrival),
    note: `central $${centralPerArrival.toFixed(6)}/arrival; conservative $${highPerArrival.toFixed(6)}/arrival`,
  };
}
