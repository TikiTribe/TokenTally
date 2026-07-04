# TokenTally: Real-Time Determinism Engine and Multi-Workload Overhaul

- **Version:** 1.0 (design)
- **Date:** 2026-07-03
- **Owner:** rock@rockcyber.com
- **Status:** Draft for review
- **Launch target:** Event adjacent to Black Hat USA

## 1. Summary

TokenTally today forecasts LLM chatbot costs using two heuristics (`~4 chars/token`, `~1.3 tokens/word`) and a hand-maintained 16-model price table covering only OpenAI and Anthropic. Caching is modeled Anthropic-only, and OpenAI is hardcoded as non-caching, which is wrong in 2026.

This overhaul replaces heuristics with real tokenization, replaces the static table with the full TokenCost/LiteLLM catalog (1,701 entries), models caching for every provider including cross-conversation warm caches, and adds agent and multi-agent workloads. It ships with a rebuilt UI, principled data visualization, light and dark modes, and a signature security feature (Denial of Wallet) aimed at the launch audience.

The product stays fully client-side. User prompt text never leaves the browser. That constraint is a feature for this audience, not a limitation.

## 2. Goals and non-goals

### Goals
1. Real token counts, not heuristics, for the overwhelming majority of models, computed locally in the browser.
2. Support every text and embedding model TokenCost lists (1,501 of the 1,701 entries at launch).
3. Model caching correctly for every provider, including the cross-conversation warm cache that dominates high-volume economics.
4. Support four workloads on one engine: Chatbot, Prompt/Batch, Agent (single), Multi-agent (crew/group chat).
5. Provider-agnostic optimization that names dollar savings across all models and caching styles.
6. A launch-grade UI with innovative, principled visualizations in light and dark.
7. Deploy to Vercel via GitHub Actions with a human-reviewed pricing refresh.

### Non-goals (deferred, not abandoned)
- Image generation, audio transcription/TTS, and rerank models (190 entries). Their pricing data is retained for a later "pricing reference" phase, but they get no token calculator at launch.
- Live per-request billing integration with provider dashboards.
- User accounts, backend, or database. The app stays static and client-side.

## 3. Key decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | Do not embed TokenCost. Consume its data. | TokenCost is Python and server-side. Its value to a browser app is the price/capability data, which mirrors LiteLLM's `model_prices_and_context_window.json`. |
| D2 | Three tokenizer engines: tiktoken, Transformers.js, heuristic. | Two libraries plus one heuristic cover 1,701 models. No per-provider integrations. |
| D3 | Claude uses local labeled estimate (Option A). | No accurate public local Claude tokenizer exists. Billing-exact counts need Anthropic's API (network + key), which breaks the privacy pitch. We estimate locally and label it. |
| D4 | Every count carries an accuracy badge: Exact / Approx / Estimate. | Scopes the ±5% claim honestly per model instead of promising it globally. |
| D5 | Three caching archetypes plus a cross-run warm-cache model. | Provider caching is heterogeneous (automatic, breakpoint+TTL, storage-based). One formula cannot represent all three. |
| D6 | Four workloads on one shared cost core. | Chatbot, Prompt, Agent, and Crew differ only in how tokens accumulate. The pricing, caching, tokenizer, optimization, and export layers are shared. |
| D7 | Pricing data is a pinned build-time snapshot, refreshed by a scheduled GitHub Action that opens a PR. | Prevents a poisoned or drifting upstream from silently changing displayed costs. Human-in-the-loop for money-affecting changes. |
| D8 | Self-host the top tokenizer files on our own origin. | Keeps "text never leaves the browser" literally true and CSP strict. Tokenizer files are dictionaries we serve, not user data we upload. |
| D9 | Visual direction: Precision Instrument base, security skin, launch-grade polish. | Numbers must read as authoritative. The venue rewards a security aesthetic. Both light and dark are first-class. |

## 4. Architecture overview

