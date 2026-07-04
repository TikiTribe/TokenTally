// Confidence-range composition (spec §5.4, C4). Composes a directional systematic tokenizer-bias band
// with an independent input-variance band into an honest interval. Rules: (1) both bands null -> a
// point estimate labeled unmodeled (never a fabricated interval); (2) the tokenizer band is honored
// AS GIVEN (already directional from 0B — not symmetrized); (3) the systematic and independent bands
// add, with any multiple independent sources quadrature-combined by the caller before this call;
// (4) the low bound is clamped to >= 0 (never a negative dollar cost); (5) NaN-safe. Owner: engine. 0C.
import type { ConfidenceRange } from '@/types/engine';

type Band = { relLow: number; relHigh: number };

const f = (x: number): number => (Number.isFinite(x) ? x : 0);

export function composeConfidence(
  centralCost: number,
  tokenizerBand: Band | null,
  inputVariance: Band | null,
): ConfidenceRange {
  const mid = f(centralCost);
  if (tokenizerBand === null && inputVariance === null) {
    return { low: mid, mid, high: mid, unmodeled: true };
  }
  const sysLow = f(tokenizerBand?.relLow ?? 0);
  const sysHigh = f(tokenizerBand?.relHigh ?? 0);
  const indLow = f(inputVariance?.relLow ?? 0);
  const indHigh = f(inputVariance?.relHigh ?? 0);
  const combinedRelLow = sysLow + indLow; // <= 0 (widen down)
  const combinedRelHigh = sysHigh + indHigh; // >= 0 (widen up)
  const low = Math.max(0, mid * (1 + combinedRelLow));
  const high = mid * (1 + combinedRelHigh);
  return { low, mid, high, unmodeled: false };
}
