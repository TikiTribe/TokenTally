// P1-A7: per-tier-band pricing for accumulating context. `effectiveInputRate` is a STEP function of
// (prefix + perArrivalInput), so folding accumulation to a single mean mis-prices a workload whose context
// straddles a 128k/200k price tier (DS2 worked a 41.5% understatement). This module partitions the `units`
// accumulation levels (input_k = base + (k-1)*growth) into contiguous bands that share one tier — analytic,
// O(tiers) not O(units), so a hostile stepsPerRun cannot make it loop unboundedly — and prices the
// accumulating input/output/reasoning bars exactly per band. The warm-cache PREFIX cost stays with
// monthlyWarmCost (priced at the mean tier; a second-order effect). Pure. Owner: engine. Version: Phase 1.
import { tierFor, effectiveInputRate, effectiveOutputRate } from '@/engine/cost/rates';
import type { ModelRecord } from '@/types/registry';

const PER_MILLION = 1_000_000;
const nn = (x: number, d = 0): number => (Number.isFinite(x) && x >= 0 ? x : d);

// A contiguous run of accumulation units that share one price tier.
export interface TierBand {
  count: number;
  meanInput: number;
}

function bandFor(start: number, end: number, base: number, growth: number): TierBand {
  const count = end - start + 1;
  // mean of base + (k-1)*growth for k in [start, end] = base + growth*((start-1)+(end-1))/2
  const meanInput = base + (growth * ((start - 1) + (end - 1))) / 2;
  return { count, meanInput };
}

export function partitionByTier(
  model: ModelRecord,
  prefixTokens: number,
  base: number,
  growth: number,
  units: number,
): TierBand[] {
  const u = Math.floor(nn(units));
  if (u <= 0) return [];
  const p = nn(prefixTokens);
  const b = nn(base);
  const g = nn(growth);
  const minTok = p + b; // unit 1
  const maxTok = p + b + g * (u - 1); // unit u
  if (model.tiers.length === 0 || g === 0 || minTok === maxTok) {
    return [bandFor(1, u, b, g)];
  }
  // Thresholds strictly inside (minTok, maxTok) split the accumulation into bands.
  const thresholds = [...new Set(model.tiers.map((t) => t.thresholdTokens))]
    .filter((T) => T >= minTok && T < maxTok)
    .sort((x, y) => x - y);
  if (thresholds.length === 0) return [bandFor(1, u, b, g)];

  const bands: TierBand[] = [];
  let start = 1;
  for (const T of thresholds) {
    // Unit k has tokens = p + b + (k-1)*g. First k strictly above T: floor((T-p-b)/g)+2 (matches tierFor's
    // "strictly exceeds"). The band [start, kCross-1] is at-or-below T.
    const kCross = Math.floor((T - p - b) / g) + 2;
    const end = Math.min(u, kCross - 1);
    if (end >= start) {
      bands.push(bandFor(start, end, b, g));
      start = end + 1;
    }
  }
  if (start <= u) bands.push(bandFor(start, u, b, g));
  return bands;
}

// True when unit 1 and unit `units` select different tiers (the accumulation crosses a threshold).
export function detectStraddle(
  model: ModelRecord,
  prefixTokens: number,
  base: number,
  growth: number,
  units: number,
): boolean {
  const u = Math.floor(nn(units));
  if (u <= 1 || model.tiers.length === 0) return false;
  const p = nn(prefixTokens);
  const b = nn(base);
  const g = nn(growth);
  const firstTier = tierFor(p + b, model.tiers);
  const lastTier = tierFor(p + b + g * (u - 1), model.tiers);
  return (firstTier?.thresholdTokens ?? null) !== (lastTier?.thresholdTokens ?? null);
}

// Exact monthly dollars for the accumulating input + (constant) output + reasoning bars, summed per band.
// arrivalsPerCycle = arrivals / units (= conversations/runs): each of the `units` levels recurs this many
// times across the month. Output/reasoning tokens are constant per arrival but their RATE tracks the band.
export function bandedAccumulatedCost(
  model: ModelRecord,
  prefixTokens: number,
  base: number,
  growth: number,
  units: number,
  arrivalsPerCycle: number,
  outputTokensPerArrival: number,
  reasoningTokensPerArrival: number,
): number {
  const bands = partitionByTier(model, prefixTokens, base, growth, units);
  const cycle = nn(arrivalsPerCycle);
  const outTok = nn(outputTokensPerArrival);
  const reasonTok = nn(reasoningTokensPerArrival);
  const reasonRate = model.reasoningPerMToken ?? 0;
  let dollars = 0;
  for (const band of bands) {
    const tierTokens = nn(prefixTokens) + band.meanInput;
    const inRate = effectiveInputRate(model, tierTokens);
    const outRate = effectiveOutputRate(model, tierTokens) ?? 0;
    const arrivalsInBand = cycle * band.count;
    dollars +=
      (arrivalsInBand * (band.meanInput * inRate + outTok * outRate + reasonTok * reasonRate)) / PER_MILLION;
  }
  return dollars;
}