```
                         ┌────────────────────────────────────┐
                         │            Model Registry           │
                         │  (TokenCost/LiteLLM snapshot, typed) │
                         │  prices • caching • context • modality│
                         └──────────────┬─────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
┌───────▼────────┐            ┌─────────▼─────────┐           ┌─────────▼─────────┐
│ Tokenizer      │            │ Caching Model     │           │ Cost Core         │
│ Engine         │            │ (3 archetypes +   │           │ (provider-agnostic│
│ tiktoken /     │──counts──▶ │ cross-run warm    │──rates──▶ │ formulas, ranges) │
│ Transformers.js│            │ cache + traffic)  │           │                   │
│ / heuristic    │            └───────────────────┘           └─────────┬─────────┘
└────────────────┘                                                      │
                                                                        │
                 ┌──────────────────────────────────────────────────────┤
                 │                    Workload Strategies                │
                 │  Chatbot • Prompt/Batch • Agent • Multi-agent (crew)  │
                 └───────────────────────────┬──────────────────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
      ┌───────▼───────┐            ┌─────────▼────────┐            ┌────────▼────────┐
      │ Optimization  │            │ UI / Dataviz     │            │ Export /        │
      │ (+ Denial of  │            │ (light + dark,   │            │ Permalink /     │
      │  Wallet)      │            │ command palette) │            │ Import          │
      └───────────────┘            └──────────────────┘            └─────────────────┘
```

Core principle: the data supplies the numbers, the archetype supplies the formula shape, the workload supplies the token-accumulation pattern. Nothing hardcodes a price or a ratio that can drift.

## 5. Subsystem designs

### 5.1 Model Registry (data layer)

Replaces `src/config/pricingData.ts` and the CSV pipeline.

- **Source of record:** TokenCost `model_prices.json` (1,701 entries), which mirrors LiteLLM. Pinned to a specific upstream commit, not `main`.
- **Build step:** a script fetches the pinned snapshot, validates it (schema, required fields, sane ranges), derives a typed `ModelRecord[]`, and writes a bundled artifact. The app imports the artifact. No runtime fetch by default.
- **Refresh:** a scheduled GitHub Action re-fetches, regenerates, and opens a PR with a human-readable diff of price and capability changes. A human merges. This is the only path that changes displayed costs.
- **Optional runtime refresh:** off by default (kill switch). When enabled, fetches a pinned CDN copy and shows a "data as of" stamp. Never on by default, to preserve determinism and avoid a runtime supply-chain dependency.
- **Typed record (replaces the `openai | anthropic` union):**

```ts
interface ModelRecord {
  id: string;
  displayName: string;
  provider: string;            // free string from data (openai, anthropic, gemini, groq, ...)
  underlyingFamily: TokenizerFamily; // resolved: llama, qwen, gpt, claude, gemini, ...
  mode: 'chat' | 'completion' | 'responses' | 'embedding';
  inputPerMToken: number;
  outputPerMToken: number | null;    // null for embeddings
  cache: CacheSpec | null;
  contextWindow: number | null;
  maxOutput: number | null;
  tieredAbove200k?: { inputPerMToken: number; outputPerMToken: number };
  accuracyTier: 'exact' | 'approx' | 'estimate';
  deprecated: boolean;
}
```

- **Coverage classification (measured against the real file):** 1,426 chat/completion/responses + 75 embedding = 1,501 token-based entries at launch. ~85% resolve to an exact local tokenizer, ~11% are Claude (deliberate estimate), ~4% are genuine estimate (Grok, Nova/Titan, Voyage, Aleph Alpha, Reka, Liquid, and a handful of obscure closed models). Every model resolves to a strategy. None returns blank.

### 5.2 Tokenizer Engine

Replaces `src/utils/tokenEstimator.ts` heuristics with a resolver over three engines. The resolver maps `model.id -> TokenizerFamily -> strategy`. Many models share one tokenizer, so ~25 distinct tokenizer files cover ~1,000 models. Cache loaded tokenizers in IndexedDB.

| Engine | Library | Covers | Badge |
|---|---|---|---|
| tiktoken | `js-tiktoken` | All OpenAI (`o200k`/`cl100k`/`p50k`), plus ChatML message/role overhead | Exact |
| Transformers.js | `@huggingface/transformers` | Every open-weight family + Gemini (shared Gemma tokenizer) + open embeddings | Exact |
| Heuristic | in-house | Claude (Option A) + closed proprietary + universal fallback | Estimate |

- **Message-format awareness:** the engine tokenizes both raw strings and structured messages, adding the documented per-message and per-role framing tokens for OpenAI, and equivalent structure overhead for other chat formats. This is what makes the count match a real API call, not just a word count.
- **Claude estimate:** calibrated char-and-word ratio, per Claude generation, applying the ~30% uplift for the current tokenizer generation (Opus 4.7+, Sonnet 5, Fable 5). Labeled Estimate with an error band.
- **Approx tier:** a shared-family tokenizer used as a proxy (for example grok-1 tokenizer for grok-3, or Gemma for a PaLM-era model). Labeled Approx.
- **Loading and privacy:** top ~25 tokenizer files are self-hosted static assets served from our Vercel origin. Transformers.js is pointed at our origin, not the HF CDN. The long tail lazy-loads from a pinned CDN with a CSP allowance, or falls back to the heuristic if blocked. User text is tokenized in the browser and never transmitted.
- **Failure mode:** any tokenizer load failure degrades to the heuristic with an Estimate badge and a visible note. The tool never hard-fails on a count.

