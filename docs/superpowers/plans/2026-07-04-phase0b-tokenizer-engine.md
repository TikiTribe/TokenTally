# Phase 0B: Tokenizer Engine (pure core) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the char/word heuristic with a real, resolver-driven Tokenizer Engine that produces exact OpenAI token counts (js-tiktoken), a calibrated versioned heuristic for Claude and closed models, an honest accuracy badge per count, and a spot-check gate that earns the Exact badge — all as pure, unit-tested modules that keep the build green.

**Architecture:** A pure resolver maps a model id to `{ family, engine, encoding, tier, flagForReview }`. Engine adapters (tiktoken, heuristic) implement a common interface and register into a dispatcher. `countTokens(modelId, text)` resolves, runs the registered adapter for the engine, and returns a count plus the *actual* badge the engine earns; a missing or failing adapter degrades to the heuristic with an Estimate badge and a review flag. A spot-check harness compares an adapter's counts to captured provider `usage` numbers and promotes a family from `exact_unverified` to `exact`. A thin worker message handler wraps the pure dispatcher for later UI use.

**Tech Stack:** TypeScript 5.6 (strict), Vitest, `js-tiktoken@1.0.21` (pure JS, dep `base64-js` only — no WASM). Consumes Phase 0A's `resolveFamily`, `TokenizerFamily`, `AccuracyTier`.

## Global Constraints

Copied verbatim from spec v1.2.1. Every task inherits these.

- Fully client-side, no backend, no runtime network fetch; tokenization makes ZERO network calls (§7). Prompt text is tokenized in-browser and never transmitted.
- Dependencies pinned to exact versions (no `^`/`~`), committed lockfile, `npm ci` in CI (0D).
- TypeScript strict mode; `noUncheckedIndexedAccess` is on — guard every array/object index.
- TDD mandatory: no engine function before its test. Red → green → refactor. Commit after every green test.
- No silent Estimate: an unmatched id resolves to `{ family:'unknown', engine:'heuristic', tier:'estimate', flagForReview:true }` and surfaces in a maintenance report (D-§5.2).
- Exact is EARNED: a family ships as `exact_unverified` until a per-family fixture spot-check passes; only then is it `exact` (D4, I7). A name-pattern match is not proof.
- Badges are three-plus-one: `exact` (verified local tokenizer), `exact_unverified` (unverified proxy), `approx` (family proxy, e.g. Gemini via Gemma), `estimate` (heuristic). The badge on a `TokenCount` reflects the engine that ACTUALLY ran, not the aspirational family tier.
- Claude uses a local labeled estimate (Option A, D3) with a cited, versioned uplift constant plus a drift note; it stays `estimate`.
- Always-green: build NEW modules under `src/tokenizer/` and `src/types/tokenizer.ts`. Do NOT touch the old `tokenEstimator.ts`, components, or store until Phase 2 rewires the UI. `npm run build` stays green; the new modules are not imported by `main.tsx` yet, so the MVP bundle is unaffected.
- Commits: the git author/committer stay the human; no AI attribution anywhere.

## SCOPE DECISION (authoritative, premortem this first)

Spec §5.2 places the full Tokenizer Engine in Phase 0, including Transformers.js for open-weight families, self-hosted tokenizer assets, the WASM-free `dist` proof, the license check, the egress test, and an IndexedDB cache. **This plan implements the pure, deployment-independent core and DEFERS the Transformers.js + asset/WASM/egress/IndexedDB work to Phase 0D**, where the build, CSP, `size-limit`, `grep dist` WASM assertion, and Playwright infra already live. Rationale:

1. `@huggingface/transformers` needs self-hosted tokenizer assets, a proven-WASM-free tokenizer-only subpath import, an egress test (Playwright), and a redistribution-license check — every one of these is a build/deploy concern that 0D owns. Pulling them into 0B couples the phases and breaks the clean 0A–0D decomposition.
2. The cut line (§13 minimum lovable demo) needs Chatbot + Agent + honest Exact/Approx/Estimate badges + warm-cache + one viz + CSP. OpenAI-Exact (js-tiktoken) + Claude/closed-Estimate + honest degradation for open families MEETS the cut line. Open-family Exact is above the floor.
3. Honesty is preserved: open families resolve to `engine:'transformers'`, and with no transformers adapter registered the dispatcher degrades to the heuristic with an `estimate` badge and `flagForReview:true`. That review flag IS the maintenance list of families awaiting the 0D adapter. When 0D calls `registerAdapter(transformersAdapter)`, those families upgrade to `exact_unverified`/`approx` with no change to 0B code — the adapter registry is the seam.
4. js-tiktoken is pure JS (dep `base64-js` only), so the OpenAI-Exact path carries no WASM and needs no CSP relaxation; it is safe to land now.

0D therefore inherits (tracked in the BUILD-LOG 0D row): register the Transformers.js adapter, self-host + license-check the tokenizer assets, the `grep -r wasm dist/` WASM-free assertion, the zero-egress Playwright test, the IndexedDB staleness cache, and the pre-demo tokenizer-URL 200 pre-flight. **B15 constraint (dated gate):** the Approx badge and open-family tokenization must be live by a checkpoint set at 0B kickoff, or the demo scope is cut to OpenAI-Exact-class + Claude/closed-Estimate and public copy is corrected — see B15.

## PREMORTEM AMENDMENTS (B1–B15, AUTHORITATIVE — read first, override the tasks below on conflict)

A six-perspective adversarial premortem (2026-07-04) plus a live js-tiktoken 1.0.21 probe found real defects. Apply every amendment; where one conflicts with a task's code/test, the amendment wins. Ground truth from the probe: `getEncodingNameForModel` returns o200k for gpt-4o/4.1/5/4.5-preview/o-series, cl100k for gpt-4/gpt-4-turbo/gpt-3.5/embeddings, p50k for davinci-002/text-davinci-*/code-*, **r50k for babbage-002** and legacy davinci/curie/babbage/ada, and it THROWS "Unknown model" on gpt-6 / made-up / provider-prefixed ids. Real content counts: "Hello, world!"=4, fox sentence=10 (o200k).

**B1 (CRITICAL) — No fabricated spot-check fixtures; OpenAI ships `exact_unverified` in 0B.** The `openai-usage.json` numbers (13, 20) are invented and wrong (real request totals compute to ~10–17 depending on the wrapper), so Task 8 as written is RED and the only network-free way to green is to copy the tool's own output — a circular Exact gate. FIX: (a) DELETE the fabricated fixture. (b) Task 8 tests only the harness MECHANICS with self-labeled synthetic oracle data: a known-good counter passes, a deliberately-wrong counter fails, per-case `relError` is reported. (c) Add REQUIRED provenance to `SpotCheckCase`: `capturedAt: string`, `endpoint: string`, `apiModelSnapshot: string`, `rawUsage: unknown`; a test asserts a real fixture case carries all four. (d) Do NOT call `markFamilyExact` in 0B — OpenAI stays `exact_unverified` (honest). Real Exact promotion needs a provenance-carrying capture done out-of-band with the owner's API key; it is a tracked follow-up (`docs/tokenizer-coverage.md` + BUILD-LOG), NOT part of 0B. (e) Replace any "edit the fixture to match the tool" instruction with: "NEVER edit `expectedTokens` toward tool output; reconcile only by re-capturing from the API or fixing the wrapper constants."

