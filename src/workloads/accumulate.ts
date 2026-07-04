// Linear context accumulation. Unit k (1-indexed) holds base + (k-1)*growth tokens. Because the cost core
// is linear in per-arrival tokens WITHIN a single price tier, the monthly input-token dollars from feeding
// the MEAN equal those from summing every unit — so each workload stays a single WarmScenario (spec D6).
// `total` is the token-conservation oracle for the reconciliation tests. (Across a 128k/200k tier boundary
// the mean is NOT exact — see tiers.ts / P1-A7.) Pure; hostile inputs clamp to finite >= 0.
// Owner: TokenTally engine. Version: Phase 1.
const nn = (x: number, d = 0): number => (Number.isFinite(x) && x >= 0 ? x : d);

// P1-A13: a hard magnitude ceiling. arrivals*tokens can overflow to Infinity even when each scalar is
// finite; clamp every count/token/request term to [0, CEIL] before it reaches the engine so a hostile
// input yields a large-but-finite dollar figure, never $Infinity (or a wrap-around clamp to $0).
export const CEIL = 1e12;
export function bounded(x: number): number {
  if (Number.isNaN(x) || x < 0) return 0; // hostile / negative -> 0
  if (!Number.isFinite(x)) return CEIL; // +Infinity -> the ceiling, not 0
  return Math.min(x, CEIL);
}

export function meanAccumulated(base: number, growthPerUnit: number, units: number): number {
  const u = Math.floor(nn(units, 0));
  if (u <= 0) return 0;
  return nn(base) + (nn(growthPerUnit) * (u - 1)) / 2;
}

export function totalAccumulated(base: number, growthPerUnit: number, units: number): number {
  const u = Math.floor(nn(units, 0));
  if (u <= 0) return 0;
  return u * nn(base) + (nn(growthPerUnit) * u * (u - 1)) / 2;
}
