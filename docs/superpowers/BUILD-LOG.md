# TokenTally Autonomous Build Log

Single source of truth for the autonomous build. Updated at the end of every work turn.
If context is compacted, resume by reading this file top to bottom, then continue from **Next action**.

## Mission

Carry TokenTally from the approved design (spec v1.2.1) to done, secure, and live, per the
owner's autonomous mandate (2026-07-03). Repeat this loop for every phase and sub-phase:

1. Write/refine the phase plan (from the spec).
2. Adversarial premortem the plan; fix all findings.
3. Implement test-first (TDD), commit per green test.
4. Lint + typecheck + full test suite green.
5. Security review + code review; fix findings.
6. PR to main, merge on green, delete the branch.
7. Update this log with status, decisions, and lessons.

End state: full app (as far as rigorously reached, §13 cut line first), headed Playwright E2E over
every function, appsec hardened, deployed (preview always; production if credentials allow),
all phase branches deleted.

## Contract (honesty)

- No faked completion. This log states done-and-verified vs in-progress vs blocked.
- Production "live" may require the owner's Vercel credentials; preview deploys and a verified
  deployable state are always achievable. The exact remaining step is flagged if blocked.
- Priority under time pressure follows spec §13: minimum lovable demo first
  (Chatbot + Agent + badges + warm-cache + one viz + enforced CSP), then expand.
- When a real fork appears: `adversarial-premortem-single` the recommendation, take the best path,
  never stop to ask (owner is away and is sole decider).

## Orchestration policy

- **Branching (push-to-main = PRODUCTION deploy, so main is protected until the end):**
  `main` stays the live MVP, untouched, until the single final go-live PR.
  `feat/realtime-determinism-engine` is the long-lived **integration branch** (preview-deploys on push).
  Per phase: `feat/phase-<id>-<name>` off the integration branch. PR into the integration branch, merge,
  delete. One final PR integration → `main` flips production, only when the app is done + verified.
  Never force-push. Never `git add .` (untracked Serena/claudedocs clutter stays out).
- **Always-green constraint:** build the new engine as NEW modules (`src/registry`, `src/tokenizer`,
  `src/engine`, `src/types/registry.ts`) alongside the old app. Do not touch the old `pricingData.ts`,
  `costCalculator.ts`, `types/index.ts`, or components until Phase 2 rewires the UI. This keeps
  `npm run build` green and every preview deployable throughout the rebuild.
- **Premortem policy:** full 6-perspective premortem for specs and sub-specs; focused 4-5 perspective
  premortem for mechanical TDD plans, logging any skipped perspective (per the skill). Appsec lens is
  never skipped (web-facing app).
- **Context management:** offload heavy implementation and exploration to subagents/workflows that
  return summaries; keep this orchestrator's context lean. Raw premortem dumps are distilled into the
  Lessons and Findings sections here, then dropped. Durable state lives in files, not in context.
- **Quality gates per phase:** `tsc --noEmit` clean, ESLint clean, full Vitest suite green with zero
  skipped tests, security review clean, before merge.
- **Loop mechanism:** background subagents/workflows re-invoke the orchestrator on completion;
  a ScheduleWakeup fallback covers idle gaps.

## Deploy mechanism (confirmed 2026-07-03)

Vercel **native Git integration** (no committed workflow). Push any branch → Vercel preview build;
push/merge `main` → production. `vercel.json` drives it (framework vite, `npm run build`, output `dist`).
CodeQL runs via GitHub default setup (scheduled on `main`, and on PRs to `main`). Implication: preview
URLs come from pushing the integration/phase branches; the final integration→main PR is the go-live and
the CodeQL gate. Push at phase boundaries (backup + preview), not every commit.

## Node/toolchain note

Env runs Node 24.10.0; `.nvmrc` pins 20.11.0 (stale). Decision: align to Node 24 (Vercel current
default) in Phase 0D via `.nvmrc`, `package.json` engines, and CI. Vite 6 + Vitest 2 run on both.

## Phase status