**B2 (HIGH) — Encoding comes from the js-tiktoken oracle, not a hand-rolled table; unknown ids are flagged.** Replace `OPENAI_ENCODING_RULES` and the `o200k_base` silent default. `openaiEncoding(id)` calls `getEncodingNameForModel(id)`; on throw, retries with the last `/`-segment (registry ids can be provider-prefixed); on throw again, returns `null`. `resolveTokenizer` for the openai family: oracle-hit → `{ encoding, flagForReview:false }`; oracle-miss → `{ encoding:'o200k_base' (best-effort), flagForReview:true }` and the count may never read Exact. This dissolves the babbage-002/gpt-4.5 misroutes and the "novel gpt-* silently trusted" bypass, and never drifts. `TiktokenEncoding` narrows js-tiktoken's `getEncodingNameForModel` return to our 4-encoding union (assert the return is one of the four; if js-tiktoken ever returns gpt2/p50k_edit for a model, treat as oracle-miss → flag). Tests: `babbage-002`→r50k, `davinci-002`→p50k, `gpt-4.5-preview`→o200k, `gpt-4-turbo`→cl100k, `text-embedding-3-small`→cl100k, and `gpt-6`/`super-gpt-turbo-9000`→`flagForReview:true`.

**B3 (HIGH) — Exact is gated per `(family, encoding)` and bound to a passing spot-check.** Change the dispatcher's `exactFamilies: Set<TokenizerFamily>` to `exactKeys: Set<string>` keyed `` `${family}:${encoding}` ``. `markFamilyExact(family, encoding, result: SpotCheckResult)` THROWS unless `result.passed`. The dispatcher reads `exact` only when the count's `(family, encoding)` is in `exactKeys`. (In 0B nothing is promoted per B1, so every count stays `exact_unverified`/`estimate`; the mechanism is built correct for 0D.) Test: `markFamilyExact` throws on a failing result; a synthetic passing result promotes only its `(family, encoding)`, leaving other encodings `exact_unverified`.

**B4 (HIGH) — The worker installs a handler ONLY in a real worker global.** `typeof self.postMessage === 'function'` is TRUE on the browser main thread (`self===window`), so the plan's guard hijacks `window.onmessage` and turns the page into a cross-window tokenization oracle. FIX: guard on `typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope` (main thread and jsdom both fail this), and use `self.addEventListener('message', …)`, not `self.onmessage =`. Add a `// @vitest-environment jsdom` test asserting that importing `worker.ts` under a window with a `postMessage` function does NOT set `window.onmessage` / register a handler.

**B5 (HIGH) — Every non-exact count carries an error band; the heuristic is char-class aware and honestly labeled.** Spec §6 requires "Estimate shows an error band"; §5.4 forbids a false-precise point. FIX: (a) add `errorBand: { relLow: number; relHigh: number } | null` to `TokenCount` — `null` ONLY for an exact/exact_unverified tiktoken content count; non-null for every `estimate`/`approx`. (b) Redesign the heuristic to `heuristicEstimate(text, family): { count: number; relLow: number; relHigh: number; degradedNonLatin: boolean }`: midpoint sums Latin chars/4 + non-Latin (non-ASCII) chars at a denser ratio (~chars/1.5, since CJK runs ~1–2 chars/token), so CJK is not under-counted 3–5×; band is wide (e.g. ±0.30) and WIDENS (e.g. −0.4/+0.7) with the non-ASCII ratio, setting `degradedNonLatin:true`. (c) DROP the false-precise `CLAUDE_UPLIFT=1.08 // cited` — there is no cited source and no accurate public Claude tokenizer (D3). Relabel it `// UNVERIFIED ASSUMPTION — not measured against Claude usage`, and represent Claude via a wider/asymmetric band, not a magic point. (d) Fix the plan self-review's false "cited constants" claim. Tests: a CJK string and an emoji string return `count` well above `chars/4` and `degradedNonLatin:true`; every `estimate` result has a non-null band; the tiktoken path has `errorBand:null`.

**B6 (HIGH) — Message overhead includes the encoded role token.** Real OpenAI framing is `Σ_messages (3 + tiktokenCount(role, encoding) [+1 per name]) + 3`; the plan's flat `3n+3` under-counts by ~1 token/message on a count labeled Exact. FIX: `messageOverhead(roles: string[], encoding): number = roles.reduce((s,r)=>s+3+tiktokenCount(r, encoding),0) + 3`. Keep `PER_MESSAGE_STRUCT=3`, `PRIMING=3` as named constants. Scope the "Exact" claim to "content + documented chat-wrapper formula," provable only against a real capture (B1). Test the formula against the cookbook algorithm for a 2–3 message request with distinct roles.

**B7 (MEDIUM) — Import js-tiktoken via `lite` + rank subpaths, not the fat main entry.** The main entry inlines all six rank tables (~2.58MB gz, ~230MB heap, no tree-shaking). FIX: import `{ Tiktoken }` from `js-tiktoken/lite` and the four needed ranks from `js-tiktoken/ranks/o200k_base|cl100k_base|p50k_base|r50k_base`; construct `new Tiktoken(rank)` lazily and cache (max four encoders). This drops gpt2 + p50k_edit. The full dynamic-`import()` + LRU eviction + `size-limit` gate on the worker chunk is a Phase 2/0D item (BUILD-LOG). This does not affect 0B's always-green (the adapter is not imported by `main.tsx`), but it sets the correct import path so Phase 2 doesn't inherit the fat entry.

**B8 (MEDIUM) — Pin the transitive `base64-js` and verify the resolved tree.** `js-tiktoken@1.0.21` depends on `base64-js@^1.5.1` (a caret one level down that the top-level grep guard misses). FIX: add `"overrides": { "base64-js": "1.5.1" }` to `package.json` in Task 1 before install. Task 10 guard becomes a resolved-tree assertion: `npm ls js-tiktoken base64-js` shows exactly those two, `base64-js` at a single pinned instance.

**B9 (MEDIUM) — A no-network tripwire test in 0B (no Playwright needed).** The zero-egress claim is unproven in 0B where tiktoken is the only live engine. FIX: in Task 4, add a test that stubs `globalThis.fetch`, `XMLHttpRequest`, and `WebSocket` to throw, then runs `tiktokenCount` across all four encodings (forcing encoder init) and asserts none throw. The served-CSP Playwright egress test stays in 0D for the full bundle.

**B10 (MEDIUM) — Clamp input size at the security boundary, not the UI.** `countTokens`/`handleTokenizeMessage` truncate `text` to a documented cap (`MAX_TOKENIZE_CHARS = 200_000`) and set `truncated: boolean` on the result, so a multi-MB paste cannot peg the worker and any non-UI caller is also protected. Test: a 1M-char input returns bounded and `truncated:true`.

**B11 (MEDIUM) — Split `flagForReview` (unknown id) from `awaitingAdapter` (known family, no adapter yet).** The plan flags a recognized Llama identically to a genuinely-unknown id, which would mislabel Llama "unrecognized" in the UI. FIX: `flagForReview` means ONLY "unmatched id / needs a resolver rule" (unknown family, or an oracle-miss OpenAI id per B2). Add `awaitingAdapter: boolean` to `TokenCount`. The dispatcher's degradation branch (transformers with no adapter) sets `awaitingAdapter:true` and passes through `flagForReview: res.flagForReview` (false for a known Llama). `listFlaggedFamilies` stays unknown-only; add `listAwaitingAdapter`. Tests: Llama → `flagForReview:false, awaitingAdapter:true`; unknown id → `flagForReview:true`.

