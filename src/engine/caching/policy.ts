// Cache provider-policy constants (D5). These are VERSIONED modeling constants with a drift note, NOT
// measurements — the registry data carries only the 5-minute write rate. Owner: TokenTally engine.
// Version: 0C.
import type { CacheSpec } from '@/types/registry';

export const POLICY_VERSION = '0C-2026-07-04';
export const POLICY_REVERIFIED = '2026-07-04'; // C15: last manual re-verify date (0D CI staleness-gates this)
export const SECONDS_PER_MONTH = 2_592_000; // 30 * 24 * 3600 — fixed 30-day modeling month (see cost-core-notes)
export const TTL_SECONDS = { min5: 300, hr1: 3600 } as const;
// Anthropic prompt-cache write multipliers relative to the BASE input rate. UNVERIFIED assumption
// pending a provider-doc citation in 0D; re-verify on each POLICY_VERSION bump.
export const WRITE_MULT = { min5: 1.25, hr1: 2.0 } as const;

export type CacheTtl = 'min5' | 'hr1';

// C7/C14: Archetype-A best-effort inactivity windows (seconds). UNVERIFIED modeling assumption — NOT a
// cited/measured retention figure; a real per-provider window citation lands in 0D. Stored in a Map so a
// hostile provider key ('__proto__'/'constructor') cannot return a prototype object.
const DEFAULT_T_EFF = 300;
const T_EFF_MAP = new Map<string, number>([
  ['openai', 300],
  ['deepseek', 300],
  ['gemini', 300],
  ['grok', 300],
]);
export function tEffFor(provider: string): number {
  return T_EFF_MAP.get(provider) ?? DEFAULT_T_EFF;
}

// C6: only trust a derived 1-hr write rate when the registry 5-min rate conforms to base*1.25.
const WRITE_RATE_TOLERANCE = 0.02; // relative tolerance on the (5-min == base*1.25) invariant

export function writeRateForTtl(cache: CacheSpec, ttl: CacheTtl, inputPrice: number): number | null {
  const fiveMin = cache.cacheWritePerMToken;
  if (fiveMin === undefined) return null; // no write cost (Archetype A)
  if (ttl === 'min5') return fiveMin; // the real data
  // C6: derive the 1-hr rate from the BASE input rate, not by scaling the stored 5-min field — but only
  // when the stored 5-min rate actually equals base*1.25; a non-conforming SKU returns null (unknown),
  // never a fabricated guess.
  if (!Number.isFinite(inputPrice) || inputPrice <= 0) return null;
  const expectedFiveMin = inputPrice * WRITE_MULT.min5;
  if (Math.abs(fiveMin - expectedFiveMin) > WRITE_RATE_TOLERANCE * inputPrice) return null;
  return inputPrice * WRITE_MULT.hr1;
}
