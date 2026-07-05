// Closed-form cross-run warm cache (spec §5.3). Pure math; no Date.now(). Warmth is a probability in
// [0,1]: the memoryless renewal kernel p_warm = 1 - e^(-rate·T) is the probability the prior
// inter-arrival for a prefix fell within the TTL (assumes Poisson/independent arrivals - see
// cost-core-notes). C5: a finite-input firewall so a hostile/empty numeric never leaks NaN/Infinity.
// Owner: TokenTally engine. Version: 0C.
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';
import type { WarmthRange } from '@/types/engine';

// Non-negative finite magnitude (arrivals, prefix counts, onsets): NaN/Infinity/negative -> default.
const nonNeg = (x: number, d = 0): number => (Number.isFinite(x) && x >= 0 ? x : d);
const clamp01 = (p: number): number => (Number.isFinite(p) ? (p < 0 ? 0 : p > 1 ? 1 : p) : 0);

export function perPrefixRate(lambdaPerMonth: number, k: number): number {
  const kk = nonNeg(k, 1) >= 1 ? nonNeg(k, 1) : 1; // K defaults to >= 1 (W4)
  return nonNeg(lambdaPerMonth, 0) / kk;
}

export function ratePerSecondFromMonthly(perMonth: number): number {
  return nonNeg(perMonth, 0) / SECONDS_PER_MONTH;
}

export function steadyWarmth(rateS: number, ttlS: number): number {
  if (!Number.isFinite(rateS) || rateS <= 0 || !Number.isFinite(ttlS) || ttlS <= 0) return 0;
  return clamp01(1 - Math.exp(-rateS * ttlS));
}

export function burstyWarmth(rateS: number, ttlS: number, activeFraction: number): number {
  const f = activeFraction > 0 && activeFraction <= 1 ? activeFraction : 1;
  return steadyWarmth(rateS / f, ttlS); // within-busy rate is rate/f (W1); onsets counted in writesPerMonth
}

// C7: a best-effort automatic cache guarantees nothing, so the honest lower bound is 0. The band width
// [0, upper] carries the uncertainty (no fabricated p_evict haircut). upper = steady warmth at T_eff.
export function archetypeARange(rateS: number, tEffS: number): WarmthRange {
  return { lower: 0, upper: steadyWarmth(rateS, tEffS) };
}

// C2 (corrected per review): the burst onsets are GUARANTEED-cold arrivals (each starts a burst after
// an idle gap ≫ TTL); the remaining within-burst arrivals warm at p_warm. A cache write happens at most
// once per arrival, so total writes are capped at arrivals - the earlier `arrivals·(1-p) + onsets·K`
// both double-counted the onsets and could exceed arrivals (making the central cost exceed the
// conservative p_warm=0 reference and the "up to" saving go negative).
export function writesPerMonth(lambdaPerMonth: number, k: number, pWarm: number, onsets = 0): number {
  const arrivals = nonNeg(lambdaPerMonth, 0);
  const kk = nonNeg(k, 1) >= 1 ? nonNeg(k, 1) : 1;
  const onsetWrites = Math.min(nonNeg(onsets, 0) * kk, arrivals); // capped: onsets can't exceed arrivals
  const withinBurst = arrivals - onsetWrites;
  return onsetWrites + withinBurst * (1 - clamp01(pWarm)); // <= arrivals by construction
}