### 5.3 Caching Model

Replaces the Anthropic-only logic. Each model maps to an archetype by provider. Cache read/write rates come from the registry, never hardcoded.

- **Archetype A, automatic prefix cache** (OpenAI, DeepSeek, Gemini implicit, Grok). No write cost, no config. Cached prefix billed at the data's cache-read rate. Knob: cache hit rate.
- **Archetype B, explicit breakpoint cache with write cost and TTL** (Anthropic, Bedrock). First write at cache-write rate (1.25x base at 5-min TTL, 2x at 1-hr). Later reads at cache-read rate (~0.1x). Knobs: cacheable fraction, hit rate, TTL.
- **Archetype C, explicit cache with hourly storage** (Gemini explicit). Archetype B plus a per-token-hour storage charge for the cache lifetime. Extra knob: cache lifetime. Flags when sparse traffic makes storage a net loss.

**Cross-conversation / cross-run warm cache (the money model).** A stable system prompt (chatbot) or tool-schema prefix (agent) written to cache stays warm across conversations or runs as long as traffic hits it inside the TTL.

- **Warmth = f(request rate, TTL).** Effective request rate derives from monthly volume spread over a traffic profile. Warmth is the probability a conversation's first turn finds the prefix already cached. It rises toward 1 as inter-arrival time drops below the TTL, and toward 0 when traffic is sparse.
- **Writes per month** approximate the number of TTL windows containing a traffic gap, capped by volume. Upper bound ~8,640/month at a 5-min fixed TTL, far fewer when traffic is continuous and each hit refreshes the timer.
- **Traffic input:** a Traffic Profile preset (Steady 24/7, Business hours, Bursty) derives the active-hours rate from monthly volume. An Advanced field overrides with peak requests/minute.
- **Output:** two figures shown side by side, conservative (each conversation cold-starts) and warm-shared (realistic at volume). The gap is the headline savings and feeds the optimization engine.

### 5.4 Cost Core

Pure TypeScript, no React. Provider-agnostic. Produces a point estimate and a confidence range (p10-p90) driven by accuracy tier and traffic assumptions.

- Converts per-MToken rates to per-token, applies tiered above-200k rates where present.
- Consumes tokenizer counts and caching rates, applies the workload's accumulation formula.
- Emits a component breakdown for the waterfall visualization: system/prefix, cache write, cache reads, input, output, context accumulation, reasoning.

### 5.5 Workload strategies

Each strategy defines only how tokens accumulate. All feed the Cost Core.

- **Chatbot** (refactor of existing): first turn plus later turns, context accumulation, cross-conversation warm cache on the system prompt.
- **Prompt / Batch** (refactor of existing): per-call cost times batch volume, optional multi-turn.
- **Agent (single)**: a tool loop. `runCost = Σ steps (cached stable prefix + accumulated observations + reasoning/action output)`. Drivers: steps per task, tool-schema tokens, avg tool-output size, reasoning mode. Cost grows roughly quadratically in steps because each step re-sends prior context.
- **Multi-agent (crew / group chat)**: `crewCost = Σ per-agent runs + orchestration overhead + shared transcript growth`. Agent count and rounds multiply the loop.
- **Framework presets** seed defaults, then the user tunes: LangChain/LangGraph (single ReAct), CrewAI (role-based crew, sequential or hierarchical), AutoGen (group chat, full-transcript visibility), LlamaIndex (retrieval per step), Custom/raw (no scaffolding). Presets set defaults, they do not hardcode a developer's exact prompts. Every number is a tunable forecast with a range.

### 5.6 Optimization Engine

Replaces the OpenAI-vs-Anthropic-only logic with provider-agnostic analysis across all 1,501 models and all caching archetypes.

