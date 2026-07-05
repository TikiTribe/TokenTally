// Engine integration: warm-cache-aware monthly cost (spec §5.3 + §5.4). Ties the caching warmth +
// writes into the unit-aware cost waterfall for a per-token warm-cache scenario, and leads with a
// calibrated central estimate plus a conservative (p_warm=0) reference and an "up to" saving (W6/C10).
// The conservative total is also the Denial-of-Wallet p_warm=0 seam Phase 1 consumes (C12). Non-token
// billing units opt out of warm-cache modeling (C13). Pure; no Date.now(). Owner: engine. Version: 0C.
import { TTL_SECONDS, tEffFor, writeRateForTtl } from '@/engine/caching/policy';
import {
  perPrefixRate,
  ratePerSecondFromMonthly,
  steadyWarmth,
  burstyWarmth,
  archetypeARange,
  writesPerMonth,
} from '@/engine/caching/warmCache';
import { breakEvenArrivals } from '@/engine/caching/breakEven';
import { effectiveInputRate, effectiveOutputRate, effectiveCacheRates } from '@/engine/cost/rates';
import { buildWaterfall } from '@/engine/cost/costCore';
import { composeConfidence } from '@/engine/cost/confidence';
import type { WarmScenario, WarmCostResult, WaterfallBarInput } from '@/types/engine';

const finite = (x: number | undefined, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);
// Non-negative magnitude (arrivals, token counts): a negative scenario input never yields a negative dollar.
const nonNeg = (x: number | undefined, d = 0): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : d);

interface Rates {
  input: number;
  output: number | null;
  read: number | null;
  write: number | null;
  reasoning: number | null;
}

// Assemble the monthly waterfall at a given warm probability (and onset writes). Reused for the
// central estimate and the p_warm=0 conservative reference so the two are computed identically.
function waterfallAt(
  scn: WarmScenario,
  rates: Rates,
  coldPrefixRate: number,
  warmPrefixRate: number,
  pWarm: number,
  onsets: number,
): { total: number; writes: number; waterfall: ReturnType<typeof buildWaterfall> } {
  const arrivals = nonNeg(scn.arrivalsPerMonth);
  const prefixTokens = nonNeg(scn.prefixTokens);
  const writes = writesPerMonth(arrivals, scn.distinctPrefixes, pWarm, onsets); // <= arrivals (capped)
  const warm = Math.max(0, arrivals - writes);
  const bars: WaterfallBarInput[] = [
    { label: 'cacheWrite', quantity: writes * prefixTokens, rate: coldPrefixRate, unit: 'per_token' },
    { label: 'cacheReads', quantity: warm * prefixTokens, rate: warmPrefixRate, unit: 'per_token' },
    { label: 'input', quantity: arrivals * nonNeg(scn.perArrivalInputTokens), rate: rates.input, unit: 'per_token' },
  ];
  if (rates.output !== null) {
    bars.push({ label: 'output', quantity: arrivals * nonNeg(scn.perArrivalOutputTokens), rate: rates.output, unit: 'per_token' });
  }
  if (rates.reasoning !== null && nonNeg(scn.perArrivalReasoningTokens) > 0) {
    bars.push({ label: 'reasoning', quantity: arrivals * nonNeg(scn.perArrivalReasoningTokens), rate: rates.reasoning, unit: 'per_token' });
  }
  const waterfall = buildWaterfall(bars);
  return { total: waterfall.total, writes, waterfall };
}

const emptyResult = (): WarmCostResult => ({
  applicable: false,
  warmth: null,
  centralTotal: 0,
  conservativeTotal: 0,
  savingsUpTo: { central: 0, conservativeReference: 0, qualifier: 'up_to' },
  writesPerMonth: 0,
  waterfall: { components: [], total: 0 },
  confidence: { low: 0, mid: 0, high: 0, unmodeled: true },
  breakEvenArrivals: null,
});

