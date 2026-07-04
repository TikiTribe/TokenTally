# Phase 0C: Caching Model + Cost Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the provider-agnostic Caching Model (three archetypes + the closed-form cross-run warm cache with a numerically-defined break-even) and the billing-unit-aware Cost Core (rate normalization, 128k/200k tiers, the waterfall, and an honest confidence range) as pure, unit-tested modules that consume the Phase 0A Registry and Phase 0B Tokenizer and keep the build green.

**Architecture:** `src/engine/caching/` holds the cache-policy constants and the pure warm-cache math (Poisson steady + busy/idle bursty warmth, an Archetype-A bounded range, writes/month, break-even). `src/engine/cost/` holds the pure cost formulas (unit-aware effective rates with tiers, per-component costs, the waterfall, and confidence composition). No React, no I/O, no `Date.now()`. All math is derived from spec §5.3/§5.4 with hand-verified numeric anchors, written test-first.

**Tech Stack:** TypeScript 5.6 (strict, `noUncheckedIndexedAccess`), Vitest. Consumes `ModelRecord`, `CacheSpec`, `PriceTier`, `BillingUnit` from `@/types/registry`; `TokenCount` (errorBand) from `@/types/tokenizer`.

## Global Constraints

Copied from spec v1.2.1. Every task inherits these.

- Fully client-side, pure functions, no I/O, no `Date.now()` in engine code.
- TDD mandatory: no engine function before its test; red → green → refactor; commit per green test.
- Billing-unit-aware: `per_token | per_character` scale per-million; `per_second | dbu` are raw. A non-token unit is NEVER coerced to `$0` (spec §9); output is `null` for embeddings.
- Provider policy constants (TTL windows, write multipliers, Archetype-A inactivity windows) are VERSIONED, CITED constants with a drift note (D5) — the registry data lacks a 1-hour field. They are labeled, not silent magic numbers.
- Honesty (spec §6, §5.4): a component with no defensible distribution is labeled "point estimate, unmodeled variance," never given a false interval. Warm savings are "up to," led by a calibrated central estimate + range (W6). Coverage/accuracy stated as ranges, never "measured."
- Determinism: `SECONDS_PER_MONTH = 2_592_000` (30×24×3600) is a fixed modeling constant (documented), so a monthly rate converts to a per-second rate reproducibly.
- Always-green: NEW modules under `src/engine/`. Do NOT touch the old `costCalculator.ts`/components. `main.tsx` does not import these yet, so the MVP bundle is unaffected.
- Commits: git author/committer stay the human; no AI attribution.

## The math (spec §5.3/§5.4, authoritative — implement exactly)

Let `λ` = total arrivals per month, `K` = distinct stable prefixes, `T` = cache TTL (seconds), `f` = active fraction (bursty).

- **Per-prefix rate:** `λ_p = λ / K`. **Per-second:** `rate_s = λ_p / SECONDS_PER_MONTH`.
- **Steady warmth (memoryless renewal):** `p_warm = 1 − e^(−rate_s · T)`.
- **Bursty warmth (busy/idle, W1):** within-busy rate `rate_s / f`; `p_warm_busy = 1 − e^(−(rate_s/f) · T)`. Each busy-period onset is a cold write.
- **Archetype-A bounded range (W3):** upper = steady warmth at the provider's cited inactivity window `T_eff`; lower = upper × `(1 − EVICTION_HAIRCUT)`. The band width carries best-effort uncertainty (no fabricated `p_evict` point).
- **Writes/month (W5):** `Σ_prefixes arrivals_p · (1 − p_warm_p)` (+ busy-period onsets for bursty). No inert cap.
- **Break-even (W2):** with `R = cacheWriteRate / (inputRate − cacheReadRate)` (guard `inputRate > cacheReadRate`), the break-even warmth is `p_warm* = R / (1 + R)`; the break-even arrival rate solves `p_warm* = 1 − e^(−rate_s·T)` → `rate_s* = −ln(1 − p_warm*) / T` → `λ* = rate_s* · SECONDS_PER_MONTH · K`.

