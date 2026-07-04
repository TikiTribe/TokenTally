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
| 0C | Caching + Cost Core | written+amended (C1-C16) | done (premortem 38 + review 11, all fixed) | Tasks 1-8 + review fixes (189 tests) | **YES (PR #7, b08760a)** | **DONE** |
| 0D | Deploy/security infra | written+amended (D1-D16) | done (6-perspective, 37 findings, 3 CRITICAL) + review (3 confirmed, all fixed) | Tasks 1-9 + review fixes (207 tests, audit 0) | **YES (PR #8, 0bdcef7)** | **DONE — PHASE 0 COMPLETE** |
| 1 | Workloads + Optimization + Denial of Wallet | written+amended (P1-A1..A30) | done (6-perspective, 40 findings) + review (2 lenses, 5 confirmed, all fixed) | Tasks 0-10 + review fixes (287 tests, tsc x3 + lint + build + audit 0 + all gates green) | **YES (PR #9, a9e632f)** | **DONE** |
| 2 | UI + dataviz (2A shell / 2B worker / 2C wiring / 2D charts / 2E a11y / 2F CSP+size) | written+amended (P2-A1..A22) | done (6-persp workflow, 18 confirmed + 14 plausible) + review (security 3 + code 3, all fixed) | 2A-2F (336 tests, 5 E2E, all gates) | **YES (PR #10 908602d + PR #11 c4d416d)** | **DONE — cut line met/exceeded; palette + 4 viz + §5.8 deferred** |
| 3 | Workflow (permalink, import, saved, examples, exports) | not written | - | - | - | IN PROGRESS (lean: exports+permalink+examples; import/saved deferred) |
| 4 | Hardening: headed E2E every function, appsec audit, load, live deploy | not written | - | - | - | QUEUED |

## Phase 0D owner runbook (D13 — settings/credentials are not code; owner actions, recorded not faked)

These CANNOT be self-enforced by CI/config and are required before/at go-live:
1. **Branch protection** (require the `ci` check + no direct pushes) on `main` AND `feat/realtime-determinism-engine`:
   `gh api -X PUT repos/TikiTribe/TokenTally/branches/main/protection` with the `ci` job as a required status check
   (and the same for the integration branch). CI provides the signal; the enforcement is a repo-admin setting.
2. **Vercel Project Node version** set to 22 (match `.nvmrc`/CI); enable "wait for CI" / an ignored-build-step so a
   red CI does not ship production.
3. **Live CSP smoke check** at go-live/preview: `curl -sI <preview-url>/<deep/spa/route>` and byte-compare the served
   `Content-Security-Policy` to `vercel.json`'s value on a REWRITTEN path (D2). Only then may "CSP verified enforced" be declared.
4. **SHA-pin the GitHub Actions** (`actions/checkout`, `actions/setup-node`) at go-live hardening (D13).
5. **Real Exact-usage capture** (0B B1): run a one-shot capture of OpenAI/Anthropic `usage.prompt_tokens` with the
   OWNER's API key, commit a provenance-carrying fixture, then `markFamilyExact`. Until then OpenAI stays `exact_unverified`.
6. **Enable Private Vulnerability Reporting** (repo Settings → Security) so the Denial-of-Wallet `DOW_VDP_URL`
   (`github.com/TikiTribe/TokenTally/security/advisories/new`) resolves for external reporters (Phase-1 security review F-3).
   The `security@rockcyber.com` backup in SECURITY.md carries the VDP if PVR is left off, but enabling PVR is the intended path.

## §12 launch-criteria waivers (owner-signed at go-live)

- **§12 "Gemini labeled Approx" — WAIVED for the initial launch (D14 decision, 2026-07-04).** The §13 cut line is
  amended to **OpenAI-Exact-class + Estimate-only**; no Approx badge ships initially. Reason: registering
  Transformers.js for open-family Approx requires a RUNTIME WASM-free proof (a static `dist` grep cannot see
  onnxruntime-web's runtime `WebAssembly.instantiate`), which is infeasible in-sandbox and would silently break the
  no-`wasm-unsafe-eval` CSP if WASM leaked. Honest alternative shipped: OpenAI real-tiktoken counts + labeled
  error-banded Estimates for everyone else, with no copy claiming Approx (guarded by the D15 grep gate). Approx is a
  tracked post-0D deliverable gated on the runtime WASM-free proof. Owner signs this waiver at go-live.

## Decision log

- 2026-07-03: Tokenizer Option A (local estimate for Claude), all-local tiered. [spec D3/D4]
- 2026-07-03: Registry keyed on (canonical model, deployment). [spec D9]
- 2026-07-03: Sole decider = owner; F1 owner/presenter residual explicitly accepted. [spec §13]
- 2026-07-03: Phase 0 decomposed into 0A-0D (independently testable). [plan scope check]
- 2026-07-04: **0D: the §13 "CSP verified enforced / zero egress" floor is NOT declared in 0D.** The real risk
  surface (charts→inline styles, the tokenizer worker, Transformers.js runtime WASM) is Phase 2, and Vercel's live
  response isn't testable in-sandbox. 0D ships the config + partial verification against the current tiktoken/chart-less
  build and EXPLICITLY re-verifies at the Phase-2/go-live gate. Certifying now against the chart-less MVP would be the
  exact dishonest-"verified" failure §13 exists to prevent. [premortem D1, appsec-core]
- 2026-07-04: **0D: `style-src 'self' 'unsafe-inline'` (documented spec §5.9 deviation).** Recharts/html2canvas emit
  inline style= attributes a nonce/hash cannot admit; strict style-src white-screens the Phase-2 charts. Since script-src
  is locked to 'self', inline-STYLE injection is low-severity. [premortem D3]
- 2026-07-04: **0D: HSTS ships WITHOUT `preload`** (one-way apex commitment, added at go-live when the domain is final);
  and the Approx-badge fork (D14) will likely AMEND the §13 cut line to OpenAI-Exact + Estimate-only (Transformers.js
  runtime-WASM-free proof is hard in-sandbox) — decided via adversarial-premortem-single, with a signed §12 waiver, not defaulted. [premortem D11/D14]
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

## Lessons from the 0C close-out code review (2026-07-04, 3 lenses x verify, 11 confirmed / 2 rejected)

- The plan-level premortem cannot catch INTEGRATION bugs; the post-implementation review is essential. It caught:
  (a) `writeRateForTtl` was built in Task 1 but never wired into `monthlyWarmCost` — the whole C6 1-hr derivation
  was DEAD CODE and hr1 scenarios silently billed the 5-min rate; (b) my C2 onset term `arrivals·(1-p)+onsets·K`
  double-counted and could push writes ABOVE total arrivals (physically impossible), making central > conservative
  and the "up to" saving NEGATIVE. Corrected: `min(arrivals, onsets·K + max(0, arrivals-onsets·K)·(1-p))`.
- Guard the RESULT of an arithmetic op, not just its inputs (rate*quantity can overflow to Infinity even when both
  are finite). Clamp NEGATIVE magnitude inputs, not only NaN/Infinity. Clamp a "saving" to >=0 defensively.
- When you build a helper for an amendment, add a test that drives it THROUGH the public entry point, not only in
  isolation — a unit-tested-but-unwired function passes its own test while the feature is broken end to end.
- Cross-perspective conflicts and arithmetic slips happen even in the reviewers: one confirmed finding had the right
  sign but wrong magnitude ($-11 vs the true $-5); the verify step recomputed and kept the real defect, dropped the bad number.

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

## Lessons from the 0D close-out review (2026-07-04, 3 findings, all confirmed + fixed)

- `build.sourcemap: true` (Vite default-on when set) ships `.js.map` files carrying full `sourcesContent`
  — the entire annotated TS source — as publicly-served, immutable-cached assets, and lets a claim in a
  source comment survive in the map after minification stripped it from the `.js`. For a security-venue
  static launch, set `sourcemap: false`. A CI copy-scanner that only reads `.js/.css/.html` never sees it.
- A copy-honesty gate is only as good as its file coverage AND its pattern coverage: the `±5%` scanner
  missed decimal (`±5.0%`) and prose (`±5 percent`) variants and skipped `.map/.svg`. Broaden both — but
  do NOT add a bare-`5%` adjacency rule; it false-positives on legitimate copy ("a 5% cache hit rate") and
  on the intentionally-scoped per-badge accuracy text. Ship a must-NOT-flag test alongside the must-flag ones.
- `security/detect-unsafe-regex` (safe-regex) flags nested quantifiers like `(?:\.0+)?` inside `\s*…\s*`;
  under `--max-warnings 0` that fails lint. Bounded `\s?` + a single-digit `(?:\.\d)?` is ReDoS-safe on the
  static CI input and satisfies the linter without a per-line disable.

## Lessons from the Phase 1 close-out review (2026-07-04, 2 lenses [security + code] x hand-verify, 5 confirmed + fixed)

- A CORRECTION that fixes one term must fix ALL correlated terms: the tier-straddle fix banded input/output but
  left the PREFIX at the mean tier, silently breaking the A11 step-reconciliation invariant it shipped alongside
  (~7.6% chart-vs-headline divergence on a cache-null tiered agent). Whenever you ship an invariant AND an
  approximation that can violate it, add a test that exercises them TOGETHER (the reconciliation test only used
  the non-tiered model; the straddle test only checked a loose lower bound). [C1]
- A clamp is only real on the path it actually reaches: A9's window clamp guarded the SCENARIO scalar but not the
  step-chart array or the straddle `accum` descriptor, so both billed tokens past the context window. And A13's
  `bounded()` covered volume inputs but not the per-turn/step COUNT and GROWTH inputs, so `turns=1e300, growth=1e200`
  overflowed to `$Infinity` (or, when contextWindow was null, `nonNeg(Infinity)=0` silently zeroed the cost). Clamp
  at the boundary AND on every derived quantity; a finite-guard on the final product that falls back to the
  engine-guarded value is the backstop. [C2, F-1, F-3]
- The engine's `nonNeg(Infinity)=0` turns an overflow into a SILENT UNDERSTATE (worse than a loud $Infinity) — the
  DoW fallback tokens hit exactly this. Route every attacker-controlled magnitude through `bounded()` (Infinity->CEIL)
  before the engine sees it, so overflow reads as "large" not "$0". [F-3]
- A gate that isn't wired into CI is decoration: the first-paint-lean script existed and passed locally but was never
  added to ci.yml. A defense you don't run is not a defense. [F-2]
- The reviewers earned their keep by HAND-verifying against the shipped fixtures (recomputing 7.272 vs 7.872) rather
  than trusting green tests — the same class of "correct-but-vacuous oracle" the 0B/0C/DS3 lessons warned about.

## Lessons from the Phase 1 plan premortem (2026-07-04, 6 perspectives one round, 40 findings, 30 amendments)

- The mean-accumulation "exact because cost is linear in tokens" claim is FALSE at a 128k/200k tier
  boundary: `effectiveInputRate` is a step function of `prefix + perArrivalInput`, so folding to the mean
  mis-prices a straddle (worked: 41.5% understatement for long-context agent/RAG). Fix = per-tier-band
  decomposition (O(tiers), not O(units) — no DoS), exact within each band. Never claim global linearity
  through a piecewise-linear rate. [P1-A7]
- The bursty warm-cache seam needs a REAL `activeFraction`: `f=1` collapses the within-burst rate to the
  monthly average and bills within-conversation turns 2+ as cold, understating caching savings ~75% at the
  SMB volumes the product sells on. Derive `f` from the burst structure (`arrivals·gapSeconds /
  SECONDS_PER_MONTH`), don't default it to 1. And pass per-prefix bursts (`conversations/K`), because the
  engine's `writesPerMonth` multiplies onsets by K. [P1-A6, P1-A10]
- A vacuous oracle ships all of the above green: every hand-verified scenario used `cache:null, tiers:[],
  per_token`, exercising none of the warm-cache/tier/reasoning/non-token paths. Write the cache-capable +
  tiered-straddle + per_character oracles FIRST as failing tests (same lesson as 0B/0C). [P1-A8]
- vitest (esbuild) ERASES type assertions and eslint can't validate them, so `as Record<string,number>`
  (TS2352) and a `noUncheckedIndexedAccess` deref (TS18048) stay invisible until the ONE `tsc` run at the
  final task. Put `npx tsc --noEmit` (base + scripts + a NEW `tsconfig.tests.json`, since tests are excluded
  from the base program) AND `npm run lint` in EVERY task's green gate. [P1-A3, P1-A4, P1-A24]
- A dual-use feature (Denial of Wallet) needs its guardrail STRUCTURAL, not decorative: a bare
  `DOW_VDP_URL='SECURITY.md'` is a dead link (no `public/`, catch-all SPA rewrite, and SECURITY.md had no
  reporting contact) — 4 of 6 perspectives converged on it. Point at the GitHub Security-Advisory URL, move
  disclaimer+VDP INTO the result payload, and refuse to enable without a resolvable VDP. Worst-case must
  include the adversarial reasoning term (o-series bill reasoning at up to 5.83× output) and must not return
  a silent `$0` for `per_second` (realtime audio — the canonical wallet-attack target). [P1-A1, A14, A15]
- Unbounded per-step loops are a client-side DoS the moment Phase 3 adds a permalink (`stepsPerRun: 1e9`
  freezes the tab). The monthly cost is O(1) via `meanAccumulated`; only the CHART array needs the loop, so
  cap+downsample it (MAX_PLOTTED_STEPS) and clamp oversized numerics (CEIL) before the engine overflows to
  `$Infinity`/`NaN%`. [P1-A12, A13]
- ESLint memory was STALE (marked broken; 0D fixed it repo-wide) — the ML-Engineer lens caught it by
  actually running eslint. Verify a "known broken" claim before trusting it; [[eslint-broken-flat-config]]
  updated to RESOLVED.

## RESUME HERE (checkpoint, 2026-07-04 — PHASES 0+1 COMPLETE; starting Phase 2 UI + dataviz)

State: **Phase 0 (engine + deploy/security) AND Phase 1 (workloads + optimization + DoW) are done and merged**
into `feat/realtime-determinism-engine`:
- 0A registry PR #5/28b0f9a · 0B tokenizer PR #6/9e8780c · 0C caching+cost PR #7/b08760a · 0D deploy/security PR #8/0bdcef7
- **1 workloads PR #9/a9e632f** — Chatbot/Prompt/Agent/Crew adapters, Optimization (candidates/tornado/budget),
  defensive Denial-of-Wallet, all on the 0C `monthlyWarmCost` seam. 30 premortem amendments + 5 review fixes.
Integration is green at **`a9e632f`**: **287 tests**, tsc (base+scripts+tests) + lint + build clean, first-paint-lean
+ honest-claims + wasm + size gates pass, `npm audit --omit=dev` 0 high+. CI passed on PR #9; Vercel preview deployed.
`main` remains the untouched live MVP; it stays frozen until the SINGLE final integration->main go-live PR after
Phases 2-4 + headed E2E + appsec.

Public engine API for Phase 2 to consume (import via DYNAMIC import() only — first-paint-lean gate enforces it):
- `@/workloads`: `chatbotForecast`/`promptForecast`/`agentForecast`/`crewForecast`, `AGENT_PRESETS`/`applyPreset`,
  `WorkloadForecast`/`StepProfile`/config types. `@/optimization`: `optimize`/`solveBudget`/`tornado`/`denialOfWallet`,
  `DOW_DISCLAIMER`/`DOW_VDP_URL`. `@/registry`: `loadRegistry`/`getModel`/`getDeployments`/`listByMode`/`getSnapshotMeta`.
  `@/tokenizer`: `countTokens`. Every forecast carries `snapshotVersion`+`formula`+`accuracyNote` for the trust surfaces.

NEXT ACTIONS (Phase 2 = UI + dataviz, spec §5.7 — refine from spec):
1. Refine the Phase 2 plan (writing-plans): the multi-mode shell (Chatbot/Prompt/Agent/Crew/DoW), real-time <100ms via
   the tokenizer worker + debounce, command palette, light/dark, WCAG AA; the dataviz set (cost waterfall, cache-warmth
   curve with the range, cost-vs-context scatter, live token visualizer as DOM TEXT NODES only, agent step-accumulation
   chart matching the engine, tornado, blast-radius radial); trust surfaces (formula + snapshotVersion links, badges,
   "data as of snapshotDate"). Wire the OLD MVP's replacement here (delete src/utils/costCalculator + old components).
2. adversarial-premortem-complete on the plan; fix ALL findings.
3. Implement test-first (Testing Library + Playwright); after any subagent code run full tests + tsc + review; PR
   feat/phase-2-ui -> integration (NEVER main); merge on green; delete branch; push integration for preview.

**ENV UPDATE (2026-07-04): Playwright browsers DO install + launch here** (`npx playwright install chromium` →
build v1194, then `chromium.launch()` works — verified). The recurring "browsers can't install in-sandbox"
assumption is FALSE. So Phase 2 MUST actually RUN the §5.9 enforced-CSP `securitypolicyviolation` test, the zero-egress
test, and the headed E2E suite — not defer them. Gotcha: the cache may hold a mismatched build (MCP's 1223 vs the
project's 1194) → `npx playwright install chromium` fixes it. See [[playwright-browsers-installable]].

Carry into every later phase (deferred, tracked honestly):
- **§13 CSP/WASM/egress runtime floor NOT yet verified** — strict CSP is in vercel.json + Playwright specs scaffolded.
  Now RUNNABLE (see ENV UPDATE): **Phase 2 runs the enforced CSP + securitypolicyviolation test + egress test** against
  a locally-served build (spec §5.9), no longer a go-live-only deferral. The Approx-badge WASM-free runtime proof
  (§12/D14) is likewise now runnable and should be re-evaluated in Phase 2.
- **Approx badge WAIVED for launch** (§12/D14): cut line = OpenAI-Exact-class + Estimate-only; Transformers.js/Gemma-Approx
  needs a runtime WASM-free proof (infeasible in-sandbox), tracked post-launch.
- **Real Exact-usage capture** (0B B1) needs the OWNER's OpenAI key (out of band) — OpenAI stays `exact_unverified`; no fabrication.
- **Phase-1 carry-forward:** render optimizer/DoW/forecast strings as DOM text nodes only (A29); the runtime kill-switch
  operator surface is a Phase-2 deliverable (A27); gate Crew + DoW behind a build-time feature flag so a §13 descope removes
  them from `dist/` (A19); enable repo Private Vulnerability Reporting so the DoW VDP link resolves (§0D runbook item 6).
- Owner runbook (branch protection, Vercel wait-for-CI/Node 22, live CSP curl, SHA-pin Actions, PVR) recorded in §0D, not faked.
Phase-1-specific carry-forward: text-node-only render contract for optimizer/DoW strings (A29, enforce in Phase 2);
runtime kill-switch operator surface is Phase 2 (A27); Crew/DoW build-time feature flag for descope is Phase 2 (A19).
END: after Phases 1-4 + headed Playwright E2E (every function) + appsec pass + vuln remediation, the SINGLE final
integration->main go-live PR flips production, then delete all phase branches.

## RESUME HERE (superseded — Phases 0A+0B DONE+merged, starting 0C)

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