export function monthlyWarmCost(scn: WarmScenario): WarmCostResult {
  const model = scn.model;
  // C13: warm-cache modeling is token-prefix specific; non-token units opt out.
  if (model.billingUnit !== 'per_token') return emptyResult();

  const tierTokens = nonNeg(scn.prefixTokens) + nonNeg(scn.perArrivalInputTokens);
  const rates: Rates = {
    input: effectiveInputRate(model, tierTokens),
    output: effectiveOutputRate(model, tierTokens),
    ...effectiveCacheRates(model, tierTokens),
    reasoning: model.reasoningPerMToken,
  };
  // Finding 3: the cold prefix write rate must be TTL-aware (hr1 = base*2.0, not the raw 5-min field).
  // breakpoint/storage: TTL write rate (fall back to the known 5-min data if the 1-hr derivation is
  // unavailable, never to base input which under-prices). automatic: no write premium -> base input.
  const coldPrefixRate =
    model.cache !== null && model.cache.cacheWritePerMToken !== undefined
      ? (writeRateForTtl(model.cache, scn.ttl, rates.input) ?? model.cache.cacheWritePerMToken)
      : rates.input;
  const warmPrefixRate = rates.read ?? rates.input; // C8: null read -> base input (no free discount)

  const T = TTL_SECONDS[scn.ttl];
  const rateS = ratePerSecondFromMonthly(perPrefixRate(finite(scn.arrivalsPerMonth), scn.distinctPrefixes));

  // Warmth: an automatic (best-effort) cache is a [0, upper] range; breakpoint/storage is a point.
  let warmth: WarmCostResult['warmth'] = null;
  let centralPWarm = 0;
  const archetype = model.cache?.archetype ?? 'automatic';
  const onsets = scn.profile === 'bursty' ? finite(scn.burstsPerMonth) : 0;
  if (model.cache !== null) {
    if (archetype === 'automatic') {
      const range = archetypeARange(rateS, tEffFor(model.provider));
      warmth = range;
      centralPWarm = range.upper;
    } else {
      centralPWarm =
        scn.profile === 'bursty' ? burstyWarmth(rateS, T, finite(scn.activeFraction, 1)) : steadyWarmth(rateS, T);
      warmth = centralPWarm;
    }
  }

  const central = waterfallAt(scn, rates, coldPrefixRate, warmPrefixRate, centralPWarm, onsets);
  // p_warm=0 reference (W6) + DoW seam (C12). Uses the same rates so it is a true upper bound.
  const conservative = waterfallAt(scn, rates, coldPrefixRate, warmPrefixRate, 0, 0);

  // C4: convert the warmth uncertainty into an input-variance band on the cost - the cost can degrade
  // up to the conservative (no-warm) total, so the interval widens UP for an uncertain cache.
  const warmthRelHigh = central.total > 0 ? Math.max(0, (conservative.total - central.total) / central.total) : 0;
  const confidence = composeConfidence(central.total, scn.tokenizerBand ?? null, {
    relLow: 0,
    relHigh: warmthRelHigh,
  });

  // Break-even needs both a read and a write rate (a no-write automatic cache has none); it uses the
  // TTL-aware write rate and, for bursty traffic, the active fraction (finding 5).
  const breakEven =
    rates.read !== null && rates.write !== null
      ? breakEvenArrivals(
          rates.input,
          rates.read,
          coldPrefixRate,
          T,
          scn.distinctPrefixes,
          scn.profile === 'bursty' ? finite(scn.activeFraction, 1) : 1,
        )
      : null;

  return {
    applicable: true,
    warmth,
    centralTotal: central.total,
    conservativeTotal: conservative.total,
    savingsUpTo: {
      // capped writes make central <= conservative, but clamp defensively so an "up to" saving is never negative.
      central: Math.max(0, conservative.total - central.total),
      conservativeReference: conservative.total,
      qualifier: 'up_to',
    },
    writesPerMonth: central.writes,
    waterfall: central.waterfall,
    confidence,
    breakEvenArrivals: breakEven,
  };
}