**Hand-verified anchors (assert these exact values):**
- `λ=43_200, K=1, T=300` → `rate_s·T = (43200/2_592_000)·300 = 5.0` → `p_warm = 1 − e^(−5) ≈ 0.9932621`.
- `λ=720, K=1, T=300` → `rate_s·T = 0.0833…` → `p_warm ≈ 0.0799556`.
- Break-even, Claude-Sonnet-like rates `cacheWrite=3.75, input=3.0, cacheRead=0.3` → `R = 3.75/2.7 = 1.388889`, `p_warm* = 1.388889/2.388889 ≈ 0.5813953`; with `T=300, K=1` → `rate_s* = −ln(1−0.5813953)/300` → `λ* ≈ 7_523.96`.
- Bursty `λ=720, K=1, T=300, f=0.25` → within-busy `rate_s/f = 0.0011111/s`, `·T = 0.333…` → `p_warm_busy = 1 − e^(−1/3) ≈ 0.2834687`.

## File Structure

- `src/types/engine.ts` — `CacheTtl`, `TrafficProfile`, `WarmthResult`, `WarmthRange`, `BreakEven`, `CostComponent`, `CostWaterfall`, `ConfidenceRange`.
- `src/engine/caching/policy.ts` — `SECONDS_PER_MONTH`, `TTL_SECONDS`, `WRITE_MULT`, `ARCHETYPE_A_T_EFF`, `EVICTION_HAIRCUT`, `POLICY_VERSION`; `writeRateForTtl(cache, ttl)`.
- `src/engine/caching/warmCache.ts` — `perPrefixRate`, `ratePerSecondFromMonthly`, `steadyWarmth`, `burstyWarmth`, `archetypeARange`, `writesPerMonth`.
- `src/engine/caching/breakEven.ts` — `breakEvenWarmth`, `breakEvenArrivals`.
- `src/engine/cost/rates.ts` — `tierFor`, `effectiveInputRate`, `effectiveOutputRate`, `effectiveCacheRates`.
- `src/engine/cost/costCore.ts` — `componentCost`, `buildWaterfall`.
- `src/engine/cost/confidence.ts` — `composeConfidence`.
- `src/engine/index.ts` — `WarmScenario`, `monthlyWarmCost` (ties caching + cost core; the §8 hand-verified integration).
- Tests alongside under `src/engine/**/__tests__/*.test.ts`.

---

### Task 1: Cache policy constants + write-rate-by-TTL

**Files:** Create `src/types/engine.ts` (partial), `src/engine/caching/policy.ts`, `src/engine/caching/__tests__/policy.test.ts`.

**Interfaces:**
- Consumes: `CacheSpec` from `@/types/registry`.
- Produces: `SECONDS_PER_MONTH`, `TTL_SECONDS: {min5: 300, hr1: 3600}`, `WRITE_MULT: {min5: 1.25, hr1: 2.0}`, `ARCHETYPE_A_T_EFF`, `EVICTION_HAIRCUT`, `POLICY_VERSION`; `type CacheTtl = 'min5' | 'hr1'`; `writeRateForTtl(cache: CacheSpec, ttl: CacheTtl): number | null`.

Modeling note (cited, versioned): the registry `cacheWritePerMToken` is the **5-minute** write rate, which Anthropic prices at `WRITE_MULT.min5 = 1.25×` the base input rate; the 1-hour write is `WRITE_MULT.hr1 = 2.0×` base. So `writeRateForTtl` returns the 5-min rate as-is and derives the 1-hr rate as `cacheWritePerMToken × (WRITE_MULT.hr1 / WRITE_MULT.min5)` (= ×1.6). These multipliers are `POLICY_VERSION`-stamped constants to re-verify against provider docs (the data carries only the 5-min rate). If `cache.cacheWritePerMToken` is undefined (Archetype A, no write), return `null`.

- [ ] **Step 1: Write the failing test** — `src/engine/caching/__tests__/policy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { writeRateForTtl, TTL_SECONDS, WRITE_MULT, SECONDS_PER_MONTH } from '@/engine/caching/policy';
import type { CacheSpec } from '@/types/registry';

const bTtl: CacheSpec = { archetype: 'breakpoint_ttl', cacheReadPerMToken: 0.3, cacheWritePerMToken: 3.75, rateUnavailable: false, readUnavailable: false };

describe('cache policy', () => {
  it('exposes cited TTL + multiplier + month constants', () => {
    expect(TTL_SECONDS).toEqual({ min5: 300, hr1: 3600 });
    expect(WRITE_MULT).toEqual({ min5: 1.25, hr1: 2.0 });
    expect(SECONDS_PER_MONTH).toBe(2_592_000);
  });
  it('returns the registry 5-min write rate as-is', () => {
    expect(writeRateForTtl(bTtl, 'min5')).toBeCloseTo(3.75, 10);
  });
  it('derives the 1-hr write rate as x(2.0/1.25) of the 5-min rate', () => {
    expect(writeRateForTtl(bTtl, 'hr1')).toBeCloseTo(3.75 * (2.0 / 1.25), 10); // 6.0
  });
  it('returns null when there is no write rate (Archetype A)', () => {
    const a: CacheSpec = { archetype: 'automatic', cacheReadPerMToken: 0.1, rateUnavailable: false, readUnavailable: false };
    expect(writeRateForTtl(a, 'min5')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/engine/caching/__tests__/policy.test.ts` → FAIL, module not found.

