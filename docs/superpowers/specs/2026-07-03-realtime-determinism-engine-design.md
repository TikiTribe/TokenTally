# TokenTally: Real-Time Determinism Engine and Multi-Workload Overhaul

- **Version:** 1.1 (design)
- **Date:** 2026-07-03
- **Owner (build):** rock@rockcyber.com
- **Independent launch decider (go/no-go):** TBD, must not be the demo presenter (see §13)
- **Status:** Draft for review, revised after adversarial premortem
- **Launch target:** Event adjacent to Black Hat USA

## 0. Revision history

**v1.1** folds in the remediation plan from the multi-subagent adversarial premortem of v1.0. Each change traces to a finding:

- F1 → new §13 launch-gate, owner/decider split, descope triggers.
- F2 → CSP moved to Phase 0 and specified concretely (§7, §5.9); long tail no longer opens a CDN hole (§5.2).
- F3 → coverage restated from the measured classifier output, not a projection (§5.1).
- F4 → Gemini demoted to the Approx tier pending empirical verification; a third badge tier is now explicit (§5.2).
- F5 → caching data model rewritten against the real field names, with a documented-policy-constant rule replacing the absolute "never hardcoded" (§5.3).
- F6 → cross-run warmth given a closed form, an arrival model, and per-provider cache semantics (§5.3).
- F7 → `ModelRecord` and ingestion rewritten against the real schema: per-token units, null embedding output, generalized tiers, provider normalization, dropped non-model rows (§5.1).
- F8 → regex resolver replaced by an explicit model→tokenizer→encoding table with an unknown→flagged path (§5.2).
- F9 → operational spine (monitoring, staleness surface, diff thresholds, rollback, reproducible build) pulled out of the skippable phase (§5.9, §10).
- F10 → performance budget defined, bundle gate wired, tokenization moved to a worker (§5.7, §5.9).
- F11 → inbound surfaces treated as untrusted parsers; `sanitizeForCSV` fix, permalink and import hardening (§5.8, §9).
- F12 → Denial of Wallet given defensive framing, bounded numbers, a disclaimer, and a VDP reference (§5.6).
- F13 → honest public claims made a gated deliverable; README and exports corrected (§6, §13).
- F14 → agent cost model restated as super-linear, not quadratic (§5.5).

## 1. Summary

TokenTally today forecasts LLM chatbot costs using two heuristics (`~4 chars/token`, `~1.3 tokens/word`) and a hand-maintained 16-model price table covering only OpenAI and Anthropic. Caching is modeled Anthropic-only, and OpenAI is hardcoded as non-caching, which is wrong in 2026.

This overhaul replaces heuristics with real tokenization where a real tokenizer exists, replaces the static table with the full TokenCost/LiteLLM catalog, models caching for every provider including cross-conversation warm caches, and adds agent and multi-agent workloads. It ships with a rebuilt UI, principled data visualization, light and dark modes, and a signature security feature (Denial of Wallet) with defensive framing.

The product stays fully client-side. User prompt text is tokenized in the browser and is never transmitted. That constraint is a feature for this audience, not a limitation. Every displayed count carries an accuracy badge so the precision claim is scoped, not global.

## 2. Goals and non-goals

### Goals
1. Real token counts, computed locally in the browser, for every model that has a runnable local tokenizer (measured: ~68% of the launch catalog today, see §5.1).
2. Support the text and embedding models TokenCost lists (roughly 1,500 of its ~1,700 entries; state ranges, not exact counts, in public copy, see F13/§13).
3. Model caching correctly per provider, including the cross-conversation warm cache that dominates high-volume economics, with a stated closed-form warmth model.
4. Support four workloads on one engine: Chatbot, Prompt/Batch, Agent (single), Multi-agent (crew/group chat).
5. Provider-agnostic optimization that names dollar savings across models and caching styles.
6. A launch-grade UI with innovative, principled visualizations in light and dark.
7. Deploy to Vercel via GitHub Actions with a human-reviewed pricing refresh, a strict CSP, and a reproducible build.

