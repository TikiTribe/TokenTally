# Caching Model + Cost Core notes (Phase 0C) — assumptions, not measurements

Everything here is a stated modeling assumption. The engine emits ranges and labeled point estimates;
it never presents a "measured" number.

## Corrected break-even (premortem C1 — spec §5.3 W2 has an error)

A cache write is billed **instead of** base input for the cached tokens (cold = `cacheWrite`, warm =
`cacheRead`, no-cache = `input`), so caching beats no-caching when `(1−p)·cacheWrite + p·cacheRead < input`.
The break-even warmth is therefore `p* = (cacheWrite − input)/(cacheWrite − cacheRead)` — the INCREMENTAL
write penalty — not the spec's literal `cacheWrite/(input − cacheRead)`. For Claude-Sonnet rates that is
**0.2174** (λ*≈2118/mo), not 0.5814 (λ*≈7524). The spec value would tell a moderate-traffic user they are
below break-even when caching already saves them money. The frozen spec is not edited; the implementation
uses the corrected formula (see the BUILD-LOG decision log).

## Policy constants are UNVERIFIED assumptions (POLICY_VERSION-stamped)

- `WRITE_MULT = { min5: 1.25, hr1: 2.0 }` (write multipliers relative to base input) and the Archetype-A
  `T_EFF` windows (300 s) are versioned modeling assumptions, NOT cited measurements. A real per-provider
  citation lands in Phase 0D, which also adds a `POLICY_REVERIFIED` staleness CI gate (C15).
- The 1-hour write rate is derived from the base input rate (`inputPrice × 2.0`), and only when the stored
  5-minute rate conforms to `base × 1.25`; a non-conforming SKU returns `null` rather than a guess (C6).

## Archetype-A best-effort caches: floor is 0

An automatic prefix cache (OpenAI, DeepSeek, Gemini-implicit, Grok) guarantees nothing, so its warmth is a
range `[0, upper]` where `upper = steadyWarmth(rate, T_eff)`. There is no fabricated eviction haircut (the
0.5 the earlier draft used was a disguised `p_evict` the spec's W3 explicitly forbade). The band width
carries the best-effort uncertainty, and it widens the cost confidence interval upward (C4/C7).

## Modeled month and the Poisson assumption

- `SECONDS_PER_MONTH = 2_592_000` is a fixed 30-day modeling month. A real calendar month (30.44 days)
  runs ~1.45% denser, so warmth is biased ~1.45% high relative to a calendar month; enter `λ` as
  arrivals-per-30-days for internal consistency. (Break-even inverts through the same constant, so it is
  self-consistent.)
- Steady warmth assumes **Poisson / exponential inter-arrivals** (random, independent). Regular-cadence
  traffic below the TTL is effectively always warm and is UNDER-stated by this model; clustered traffic is
  OVER-stated (use the Bursty profile). The Bursty profile is a two-parameter `(λ, f)` busy/idle model and
  additionally needs a busy-period count `B` to price the cold onset writes (C2) — with `B` absent, report
  bursty warmth/writes as a range, never a false point.

## Archetype C (explicit storage) — per-time storage component is unmodeled

A `storage`-archetype cache (Gemini explicit) is modeled breakpoint-like (it has real write + read rates,
so those costs are priced), but its additional per-token-hour STORAGE component is NOT modeled in 0C —
so a sparse-traffic storage cache that is a net loss is not yet flagged. This is a known deferral; the
storage-time term lands with the workload modeling. The write cost uses the same TTL-aware rate as
breakpoint (`writeRateForTtl`, hr1 = base*2.0).

## Honesty framing (W6 / §6)

- The warm figure is a **central estimate**; the `p_warm=0` **conservative total** is the labeled reference;
  the saving is `savingsUpTo` with the `up_to` qualifier and the conservative reference attached (C10), so a
  consumer cannot render an unqualified warm saving. The `p_warm=0` conservative total is also the
  Denial-of-Wallet worst-case seam Phase 1 consumes (C12).
- A non-token billing unit (`per_character`/`per_second`/`dbu`) opts out of warm-cache modeling (`applicable:
  false`) and is never coerced to a token dollar or `$0` (C9/C13). A `readUnavailable` cache never gets a
  free-read discount (C8). The confidence interval is a point labeled `unmodeled` when no band applies, and
  the low bound is clamped to ≥ 0 (never a negative dollar) (C4).