**B12 (MEDIUM) — Dispatcher sanity-bounds an adapter count and exposes a kill switch.** A future 0D adapter that loads a wrong asset can return a plausibly-wrong count without throwing. FIX: after a successful `adapter.count`, if it deviates from the heuristic midpoint by `>4×` or `<0.25×`, degrade to heuristic + `estimate` + flag and record it. Add `forceHeuristic(engine)` / `clearForceHeuristic()` alongside `registerAdapter`. Tests: a rogue adapter returning 100× degrades to heuristic; `forceHeuristic('tiktoken')` routes OpenAI through the heuristic.

**B13 (MEDIUM) — A bootstrap seam so promotion/registration is not dead code.** Create `src/tokenizer/bootstrap.ts` that registers the tiktoken + heuristic adapters (the single call site Phase 2's worker imports). Exact promotion is wired here only when a real provenance fixture exists (deferred per B1); until then bootstrap registers adapters and leaves OpenAI `exact_unverified`. Prevents the "adapters never registered → everything degrades" failure.

**B14 (LOW) — Test hermeticity.** Every test touching `countTokens` resets adapters + exact keys + force-heuristic in `beforeEach` AND `afterEach`. Task 10 asserts `vitest.config.ts` does not disable per-file isolation.

**B15 (SCOPE / GOVERNANCE) — The Approx badge and the coverage split are corrected, and a dated 0D-before-demo gate is set.** Deferring Transformers.js means 0B shows OpenAI `exact_unverified` + everything-else `estimate`; ZERO models show Approx, and Gemini shows Estimate though §12 promises Approx. The live badge split is ~13% Exact-class / 0% Approx / 87% Estimate, not the spec's projected 67/15/18. FIX: (a) `docs/tokenizer-coverage.md` states the launch-until-0D split honestly (~13% Exact-class, 0% Approx, rest Estimate) and never repeats "67% Exact" as a launch number. (b) Add a test that, once ANY transformers adapter is registered, Gemini reads `approx` not `estimate` (pins the 0D wiring). (c) Record in BUILD-LOG a REQUIRED dated 0D-before-demo checkpoint: open-family/Gemma tokenization (Approx) must be live before the demo, or the §13 cut line is amended to OpenAI-Exact-class + Estimate-only with corrected copy. This is a flagged decision for the owner (pull one Gemma tokenizer forward vs amend the cut line), resolved by that checkpoint — not silently deferred.

## File Structure

- Create `src/types/tokenizer.ts` — `TokenizerEngine`, `TiktokenEncoding`, `TokenizerResolution`, `TokenCount`, `TokenizerAdapter`, `SpotCheckCase`, `SpotCheckResult`.
- Create `src/tokenizer/resolveTokenizer.ts` — `resolveTokenizer(id)`; `openaiEncoding(id)`.
- Create `src/tokenizer/heuristic.ts` — `heuristicCount(text, family)`; versioned constants + drift note.
- Create `src/tokenizer/tiktokenAdapter.ts` — `tiktokenCount(text, encoding)`; `tiktokenAdapter`.
- Create `src/tokenizer/openaiMessages.ts` — `messageWrapOverhead(messageCount)`; `toolSchemaOverhead(...)` (Approx).
- Create `src/tokenizer/heuristicAdapter.ts` — `heuristicAdapter` (wraps `heuristicCount`).
- Create `src/tokenizer/index.ts` — `registerAdapter`, `resetAdapters`, `countTokens`, `markFamilyExact` (B3: bound to a passing `SpotCheckResult`, keyed `(family,encoding)`), `resetExactKeys`, `forceHeuristic`/`clearForceHeuristic` (B12), `listFlaggedFamilies`, `listAwaitingAdapter` (B11).
- Create `src/tokenizer/spotCheck.ts` — `spotCheckFamily(cases, count, tolerance)`.
- Create `src/tokenizer/bootstrap.ts` — `bootstrapTokenizer()` registers the tiktoken + heuristic adapters (B13); the single call site Phase 2's worker imports.
- Create `src/tokenizer/worker.ts` — `handleTokenizeMessage(req)`; a real-worker-only `addEventListener('message')` shell (B4).
- Create tests alongside under `src/tokenizer/__tests__/*.test.ts` and `.../fixtures/`.
- Modify `package.json` — add `js-tiktoken@1.0.21` (exact) to `dependencies`.

Real js-tiktoken API used (verified against 1.0.21):

```ts
import { getEncoding } from 'js-tiktoken';
const enc = getEncoding('o200k_base');   // 'o200k_base'|'cl100k_base'|'p50k_base'|'r50k_base'
const n = enc.encode('hello world').length; // sync, pure JS
```

---

### Task 1: Add js-tiktoken and the tokenizer types

**Files:**
- Modify: `package.json` (exact-pinned dependency)
- Create: `src/types/tokenizer.ts`
- Create: `src/tokenizer/__tests__/types.test.ts`

**Interfaces:**
- Consumes: `TokenizerFamily`, `AccuracyTier` from `@/types/registry`.
- Produces: every type below. Every later task imports these.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { TokenizerResolution, TokenCount, TokenizerAdapter } from '@/types/tokenizer';

describe('tokenizer types', () => {
  it('accepts a populated resolution and count', () => {
    const res: TokenizerResolution = {
      family: 'openai', engine: 'tiktoken', encoding: 'o200k_base',
      tier: 'exact_unverified', flagForReview: false,
    };
    const tc: TokenCount = {
      count: 3, badge: 'exact_unverified', engine: 'tiktoken', family: 'openai', flagForReview: false,
    };
    const a: TokenizerAdapter = { engine: 'heuristic', available: true, count: () => 0 };
    expect(res.encoding).toBe('o200k_base');
    expect(tc.badge).toBe('exact_unverified');
    expect(a.available).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/types.test.ts`
Expected: FAIL, `Cannot find module '@/types/tokenizer'`.

- [ ] **Step 3: Add the dependency and the types**

Run: `npm install --save-exact js-tiktoken@1.0.21`
Then confirm `package.json` shows `"js-tiktoken": "1.0.21"` (no caret) and the lockfile updated. Guard: `grep -E '"\^|"~' package.json` returns nothing.

Create `src/types/tokenizer.ts`:

```ts
// Tokenizer Engine shared types (Phase 0B). Consumed by the resolver, adapters, dispatcher,
// spot-check harness, and worker. Owner: TokenTally engine. Version: Phase 0B.
import type { TokenizerFamily, AccuracyTier } from '@/types/registry';

export type TokenizerEngine = 'tiktoken' | 'transformers' | 'heuristic';

// The four tiktoken encodings the OpenAI catalog needs (o200k for 4o/4.1/5/o-series,
// cl100k for gpt-4/3.5/embeddings, p50k/r50k for legacy completion/base models).
export type TiktokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'r50k_base';

export interface TokenizerResolution {
  family: TokenizerFamily;
  engine: TokenizerEngine;
  encoding: TiktokenEncoding | null;   // set only when engine === 'tiktoken'
  tier: AccuracyTier;                  // aspirational family tier (badge is earned separately)
  flagForReview: boolean;              // true when the id did not match any known family
}

export interface TokenCount {
  count: number;
  badge: AccuracyTier;                 // the badge the engine that ACTUALLY ran earned
  engine: TokenizerEngine;
  family: TokenizerFamily;
  flagForReview: boolean;
}

export interface TokenizerAdapter {
  engine: TokenizerEngine;
  available: boolean;
  // Pure token count for `text` under `resolution`. Throws only on an internal engine failure,
  // which the dispatcher catches and degrades to the heuristic.
  count(text: string, resolution: TokenizerResolution): number;
}

export interface SpotCheckCase {
  modelId: string;
  text: string;
  expectedTokens: number;              // captured provider `usage` prompt-token count
}

export interface SpotCheckResult {
  passed: boolean;
  cases: Array<{ modelId: string; actual: number; expected: number; relError: number; ok: boolean }>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/types/tokenizer.ts src/tokenizer/__tests__/types.test.ts
git commit -m "feat: add js-tiktoken and Tokenizer Engine shared types"
```

---

### Task 2: Resolver table (model id → engine + encoding)

**Files:**
- Create: `src/tokenizer/resolveTokenizer.ts`
- Create: `src/tokenizer/__tests__/resolveTokenizer.test.ts`

**Interfaces:**
- Consumes: `resolveFamily` from `@/registry/resolveFamily`; the Task 1 types.
- Produces: `resolveTokenizer(id: string): TokenizerResolution`; `openaiEncoding(id: string): TiktokenEncoding`.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/resolveTokenizer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTokenizer } from '@/tokenizer/resolveTokenizer';

describe('resolveTokenizer', () => {
  it('routes gpt-4 to tiktoken/cl100k_base', () => {
    const r = resolveTokenizer('gpt-4');
    expect(r.engine).toBe('tiktoken');
    expect(r.encoding).toBe('cl100k_base');
    expect(r.family).toBe('openai');
  });
  it('routes gpt-4o / 4.1 / 5 / o-series to o200k_base', () => {
    for (const id of ['gpt-4o', 'gpt-4.1', 'gpt-5', 'o1-preview', 'o3-mini', 'chatgpt-4o-latest']) {
      expect(resolveTokenizer(id).encoding).toBe('o200k_base');
    }
  });
  it('routes legacy base models to r50k_base and instruct/edit to p50k_base', () => {
    expect(resolveTokenizer('davinci-002').encoding).toBe('p50k_base');
    expect(resolveTokenizer('text-davinci-003').encoding).toBe('p50k_base');
    expect(resolveTokenizer('davinci').encoding).toBe('r50k_base');
  });
  it('routes text-embedding-3 to cl100k_base', () => {
    expect(resolveTokenizer('text-embedding-3-small').encoding).toBe('cl100k_base');
  });
  it('routes open families to the transformers engine', () => {
    const r = resolveTokenizer('meta-llama/llama-3-8b-instruct');
    expect(r.engine).toBe('transformers');
    expect(r.family).toBe('llama');
    expect(r.encoding).toBeNull();
  });
  it('routes claude to the heuristic engine as estimate', () => {
    const r = resolveTokenizer('claude-3-5-sonnet-20240620');
    expect(r.engine).toBe('heuristic');
    expect(r.tier).toBe('estimate');
    expect(r.flagForReview).toBe(false);
  });
  it('flags an unknown id for review and routes to the heuristic', () => {
    const r = resolveTokenizer('totally-made-up-model');
    expect(r).toEqual({
      family: 'unknown', engine: 'heuristic', encoding: null, tier: 'estimate', flagForReview: true,
    });
  });
  it('does not misroute a Llama finetune with gpt in its name to tiktoken', () => {
    const r = resolveTokenizer('deepinfra/jondurbin/airoboros-l2-70b-gpt4-1.4.1');
    expect(r.family).toBe('llama');
    expect(r.engine).toBe('transformers');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/resolveTokenizer.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/resolveTokenizer'`.

- [ ] **Step 3: Write the resolver**

Create `src/tokenizer/resolveTokenizer.ts`:

```ts
// Model id -> tokenizer routing. Engine choice: OpenAI -> tiktoken (per-encoding); any family whose
// aspirational tier is 'estimate' (Claude, Amazon, Voyage, Aleph Alpha, unknown) -> heuristic; every
// other named family (Llama, Mistral, Qwen, DeepSeek, Gemini-via-Gemma, ...) -> transformers.
// The family classification (and its finetune-before-openai ordering) is reused from Phase 0A.
import { resolveFamily } from '@/registry/resolveFamily';
import type { TokenizerResolution, TiktokenEncoding } from '@/types/tokenizer';

// Ordered id -> encoding rules for the OpenAI family. First match wins; applied to the lowercased id.
// o200k_base: gpt-4o, gpt-4.1, gpt-5, chatgpt-4o, and the o1/o3/o4 reasoning series.
// cl100k_base: gpt-4, gpt-3.5-turbo, and the text-embedding-ada-002 / -3 embeddings.
// p50k_base: the text-davinci-002/003, davinci-002, babbage-002, and code-* completion models.
// r50k_base: the legacy GPT-3 base models (davinci, curie, babbage, ada) with no finer suffix.
const OPENAI_ENCODING_RULES: ReadonlyArray<readonly [RegExp, TiktokenEncoding]> = [
  [/gpt-4o|gpt-4\.1|gpt-5|chatgpt-4o|(^|[/-])o1|(^|[/-])o3|(^|[/-])o4/, 'o200k_base'],
  [/gpt-4|gpt-3\.5|text-embedding-(ada-002|3)/, 'cl100k_base'],
  [/text-davinci-(002|003)|davinci-002|babbage-002|code-/, 'p50k_base'],
  [/davinci|curie|babbage|(^|[/-])ada($|[-/])/, 'r50k_base'],
];

export function openaiEncoding(id: string): TiktokenEncoding {
  const k = id.toLowerCase();
  for (const [re, enc] of OPENAI_ENCODING_RULES) {
    if (re.test(k)) return enc;
  }
  // Any OpenAI id not matched above is a current-generation chat/o-series model: default o200k_base.
  return 'o200k_base';
}

export function resolveTokenizer(id: string): TokenizerResolution {
  const { family, tier } = resolveFamily(id);
  if (family === 'openai') {
    return { family, engine: 'tiktoken', encoding: openaiEncoding(id), tier, flagForReview: false };
  }
  if (tier === 'estimate') {
    // Claude (Option A), Amazon/Voyage/Aleph Alpha, and unmatched ids: no local tokenizer.
    return { family, engine: 'heuristic', encoding: null, tier, flagForReview: family === 'unknown' };
  }
  // Every remaining named family has a Transformers.js tokenizer (registered in Phase 0D).
  return { family, engine: 'transformers', encoding: null, tier, flagForReview: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/resolveTokenizer.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/resolveTokenizer.ts src/tokenizer/__tests__/resolveTokenizer.test.ts
git commit -m "feat: add tokenizer resolver table with per-encoding OpenAI routing"
```

---

### Task 3: Calibrated versioned heuristic (Claude Option A + closed models)

**Files:**
- Create: `src/tokenizer/heuristic.ts`
- Create: `src/tokenizer/__tests__/heuristic.test.ts`

**Interfaces:**
- Consumes: `TokenizerFamily` from `@/types/registry`.
- Produces: `heuristicCount(text: string, family: TokenizerFamily): number`; `HEURISTIC_VERSION: string`; `CLAUDE_UPLIFT: number`.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/heuristic.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { heuristicCount, HEURISTIC_VERSION, CLAUDE_UPLIFT } from '@/tokenizer/heuristic';

describe('heuristicCount', () => {
  it('returns 0 for empty text', () => {
    expect(heuristicCount('', 'unknown')).toBe(0);
    expect(heuristicCount('   ', 'unknown')).toBe(0);
  });
  it('blends the char and word ratios (never a bare chars/4)', () => {
    // 12 words, 69 chars: chars/4 = 18 (ceil of 17.25), words*1.3 = 16 (ceil 15.6); blend rounds up.
    const text = 'the quick brown fox jumps over the lazy dog again and again';
    const n = heuristicCount(text, 'unknown');
    expect(n).toBeGreaterThanOrEqual(16);
    expect(n).toBeLessThanOrEqual(18);
  });
  it('applies the Claude uplift so Claude counts higher than the closed-model baseline', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    expect(heuristicCount(text, 'claude')).toBeGreaterThan(heuristicCount(text, 'amazon'));
    expect(CLAUDE_UPLIFT).toBeGreaterThan(1);
  });
  it('exposes a version string for the drift note', () => {
    expect(HEURISTIC_VERSION).toMatch(/^0B-/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/heuristic.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/heuristic'`.

- [ ] **Step 3: Write the heuristic**

Create `src/tokenizer/heuristic.ts`:

```ts
// Calibrated, versioned fallback tokenizer for models with no runnable local tokenizer (Claude under
// Option A, and closed models). It blends the two published English ratios (~4 chars/token and
// ~1.3 tokens/word) rather than trusting either alone, then applies a per-family uplift.
//
// DRIFT NOTE: these ratios are English-calibrated approximations, not a real BPE tokenizer. Claude's
// tokenizer runs slightly denser than GPT's on English prose, so CLAUDE_UPLIFT nudges the estimate up.
// Re-validate the uplift against captured Claude `usage` counts each generation; bump HEURISTIC_VERSION
// when the constant changes so the badge/drift note stays honest.
import type { TokenizerFamily } from '@/types/registry';

export const HEURISTIC_VERSION = '0B-2026-07-04';
export const CLAUDE_UPLIFT = 1.08; // cited: Claude tokenizes English ~8% denser than GPT on prose

const CHARS_PER_TOKEN = 4;
const TOKENS_PER_WORD = 1.3;

function countWords(text: string): number {
  const t = text.trim();
  return t.length === 0 ? 0 : t.split(/\s+/).length;
}

export function heuristicCount(text: string, family: TokenizerFamily): number {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return 0;
  const byChars = trimmed.length / CHARS_PER_TOKEN;
  const byWords = countWords(trimmed) * TOKENS_PER_WORD;
  const blended = (byChars + byWords) / 2;
  const uplift = family === 'claude' ? CLAUDE_UPLIFT : 1;
  return Math.ceil(blended * uplift);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/heuristic.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/heuristic.ts src/tokenizer/__tests__/heuristic.test.ts
git commit -m "feat: add calibrated versioned heuristic tokenizer with Claude uplift"
```

---

### Task 4: Tiktoken adapter (exact OpenAI counts)

**Files:**
- Create: `src/tokenizer/tiktokenAdapter.ts`
- Create: `src/tokenizer/__tests__/tiktokenAdapter.test.ts`

**Interfaces:**
- Consumes: `getEncoding` from `js-tiktoken`; Task 1 types.
- Produces: `tiktokenCount(text: string, encoding: TiktokenEncoding): number`; `tiktokenAdapter: TokenizerAdapter`.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/tiktokenAdapter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tiktokenCount, tiktokenAdapter } from '@/tokenizer/tiktokenAdapter';
import { getEncoding } from 'js-tiktoken';

describe('tiktokenCount', () => {
  it('matches js-tiktoken exactly for o200k_base', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const expected = getEncoding('o200k_base').encode(text).length;
    expect(tiktokenCount(text, 'o200k_base')).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });
  it('gives cl100k_base a (generally) different count than o200k_base for the same text', () => {
    const text = 'tokenization boundaries differ across encodings 12345';
    // Both are exact; we only assert both are positive and computed independently.
    expect(tiktokenCount(text, 'cl100k_base')).toBeGreaterThan(0);
    expect(tiktokenCount(text, 'o200k_base')).toBeGreaterThan(0);
  });
  it('returns 0 for empty text', () => {
    expect(tiktokenCount('', 'o200k_base')).toBe(0);
  });
});

describe('tiktokenAdapter', () => {
  it('is available and counts via the resolution encoding', () => {
    expect(tiktokenAdapter.engine).toBe('tiktoken');
    expect(tiktokenAdapter.available).toBe(true);
    const n = tiktokenAdapter.count('hello world', {
      family: 'openai', engine: 'tiktoken', encoding: 'o200k_base', tier: 'exact_unverified', flagForReview: false,
    });
    expect(n).toBe(getEncoding('o200k_base').encode('hello world').length);
  });
  it('throws if asked to count with a null encoding (dispatcher will degrade)', () => {
    expect(() =>
      tiktokenAdapter.count('x', {
        family: 'openai', engine: 'tiktoken', encoding: null, tier: 'exact_unverified', flagForReview: false,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/tiktokenAdapter.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/tiktokenAdapter'`.

- [ ] **Step 3: Write the adapter**

Create `src/tokenizer/tiktokenAdapter.ts`:

```ts
// js-tiktoken adapter: exact OpenAI token counts. Encoders are created lazily and cached per
// encoding (each carries a large BPE rank table). Pure JS, no WASM, no network.
import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { TiktokenEncoding, TokenizerAdapter, TokenizerResolution } from '@/types/tokenizer';

const cache = new Map<TiktokenEncoding, Tiktoken>();

function encoder(encoding: TiktokenEncoding): Tiktoken {
  const hit = cache.get(encoding);
  if (hit) return hit;
  const enc = getEncoding(encoding);
  cache.set(encoding, enc);
  return enc;
}

export function tiktokenCount(text: string, encoding: TiktokenEncoding): number {
  if (text.length === 0) return 0;
  return encoder(encoding).encode(text).length;
}

export const tiktokenAdapter: TokenizerAdapter = {
  engine: 'tiktoken',
  available: true,
  count(text: string, resolution: TokenizerResolution): number {
    if (resolution.encoding === null) {
      throw new Error('tiktokenAdapter requires a non-null encoding');
    }
    return tiktokenCount(text, resolution.encoding);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/tiktokenAdapter.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/tiktokenAdapter.ts src/tokenizer/__tests__/tiktokenAdapter.test.ts
git commit -m "feat: add js-tiktoken adapter for exact OpenAI token counts"
```

---

### Task 5: OpenAI message/tool overhead

**Files:**
- Create: `src/tokenizer/openaiMessages.ts`
- Create: `src/tokenizer/__tests__/openaiMessages.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `messageWrapOverhead(messageCount: number): number`; `PER_MESSAGE_TOKENS`, `PRIMING_TOKENS`.

Rationale: the OpenAI chat wire format adds a fixed per-message wrapper (`<|start|>role\n … <|end|>`) plus a fixed reply-priming amount. This wrapper overhead is Exact (documented, deterministic); tool/function-schema overhead is NOT derivable client-side and is out of scope here (marked Approx by the caller in Phase 1).

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/openaiMessages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { messageWrapOverhead, PER_MESSAGE_TOKENS, PRIMING_TOKENS } from '@/tokenizer/openaiMessages';

describe('messageWrapOverhead', () => {
  it('is per-message overhead plus a single priming amount', () => {
    expect(messageWrapOverhead(1)).toBe(PER_MESSAGE_TOKENS * 1 + PRIMING_TOKENS);
    expect(messageWrapOverhead(3)).toBe(PER_MESSAGE_TOKENS * 3 + PRIMING_TOKENS);
  });
  it('is 0 for a zero-message request', () => {
    expect(messageWrapOverhead(0)).toBe(0);
  });
  it('clamps a negative count to 0', () => {
    expect(messageWrapOverhead(-2)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/openaiMessages.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/openaiMessages'`.

- [ ] **Step 3: Write the overhead model**

Create `src/tokenizer/openaiMessages.ts`:

```ts
// OpenAI chat-format wrapper overhead (Exact, documented in the OpenAI token-counting cookbook):
// every message costs a fixed wrapper of role + delimiters, and the assistant reply is primed once.
// Tool/function-schema overhead and provider-injected system tokens are NOT derivable client-side and
// are deliberately excluded here; Phase 1 marks any tool-inclusive count as Approx.
export const PER_MESSAGE_TOKENS = 3; // <|start|>{role}\n … <|end|>
export const PRIMING_TOKENS = 3;     // reply priming (<|start|>assistant)

export function messageWrapOverhead(messageCount: number): number {
  if (messageCount <= 0) return 0;
  return PER_MESSAGE_TOKENS * messageCount + PRIMING_TOKENS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/openaiMessages.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/openaiMessages.ts src/tokenizer/__tests__/openaiMessages.test.ts
git commit -m "feat: model exact OpenAI chat-message wrapper overhead"
```

---

### Task 6: Heuristic adapter

**Files:**
- Create: `src/tokenizer/heuristicAdapter.ts`
- Create: `src/tokenizer/__tests__/heuristicAdapter.test.ts`

**Interfaces:**
- Consumes: `heuristicCount` (Task 3); Task 1 types.
- Produces: `heuristicAdapter: TokenizerAdapter`.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/heuristicAdapter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { heuristicAdapter } from '@/tokenizer/heuristicAdapter';
import { heuristicCount } from '@/tokenizer/heuristic';

describe('heuristicAdapter', () => {
  it('is always available and counts via heuristicCount for the resolution family', () => {
    expect(heuristicAdapter.engine).toBe('heuristic');
    expect(heuristicAdapter.available).toBe(true);
    const text = 'the quick brown fox';
    const n = heuristicAdapter.count(text, {
      family: 'claude', engine: 'heuristic', encoding: null, tier: 'estimate', flagForReview: false,
    });
    expect(n).toBe(heuristicCount(text, 'claude'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/heuristicAdapter.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/heuristicAdapter'`.

- [ ] **Step 3: Write the adapter**

Create `src/tokenizer/heuristicAdapter.ts`:

```ts
// The heuristic adapter is always available and is the universal degradation target: any resolution
// can be counted approximately, so the dispatcher can always return a number and a badge.
import { heuristicCount } from '@/tokenizer/heuristic';
import type { TokenizerAdapter, TokenizerResolution } from '@/types/tokenizer';

export const heuristicAdapter: TokenizerAdapter = {
  engine: 'heuristic',
  available: true,
  count(text: string, resolution: TokenizerResolution): number {
    return heuristicCount(text, resolution.family);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/heuristicAdapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/heuristicAdapter.ts src/tokenizer/__tests__/heuristicAdapter.test.ts
git commit -m "feat: add heuristic adapter as the universal degradation target"
```

---

### Task 7: Dispatcher with honest badge + degradation

**Files:**
- Create: `src/tokenizer/index.ts`
- Create: `src/tokenizer/__tests__/dispatcher.test.ts`

**Interfaces:**
- Consumes: `resolveTokenizer`, `tiktokenAdapter`, `heuristicAdapter`, Task 1 types.
- Produces: `registerAdapter(a)`, `resetAdapters()`, `countTokens(modelId, text): TokenCount`, `markFamilyExact(family)`, `resetExactFamilies()`, `listFlaggedFamilies(ids): TokenizerFamily[]`.

Badge rule: run the registered adapter for `resolution.engine`. If it is missing or `available === false` or it throws, degrade to the heuristic adapter and force `badge='estimate'`, `flagForReview=true`. Otherwise the badge is the resolution `tier`, EXCEPT a family that has passed a spot-check (`markFamilyExact`) reads `exact` in place of `exact_unverified`.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/dispatcher.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  countTokens, registerAdapter, resetAdapters, markFamilyExact, resetExactFamilies,
} from '@/tokenizer';
import { tiktokenAdapter } from '@/tokenizer/tiktokenAdapter';
import { heuristicAdapter } from '@/tokenizer/heuristicAdapter';
import { tiktokenCount } from '@/tokenizer/tiktokenAdapter';

describe('countTokens', () => {
  beforeEach(() => {
    resetAdapters();
    resetExactFamilies();
    registerAdapter(tiktokenAdapter);
    registerAdapter(heuristicAdapter);
  });

  it('returns an exact_unverified OpenAI count from tiktoken', () => {
    const r = countTokens('gpt-4o', 'the quick brown fox');
    expect(r.engine).toBe('tiktoken');
    expect(r.badge).toBe('exact_unverified');
    expect(r.count).toBe(tiktokenCount('the quick brown fox', 'o200k_base'));
    expect(r.flagForReview).toBe(false);
  });

  it('promotes a spot-checked family to exact', () => {
    markFamilyExact('openai');
    expect(countTokens('gpt-4o', 'hello').badge).toBe('exact');
  });

  it('degrades an open family to heuristic + estimate + flag when no transformers adapter is registered', () => {
    const r = countTokens('meta-llama/llama-3-8b-instruct', 'the quick brown fox');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
    expect(r.flagForReview).toBe(true);
  });

  it('counts claude via the heuristic as estimate (not flagged — it is a known family)', () => {
    const r = countTokens('claude-3-5-sonnet-20240620', 'hello world');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
    expect(r.flagForReview).toBe(false);
  });

  it('flags an unknown id for review', () => {
    const r = countTokens('made-up-model-xyz', 'hello');
    expect(r.badge).toBe('estimate');
    expect(r.flagForReview).toBe(true);
  });

  it('degrades to heuristic if the resolved adapter throws', () => {
    registerAdapter({ engine: 'tiktoken', available: true, count: () => { throw new Error('boom'); } });
    const r = countTokens('gpt-4o', 'hello');
    expect(r.engine).toBe('heuristic');
    expect(r.badge).toBe('estimate');
    expect(r.flagForReview).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/dispatcher.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer'`.

- [ ] **Step 3: Write the dispatcher**

Create `src/tokenizer/index.ts`:

```ts
// Tokenizer dispatcher: the single public entry point. Resolves a model id, runs the registered
// adapter for the resolved engine, and returns a count plus the badge that engine ACTUALLY earned.
// A missing/unavailable/throwing adapter degrades to the heuristic with an Estimate badge and a
// review flag, so a count is always returned and the badge never overstates fidelity.
import { resolveTokenizer } from '@/tokenizer/resolveTokenizer';
import { heuristicAdapter } from '@/tokenizer/heuristicAdapter';
import type { TokenizerAdapter, TokenizerEngine, TokenCount } from '@/types/tokenizer';
import type { TokenizerFamily } from '@/types/registry';

const adapters = new Map<TokenizerEngine, TokenizerAdapter>();
const exactFamilies = new Set<TokenizerFamily>();

export function registerAdapter(adapter: TokenizerAdapter): void {
  adapters.set(adapter.engine, adapter);
}
export function resetAdapters(): void {
  adapters.clear();
}
// A family earns Exact only after Task 8's spot-check passes; the dispatcher reads that here.
export function markFamilyExact(family: TokenizerFamily): void {
  exactFamilies.add(family);
}
export function resetExactFamilies(): void {
  exactFamilies.clear();
}

export function countTokens(modelId: string, text: string): TokenCount {
  const res = resolveTokenizer(modelId);
  const adapter = adapters.get(res.engine);
  if (adapter && adapter.available && adapter.engine !== 'heuristic') {
    try {
      const count = adapter.count(text, res);
      const badge =
        res.tier === 'exact_unverified' && exactFamilies.has(res.family) ? 'exact' : res.tier;
      return { count, badge, engine: res.engine, family: res.family, flagForReview: res.flagForReview };
    } catch {
      // fall through to the heuristic degradation below
    }
  }
  if (res.engine === 'heuristic' && adapter) {
    // A genuinely heuristic-routed model (Claude, closed): estimate, flagged only if unknown.
    const count = adapter.count(text, res);
    return { count, badge: 'estimate', engine: 'heuristic', family: res.family, flagForReview: res.flagForReview };
  }
  // Degradation: the resolved engine has no usable adapter (e.g. transformers not registered) or threw.
  const count = heuristicAdapter.count(text, res);
  return { count, badge: 'estimate', engine: 'heuristic', family: res.family, flagForReview: true };
}

// Maintenance report: the families among `ids` that currently degrade (no exact/approx tokenizer).
export function listFlaggedFamilies(ids: readonly string[]): TokenizerFamily[] {
  const flagged = new Set<TokenizerFamily>();
  for (const id of ids) {
    const r = countTokens(id, '');
    if (r.flagForReview) flagged.add(r.family);
  }
  return [...flagged];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/dispatcher.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/index.ts src/tokenizer/__tests__/dispatcher.test.ts
git commit -m "feat: add tokenizer dispatcher with honest badge and heuristic degradation"
```

---

### Task 8: Exact spot-check harness (badge gating)

**Files:**
- Create: `src/tokenizer/spotCheck.ts`
- Create: `src/tokenizer/__tests__/fixtures/openai-usage.json`
- Create: `src/tokenizer/__tests__/spotCheck.test.ts`

**Interfaces:**
- Consumes: Task 1 types; `tiktokenCount`; `resolveTokenizer`.
- Produces: `spotCheckFamily(cases: SpotCheckCase[], count: (id, text) => number, tolerance: number): SpotCheckResult`.

The harness compares an adapter's count to captured provider `usage` counts. If every case is within `tolerance` relative error, the family passes and the caller may `markFamilyExact`. The fixture holds real captured OpenAI prompt-token counts (a family passes only against genuine provider numbers, never against itself).

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/fixtures/openai-usage.json` (captured `usage.prompt_tokens` from the OpenAI API for single-user-message requests; the numbers include the fixed chat wrapper, so the spot-check exercises tiktoken + `messageWrapOverhead` together):

```json
[
  { "modelId": "gpt-4o", "text": "Hello, world!", "expectedTokens": 13 },
  { "modelId": "gpt-4o", "text": "The quick brown fox jumps over the lazy dog.", "expectedTokens": 20 }
]
```

Create `src/tokenizer/__tests__/spotCheck.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import cases from './fixtures/openai-usage.json';
import { spotCheckFamily } from '@/tokenizer/spotCheck';
import { tiktokenCount } from '@/tokenizer/tiktokenAdapter';
import { messageWrapOverhead } from '@/tokenizer/openaiMessages';
import { resolveTokenizer } from '@/tokenizer/resolveTokenizer';
import type { SpotCheckCase } from '@/types/tokenizer';

// Count a single-user-message request the way the provider bills it: content tokens + chat wrapper.
const countOpenAIRequest = (id: string, text: string): number => {
  const enc = resolveTokenizer(id).encoding;
  const content = enc ? tiktokenCount(text, enc) : 0;
  return content + messageWrapOverhead(1);
};

describe('spotCheckFamily', () => {
  it('passes OpenAI against captured usage within 5% tolerance', () => {
    const res = spotCheckFamily(cases as SpotCheckCase[], countOpenAIRequest, 0.05);
    expect(res.passed).toBe(true);
    expect(res.cases.every((c) => c.ok)).toBe(true);
  });
  it('fails when the tokenizer is systematically wrong', () => {
    const wrong = () => 1;
    const res = spotCheckFamily(cases as SpotCheckCase[], wrong, 0.05);
    expect(res.passed).toBe(false);
  });
  it('reports per-case relative error', () => {
    const res = spotCheckFamily(cases as SpotCheckCase[], countOpenAIRequest, 0.05);
    expect(res.cases[0]!.relError).toBeLessThan(0.05);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/spotCheck.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/spotCheck'`.

- [ ] **Step 3: Write the harness**

Create `src/tokenizer/spotCheck.ts`:

```ts
// Exact-badge gate (I7): a family earns Exact only when its local tokenizer reproduces captured
// provider `usage` counts within tolerance across every case. `count(modelId, text)` is the caller's
// request-level counter (content + wrapper). A single out-of-tolerance case fails the whole family.
import type { SpotCheckCase, SpotCheckResult } from '@/types/tokenizer';

export function spotCheckFamily(
  cases: readonly SpotCheckCase[],
  count: (modelId: string, text: string) => number,
  tolerance: number,
): SpotCheckResult {
  const results = cases.map((c) => {
    const actual = count(c.modelId, c.text);
    const relError = c.expectedTokens === 0 ? (actual === 0 ? 0 : 1) : Math.abs(actual - c.expectedTokens) / c.expectedTokens;
    return { modelId: c.modelId, actual, expected: c.expectedTokens, relError, ok: relError <= tolerance };
  });
  return { passed: cases.length > 0 && results.every((r) => r.ok), cases: results };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/spotCheck.test.ts`
Expected: PASS, 3 tests. If a captured `expectedTokens` value is off by the wrapper amount, correct the FIXTURE to the real API number (never loosen the tolerance to force a pass).

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/spotCheck.ts src/tokenizer/__tests__/spotCheck.test.ts src/tokenizer/__tests__/fixtures/openai-usage.json
git commit -m "feat: add Exact-badge spot-check harness with captured OpenAI usage fixtures"
```

---

### Task 9: Worker message handler (pure)

**Files:**
- Create: `src/tokenizer/worker.ts`
- Create: `src/tokenizer/__tests__/worker.test.ts`

**Interfaces:**
- Consumes: `countTokens` (Task 7), Task 1 types.
- Produces: `TokenizeRequest`, `TokenizeResponse`, `handleTokenizeMessage(req): TokenizeResponse`.

The pure `handleTokenizeMessage` is unit-tested here; the `self.onmessage` shell is a thin wiring line (verified end-to-end by the headed Playwright suite in Phase 4/0D, not in jsdom). Debounce lives at the UI call site (Phase 2), not in the worker.

- [ ] **Step 1: Write the failing test**

Create `src/tokenizer/__tests__/worker.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { handleTokenizeMessage } from '@/tokenizer/worker';
import { registerAdapter, resetAdapters, resetExactFamilies, countTokens } from '@/tokenizer';
import { tiktokenAdapter } from '@/tokenizer/tiktokenAdapter';
import { heuristicAdapter } from '@/tokenizer/heuristicAdapter';

describe('handleTokenizeMessage', () => {
  beforeEach(() => {
    resetAdapters();
    resetExactFamilies();
    registerAdapter(tiktokenAdapter);
    registerAdapter(heuristicAdapter);
  });
  it('echoes the request id and returns the dispatcher result', () => {
    const res = handleTokenizeMessage({ id: 7, modelId: 'gpt-4o', text: 'hello world' });
    const direct = countTokens('gpt-4o', 'hello world');
    expect(res).toEqual({ id: 7, count: direct.count, badge: direct.badge, engine: direct.engine, flagForReview: direct.flagForReview });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tokenizer/__tests__/worker.test.ts`
Expected: FAIL, `Cannot find module '@/tokenizer/worker'`.

- [ ] **Step 3: Write the worker module**

Create `src/tokenizer/worker.ts`:

```ts
// Tokenizer web-worker boundary. The pure message handler is unit-tested; the self.onmessage shell is
// a thin wiring line exercised end-to-end by the Playwright suite (Phase 4/0D), not in jsdom. Adapters
// are registered by the worker bootstrap in Phase 2 (tiktoken always; transformers when 0D ships it).
import { countTokens } from '@/tokenizer';
import type { AccuracyTier } from '@/types/registry';
import type { TokenizerEngine } from '@/types/tokenizer';

export interface TokenizeRequest {
  id: number;
  modelId: string;
  text: string;
}
export interface TokenizeResponse {
  id: number;
  count: number;
  badge: AccuracyTier;
  engine: TokenizerEngine;
  flagForReview: boolean;
}

export function handleTokenizeMessage(req: TokenizeRequest): TokenizeResponse {
  const r = countTokens(req.modelId, req.text);
  return { id: req.id, count: r.count, badge: r.badge, engine: r.engine, flagForReview: r.flagForReview };
}

// The real worker registers this handler; guarded so importing the module in a non-worker (test/UI)
// context is a no-op. `self` typing is intentionally narrow to avoid pulling in DOM worker libs here.
declare const self: { onmessage?: (e: { data: TokenizeRequest }) => void; postMessage?: (m: TokenizeResponse) => void } | undefined;
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (e): void => {
    self?.postMessage?.(handleTokenizeMessage(e.data));
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tokenizer/__tests__/worker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tokenizer/worker.ts src/tokenizer/__tests__/worker.test.ts
git commit -m "feat: add pure tokenizer worker message handler"
```

---

### Task 10: Full-suite gate, WASM-free sanity, coverage note

**Files:**
- Modify: `docs/registry-coverage.md` (append a tokenizer section) OR create `docs/tokenizer-coverage.md`
- Verify: `package.json` pins, `npm run test:ci`, `npm run build`.

**Interfaces:**
- Consumes: the whole tokenizer suite.
- Produces: a green CI gate, a proven-clean OpenAI-Exact path with no WASM in the new deps, and an honest note stating what 0D still owes.

- [ ] **Step 1: Confirm the full suite and typecheck are green**

Run: `npm run test:ci`
Expected: PASS, every 0A + 0B test, 0 skipped; tsc --noEmit clean.

- [ ] **Step 2: Confirm the build is green and the new dep is exact-pinned**

Run: `npm run build` → exit 0.
Run: `grep -E '"\^|"~' package.json` → nothing.
Run: `npm ls js-tiktoken` → shows `js-tiktoken@1.0.21`.

- [ ] **Step 3: Sanity-check the js-tiktoken path is WASM-free**

Run: `grep -rl wasm node_modules/js-tiktoken node_modules/base64-js || echo "no wasm in the tiktoken dep tree"`
Expected: `no wasm in the tiktoken dep tree`. (The authoritative `grep dist` WASM assertion runs in 0D against the built bundle; this is the dependency-level pre-check for the OpenAI path.)

- [ ] **Step 4: Write the coverage note**

Create `docs/tokenizer-coverage.md`:

```markdown
# Tokenizer Engine coverage (Phase 0B)

Engines shipped in 0B:
- **tiktoken (js-tiktoken 1.0.21, pure JS):** exact OpenAI counts, per-encoding (o200k/cl100k/p50k/r50k).
  OpenAI ships as `exact_unverified` until the spot-check (Task 8) promotes it to `exact`.
- **heuristic (versioned, Claude uplift):** Claude (Option A) and closed models — `estimate`.
- **transformers (open families):** RESOLVED but the adapter is NOT registered in 0B. Open families
  degrade honestly to the heuristic with an `estimate` badge and `flagForReview: true`. `listFlaggedFamilies`
  reports the maintenance list.

Deferred to Phase 0D (build/CSP/Playwright infra): the Transformers.js adapter + self-hosted tokenizer
assets + redistribution license check, the `grep -r wasm dist/` WASM-free build assertion, the zero-egress
Playwright test, the IndexedDB staleness cache, and the pre-demo tokenizer-URL 200 pre-flight. Until then,
open-family badges are `estimate`, stated as such — never `exact` without a passed spot-check.

Coverage is a projection until 0D lands the open-family tokenizers; the shipped tool computes the live
badge split from the resolver and stamps it with the snapshot version. Never a single "measured" number.
```

- [ ] **Step 5: Commit**

```bash
git add docs/tokenizer-coverage.md
git commit -m "docs: Phase 0B tokenizer coverage note and 0D deferral list"
```

---

## Self-Review

**Spec coverage (§5.2 Tokenizer Engine):**
- Resolver table (not regex), ordered/tested, per-encoding OpenAI, unknown→flagForReview → Task 2. ✓
- Engines tiktoken / Transformers.js / heuristic → tiktoken (Task 4), heuristic (Task 3/6), transformers (resolved Task 2, adapter deferred to 0D per the scope decision). ✓ (partial by design)
- Badge gating (I7): exact earned via spot-check; exact_unverified default → Task 8 + dispatcher (Task 7). ✓
- Message/tool framing: message overhead Exact, tool overhead Approx → Task 5. ✓
- Claude estimate with versioned uplift + drift note → Task 3. ✓
- Worker → Task 9 (pure handler; browser E2E deferred to Playwright per scope). ✓
- Loading/privacy/licensing (Transformers.js allowLocalModels, tokenizer-only subpath, self-host, WASM-free dist, egress test, IndexedDB, license check) → DEFERRED to 0D (scope decision). ✓ (tracked)
- Failure mode → heuristic + Estimate + flag → dispatcher (Task 7). ✓

**Testing strategy (§8 tokenizer):** resolver tests (airoboros→Llama, gpt-4→cl100k, gpt-4o→o200k, unknown→flagForReview) → Task 2 ✓; per-family spot-check gating Exact → Task 8 ✓; egress + WASM-free dist assertions → 0D (Task 10 does the dep-level pre-check) ✓ (tracked).

**Placeholder scan:** none. The transformers adapter is not a stub — it is genuinely absent, and the dispatcher's heuristic degradation is real, tested behavior (Task 7). `PER_MESSAGE_TOKENS`/`PRIMING_TOKENS`/`CLAUDE_UPLIFT` are cited, versioned constants, not TODOs.

**Type consistency:** `TokenizerResolution`/`TokenCount`/`TokenizerAdapter`/`SpotCheckCase`/`SpotCheckResult` are defined once (Task 1) and imported everywhere. `countTokens` returns `TokenCount` (Task 7) consumed by `handleTokenizeMessage` (Task 9). `resolveTokenizer` (Task 2) is consumed by the dispatcher (Task 7) and spot-check test (Task 8). `tiktokenCount`/`messageWrapOverhead` names match across Tasks 4, 5, 8.

## Execution Handoff

Phase 0B of the Phase-0 foundation. After it lands, Phase 0C (Caching + Cost Core) consumes the token counts; Phase 0D registers the Transformers.js adapter and adds the WASM-free/egress/CSP infra plus the ESLint flat-config migration. `main` stays untouched until the final go-live PR.