- [ ] **Step 3: Write `src/engine/caching/policy.ts`:**

```ts
// Cache provider-policy constants (D5): VERSIONED, CITED, with a drift note. The registry data carries
// only the 5-minute write rate; TTL windows and the 5-min/1-hr write multipliers are policy constants
// re-verified against provider docs on each POLICY_VERSION bump. Owner: TokenTally engine. Version: 0C.
import type { CacheSpec } from '@/types/registry';

export const POLICY_VERSION = '0C-2026-07-04';
export const SECONDS_PER_MONTH = 2_592_000; // 30 * 24 * 3600 — fixed modeling month
export const TTL_SECONDS = { min5: 300, hr1: 3600 } as const;
// Anthropic prompt-cache write multipliers relative to the BASE input rate (cited, versioned).
export const WRITE_MULT = { min5: 1.25, hr1: 2.0 } as const;
// Archetype-A best-effort inactivity windows (seconds) used for the upper warmth bound (cited).
export const ARCHETYPE_A_T_EFF = { openai: 300, deepseek: 300, gemini: 300, grok: 300 } as const;
export const EVICTION_HAIRCUT = 0.5; // conservative lower-bound haircut on best-effort warmth (W3)

export type CacheTtl = 'min5' | 'hr1';

export function writeRateForTtl(cache: CacheSpec, ttl: CacheTtl): number | null {
  const fiveMin = cache.cacheWritePerMToken;
  if (fiveMin === undefined) return null; // no write cost (Archetype A)
  if (ttl === 'min5') return fiveMin;
  // 1-hr write = base * WRITE_MULT.hr1; the 5-min rate = base * WRITE_MULT.min5, so scale by the ratio.
  return fiveMin * (WRITE_MULT.hr1 / WRITE_MULT.min5);
}
```

- [ ] **Step 4: Run to verify it passes.** **Step 5: Commit** `feat: add cited cache-policy constants and TTL write-rate`.

---

### Task 2: Closed-form warm cache (steady + bursty + Archetype-A range + writes/month)

**Files:** Modify `src/types/engine.ts`; create `src/engine/caching/warmCache.ts`, `src/engine/caching/__tests__/warmCache.test.ts`.

**Interfaces:**
- Produces: `perPrefixRate(lambdaPerMonth, K)`, `ratePerSecondFromMonthly(perMonth)`, `steadyWarmth(rateS, ttlS)`, `burstyWarmth(rateS, ttlS, f)`, `archetypeARange(rateS, tEffS)` → `WarmthRange`, `writesPerMonth(lambdaPerMonth, K, pWarm)`.

Guards: `K ≥ 1`; `f ∈ (0, 1]`; a non-positive rate → warmth 0; clamp warmth to `[0, 1]`.

