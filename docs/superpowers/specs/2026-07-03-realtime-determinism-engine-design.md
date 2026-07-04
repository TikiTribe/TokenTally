# TokenTally: Real-Time Determinism Engine and Multi-Workload Overhaul

- **Version:** 1.2 (design)
- **Date:** 2026-07-03
- **Owner (build):** rock@rockcyber.com
- **Independent launch decider (go/no-go):** TBD, must not be the demo presenter (see §13)
- **Status:** Draft for review, revised after two adversarial premortem rounds
- **Launch target:** Event adjacent to Black Hat USA

## 0. Revision history

- **v1.0** initial design.
- **v1.1** folded in the multi-subagent premortem remediations F1-F14.
- **v1.2** folds in the targeted second-round premortem on the warmth, CSP, and ingestion sections. Each change traces to a finding:
  - I1 → coverage stated as a projection, not "measured"; the in-tool split is computed live from the resolver (§5.1).
  - I2, I5 → `billingUnit` discriminated union (per-token / per-char / per-second / DBU) and a `reasoningPerMToken` field (§5.1, §5.4).
  - I3 → the registry keys on (canonical model, deployment), so per-provider/region price divergence is preserved, not collapsed (§5.1).
  - I4 → priced-at-zero real models are kept and flagged "free tier"; only junk 0/0 rows drop (§5.1).
  - I6 → seven cache fields, not three; tiered above-200k and audio-cache rates wired into the resolver (§5.1, §5.3).
  - I7 → the Exact badge is gated behind a per-family fixture spot-check; unverified families ship as "Exact (unverified proxy)" (§5.2).
  - W1 → the Bursty profile modeled as a two-parameter busy/idle process, not a single scalar; honest that one rate cannot encode burstiness (§5.3).
  - W2 → break-even defined numerically from Cost Core inputs, so the §8 test is writable (§5.3, §8).
  - W3 → Archetype A best-effort warmth reported as a bounded range with cited windows, not a point with a fabricated `p_evict` (§5.3).
  - W4 → a "distinct cached prefixes (K)" input; warmth uses per-prefix rate λ/K (§5.3).
  - W5 → the inert writes cap removed (§5.3).
  - W6 → the UI leads with a calibrated central estimate and a range; the conservative figure is a labeled reference, not the headline (§5.3, §5.7).
  - C1, C5 → the full CSP directive set specified, including `style-src`/`img-src`/`font-src`/`worker-src`/`base-uri`/`form-action`/`frame-ancestors` and HSTS preload (§5.9, §7).
  - C2 → a Playwright test under the served CSP that fails on `securitypolicyviolation`, replacing the jsdom "proof" (§5.9, §8).
  - C3, C4 → `allowLocalModels=true`, a tokenizer-only subpath import, a `grep dist` WASM-free assertion, and a tokenizer-redistribution license check (§5.2, §5.9).
  - C6 → the IndexedDB claim right-sized to staleness, not anti-poisoning (§5.2, §7).

## 1. Summary

TokenTally today forecasts LLM chatbot costs using two heuristics (`~4 chars/token`, `~1.3 tokens/word`) and a hand-maintained 16-model price table covering only OpenAI and Anthropic, with caching modeled Anthropic-only and OpenAI hardcoded as non-caching (wrong in 2026).

This overhaul replaces heuristics with real tokenization where a real tokenizer exists, replaces the static table with the full TokenCost/LiteLLM catalog, models caching per provider including cross-conversation warm caches, and adds agent and multi-agent workloads. It ships with a rebuilt UI, principled data visualization, light and dark modes, and a defensively framed security feature (Denial of Wallet).

The product stays fully client-side. Prompt text is tokenized in the browser and never transmitted. Every displayed count carries an accuracy badge (Exact / Approx / Estimate) so the precision claim is scoped, not global.

## 2. Goals and non-goals

### Goals
1. Real token counts computed locally for every model with a runnable, verified local tokenizer.
2. Support the text and embedding models TokenCost lists (roughly 1,500 of its ~1,700 entries), keyed per deployment. Public copy states ranges, not exact counts.
3. Model caching per provider, including a stated closed-form cross-conversation warm cache with a numerically defined break-even.
4. Four workloads on one engine: Chatbot, Prompt/Batch, Agent, Multi-agent.
5. Provider-agnostic optimization that names dollar savings across models and deployments.
6. A launch-grade UI with principled visualizations in light and dark.
7. Deploy to Vercel via GitHub Actions with a human-reviewed pricing refresh, a strict enforced CSP, and a reproducible build.

