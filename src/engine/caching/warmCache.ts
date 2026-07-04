// Closed-form cross-run warm cache (spec §5.3). Pure math; no Date.now(). Warmth is a probability in
// [0,1]: the memoryless renewal kernel p_warm = 1 - e^(-rate·T) is the probability the prior
// inter-arrival for a prefix fell within the TTL (assumes Poisson/independent arrivals — see
// cost-core-notes). C5: a finite-input firewall so a hostile/empty numeric never leaks NaN/Infinity.
// Owner: TokenTally engine. Version: 0C.
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';
import type { WarmthRange } from '@/types/engine';

const finite = (x: number, d = 0): number => (Number.isFinite(x) ? x : d);
const clamp01 = (p: number): number => (Number.isFinite(p) ? (p < 0 ? 0 : p > 1 ? 1 : p) : 0);

export function perPrefixRate(lambdaPerMonth: number, k: number): number {
  const kk = finite(k, 1) >= 1 ? finite(k, 1) : 1; // K defaults to >= 1 (W4)
  return finite(lambdaPerMonth, 0) / kk;
}

export function ratePerSecondFromMonthly(perMonth: number): number {
  return finite(perMonth, 0) / SECONDS_PER_MONTH;
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

// C2: writes = arrivals·(1 - p_warm) + onset cold writes (one per prefix per busy period, bursty only).
export function writesPerMonth(lambdaPerMonth: number, k: number, pWarm: number, onsets = 0): number {
  const arrivals = finite(lambdaPerMonth, 0);
  const kk = finite(k, 1) >= 1 ? finite(k, 1) : 1;
  return arrivals * (1 - clamp01(pWarm)) + finite(onsets, 0) * kk;
}