- [ ] **Step 1: Write the failing test** — `warmCache.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { perPrefixRate, ratePerSecondFromMonthly, steadyWarmth, burstyWarmth, archetypeARange, writesPerMonth } from '@/engine/caching/warmCache';
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';

describe('warm cache closed form (spec §5.3)', () => {
  it('steady warmth matches the hand-verified anchor (dense)', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(43_200, 1));
    expect(steadyWarmth(rateS, 300)).toBeCloseTo(0.9932621, 6);
  });
  it('steady warmth matches the sparse anchor', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(720, 1));
    expect(steadyWarmth(rateS, 300)).toBeCloseTo(0.0799556, 6);
  });
  it('splits the rate across K prefixes', () => {
    expect(perPrefixRate(1000, 4)).toBe(250);
    expect(perPrefixRate(1000, 0)).toBe(1000); // K<1 guarded to 1
  });
  it('bursty warmth uses the within-busy rate lambda/f', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(720, 1));
    expect(burstyWarmth(rateS, 300, 0.25)).toBeCloseTo(0.2834687, 6);
  });
  it('archetype-A range is [upper*(1-haircut), upper] and ordered', () => {
    const rateS = ratePerSecondFromMonthly(perPrefixRate(43_200, 1));
    const r = archetypeARange(rateS, 300);
    expect(r.upper).toBeCloseTo(0.9932621, 6);
    expect(r.lower).toBeCloseTo(0.9932621 * 0.5, 6);
    expect(r.lower).toBeLessThanOrEqual(r.upper);
  });
  it('writes/month = arrivals * (1 - p_warm)', () => {
    expect(writesPerMonth(43_200, 1, 0.9932621)).toBeCloseTo(43_200 * (1 - 0.9932621), 4);
  });
  it('clamps warmth to [0,1] and a non-positive rate to 0', () => {
    expect(steadyWarmth(0, 300)).toBe(0);
    expect(steadyWarmth(-1, 300)).toBe(0);
  });
});
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Write `warmCache.ts`:**

```ts
// Closed-form cross-run warm cache (spec §5.3). Pure math; no Date.now(). Warmth is a probability in
// [0,1]. The memoryless renewal kernel p_warm = 1 - e^(-rate·T) is the probability the prior
// inter-arrival for a prefix fell within the TTL. Owner: TokenTally engine. Version: 0C.
import { SECONDS_PER_MONTH, EVICTION_HAIRCUT } from '@/engine/caching/policy';
import type { WarmthRange } from '@/types/engine';

export function perPrefixRate(lambdaPerMonth: number, k: number): number {
  const kk = k >= 1 ? k : 1; // K defaults to >= 1 (W4)
  return lambdaPerMonth / kk;
}

export function ratePerSecondFromMonthly(perMonth: number): number {
  return perMonth / SECONDS_PER_MONTH;
}

const clamp01 = (p: number): number => (p < 0 ? 0 : p > 1 ? 1 : p);

export function steadyWarmth(rateS: number, ttlS: number): number {
  if (rateS <= 0 || ttlS <= 0) return 0;
  return clamp01(1 - Math.exp(-rateS * ttlS));
}

export function burstyWarmth(rateS: number, ttlS: number, activeFraction: number): number {
  const f = activeFraction > 0 && activeFraction <= 1 ? activeFraction : 1;
  return steadyWarmth(rateS / f, ttlS); // within-busy rate is rate/f (W1)
}

export function archetypeARange(rateS: number, tEffS: number): WarmthRange {
  const upper = steadyWarmth(rateS, tEffS);
  return { lower: upper * (1 - EVICTION_HAIRCUT), upper };
}

export function writesPerMonth(lambdaPerMonth: number, k: number, pWarm: number): number {
  const arrivals = perPrefixRate(lambdaPerMonth, k) * (k >= 1 ? k : 1); // total arrivals = lambda
  return arrivals * (1 - clamp01(pWarm));
}
```

Add to `src/types/engine.ts`: `export interface WarmthRange { lower: number; upper: number; }`.

- [ ] **Step 4: Run → PASS.** **Step 5: Commit** `feat: closed-form warm-cache warmth, range, and writes/month`.

---

### Task 3: Numerically-defined break-even

**Files:** Create `src/engine/caching/breakEven.ts`, `src/engine/caching/__tests__/breakEven.test.ts`; extend `src/types/engine.ts`.

**Interfaces:** `breakEvenWarmth(inputRate, cacheReadRate, cacheWriteRate): number | null`; `breakEvenArrivals(inputRate, cacheReadRate, cacheWriteRate, ttlS, k): number | null` (null when caching can never pay: `inputRate ≤ cacheReadRate`).

- [ ] **Step 1: Failing test** — `breakEven.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { breakEvenWarmth, breakEvenArrivals } from '@/engine/caching/breakEven';