| Phase | Scope | Plan | Premortem | Impl | Merged | State |
|-------|-------|------|-----------|------|--------|-------|
| Design | Spec v1.2.1 | - | 2 rounds done | - | pending | DONE (docs) |
| 0A | Test harness + types + Registry | written+amended | done (A1-A12) + review (6 fixed) | Tasks 1-12 + fixes (84 tests) | **YES (PR #5, 28b0f9a)** | **DONE** |
| 0B | Tokenizer Engine | written+amended (B1-B15) | done (premortem 31 + review 6, all fixed) | Tasks 1-10 + review fixes (141 tests) | **YES (PR #6, 9e8780c)** | **DONE** |
| 0C | Caching + Cost Core | written+amended (C1-C16) | done (6-perspective, 38 findings, 1 CRITICAL) | - | - | IN PROGRESS (implementing) |
| 0D | Deploy/security infra (CSP, CI, pins, size-limit, refresh Action, **ESLint flat-config migration**, Transformers.js adapter + self-host + license-check + WASM-free dist grep + egress Playwright + IndexedDB, tokenizer-chunk size-limit + dynamic rank import, Dependabot-vuln remediation, real Exact-usage capture w/ owner key, Approx-before-demo gate) | not written | - | - | - | QUEUED |
| 1 | Workloads + Optimization + Denial of Wallet | not written | - | - | - | QUEUED |
| 2 | UI + dataviz (light/dark, command palette) | not written | - | - | - | QUEUED |
| 3 | Workflow (permalink, import, saved, examples, exports) | not written | - | - | - | QUEUED |
| 4 | Hardening: E2E, appsec audit, a11y, load, live deploy | not written | - | - | - | QUEUED |

## Decision log

- 2026-07-03: Tokenizer Option A (local estimate for Claude), all-local tiered. [spec D3/D4]
- 2026-07-03: Registry keyed on (canonical model, deployment). [spec D9]
- 2026-07-03: Sole decider = owner; F1 owner/presenter residual explicitly accepted. [spec §13]
- 2026-07-03: Phase 0 decomposed into 0A-0D (independently testable). [plan scope check]
- 2026-07-04: **0C: spec §5.3 W2 break-even formula is WRONG; implementation uses the corrected one.** The spec's
  `p_warm/(1-p_warm) = cacheWrite/(input-cacheRead)` treats the cache-write cost as an ADD-ON to base input, but
  Anthropic bills a cache write INSTEAD OF base input for those tokens (cold=cacheWrite, warm=cacheRead, no-cache=input).
  Correct break-even: `p* = (cacheWrite-input)/(cacheWrite-cacheRead)` = 0.2174 (λ*≈2118/mo), NOT 0.5814 (λ*≈7524).
  Verified numerically (at p=0.30 the cache path 2.715 < no-cache 3.0, so caching already saves — the spec's 0.581
  would wrongly tell users NOT to cache). The frozen spec is NOT edited; the implementation and the §12 break-even use
  the corrected formula. Caught by the 0C premortem (5 of 6 perspectives, CRITICAL). [premortem C1, §13 correctness floor]
- 2026-07-04: **0B: encoding comes from js-tiktoken's `getEncodingNameForModel` oracle, not a hand-rolled table.**
  Probe-verified: the oracle returns the correct encoding for every known OpenAI id (babbage-002->r50k, gpt-4.5->o200k,
  davinci-002->p50k, gpt-4->cl100k) and THROWS "Unknown model" on novel/prefixed ids — its rejection is the flagForReview
  signal. Eliminates the hand-rolled-map drift bug class. [premortem B2, empirically verified]
- 2026-07-04: **0B: no Exact badge at launch without real provider ground truth.** The spot-check fixture cannot be
  fabricated (a circular tiktoken-vs-tiktoken gate). OpenAI ships `exact_unverified`; real Exact promotion needs a
  provenance-carrying `usage` capture done OUT OF BAND with the owner's OpenAI/Anthropic API key (owner action, tracked
  follow-up — NOT blocking 0B). [premortem B1]
- 2026-07-04: **0B scope (B15): Approx badge deferred with Transformers.js -> dated 0D-before-demo gate.** 0B ships ~13%
  Exact-class / 0% Approx / 87% Estimate, NOT the spec's projected 67/15/18. Before the demo, either pull one Gemma
  tokenizer forward (so Gemini shows Approx) OR amend the §13 cut line to OpenAI-Exact-class + Estimate-only and correct
  copy. Owner decision at the checkpoint; do not silently ship a demo that violates the cut-line badge floor. [premortem B15]
- 2026-07-03: **ESLint deferred to 0D.** ESLint 9.39 is installed but the repo has only a legacy
  `.eslintrc.json` (no flat `eslint.config.js`), and the installed plugins (eslint-plugin-security 3.0.1
  etc.) ship flat-only configs that the legacy validator rejects even under `ESLINT_USE_FLAT_CONFIG=false`.
  So `npm run lint` is broken on main already, and restoring it is a repo-wide flat-config migration =
  0D infra. Premortem (single, proportionate): strongest risk is deferring a security control (eslint-
  plugin-security) on a web-facing app; compensated because 0A is pure data-normalization (no DOM/network/
  user-regex), its real security surface (proto-pollution A7, price sanity A4, id sanitization, supply-chain
  hash) is handled in code AND independently reviewed now, and a banned-pattern grep on the 0A diff is clean
  (only a legitimate console.log in the build-script CLI). CONSTRAINT: 0D must restore ESLint BEFORE Phase 2
  (first DOM/injection surface). [genuine fork, evidence-backed]

## Lessons carried forward (updated as phases complete)

- Verify every external claim against the real artifact before building on it (premortem repeatedly
  caught projected-as-measured numbers, missing schema fields, absent CSP). Coverage is a projection,
  never "measured."
- The real TokenCost schema has: per-token AND per-character/per-second/DBU billing units; seven cache
  field names; 128k AND 200k tiers; reasoning-token rate; duplicate/prefixed keys with divergent prices;
  free/preview 0-priced models worth keeping. 0A's registry handles all of these.
- `js-tiktoken` and Transformers.js *tokenization* are pure JS (no WASM), so a strict CSP without
  `wasm-unsafe-eval` is achievable IF the build is proven WASM-free (grep dist). Verify in 0B/0D.
- A CSP cannot be validated in jsdom; it needs a Playwright test under the served header. [C2]
- Real TokenCost tier field names are ABBREVIATED: `input_cost_per_token_above_128k_tokens` / `_above_200k_tokens`
  (and per-character variants), not the numeric `128000`. Plan Task 6 mismatched test (`128k`) vs impl (`128000`);
  fixed in parseTiers. When planning, keep test fixtures and impl field-name construction consistent with the real schema.
- A dispatched implementation subagent committed a task while its tests were RED (parseTiers). ALWAYS run the full
  suite + `tsc --noEmit` after a subagent implementation and BEFORE trusting/merging its commits. Add a mandatory
  green-verification gate after every subagent implementation phase.
- Tasks 7-12 were implemented inline (not delegated) because they are sequential (each appends to normalize.ts),
  amendment-laden, and high-judgment; TDD red->green per test with a full-suite+tsc gate after each caught nothing
  regressing. The build script (`scripts/registry/buildRegistry.ts`) is NOT in any tsconfig `include` (root tsconfig
  is src-only; test files are excluded too), so `tsc --noEmit` does not typecheck it — verified it separately via a
  throwaway `tsconfig.verify-scripts.json` (extends root, includes scripts+src, types:[node]) = clean. 0D's CI should
  add a scripts typecheck permanently. Neither scripts nor *.test.ts are tsc-gated today; runtime Vitest is the net.
- Golden-fixture counting is exact and testable: a ~21-row fixture yielded 16 survivors / 3 drops / 1 ignored meta /
  1 divergent-price collision; asserting the exact counts is a strong regression tripwire. per_second/dbu survivors
  need an in-scope mode (chat) since real per_second models are usually audio (dropped by A6) — the fixture uses a
  synthetic per_second+chat row to exercise the raw-passthrough path.
- ESLint is non-functional repo-wide (flat-config migration owed to 0D; see decision log). Until then the lint gate
  is substituted by tsc-strict + tests + a banned-pattern grep + the security review.
- 0A adversarial review (3 lenses × verify, 15 agents) confirmed 6 real defects, ALL fixed before merge (commit
  e9d9e39): (1) the A7 id-firewall skipped the `provider` field (litellm_provider) — a poisoned provider could carry
  stored-XSS/proto-pollution into a record; now sanitized like id/deployment. (2) reasoning-token rate and (3) ALL
  parseTiers rates bypassed the A4 sanePrice guard — a poisoned/typo rate scaled x1e6 into a mis-bill; now guarded.
  (4) `PriceTier.inputPrice` was 0 for a cache/output-only tier (reads as free above the threshold); now nullable
  = "use base rate", mirroring outputPrice. (5+6) two false-green test gaps (dbu raw-passthrough, divergent-output
  collision) closed. LESSON: apply the price-sanity guard to EVERY price surface uniformly; sanitize EVERY DOM-bound/
  map-key field uniformly. Don't leave a secondary field (reasoning, tiers, provider) out of a guard the rest of the
  file enforces — reviewers find the one gap. The review workflow (3 parallel finders → adversarial per-finding
  verify, refute-by-default) rejected 4 non-defects (non-occurring data, covered-elsewhere) and kept only manifest ones.
- Vercel builds a preview on ANY pushed branch/PR (not just the integration branch); PR #5 into the integration branch
  got a green Vercel preview + "Vercel Agent Review" (NEUTRAL) + preview-comments checks. Production stays main-only.
  So preview coverage is broader than assumed — every phase PR is deployable-verified, not just phase boundaries.
- SUPPLY CHAIN / GO-LIVE BLOCKER: GitHub reports 10 Dependabot vulns on `main` (2 critical, 6 high, 2 moderate) as of
  2026-07-04. These are the live MVP's deps and MUST be resolved before the final integration->main go-live (QC.1: no
  high/critical vulns at release). Handle in 0D (or a dedicated dependency-hardening pass) before go-live; audit via
  `npm audit` + the Dependabot dashboard. Do NOT bump deps on `main` directly (main is frozen); fix on the integration
  line and carry through the go-live PR.