- Switch-model, enable-caching, trim-tool-schemas, adjust-context-strategy, each with a dollar figure and a priority.
- **Budget inverse-solve:** given a monthly budget, return feasible model and volume combinations.
- **Sensitivity analysis:** rank which variable (volume, steps, cache hit rate, tool-schema size) moves cost most. Feeds the tornado chart.
- **Denial of Wallet (signature feature):** model worst-case cost under adversarial input. Inflated tool outputs, forced retry loops, injection-induced extra reasoning. Output: baseline vs adversarial per-request cost and the aggregate blast radius at attack volume. Reframes token cost as a security surface. This is the launch differentiator.

### 5.7 UI / UX and data visualization

- **Shell:** multi-mode app (Chatbot, Prompt, Agent, Crew, plus Denial of Wallet). Real-time updates under 100 ms. Command palette (Cmd/Ctrl-K) to jump to any model or mode. Responsive. WCAG AA.
- **Visual direction:** Precision Instrument base (dense, high data-ink, authoritative numerics), security skin (dark-first, restrained accents), launch-grade polish (Vercel/Linear craft). Light and dark first-class, driven by a theme token system, not duplicated styles.
- **Model picker:** searchable, filterable, groupable across 1,501 models, showing price, context window, cache support, and accuracy badge.
- **Visualizations (each answers one question, built per the dataviz skill's palette and accessibility rules):**
  - Cost waterfall: where the monthly money goes, component by component.
  - Cache-warmth curve: cost vs traffic density with the break-even point marked and the conservative/warm band shaded.
  - Cost-vs-context scatter: models plotted by scenario cost vs context window, colored by provider, sized by accuracy tier, to find the frontier.
  - Live token visualizer: colored token stream with a per-token histogram and the exact count and badge.
  - Agent step-accumulation area chart: cumulative token cost per step showing the quadratic climb, with the cached-prefix portion shaded to show savings.
  - Tornado chart: sensitivity ranking.
  - Blast-radius radial: baseline vs adversarial worst-case for Denial of Wallet.
- **Trust surfaces:** every number links to its formula and data source (auditable). Privacy-first badge stated plainly and verifiable in source. Accuracy badges everywhere counts appear.

### 5.8 Workflow features

- **Shareable permalink:** full scenario encoded in the URL fragment, client-side, no backend, no data leak. Built for conference sharing.
- **Import real usage:** paste an API `usage` block or a Langfuse/LangSmith trace to validate forecast against actuals.
- **Saved scenarios and side-by-side comparison:** local storage.
- **Preloaded examples:** LangChain agent, high-volume chatbot, RAG pipeline, so the tool is never empty on first load.
- **Exports:** existing PDF/CSV upgraded, plus JSON export and a shareable summary card.

### 5.9 Deployment

- **Host:** Vercel, static SPA (existing `vercel.json` retained and hardened: strict CSP, security headers, SPA rewrites, asset caching).
- **CI (GitHub Actions):** typecheck, lint, unit tests, build, bundle-size budget gate on every PR.
- **Pricing refresh (GitHub Actions):** scheduled job regenerates the data snapshot and opens a PR with a diff. Human merge only.
- **Deploy:** Vercel Git integration builds and deploys on merge to main. Preview deploys per PR.
- **Bundle strategy:** code-split by mode. Lazy-load tokenizers and dataviz. Target first-paint JS under 200 KB gzipped, with tokenizers and charts loaded on demand. Current baseline is 305 KB total.

## 6. Accuracy and honesty

- The ±5% precision claim is scoped per accuracy badge, not promised globally.
- Exact-tier counts match real API billing for text. Estimate-tier counts show an error band.
- Agent and crew costs are tunable forecasts with ranges, explicitly "given your inputs," because the workload cannot be measured without the developer's real prompts.
- Every displayed cost traces to a formula and a data-snapshot version.

## 7. Security and privacy

- Fully client-side. User prompt text is tokenized in the browser and never transmitted.
- Tokenizer files are served from our origin (top ~25) or a pinned CDN (long tail), never uploaded from the user.
- No API keys anywhere in the product (Option A removes the only reason one would be needed).
- Pricing data changes only through a human-reviewed PR. No silent runtime mutation of costs by default.
- Strict CSP. Dependency pinning (exact versions, `npm audit` gate). These match the existing security posture and the project Quality Contract.

## 8. Testing strategy

The current app has no automated tests. A precision financial tool with a new engine cannot ship that way.

**Test-driven development is mandatory for all engine code** (Model Registry, Tokenizer Engine, Caching Model, Cost Core, workload strategies, Optimization Engine). We follow the superpowers `test-driven-development` skill: write a failing test that pins the expected behavior (red), write the minimum code to pass (green), refactor with the test as a guard. No engine function is written before its test. This is not negotiable for money-affecting math, and it is how every phase is delivered.

- **Test stack:** Vitest (Vite-native) for unit and integration, Testing Library for components. Added in Phase 0 before any engine code exists.
- **Red-green-refactor per unit:** every cost formula, tokenizer resolution, and caching archetype begins as a failing test derived from a hand calculation or a captured fixture, then gets the minimum implementation to pass.
- **Cost core:** hand-verified scenarios per workload written first from the hand math, asserting within 1% of hand calculation. Reproduces the existing 22-scenario validation and extends it to agent and crew.
- **Tokenizer engine:** known token counts per family (fixtures captured from real tokenizers) written as failing tests first, to confirm the Exact tier is actually exact and to catch regressions.
- **Caching archetypes:** tests per archetype written before the formula, including the cross-run warmth model at sparse, break-even, and saturated traffic.
- **Registry:** golden-file test that the generated snapshot matches the pinned upstream and passes schema validation.
- **UI:** component tests for the calculators and a smoke test per mode. Visual review during implementation.
- **CI gate:** GitHub Actions runs the full suite on every PR and blocks merge on any failing, skipped, or disabled test. No test is silenced to make a build pass.

## 9. Error handling and kill switches

- Tokenizer load failure degrades to heuristic with an Estimate badge.
- Data fetch failure (runtime refresh only) falls back to the bundled snapshot.
- Invalid inputs use extended validators with min/max clamping and visible warnings.
- Unknown model resolves to the universal estimate fallback.
- Kill switches: runtime data refresh (default off), each workload mode (feature-flagged for staged rollout), Denial of Wallet mode.

## 10. Phased decomposition

Too large for one implementation plan. Each phase becomes its own plan via the writing-plans skill. Phase 0 is the critical path and unblocks parallel UI work.

- **Phase 0, Foundation:** Model Registry (ingestion, typed records, build snapshot, GHA refresh PR), provider-agnostic Cost Core and types, three caching archetypes plus cross-run warm cache, Tokenizer Engine (three engines, badges, lazy loading), extended validators. Headless, developed test-first (TDD), and fully covered. Establishes the Vitest harness the later phases build on.
- **Phase 1, Workloads and intelligence:** refactor Chatbot and Prompt onto the core, add Agent and Multi-agent, build the provider-agnostic Optimization Engine including Denial of Wallet.
- **Phase 2, UI and dataviz:** multi-mode shell, visual identity, all visualizations, light/dark, command palette, model picker, live token visualizer, sensitivity sliders.
- **Phase 3, Workflow:** shareable permalink, import usage, saved scenarios, examples, export upgrades.
- **Phase 4, Deploy hardening:** GHA CI and pricing-refresh PR, CSP and tokenizer self-hosting, bundle budget, accessibility audit.

The first implementation plan targets Phase 0.

## 11. Open questions and risks

- **Schedule risk:** full agent plus multi-agent plus a UI overhaul before a fixed launch date is aggressive. Mitigation: Phase 0 and Phase 1 are the demo-critical core. UI (Phase 2) can begin against Phase 0 interfaces in parallel. Phases 3 and 4 can trail the launch if needed.
- **Tokenizer bundle weight:** ~25 self-hosted tokenizer files plus Transformers.js add weight. Mitigation: lazy-load per family, cache in IndexedDB, heuristic fallback for the long tail. Confirm the first-paint budget holds.
- **Long-tail tokenizer accuracy:** a small set of closed models (Grok, Nova, Voyage, Reka, Liquid) can only be estimated. Accepted and labeled.
- **Denial of Wallet framing:** must stay rigorous and evidence-based, not sensational, to land with a security audience.
- **Open decision:** self-host exactly which top-N tokenizers, and the CSP policy for the long-tail CDN. Resolve during Phase 0.

## 12. Success criteria (launch)

- Exact token counts for OpenAI, Gemini/Gemma, and open-weight models, matching real API counts for text.
- 1,501 text and embedding models selectable with correct pricing, caching, and context data.
- Four workloads produce auditable forecasts with confidence ranges.
- Cross-conversation warm cache shows a credible savings range against the conservative baseline.
- Denial of Wallet produces a defensible worst-case blast radius.
- Light and dark, responsive, WCAG AA, first-paint under budget.
- Deploys to Vercel via GitHub Actions with a human-reviewed pricing refresh.
- Engine code delivered test-first (TDD); CI blocks merge on any failing or skipped test.
- Zero high or critical `npm audit` findings.