describe('break-even (spec §5.3 W2)', () => {
  it('p_warm* = R/(1+R) for Claude-Sonnet-like rates', () => {
    expect(breakEvenWarmth(3.0, 0.3, 3.75)).toBeCloseTo(0.581395, 6);
  });
  it('solves the break-even arrivals for T=300, K=1', () => {
    expect(breakEvenArrivals(3.0, 0.3, 3.75, 300, 1)).toBeCloseTo(7524, 0);
  });
  it('returns null when reads never save (inputRate <= cacheReadRate)', () => {
    expect(breakEvenWarmth(0.3, 0.3, 3.75)).toBeNull();
    expect(breakEvenArrivals(0.3, 0.5, 3.75, 300, 1)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → FAIL.** **Step 3: Write `breakEven.ts`:**

```ts
// Numerically-defined break-even (spec §5.3 W2): the warmth (and arrival rate) at which cumulative
// warm-read savings equal cumulative write cost. p_warm/(1-p_warm) = cacheWrite/(input-cacheRead).
import { SECONDS_PER_MONTH } from '@/engine/caching/policy';

export function breakEvenWarmth(
  inputRate: number,
  cacheReadRate: number,
  cacheWriteRate: number,
): number | null {
  const readSaving = inputRate - cacheReadRate;
  if (readSaving <= 0) return null; // caching reads never save -> no break-even
  const r = cacheWriteRate / readSaving;
  return r / (1 + r);
}

export function breakEvenArrivals(
  inputRate: number,
  cacheReadRate: number,
  cacheWriteRate: number,
  ttlS: number,
  k: number,
): number | null {
  const pStar = breakEvenWarmth(inputRate, cacheReadRate, cacheWriteRate);
  if (pStar === null || pStar >= 1 || ttlS <= 0) return null;
  const rateS = -Math.log(1 - pStar) / ttlS; // invert p = 1 - e^(-rate*T)
  const kk = k >= 1 ? k : 1;
  return rateS * SECONDS_PER_MONTH * kk;
}
```

- [ ] **Step 4: Run → PASS.** **Step 5: Commit** `feat: numerically-defined cache break-even warmth and arrivals`.

---

### Task 4: Unit-aware effective rates with 128k/200k tiers

**Files:** Create `src/engine/cost/rates.ts`, `src/engine/cost/__tests__/rates.test.ts`.

**Interfaces:** `tierFor(tokens, tiers): PriceTier | null` (the highest threshold the token count exceeds); `effectiveInputRate(model, tokens)`, `effectiveOutputRate(model, tokens)`, `effectiveCacheRates(model, tokens)` → `{ read: number | null; write: number | null }`. Each applies the tier override when `tokens > thresholdTokens` and the tier carries a non-null rate, else the base `ModelRecord` rate; unit scaling already happened in 0A (rates are per-million for token/char, raw for per_second/dbu).

- [ ] **Step 1: Failing test** — `rates.test.ts`: assert base rate below the tier; the 200k tier rate above it; a null tier field falls back to base (per 0A amendment E); embeddings output is null.

- [ ] **Step 2-5:** implement `tierFor` (sort thresholds descending, first `tokens > threshold` wins) and the effective-rate accessors reading `model.inputPrice/outputPrice/cache?.cacheReadPerMToken/cacheWritePerMToken` with tier override; commit.

*(Full test/impl code written at implementation time from the interfaces above; the tier-override + null-fallback + embedding-null rules are exact, no placeholders.)*

---

### Task 5: Per-component cost + waterfall

**Files:** Create `src/engine/cost/costCore.ts`, `src/engine/cost/__tests__/costCore.test.ts`; extend `src/types/engine.ts` (`CostComponent`, `CostWaterfall`).

**Interfaces:** `componentCost(rate, tokens, unit): number` (per_token/per_character → `rate × tokens / 1e6`... rates are already per-million so cost = `rate × tokens / 1e6`; per_second/dbu → raw handling, never $0); `buildWaterfall(input): CostWaterfall` with bars `prefix, cacheWrite, cacheReads, input, output, reasoning, context` and a `total`. Output bar is `0`/absent for embeddings (null output). A non-token unit is surfaced in its own unit, never coerced to `$0`.

- [ ] **Step 1: Failing test** — hand-verified: e.g. input 10_000 tokens at rate 3.0/M = $0.03; output 500 at 15/M = $0.0075; reasoning bar from `reasoningPerMToken`; total = sum. Assert within 1e-9.

- [ ] **Step 2-5:** implement, commit `feat: unit-aware per-component cost and the waterfall`.

---

### Task 6: Confidence range composition

**Files:** Create `src/engine/cost/confidence.ts`, `src/engine/cost/__tests__/confidence.test.ts`; extend `src/types/engine.ts` (`ConfidenceRange`).

**Interfaces:** `composeConfidence(centralCost, tokenizerBand: {relLow,relHigh}|null, inputVariance: {relLow,relHigh}|null): ConfidenceRange` → `{ low, mid, high, unmodeled: boolean }`. Rule (spec §5.4): the systematic tokenizer bias band and the input-variance band compose (combine relative bands; state the rule — sum in quadrature for independent variance, add for systematic bias). When BOTH inputs are null, return `{ low: mid, high: mid, mid, unmodeled: true }` (point estimate, unmodeled variance — NEVER a fabricated interval).

- [ ] **Step 1: Failing test** — a null/null input yields `unmodeled: true` and `low===high===mid`; a tokenizer band of ±0.2 with null variance yields `[mid*0.8, mid*1.2]`; both present compose per the stated rule.

- [ ] **Step 2-5:** implement, commit `feat: honest confidence-range composition`.

---

### Task 7: Integration — warm-monthly cost (the §8 hand-verified scenarios)

**Files:** Create `src/engine/index.ts`, `src/engine/__tests__/integration.test.ts`; extend `src/types/engine.ts` (`WarmScenario`).

**Interfaces:** `monthlyWarmCost(scenario: WarmScenario): { total: number; waterfall: CostWaterfall; pWarm: number; writesPerMonth: number; confidence: ConfidenceRange; breakEvenArrivals: number | null }` — ties the caching warmth + writes/month into the cost waterfall for a simple chatbot-shaped scenario (prefix tokens, per-turn input/output, turns, conversations/month, K, TTL, profile). Provider-agnostic; billing-unit-aware.

- [ ] **Step 1: Failing test** — **≥3 hand-verified scenarios within 1%** (spec §8): (a) a dense Claude warm-cache scenario (compute p_warm, writes, waterfall by hand, assert within 1%); (b) a sparse scenario near break-even; (c) an OpenAI Archetype-A scenario returning a warmth RANGE (no write cost). Hand-calc each in a comment.

- [ ] **Step 2-5:** implement, commit `feat: warm-monthly cost integration with hand-verified scenarios`.

---

### Task 8: Full-suite gate + coverage note

- [ ] Run `npm run test:ci` (tsc + vitest --coverage) → all 0A+0B+0C green, 0 skipped.
- [ ] Run `npm run build` → exit 0; confirm `src/engine` is tree-shaken out of the MVP bundle (not imported by `main.tsx`).
- [ ] Create `docs/cost-core-notes.md`: the cited policy constants + `POLICY_VERSION`, the modeled-month convention, the confidence-composition rule, and the honesty framing (up-to savings, unmodeled variance labeling) — projections, never "measured."
- [ ] Commit `chore: 0C CI gate + cost-core notes`.

---

## Self-Review

**Spec coverage (§5.3/§5.4):** three archetypes + write-rate-by-TTL → Task 1; seven-cache-field rates come from the 0A registry `CacheSpec`/`PriceTier` (reused, tier wiring in Task 4). Closed-form steady/bursty warmth, Archetype-A range, writes/month → Task 2. Numerically-defined break-even → Task 3. Unit-aware rates + tiers → Task 4. Waterfall (7 bars), null-output, non-token-never-$0 → Task 5. Confidence composition + unmodeled labeling → Task 6. Hand-verified ≥3 scenarios within 1% (§8) → Task 7. Cited/versioned policy constants + honesty (W6, §6) → Tasks 1, 6, 8. ✓

**Deferred (correctly out of 0C):** workload accumulation (chatbot turns, agent/crew steps) is Phase 1 (§5.5); the UI warmth curve / waterfall chart is Phase 2 (§5.7); the CSP/CI/size-limit is 0D. 0C provides the pure formulas the workloads consume.

**Placeholder scan:** Tasks 4-7 give exact interfaces + rules + hand-verified anchors; the full test/impl code is written at implementation time from those exact specs (no TODOs, no stubs). Tasks 1-3 carry complete code. `POLICY_VERSION`-stamped constants are labeled configuration, not placeholders.

**Type consistency:** `WarmthRange`, `ConfidenceRange`, `CostWaterfall`, `WarmScenario` defined once in `src/types/engine.ts`, imported everywhere. `SECONDS_PER_MONTH` defined once in `policy.ts`, reused by `warmCache.ts` and `breakEven.ts`. Rates are per-million (token/char) / raw (per_second/dbu) consistently, matching the 0A registry contract.

## Execution Handoff

Phase 0C of the Phase-0 foundation. After it lands, Phase 1 consumes `monthlyWarmCost` + the waterfall for the four workloads; 0D adds CSP/CI/size-limit and the Transformers.js adapter. `main` stays untouched until the final go-live PR.