## Lessons from the 0B close-out code review (2026-07-04, 3 lenses x verify, 6 confirmed / 8 rejected)

- A "sanity bound" that compares an EXACT engine to a ROUGH heuristic is unsound: on whitespace/repetitive
  input the two legitimately diverge >4x, so the guard discarded the correct tiktoken count and returned the
  worse estimate ('-'x80: exact 1 -> 20; whitespace -> 0 with a false [0,0] band). Replaced B12 with an
  estimator-INDEPENDENT absolute upper bound (count <= chars*4). A too-low positive count cannot be caught at
  the dispatcher (repetitive text merges to few tokens) — that is the spot-check's job. Don't let a rough
  estimator veto an exact one.
- Whitespace-only input is NOT empty: collapsing /\s+/->'' produced a false-precise 0 with a zero-width band.
  Only truly-empty text is a certain 0; non-empty is >= 1 token with a real band.
- The reviewers correctly REJECTED 8 findings (a flagged id reading exact_unverified is fine — it is not
  exact; the surrogate-clamp only fires when already-flagged truncated; markFamilyExact empty-set is guarded
  by spotCheckFamily.passed). The adversarial-verify step earns its keep by killing plausible-but-wrong ones.
- Strengthen a "did it register?" test to actually INVOKE the registered callback and assert the emitted
  payload — a boolean-only assertion passes on broken glue wiring.

