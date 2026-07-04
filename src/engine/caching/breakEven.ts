// Numerically-defined cache break-even (§5.3 W2), CORRECTED per premortem C1. A cache WRITE is billed
// INSTEAD OF base input for those tokens (cold = cacheWrite, warm = cacheRead, no-cache = input), so
// caching beats no-caching when (1-p)·cacheWrite + p·cacheRead < input. The break-even warmth is
// therefore p* = (cacheWrite - input)/(cacheWrite - cacheRead) — using the INCREMENTAL write penalty
// (cacheWrite - input), not the full cacheWrite the spec text literally states. Owner: TokenTally engine.
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';

export function breakEvenWarmth(
  inputRate: number,
  cacheReadRate: number,
  cacheWriteRate: number,
): number | null {
  if (![inputRate, cacheReadRate, cacheWriteRate].every(Number.isFinite)) return null;
  const readSaving = inputRate - cacheReadRate;
  if (readSaving <= 0) return null; // reads never save -> no break-even
  const writePenalty = cacheWriteRate - inputRate;
  if (writePenalty <= 0) return 0; // a cold write is already <= base input -> caching always pays
  const r = writePenalty / readSaving;
  return r / (1 + r); // = writePenalty / (writePenalty + readSaving)
}

export function breakEvenArrivals(
  inputRate: number,
  cacheReadRate: number,
  cacheWriteRate: number,
  ttlS: number,
  k: number,
): number | null {
  const pStar = breakEvenWarmth(inputRate, cacheReadRate, cacheWriteRate);
  if (pStar === null || pStar >= 1 || !Number.isFinite(ttlS) || ttlS <= 0) return null;
  if (pStar === 0) return 0; // caching always pays -> break-even at zero volume
  const rateS = -Math.log(1 - pStar) / ttlS; // invert p = 1 - e^(-rate*T)
  const kk = Number.isFinite(k) && k >= 1 ? k : 1;
  return rateS * SECONDS_PER_MONTH * kk;
}