### Non-goals (deferred)
- Image generation, audio transcription/TTS, rerank models (roughly 190 entries). Pricing retained for a later reference phase, no token calculator at launch.
- Live per-request billing integration.
- User accounts, backend, database.

## 3. Key decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Consume TokenCost/LiteLLM data, do not embed the Python package. | Its portable value is the price/capability data. |
| D2 | Three tokenizer engines: tiktoken, Transformers.js, heuristic, behind an explicit resolver table. | Two libraries plus one heuristic cover the catalog without per-provider integrations. |
| D3 | Claude uses a local labeled estimate (Option A). | No accurate public local Claude tokenizer; the API needs a key and network. |
| D4 | Three badges: **Exact** (verified local tokenizer), **Approx** (family proxy), **Estimate** (heuristic). Exact is earned only after a per-family fixture spot-check. | Scopes precision honestly; a name-pattern match is not proof of billing fidelity. |
| D5 | Cache/price rates come from the registry. Provider policy constants (TTL multipliers, best-effort windows) are versioned, cited constants. | The data lacks a 1-hour field and uses seven cache field names; absolute "never hardcoded" is not achievable. |
| D6 | Four workloads on one shared cost core. | They differ only in accumulation. |
| D7 | Pinned build-time snapshot, refreshed by a scheduled Action that opens a PR with per-field change thresholds. | Blocks silent poisoning/drift. |
| D8 | Self-host the tokenizers we support. The long tail falls back to the heuristic, never a CDN allowance in the CSP. | Keeps "text never leaves the browser" true and the CSP strict. |
| D9 | Registry keyed on (canonical model, deployment). | The same model prices differently across Bedrock, gov-cloud, Vertex, OpenRouter; collapsing would mis-cost. |
| D10 | Visual direction: Precision Instrument base, security skin, launch polish, light and dark. | Numbers must read as authoritative; the venue rewards a security aesthetic. |

## 4. Architecture overview

```
                         ┌────────────────────────────────────┐
                         │            Model Registry           │
                         │  keyed on (model, deployment)        │
                         │  price+unit • caching • tiers • tier │
                         └──────────────┬─────────────────────┘
        ┌───────────────────────────────┼───────────────────────────────┐
┌───────▼────────┐            ┌─────────▼─────────┐           ┌─────────▼─────────┐
│ Tokenizer      │            │ Caching Model     │           │ Cost Core         │
│ Engine (worker)│──counts──▶ │ (3 archetypes +   │──rates──▶ │ (provider-agnostic│
│ tiktoken /     │            │ closed-form warm  │           │ formulas, ranges, │
│ Transformers.js│            │ + break-even)     │           │ billing units)    │
│ / heuristic    │            └───────────────────┘           └─────────┬─────────┘
└────────────────┘                                                      │
                 ┌──────────────────────────────────────────────────────┤
                 │       Workloads: Chatbot / Prompt / Agent / Crew      │
                 └───────────────────────────┬──────────────────────────┘
      ┌───────────────┐            ┌──────────┴───────┐            ┌─────────────────┐
      │ Optimization  │            │ UI / Dataviz     │            │ Export /        │
      │ + Denial of   │            │ light + dark     │            │ Permalink /     │
      │ Wallet        │            │ command palette  │            │ Import          │
      └───────────────┘            └──────────────────┘            └─────────────────┘
```

## 5. Subsystem designs

### 5.1 Model Registry (data layer)

Replaces `src/config/pricingData.ts` and the CSV pipeline.