## Lessons from the 0B plan premortem (2026-07-04, 6 perspectives, 31 findings)

- A spot-check gate that "verifies" a tokenizer against numbers you fabricated is worse than no gate — under the
  always-green loop the cheapest fix is to backfill the fixture from the tool's own output, making Exact a
  tiktoken-vs-tiktoken tautology. NEVER author "captured provider" fixtures without real capture + provenance.
- When a pinned library already ships the mapping you need (js-tiktoken's `getEncodingNameForModel`), USE IT as the
  oracle; a hand-rolled parallel copy silently drifts (it already had babbage-002 and gpt-4.5 wrong before a line ran).
- Honesty is a TYPE-level contract: an Estimate with no `errorBand` field renders as false precision downstream and
  can't be fixed without a breaking change once 0C consumes it. Put the band on the type before building on it.
- A `typeof self.postMessage === 'function'` "am I a worker?" guard is TRUE on the main thread; node tests hide it.
  Guard on `self instanceof WorkerGlobalScope` and add a jsdom test, or the worker hijacks window.onmessage.
- The fat js-tiktoken main entry inlines all 6 rank tables (~2.58MB gz, ~230MB heap). Set the lite+rank-subpath import
  path NOW so Phase 2 doesn't inherit it; pull the size-limit gate onto the tokenizer chunk.
- Front-loading all 5 premortem layers into ONE parallel 6-perspective round (vs sequential rounds) converged well for
  a plan-sized artifact; empirically resolve any cross-perspective conflict (babbage encoding) against ground truth
  before amending. The 0B-close-out security+code review is the post-implementation adversarial pass.

## RESUME HERE (checkpoint, 2026-07-04 — Phases 0A + 0B DONE + merged, starting 0C)

State: **0A and 0B are DONE and merged** into the integration branch `feat/realtime-determinism-engine`
(0A = PR #5 / 28b0f9a; 0B = PR #6 / 9e8780c). Integration is green: 141 tests, tsc clean, build green,
Vercel previews built on both PRs. Now on branch **`feat/phase-0c-caching-cost`** (off integration).
`main` remains the untouched live MVP.

Available to 0C: the Registry (`src/registry`: getModel/getDeployments/listByMode, CacheSpec, PriceTier,
billingUnit, tiers, reasoningPerMToken) and the Tokenizer (`src/tokenizer`: countTokens -> TokenCount with
count/badge/errorBand/awaitingAdapter/truncated). Both are pure, tested, always-green modules.

Phase 0C = Caching Model + Cost Core (spec §5.3, §5.4). Scope:
- Caching Model: 3 archetypes (A automatic prefix cache no-write; B breakpoint+TTL write cost, 5min/1hr
  multipliers as cited constants; C hourly storage) via a cache-field resolver; the closed-form cross-run
  WARM cache with distinct-prefixes K, steady (p_warm=1-e^(-lambda_p*T)) and bursty (busy/idle f) profiles,
  Archetype-A best-effort as a BOUNDED RANGE, writes/month, and the NUMERICALLY-DEFINED break-even
  (p_warm/(1-p_warm) = cacheWriteRate/(inputRate-cacheReadRate)).
- Cost Core: pure TS, provider-agnostic, billing-unit-aware; normalizes by unit, applies 128k/200k tiers,
  null-output for embeddings, reasoning bar from reasoningPerMToken; composes a confidence range from the
  tokenizer errorBand (systematic bias) + input variance; emits the waterfall (prefix, cache write, cache
  reads, input, output, reasoning, context). Never coerces a non-token unit to $0.

NEXT ACTIONS (0C loop): read spec §5.3/§5.4 (+ CacheSpec/PriceTier in src/types/registry.ts); write Plan 0C
(superpowers:writing-plans, test-first, always-green new modules e.g. src/engine/caching + src/engine/cost);
adversarial premortem (full for the closed-form warmth/break-even math + cost composition; appsec lens kept);
fix findings; implement test-first (hand-verify >=3 scenarios within 1% per spec §8); security + code review;
PR -> integration (NEVER main); merge; delete; then 0D.

## RESUME HERE (superseded — Phase 0A DONE + merged, starting 0B)

State: **Phase 0A is DONE and merged.** PR #5 (`feat/phase-0a-registry` -> `feat/realtime-determinism-engine`)
merged as commit 28b0f9a; phase branch deleted (local + remote); Vercel preview built green. Integration branch
`feat/realtime-determinism-engine` now carries the full registry (84 tests, tsc clean, build green).

Now on branch **`feat/phase-0b-tokenizer`** (off integration @ 28b0f9a). Working tree clean except pre-existing
untracked clutter (.serena/*, claudedocs/*, *.docx, investigate-failures.ts, test-execution.ts) and .serena/project.yml.

Phase 0B = Tokenizer Engine. It consumes `resolveFamily`, `ModelRecord`, and the query API from 0A. Scope (from the
0A plan's deferral list + spec v1.2.1): per-family tokenizer loading (js-tiktoken for OpenAI; Transformers.js/local
for open families), a resolver table mapping TokenizerFamily -> tokenizer, a worker boundary, a WASM-free proof
(grep dist — js-tiktoken + Transformers.js tokenization are pure JS, enabling a strict CSP without wasm-unsafe-eval;
VERIFY), an egress test (no network at runtime), and the per-family Exact spot-check that promotes accuracyTier
`exact_unverified` -> `exact`. Tokenizer Option A: Claude uses a local estimate (stays `estimate`).

NEXT ACTIONS (0B loop):
1. DONE — spec read; Plan 0B written (5a4b09d); 6-perspective premortem done (31 findings); amendments B1-B15
   committed (bb4fa4d). js-tiktoken 1.0.21 API + encoding oracle probe-verified (scratchpad/0b-probe-notes.md).
2. IMPLEMENT Tasks 1-10 test-first, applying B1-B15 (amendments OVERRIDE task bodies). Full test:ci + tsc green
   after each task (and after ANY subagent work, before trusting it). Key: use `getEncodingNameForModel` oracle;
   NO fabricated fixtures (OpenAI = exact_unverified); errorBand on TokenCount; worker-global guard; lite+rank imports;
   base64-js override; split flagForReview/awaitingAdapter; input clamp; dispatcher sanity-bound + kill switch.
3. Security + code review (workflow: appsec/correctness/test-quality -> adversarial verify). Fix confirmed findings.
4. PR `feat/phase-0b-tokenizer` -> integration (NEVER main); merge on green; delete branch; push integration (preview).
5. Update this log; proceed to 0C (Caching + Cost Core), 0D (Deploy/security infra incl ESLint flat-config BEFORE
   Phase 2, Transformers.js adapter + Approx-before-demo gate, size-limit, refresh Action, dependency-vuln remediation,
   real Exact-usage capture with owner key), then Phases 1-4.

END: headed Playwright E2E over every function, appsec pass, resolve the 10 Dependabot vulns, then the SINGLE final
integration->main go-live PR (flips production), then delete all phase branches. main is untouched until that PR.