### Non-goals (deferred, not abandoned)
- Image generation, audio transcription/TTS, and rerank models (roughly 190 entries). Pricing data retained for a later "pricing reference" phase, no token calculator at launch.
- Live per-request billing integration with provider dashboards.
- User accounts, backend, or database. The app stays static and client-side.

## 3. Key decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | Do not embed TokenCost. Consume its data. | TokenCost is Python and server-side. Its portable value is the price/capability data, which mirrors LiteLLM's `model_prices_and_context_window.json`. |
| D2 | Three tokenizer engines: tiktoken, Transformers.js, heuristic. | Two libraries plus one heuristic cover the catalog with an explicit resolver table, not per-provider integrations. |
| D3 | Claude uses a local labeled estimate (Option A). | No accurate public local Claude tokenizer exists. Billing-exact counts need Anthropic's API (network + key), which breaks the privacy pitch. We estimate locally and label it. |
| D4 | Three accuracy badges: **Exact** (the model's own tokenizer runs locally), **Approx** (a shared-family tokenizer used as a proxy), **Estimate** (heuristic). | Scopes the ±5% claim honestly per model. Gemini is Approx, not Exact, until verified (F4). |
| D5 | Cache read/write rates come from the registry where present. TTL multipliers and other provider policy constants are stored as **versioned, cited constants**, not silent hardcodes. | The real data lacks a 1-hour-TTL field and uses three different cache field names, so an absolute "never hardcoded" is not achievable (F5). |
| D6 | Four workloads on one shared cost core. | They differ only in token accumulation. Pricing, caching, tokenizer, optimization, and export layers are shared. |
| D7 | Pricing data is a pinned build-time snapshot, refreshed by a scheduled GitHub Action that opens a PR with per-field change thresholds. | Prevents a poisoned or drifting upstream from silently changing costs; the threshold flags any rate moving more than a set percent for the reviewer. |
| D8 | Self-host the tokenizer files we support Exact/Approx. The long tail falls back to the heuristic, it does not open a CDN allowance in the CSP. | Keeps "text never leaves the browser" literally true and the CSP strict with no third-party origin in `script-src`/`connect-src` (F2). |
| D9 | Visual direction: Precision Instrument base, security skin, launch-grade polish, light and dark first-class. | Numbers must read as authoritative; the venue rewards a security aesthetic. |

## 4. Architecture overview

```
                         ┌────────────────────────────────────┐
                         │            Model Registry           │
                         │  (TokenCost/LiteLLM snapshot, typed) │
                         │  prices • caching • context • modality│
                         └──────────────┬─────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
┌───────▼────────┐            ┌─────────▼─────────┐           ┌─────────▼─────────┐
│ Tokenizer      │            │ Caching Model     │           │ Cost Core         │
│ Engine (worker)│            │ (3 archetypes +   │           │ (provider-agnostic│
│ tiktoken /     │──counts──▶ │ closed-form warm  │──rates──▶ │ formulas, ranges) │
│ Transformers.js│            │ cache + traffic)  │           │                   │
│ / heuristic    │            └───────────────────┘           └─────────┬─────────┘
└────────────────┘                                                      │
                 ┌──────────────────────────────────────────────────────┤
                 │       Workload Strategies (Chatbot/Prompt/Agent/Crew) │
                 └───────────────────────────┬──────────────────────────┘
              ┌──────────────────────────────┼──────────────────────────────┐
      ┌───────▼───────┐            ┌─────────▼────────┐            ┌────────▼────────┐
      │ Optimization  │            │ UI / Dataviz     │            │ Export /        │
      │ (+ Denial of  │            │ (light + dark,   │            │ Permalink /     │
      │  Wallet)      │            │ command palette) │            │ Import          │
      └───────────────┘            └──────────────────┘            └─────────────────┘
```

Data supplies the numbers, the archetype supplies the formula shape, the workload supplies the accumulation pattern. Prices and cache rates come from the registry; the only baked-in numbers are versioned, cited provider policy constants (D5).

## 5. Subsystem designs

### 5.1 Model Registry (data layer)

Replaces `src/config/pricingData.ts` and the CSV pipeline.

- **Source of record:** TokenCost `model_prices.json`, which mirrors LiteLLM. Pinned to a specific upstream commit, not `main`.
- **Build step:** a script fetches the pinned snapshot, validates it, normalizes it, derives a typed `ModelRecord[]`, and writes a bundled artifact with a `snapshotVersion` and `snapshotDate`. The app imports the artifact. No runtime fetch by default.
- **Normalization (F7):** the raw file stores prices **per token** (for example `1.25e-06`), has **null output prices for embeddings**, breaks tiered pricing at **128k and 200k** (not only 200k), uses **three different cache field names**, and carries **duplicate/prefixed provider keys** (`gemini` vs `gemini/gemini`) plus **non-model rows** (Fireworks param-size pricing buckets, mode-less entries, 0/0-priced entries). The build step therefore:
  - multiplies per-token prices to the internal per-MToken unit explicitly, with a unit test on the 1e6 factor;
  - stores output price as `number | null` and guards every output multiply against null (embeddings never NaN);
  - models tiers as a list `[{ thresholdTokens, inputPerMToken, outputPerMToken, cacheReadPerMToken?, cacheWritePerMToken? }]`, covering 128k and 200k and tiered cache rates;
  - collapses prefixed duplicate keys to a canonical model id via a normalization map, so archetype routing and the selectable count are deduplicated;
  - drops non-model pricing buckets and 0/0 or price-null rows from the selectable catalog and logs the count dropped (the selectable-model number is computed, not asserted).
- **Typed record (replaces the `openai | anthropic` union):**

```ts
interface ModelRecord {
  id: string;                        // canonical, de-prefixed
  displayName: string;
  provider: string;                  // normalized
  underlyingFamily: TokenizerFamily; // resolved via the explicit table in 5.2
  mode: 'chat' | 'completion' | 'responses' | 'embedding';
  inputPerMToken: number;
  outputPerMToken: number | null;    // null for embeddings
  cache: CacheSpec | null;           // see 5.3 for field-name resolution
  contextWindow: number | null;
  maxOutput: number | null;
  tiers?: PriceTier[];               // 128k / 200k / tiered cache
  accuracyTier: 'exact' | 'approx' | 'estimate';
  deprecated: boolean;
}
```

- **Coverage classification (measured from the classifier over the real file, not projected).** Running the classifier today yields **~68% Exact** (the model's own tokenizer runs locally: OpenAI, Llama/Mistral/Qwen/DeepSeek/Kimi/Phi/Granite/DBRX/Yi and open Cohere/AI21/Gemma), **~14% Approx** (shared-family proxy: Gemini and PaLM via Gemma, Grok via grok-1, Perplexity via Llama), and **~18% Estimate** (11% Claude by design plus ~7% closed: Nova/Titan, Voyage, Aleph Alpha, Reka, Liquid, and the unmatched tail). Resolver refinement (§5.2) can move part of the Approx/Estimate tail into Exact; these are classifier-derived and get pinned by the Phase 0 resolver table plus empirical spot-checks. Public copy states ranges, the in-tool data view shows the exact current split with the snapshot version (F13).

### 5.2 Tokenizer Engine

Replaces `src/utils/tokenEstimator.ts`. Runs in a **web worker** (F10) so tokenization never blocks the 100 ms UI budget. Resolution uses an **explicit table**, not regex string-matching (F8).

- **Resolver table:** `modelIdPattern -> { family, tokenizerAsset, encoding }`, ordered and tested. It maps each model to its tokenizer and, for OpenAI, to the correct **per-model encoding** (`gpt-4` → `cl100k_base`, `gpt-4o`/`gpt-4.1`/`gpt-5`/o-series → `o200k_base`, legacy → `p50k`/`r50k`). Any model the table does not match resolves to `{ family: 'unknown', tier: 'estimate', flagForReview: true }`, which surfaces in a maintenance report. No silent Estimate.

| Engine | Library | Covers | Badge |
|---|---|---|---|
| tiktoken | `js-tiktoken` | OpenAI, per-model encoding; raw strings and message/role framing | Exact for text; tool-schema framing marked Approx (see below) |
| Transformers.js | `@huggingface/transformers` | Open-weight families + Gemma; open embeddings | Exact for that model |
| Transformers.js (proxy) | Gemma tokenizer used for Gemini/PaLM, grok-1 for grok | Gemini, PaLM, Grok | **Approx** |
| Heuristic | in-house | Claude (Option A) + closed proprietary + `unknown` fallback | Estimate |

- **Message and tool framing (F8):** OpenAI's per-message and per-role overhead is reproducible and counts as Exact. Tool/function-schema overhead and provider-injected system tokens (the data shows `tool_use_system_prompt_tokens` for some models) are **not** exactly derivable client-side; the Agent workload marks the tool-schema portion of its count Approx and says so.
- **Gemini (F4):** badged **Approx** via the Gemma tokenizer until an empirical spot-check against real Vertex/Gemini `usage` counts is run and recorded. If verified within a stated tolerance, it may be promoted to Exact with the evidence cited; until then it stays Approx.
- **Claude estimate:** calibrated char-and-word ratio per Claude generation, applying the current-generation uplift (Opus 4.7+, Sonnet 5, Fable 5). The uplift is a **cited, versioned constant** with a source, not an unsourced scalar (F13), and a drift note tracks the next tokenizer generation.
- **Loading and privacy:** tokenizer files for Exact/Approx models are **self-hosted static assets** served from our origin. Transformers.js is configured `allowRemoteModels=false` with `localModelPath` set to our origin, asserted by a test that fails on any network egress during tokenization. The long tail that we do not self-host falls back to the heuristic; it does **not** load from a third-party CDN, so the CSP needs no CDN allowance (F2). Loaded tokenizers cache in IndexedDB keyed by a content hash and a cache-version, re-verified on read; a version bump invalidates a poisoned or stale entry (F-tail).
- **Failure mode:** any tokenizer load failure degrades to the heuristic with an Estimate badge and a visible note. A pre-demo synthetic check (§5.9) verifies the self-hosted tokenizer URLs so a soft-fail cannot silently turn the flagship into the old heuristic on stage.

### 5.3 Caching Model

Each model maps to an archetype by normalized provider. Cache rates come from the registry via a **field resolver** that unions the three real field names: `cache_read_input_token_cost`, `cache_creation_input_token_cost` (write), and `input_cost_per_token_cache_hit` (DeepSeek's read). A model is cache-capable if any of these is present OR `supports_prompt_caching` is true; the two signals are reconciled and a model with a rate but a falsy flag is treated as capable. Where a provider caches but the data has no rate, the UI shows caching as "supported, rate unavailable" rather than a fabricated number (F5).

- **Archetype A, automatic prefix cache** (OpenAI, DeepSeek, Gemini implicit, Grok). No write cost. Cached prefix billed at the resolved cache-read rate. Best-effort: no TTL guarantee, eviction under capacity modeled by a provider eviction factor.
- **Archetype B, explicit breakpoint cache with write cost and sliding TTL** (Anthropic, Bedrock). First write at the cache-write rate; later reads at the cache-read rate. The 5-min vs 1-hr **TTL write multipliers (1.25x / 2x) are versioned, cited policy constants** (D5), since the data carries only the 5-min rate.
- **Archetype C, explicit cache with hourly storage** (Gemini explicit). Archetype B plus a per-token-hour storage charge; flags when sparse traffic makes storage a net loss.

**Cross-run warm cache (F6), stated as a closed form.**

- **Arrival model:** requests are modeled as Poisson with rate `λ`, where `λ` = monthly volume spread over the active-hours implied by the Traffic Profile. The **Bursty** profile applies a documented peak-to-mean factor `b > 1` that raises effective inter-arrival variance; Steady uses `b = 1`. Both are stated and tested.
- **Warmth (Archetype B, sliding TTL `T`):** the probability a request finds the prefix warm is `p_warm = 1 − e^(−λT)` (probability the prior inter-arrival was shorter than the TTL). For the Bursty profile, `λ` is replaced by the burst-adjusted effective rate.
- **Warmth (Archetype A, best-effort):** `p_warm = (1 − e^(−λ·T_eff)) × (1 − p_evict)`, where `T_eff` and `p_evict` are per-provider versioned constants. This prevents importing Anthropic's guaranteed sliding TTL onto best-effort caches.
- **Writes per month:** `arrivals × (1 − p_warm)`, capped at `activeSeconds / T`.
- **Conservative baseline:** `p_warm = 0` (every conversation cold-starts). The tool shows conservative and warm-shared side by side; the gap is the headline savings, and both numbers are now reproducible from the formula above, which makes the Phase 0 break-even test writable.

### 5.4 Cost Core

Pure TypeScript, no React. Provider-agnostic. Emits a point estimate and a confidence range.

- Converts registry per-MToken rates to per-token, applies tiered rates (128k/200k) where present, guards null output for embeddings.
- **Confidence range (F5 of the v1.0 premortem's DS #5):** the range is not a fake CI. Systematic tokenizer bias (Claude uplift, Gemini proxy) is represented as a one-sided bias band per tier; input-assumption variance (traffic, cache hit rate) is represented separately; the two compose by a stated rule, and the methodology is documented next to the number. If a defensible distribution is not available for a component, the tool labels that component "point estimate, unmodeled variance" rather than drawing a false interval.
- Emits a component breakdown for the waterfall: prefix, cache write, cache reads, input, output, context accumulation, reasoning.

### 5.5 Workload strategies

Each strategy defines only how tokens accumulate. All feed the Cost Core.

- **Chatbot** and **Prompt/Batch:** refactors of the existing engines onto the shared core, with the cross-run warm cache on the stable system prompt. The cache write moves from per-conversation to per-write-event so the warm model amortizes it correctly.
- **Agent (single):** a tool loop. `runCost = Σ steps (cached stable prefix + accumulated observations + reasoning/action output)`. Input from re-sent context is **super-linear** in steps, bounded by prefix caching (reads at the cache-read rate) and often dominated by output for reasoning models. The spec does **not** claim a clean quadratic (F14); the step-accumulation chart plots the actual engine output, cached prefix shaded.
- **Multi-agent (crew/group chat):** `crewCost = Σ per-agent runs + orchestration overhead + shared transcript growth`.
- **Framework presets** (LangChain/LangGraph, CrewAI, AutoGen, LlamaIndex, Custom) seed defaults and are tunable. Every number is a forecast with a range, explicitly "given your inputs."

### 5.6 Optimization Engine

Provider-agnostic across the catalog: switch-model, enable-caching, trim-tool-schemas, adjust-context-strategy, budget inverse-solve, and sensitivity (tornado) analysis.

- **Denial of Wallet (F12), reframed as defense.** Models worst-case cost under adversarial input (inflated tool outputs, forced retry loops, injection-induced reasoning). Guardrails:
  - the blast-radius number ships **with its confidence bounds**, and where the underlying agent cost is Estimate-tier the output says so; it never presents a false-precise "defensible worst-case" (this closes the Governance objection);
  - the feature is framed for **defenders** ("your exposure and how to cap it": budget limits, output caps, retry ceilings, per-user rate limits), not as an attack optimizer;
  - it ships a short **abuse/dual-use disclaimer** and links the project **VDP**;
  - a kill switch gates the feature.

### 5.7 UI / UX and data visualization

- **Shell:** multi-mode app (Chatbot, Prompt, Agent, Crew, Denial of Wallet). Real-time under 100 ms, achieved by running tokenization in a worker (§5.2) with input debounce. Command palette (Cmd/Ctrl-K). Responsive. WCAG AA.
- **First-paint (F10):** "first-paint JS" is defined as the initial route shell (React, state, theme tokens, one mode's inputs). The 1,501-entry registry, tokenizers, and charts are **not** in first-paint; the registry is lazy-loaded or streamed for the model picker. A `size-limit` gate enforces the defined budget in CI; the target is set against a freshly measured baseline, not the ambiguous 305 KB figure.
- **Visual direction:** Precision Instrument base, security skin, launch-grade polish, light and dark via a theme-token system.
- **Visualizations** (per the dataviz skill's palette and accessibility rules): cost waterfall, cache-warmth curve with break-even and the conservative/warm band, cost-vs-context scatter, live token visualizer (rendered as real DOM nodes, never `innerHTML`, to keep the permalink XSS surface closed), agent step-accumulation area chart matching the engine, tornado sensitivity, blast-radius radial with confidence bounds.
- **Trust surfaces:** every number links to its formula and the snapshot version; accuracy badges everywhere counts appear; a "data as of `snapshotDate`" stamp is always visible (F9).

### 5.8 Workflow features

- **Shareable permalink:** encodes only **structural/config state** in the URL fragment. Raw prompt text is **excluded** by default (a checkbox lets a user opt to include it, with a clear warning), so sharing a link does not leak prompts and "no data leak" is enforced, not just asserted (F11). Decoded fields render as text nodes only.
- **Import real usage:** paste an API `usage` block or a trace, parsed with a **strict schema**, a **size cap**, no deep-merge (no prototype-pollution path), and a local **secret/PII scrub** that redacts key-shaped and PII tokens before anything is stored, with a visible "we stripped N secrets locally" note (F11).
- **Saved scenarios and comparison:** local storage. **Assumptions are locked into the shared artifact** so a rigged permalink cannot silently misrepresent who set the inputs (F11/Red #5).
- **Preloaded examples:** LangChain agent, high-volume chatbot, RAG pipeline.
- **Exports:** PDF/CSV upgraded. `sanitizeForCSV` is fixed (escape quotes on every path, prefix `\t` and `\r`, not only `= + - @`), with a red test first. The PDF provenance line is generated from `snapshotVersion`/`snapshotDate`, not the hardcoded "January 2025" string (F11/F13).

### 5.9 Deployment and operations

- **Host:** Vercel, static SPA. `vercel.json` hardened: a **real strict CSP** (`default-src 'self'`; `script-src 'self'`; `connect-src 'self'`; no `unsafe-eval`; `wasm-unsafe-eval` only if onnxruntime-web WASM is actually used, otherwise omitted, and never a third-party origin), `X-XSS-Protection: 0`, HSTS, plus the existing headers. The CSP lands in **Phase 0**, not Phase 4 (F2).
- **Build reproducibility (F9):** Vercel install command switched to `npm ci`; all deps pinned to exact versions including a committed lockfile and `overrides` for the Transformers.js/onnxruntime subtree; GitHub Action steps pinned by commit SHA.
- **CI (GitHub Actions):** typecheck, lint, unit tests, build, `size-limit` bundle gate, and an egress test asserting tokenization makes no network calls, on every PR. Blocks merge on any failing, skipped, or disabled test.
- **Pricing refresh (F9):** a scheduled Action regenerates the snapshot and opens a PR whose CI **fails on any per-field rate change over a set percent** unless an override label is applied, so a poisoned or fat-fingered rate cannot pass on reviewer fatigue. The Action alerts on its own failure so a moved/deleted upstream file surfaces instead of silently freezing prices. The shipped build always shows the snapshot age.
- **Observability (F9):** a privacy-safe client signal (aggregate, no prompt content) plus an external synthetic check on the tokenizer asset URLs and the deployed CSP. A green-to-red synthetic pages an operator.
- **Rollback (F9):** a documented runbook using Vercel instant rollback, plus a pre-demo pre-flight checklist that loads the app, confirms Exact badges on the demo models, and confirms tokenizer assets return 200.
- **Bundle strategy:** code-split by mode, lazy-load tokenizers and charts, registry out of first-paint.

## 6. Accuracy and honesty

- The ±5% claim is scoped per accuracy badge, never global. **The public README and marketing copy are corrected to match** (this is a gated launch deliverable, F13): no unqualified "±5%", no "100% test coverage" (the 22 scenarios were manual), and ranges rather than exact catalog counts.
- Exact-tier counts match real API billing for text. Approx-tier counts are labeled as proxy-based. Estimate-tier counts show an error band.
- Agent and crew costs are tunable forecasts with ranges, explicitly "given your inputs."
- Every displayed cost traces to a formula and a `snapshotVersion`.

## 7. Security and privacy

- Fully client-side. Prompt text is tokenized in the browser and never transmitted; the egress test enforces it.
- **Strict CSP ships in Phase 0** (§5.9). It is not claimed as pre-existing; `vercel.json` today has no CSP, and adding it is scoped work, not a hardening footnote.
- No third-party CDN in the CSP: self-hosted tokenizers for what we support, heuristic fallback otherwise (D8).
- Tokenizer assets carry a content hash; IndexedDB entries are re-verified on read and invalidated by a cache-version bump.
- No API keys in the product. The import feature scrubs pasted secrets locally.
- Pricing changes only through a human-reviewed PR with per-field change thresholds. Dependency pinning is exact with a committed lockfile and `overrides`; `npm ci` in CI and on Vercel.
- **Parked tail risk:** code execution via a poisoned self-hosted tokenizer or onnxruntime WASM. Mitigated by content hashing and by omitting `wasm-unsafe-eval` unless required. Re-score at Phase 4; the trigger is any CSP relaxation that permits WASM compilation plus an unverified asset.

## 8. Testing strategy

The current app has no automated tests. A precision financial tool with a new engine cannot ship that way.

**Test-driven development is mandatory for all engine code** (Registry, Tokenizer, Caching, Cost Core, workloads, Optimization). Red-green-refactor per the superpowers `test-driven-development` skill. No engine function is written before its test.

- **Stack:** Vitest + Testing Library, added in Phase 0 before any engine code.
- **Cost core:** hand-verified scenarios written first, within 1% of hand calculation, extended to agent and crew.
- **Tokenizer:** fixtures captured from real tokenizers, plus resolver tests that assert `airoboros...gpt4` routes to Llama, `gpt-4`→cl100k, `gpt-4o`→o200k, and an unknown id routes to `flagForReview`.
- **Caching:** per-archetype tests including the closed-form warmth at sparse, break-even, and saturated traffic (now writable because §5.3 gives the formula), and the three-field cache resolver.
- **Registry:** golden-file test over the pinned snapshot, the 1e6 unit factor, null-output guard, tier parsing at 128k/200k, and provider-key dedup.
- **Security:** red tests for `sanitizeForCSV` (`=1"2` and `\t`/`\r`), an import prototype-pollution case, and the tokenization egress test.
- **CI gate:** the full suite runs on every PR and blocks merge on any failing, skipped, or disabled test.

## 9. Error handling and kill switches

- Tokenizer load failure degrades to heuristic with an Estimate badge and a pre-demo pre-flight to catch it.
- Pricing refresh failure alerts and keeps the last snapshot; the build always shows snapshot age.
- Invalid or oversized inputs use extended validators with clamping, a size cap on import, and free-string sanitization on any rendered field.
- Unknown model routes to the `flagForReview` estimate path, never blank.
- Kill switches: runtime data refresh (default off), each workload mode, Denial of Wallet.

## 10. Phased decomposition

Each phase becomes its own plan via writing-plans. **The operational and security spine moved into Phase 0 and Phase 4 is no longer allowed to trail the launch (F2/F9).**

- **Phase 0, Foundation and safety floor:** Registry (ingestion, normalization, typed records, snapshot, refresh PR with thresholds), provider-agnostic Cost Core and types, three caching archetypes plus the closed-form warm cache, Tokenizer Engine (three engines, resolver table, worker, self-hosting, egress test), extended validators, the strict CSP, `npm ci` + exact pins, the `size-limit` gate, and the synthetic check. Headless where possible, developed test-first, fully covered. Establishes the Vitest harness later phases build on.
- **Phase 1, Workloads and intelligence:** refactor Chatbot and Prompt, add Agent and Multi-agent, build the Optimization Engine including the defensively framed Denial of Wallet.
- **Phase 2, UI and dataviz:** multi-mode shell, visual identity, all visualizations (DOM-node token stream), light/dark, command palette, model picker, sensitivity sliders.
- **Phase 3, Workflow:** permalink (config-only), import (scrubbed), saved scenarios, examples, corrected exports.
- **Phase 4, Hardening and audit:** accessibility audit, WASM tail-risk re-score, load/latency validation, and the public-claims correction sign-off.

The first implementation plan targets Phase 0.

## 11. Open questions and risks

- **Schedule (dominant):** a from-scratch rebuild against a ~4-5 week fixed date with a new test culture is aggressive. The mitigation is the §13 launch-gate and cut line, not optimism.
- **Gemini exactness** cannot be confirmed without a corpus spot-check; it stays Approx until then.
- **Supply-chain integrity** is mitigated (content hash, thresholds, `npm ci`) not eliminated; the WASM-RCE tail risk is parked with its trigger (§7).
- **Estimate-tier accuracy** for Claude and the closed tail is inherent to Option A and acceptable only because badges and ranges are honest.

## 12. Success criteria (launch)

- Exact token counts for OpenAI and open-weight models matching real API counts for text; Gemini labeled Approx (or promoted with cited evidence).
- Roughly 1,500 text and embedding models selectable with correct pricing, caching, and context data, deduplicated, none blank.
- Four workloads produce auditable forecasts with confidence ranges.
- Cross-run warm cache shows a reproducible savings range from the stated formula.
- Denial of Wallet produces a bounded, defensively framed exposure figure, never a false-precise number.
- Strict CSP live; tokenization makes zero network calls (egress test green); build is reproducible (`npm ci`, exact pins).
- Light and dark, responsive, WCAG AA, first-paint under the defined and gated budget.
- Public claims corrected: no unqualified ±5%, no "100% test coverage", ranges not exact counts.
- Engine code delivered test-first; CI blocks on any failing or skipped test.
- Zero high or critical `npm audit` findings.

## 13. Launch gate (F1)

- **Owner/decider split:** the build owner is not the go/no-go decider. An independent decider (named before Phase 1) holds authority to cut scope or pull the demo.
- **Minimum lovable demo (the cut line):** Chatbot and Agent modes on the shared engine, Exact/Approx/Estimate badges, the cross-run warm-cache savings view, and one flagship visualization, all on real data with the strict CSP live. Crew, Denial of Wallet, permalink, and import are above the cut line and can be dropped without breaking the demo.
- **Descope trigger:** if Phase 1 is not feature-complete by a dated checkpoint (set at Phase 0 kickoff), the launch falls back to the minimum lovable demo automatically, no renegotiation.
- **Non-negotiable floor:** TDD on engine code and the honest-claims correction ship regardless of scope cuts. The date is the variable, the correctness of the numbers is not.