- **Source:** TokenCost `model_prices.json` (mirrors LiteLLM), pinned to a specific upstream commit. Build-time fetch, validate, normalize, derive typed records, write a bundled artifact with `snapshotVersion` and `snapshotDate`. No runtime fetch by default.
- **Keying (D9, I3):** the primary key is `(canonicalModelId, deployment)`, where deployment is the provider/region route (`anthropic`, `bedrock/us-gov-east-1`, `vertex_ai`, `openrouter`, ...). Only true identical-price prefix duplicates (`gemini` vs `gemini/gemini`) collapse; divergent-price SKUs (gov-cloud +20%, OpenRouter +38%) are kept as distinct selectable deployments. The optimizer compares within and across deployments.
- **Billing units (I2):** the raw file mixes units. `billingUnit` is a discriminated union: `per_token` (default), `per_character` (51 chat entries, e.g. `medlm-large` at 5e-6/char), `per_second` (36 realtime/audio), `dbu` (14 Databricks). Non-token units are guarded and rendered in their own unit, never coerced to $0.
- **Reasoning rate (I5):** `reasoningPerMToken: number | null` stores `output_cost_per_reasoning_token` (14 models carry it; `gemini-2.5-flash` reasons at 5.83x its output rate). The Cost Core waterfall's reasoning bar reads this field, not the output rate.
- **Free models (I4):** priced-at-zero real models (`llama-3-8b-instruct:free`, `gemini-pro-experimental`, `gemma-3-27b-it`, 22 of them) are kept and flagged `freeTier: true`. Only 0/0 rows that also fail a mode/provider sanity check (Fireworks param-buckets, mode-less rows) drop, and the dropped count is logged.
- **Tiers (I6):** `PriceTier[]` covers the 128k and 200k thresholds for input, output, and cache, including `cache_*_input_token_cost_above_200k_tokens`. Per-character tiering (`input_cost_per_character_above_128k_tokens`) is modeled in the per-character unit.
- **Typed record:**

```ts
type BillingUnit = 'per_token' | 'per_character' | 'per_second' | 'dbu';

interface ModelRecord {
  canonicalId: string;
  deployment: string;                 // provider/region route; part of the key
  displayName: string;
  provider: string;
  underlyingFamily: TokenizerFamily;
  mode: 'chat' | 'completion' | 'responses' | 'embedding';
  billingUnit: BillingUnit;
  inputPrice: number;                 // per unit, normalized
  outputPrice: number | null;         // null for embeddings
  reasoningPerMToken: number | null;
  cache: CacheSpec | null;            // see 5.3
  contextWindow: number | null;
  maxOutput: number | null;
  tiers?: PriceTier[];                // 128k / 200k, input/output/cache
  accuracyTier: 'exact' | 'exact_unverified' | 'approx' | 'estimate';
  freeTier: boolean;
  deprecated: boolean;
}
```

- **Coverage (I1), stated honestly.** The classifier as written prints a two-way split, `EXACT_LOCAL 1193/1501 = 79.5%` and `ESTIMATE 20.5%`; it has no Approx bucket. The three-tier split is a **projection** obtained by hand-demoting family proxies (Gemini/PaLM via Gemma, Grok, Perplexity) into an Approx tier: roughly **67% Exact / 15% Approx / 18% Estimate** (11% Claude by design). These are projections pending the Phase 0 resolver table; the in-tool data view computes the **live** split from the shipped resolver and stamps it with `snapshotVersion`. Public copy states ranges, never a single "measured" number.

### 5.2 Tokenizer Engine

Replaces `src/utils/tokenEstimator.ts`. Runs in a **web worker** with input debounce so tokenization never blocks the 100 ms UI budget.

- **Resolver table (not regex):** `modelIdPattern -> { family, tokenizerAsset, encoding }`, ordered and tested. OpenAI resolves to the correct per-model encoding (`gpt-4`→`cl100k_base`, `gpt-4o`/`4.1`/`5`/o-series→`o200k_base`, legacy→`p50k`/`r50k`). An unmatched id resolves to `{ family: 'unknown', tier: 'estimate', flagForReview: true }` and surfaces in a maintenance report. No silent Estimate.
- **Engines:** `js-tiktoken` (pure JS) for OpenAI; `@huggingface/transformers` for open-weight families and Gemma; heuristic for Claude and closed models.
- **Badge gating (I7):** a family earns **Exact** only after a per-family fixture spot-check compares the local tokenizer to captured provider `usage` counts within tolerance. Families not yet spot-checked ship as **`exact_unverified`** ("Exact, unverified proxy"), visibly distinct. Gemini is **Approx** via Gemma until spot-checked; Perplexity Sonar is `exact_unverified` until proven, not silently Exact.
- **Message and tool framing:** OpenAI per-message/role overhead counts as Exact. Tool/function-schema overhead and provider-injected system tokens are marked Approx (not derivable client-side).
- **Claude estimate:** calibrated char-and-word ratio per Claude generation with the current-generation uplift as a cited, versioned constant plus a drift note.
- **Loading, privacy, licensing (C3, C4, D8):**
  - Transformers.js is configured `allowLocalModels=true`, `allowRemoteModels=false`, `localModelPath` set to our origin. A test asserts zero network egress during tokenization.
  - The library is imported through its **tokenizer-only subpath** so `onnxruntime-web` is tree-shaken out; a CI step asserts WASM-free with `grep -r wasm dist/` returning nothing, keeping the CSP free of `wasm-unsafe-eval`.
  - Tokenizer files for supported models are **self-hosted static assets**; the long tail falls back to the heuristic, never a third-party CDN. A **license check** confirms each self-hosted tokenizer's redistribution terms (Llama, Gemma, and others carry their own licenses) before it ships.
  - IndexedDB caches loaded tokenizers keyed by a **cache-version** for **staleness** control (a version bump invalidates old entries). This is a freshness mechanism, not an anti-poisoning control; integrity rests on same-origin HTTPS and the pinned build (C6).
- **Failure mode:** any load failure degrades to the heuristic with an Estimate badge and a visible note; a pre-demo pre-flight (§5.9) verifies the demo tokenizer URLs return 200 so a soft-fail cannot silently show the old heuristic on stage.

### 5.3 Caching Model

Each model maps to an archetype by normalized provider. Rates come from a **cache-field resolver** that unions the **seven** real fields: `cache_read_input_token_cost`, `cache_creation_input_token_cost`, `input_cost_per_token_cache_hit` (DeepSeek read), the `*_above_200k_tokens` read/write variants, and the audio-cache read/write variants. Tiered cache rates are wired into `PriceTier` so a 200k+ Claude context uses the above-200k cache rate (`claude-4-sonnet`: base read 3e-7, above-200k 6e-7). A model is cache-capable if any field is present or `supports_prompt_caching` is true; the two signals are reconciled.

- **Archetype A, automatic prefix cache** (OpenAI, DeepSeek, Gemini implicit, Grok). No write cost. Best-effort, no TTL guarantee.
- **Archetype B, explicit breakpoint cache with write cost and sliding TTL** (Anthropic, Bedrock). Write then cheap reads; 5-min/1-hr write multipliers (1.25x/2x) are versioned, cited constants (the data has only the 5-min rate).
- **Archetype C, explicit cache with hourly storage** (Gemini explicit). B plus per-token-hour storage; flags when sparse traffic makes storage a net loss.

**Cross-run warm cache, closed form.**

- **Distinct prefixes (W4):** the user enters `K`, the number of distinct stable prefixes (system prompts or tool-schema blocks) sharing the traffic. Per-prefix rate is `λ_p = λ/K`. Warmth is computed per prefix, defaulting K=1.
- **Steady profile:** Poisson at `λ_p`. Warmth (Archetype B sliding TTL `T`): `p_warm = 1 − e^(−λ_p·T)` (probability the prior inter-arrival was under the TTL; correct memoryless renewal kernel).
- **Bursty profile (W1):** modeled as an alternating **busy/idle** process with a documented active fraction `f` (Business hours, Bursty presets set `f`). Within-busy rate is `λ_p/f`; warmth inside a burst uses `1 − e^(−(λ_p/f)·T)`; each busy-period onset is a cold write. This is a two-parameter `(λ, f)` model, both stated and tested. It does not pretend a single rate encodes burstiness.
- **Archetype A, best-effort (W3):** reported as a **bounded range**, not a point. Upper bound is the sliding-TTL warmth at the provider's documented inactivity window `T_eff` (cited); the lower bound applies a conservative eviction haircut. The band width, not a fabricated `p_evict` scalar, carries the best-effort uncertainty.
- **Writes per month (W5):** `Σ_prefixes arrivals_p × (1 − p_warm_p)`, plus busy-period onsets for the Bursty profile. No inert cap.
- **Break-even, numerically defined (W2):** the volume at which cumulative warm-read savings equal cumulative write cost. With write cost per write `= prefixTokens × cacheWriteRate` and read savings per warm hit `= prefixTokens × (inputRate − cacheReadRate)`, break-even is where `p_warm / (1 − p_warm) = cacheWriteRate / (inputRate − cacheReadRate)`, solvable for `λ` given `T`. This is a Cost Core quantity (it needs the rates and prefix size), so §8's break-even test asserts this specific value, not a property of `p_warm` alone.
- **Presentation (W6):** the UI leads with a **calibrated central estimate** (the modeled warm figure at the user's inputs) and a range. The conservative `p_warm=0` figure is shown as a labeled reference, and savings are stated as "up to," not as an unqualified gap.

### 5.4 Cost Core

Pure TypeScript, no React. Provider-agnostic, billing-unit-aware.

- Normalizes rates by unit, applies 128k/200k tiers, guards null output for embeddings, sources the reasoning bar from `reasoningPerMToken`.
- **Confidence range:** systematic tokenizer bias (Claude uplift, Approx proxies) is a one-sided bias band per tier; input variance (traffic, hit rate, best-effort Archetype-A band) is separate; the two compose by a stated rule. A component without a defensible distribution is labeled "point estimate, unmodeled variance," never given a false interval.
- Emits the waterfall breakdown: prefix, cache write, cache reads, input, output, reasoning, context accumulation.

### 5.5 Workload strategies

- **Chatbot / Prompt/Batch:** refactors onto the shared core; the cache write moves from per-conversation to per-write-event for the warm model.
- **Agent (single):** a tool loop, `runCost = Σ steps (cached prefix + accumulated observations + reasoning/action output)`. Re-sent-context input is **super-linear**, bounded by prefix caching and often output-dominated for reasoning models. No clean-quadratic claim; the step chart plots actual engine output.
- **Multi-agent (crew/group chat):** `Σ per-agent runs + orchestration + shared transcript growth`.
- **Framework presets** (LangChain/LangGraph, CrewAI, AutoGen, LlamaIndex, Custom) seed tunable defaults. Every number is a forecast with a range.

### 5.6 Optimization Engine

Provider-agnostic across models and deployments: switch-model, switch-deployment, enable-caching, trim-tool-schemas, adjust-context, budget inverse-solve, tornado sensitivity.

- **Denial of Wallet, defensive framing:** worst-case cost under adversarial input, shipped **with confidence bounds** (and a note where the underlying agent cost is Estimate-tier). Framed for defenders (budget caps, output caps, retry ceilings, per-user rate limits), with an abuse/dual-use disclaimer and a VDP link. Kill-switch gated.

### 5.7 UI / UX and data visualization

- **Shell:** multi-mode (Chatbot, Prompt, Agent, Crew, Denial of Wallet), real-time under 100 ms via the tokenizer worker + debounce, command palette, responsive, WCAG AA.
- **First-paint:** defined as the initial route shell (React, state, theme tokens, one mode's inputs). The registry, tokenizers, and charts are lazy-loaded, not in first-paint. A `size-limit` gate enforces a budget set against a freshly measured baseline.
- **Visualizations** (per the dataviz skill): cost waterfall, cache-warmth curve leading with the calibrated central estimate and its range (conservative shown as reference), cost-vs-context scatter, live token visualizer rendered as **DOM text nodes only** (never `innerHTML`), agent step-accumulation chart matching the engine, tornado sensitivity, blast-radius radial with confidence bounds.
- **Trust surfaces:** every number links to its formula and `snapshotVersion`; badges everywhere; a "data as of `snapshotDate`" stamp always visible.

### 5.8 Workflow features

- **Permalink:** encodes config/structural state only; raw prompt text is excluded by default (opt-in with a warning). Decoded fields render as text nodes.
- **Import usage:** strict schema, size cap, no deep-merge (no prototype pollution), local secret/PII scrub with a visible "stripped N secrets" note.
- **Saved scenarios / comparison:** local storage; assumptions locked into the shared artifact.
- **Examples:** LangChain agent, high-volume chatbot, RAG pipeline.
- **Exports:** PDF/CSV upgraded. `sanitizeForCSV` fixed (escape quotes on every path, prefix `\t`/`\r`) with a red test first. PDF provenance generated from `snapshotVersion`/`snapshotDate`.

### 5.9 Deployment and operations

- **CSP (C1, C5), full directive set, enforced in Phase 0:** `default-src 'self'`; `script-src 'self'`; `style-src 'self'` (external stylesheet + CSS variables, `build.assetsInlineLimit: 0` so no inlined `data:` styles); `img-src 'self' data:` only if inlining is kept, else `'self'`; `font-src 'self'`; `connect-src 'self'`; `worker-src 'self'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `object-src 'none'`; no `unsafe-eval`; `wasm-unsafe-eval` omitted (proven WASM-free per §5.2). `X-XSS-Protection: 0`, HSTS with `preload`, existing headers retained.
- **Build reproducibility:** Vercel `installCommand` switched to `npm ci`; all deps exact-pinned with a committed lockfile and `overrides` for the Transformers.js subtree; Action steps pinned by commit SHA.
- **CI (GitHub Actions):** typecheck, lint, unit tests, build, `size-limit` gate, the WASM-free `dist` assertion, the tokenization egress test, and a **Playwright test that loads the app under the served CSP and fails on any `securitypolicyviolation`** (C2). Blocks merge on any failing, skipped, or disabled test.
- **Pricing refresh:** scheduled Action regenerates the snapshot and opens a PR whose CI fails on any per-field rate change over a set percent unless an override label is applied. The Action alerts on its own failure. The build always shows snapshot age.
- **Observability:** a privacy-safe aggregate client signal plus an external synthetic on the tokenizer asset URLs and the deployed CSP; a green-to-red synthetic pages an operator.
- **Rollback:** documented Vercel instant-rollback runbook plus a pre-demo pre-flight (loads the app, confirms Exact badges and 200s on demo tokenizer assets, confirms the CSP is served and enforced).
- **Bundle:** code-split by mode, lazy-load tokenizers and charts, registry out of first-paint.

## 6. Accuracy and honesty

- ±5% is scoped per badge, never global. **README and marketing copy are corrected as a gated launch deliverable:** no unqualified ±5%, no "100% test coverage" (the 22 scenarios were manual), ranges not exact catalog counts.
- Exact matches real API billing for text and is earned by a spot-check; `exact_unverified` and Approx are labeled as proxy-based; Estimate shows an error band.
- Agent and crew costs are tunable forecasts with ranges.
- Every cost traces to a formula and `snapshotVersion`.

## 7. Security and privacy

- Fully client-side; prompt text tokenized in-browser, never transmitted; the browser egress test and `connect-src 'self'` both enforce it (navigation exfil closed by `base-uri`/`form-action`).
- Strict enforced CSP ships in Phase 0, verified by the Playwright policy-violation test, not merely served.
- Self-hosted tokenizers, no third-party CDN in the CSP; redistribution licenses checked before shipping each.
- No API keys in the product; the import feature scrubs pasted secrets locally.
- Pricing changes only via human-reviewed PR with per-field thresholds. Exact-pinned deps, committed lockfile, `overrides`, `npm ci`.
- **Parked tail risk:** WASM RCE. Kept out of scope by proving the build WASM-free and omitting `wasm-unsafe-eval`; re-score at Phase 4 if any WASM path is introduced.

## 8. Testing strategy

TDD is mandatory for all engine code (Registry, Tokenizer, Caching, Cost Core, workloads, Optimization). Red-green-refactor per the superpowers `test-driven-development` skill; no engine function before its test. Stack: Vitest + Testing Library + Playwright, added in Phase 0.

- **Cost core:** hand-verified scenarios within 1% of hand math, per workload and billing unit.
- **Tokenizer:** real-tokenizer fixtures; resolver tests (`airoboros...gpt4`→Llama, `gpt-4`→cl100k, `gpt-4o`→o200k, unknown→`flagForReview`); the per-family spot-check that gates the Exact badge; the egress assertion; the WASM-free `dist` assertion.
- **Caching:** per-archetype tests; the closed-form warmth at sparse, saturated, and the **numerically defined break-even**; the two-parameter Bursty model; the Archetype-A range; the seven-field resolver and tiered-cache wiring.
- **Registry:** golden-file over the snapshot; the 1e6 factor; null-output guard; per-character/per-second/DBU unit handling; 128k/200k tiers; `(model, deployment)` keying with the gov-cloud/OpenRouter price-divergence cases; free-tier retention; junk-row drops.
- **Security:** `sanitizeForCSV` (`=1"2`, `\t`, `\r`); import prototype-pollution; the Playwright CSP `securitypolicyviolation` test.
- **CI gate:** full suite on every PR; blocks on any failing, skipped, or disabled test.

## 9. Error handling and kill switches

- Tokenizer load failure degrades to heuristic + Estimate badge + pre-flight catch.
- Pricing refresh failure alerts and keeps the last snapshot; snapshot age always shown.
- Invalid/oversized inputs clamped; import size-capped; rendered fields sanitized.
- Unknown model routes to `flagForReview`, never blank; non-token billing units render in their own unit, never $0.
- Kill switches: runtime data refresh (default off), each workload mode, Denial of Wallet.

## 10. Phased decomposition

The operational and security spine stays in Phase 0. Each phase is its own plan.

- **Phase 0, Foundation and safety floor:** Registry (ingestion, `(model, deployment)` keying, billing units, tiers, free-tier, snapshot, threshold refresh PR), provider-agnostic Cost Core and types, three caching archetypes plus the closed-form warm cache with break-even, Tokenizer Engine (resolver table, worker, self-hosting, `allowLocalModels`, WASM-free proof, license check, egress test, Exact spot-check gate), extended validators, the full enforced CSP + Playwright policy test, `npm ci` + exact pins, `size-limit` gate, synthetic check. Test-first, fully covered.
- **Phase 1, Workloads and intelligence:** Chatbot/Prompt refactor, Agent, Multi-agent, Optimization Engine including the defensively framed Denial of Wallet.
- **Phase 2, UI and dataviz:** multi-mode shell, visual identity, all visualizations (DOM-node token stream), light/dark, command palette, model/deployment picker, sensitivity sliders.
- **Phase 3, Workflow:** permalink (config-only), import (scrubbed), saved scenarios, examples, corrected exports.
- **Phase 4, Hardening and audit:** accessibility audit, WASM tail-risk re-score, load/latency validation, public-claims correction sign-off.

The first implementation plan targets Phase 0.

## 11. Open questions and risks

- **Schedule (dominant):** a from-scratch rebuild against a ~4-5 week fixed date with a new test culture is aggressive. Mitigation is the §13 launch-gate and cut line, not optimism.
- **Exact-badge backlog:** each family needs a spot-check before it earns Exact; the ~1,000 pattern-matched rows ship as `exact_unverified` until then, which is honest but is real Phase 0/1 work.
- **Deployment granularity:** keying per deployment multiplies selectable rows; the picker groups by model with deployment as a sub-choice to keep it usable.
- **Best-effort caches:** Archetype-A warmth is a range, not a point; accepted and labeled.
- **Supply chain:** mitigated (content pinning, thresholds, `npm ci`, WASM-free) not eliminated.

## 12. Success criteria (launch)

- Exact token counts for spot-checked families matching real API counts for text; unverified families labeled `exact_unverified`; Gemini labeled Approx.
- Roughly 1,500 text and embedding models selectable, keyed per deployment, with correct per-unit pricing, caching, tiers, and context; free models present and flagged; none blank.
- Four workloads produce auditable forecasts with confidence ranges.
- Cross-run warm cache shows a calibrated central estimate, a range, and a numerically defined break-even from the stated formula.
- Denial of Wallet produces a bounded, defensively framed exposure figure, never false-precise.
- Strict CSP live and **verified enforced** by the Playwright policy test; tokenization makes zero network calls; build reproducible (`npm ci`, exact pins, WASM-free `dist`).
- Light and dark, responsive, WCAG AA, first-paint under the defined and gated budget.
- Public claims corrected: no unqualified ±5%, no "100% test coverage", ranges not exact counts.
- Engine code delivered test-first; CI blocks on any failing or skipped test.
- Zero high or critical `npm audit` findings.

## 13. Launch gate

- **Owner/decider split:** the build owner is not the go/no-go decider. An independent decider (named before Phase 1) can cut scope or pull the demo.
- **Minimum lovable demo (cut line):** Chatbot and Agent on the shared engine, Exact/Approx/Estimate badges, the cross-run warm-cache view with break-even, one flagship visualization, on real data with the strict CSP live and verified. Crew, Denial of Wallet, permalink, and import are above the cut line.
- **Descope trigger:** if Phase 1 is not feature-complete by a dated checkpoint (set at Phase 0 kickoff), the launch falls back to the minimum lovable demo automatically.
- **Non-negotiable floor:** TDD on engine code and the honest-claims correction ship regardless of scope cuts. The date is the variable, the correctness of the numbers is not.
