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
| 0A | Test harness + types + Registry | written+amended | done (A1-A12) | Tasks 1-12 green (74 tests) | no | IN PROGRESS ~90% (review running) |
| 0B | Tokenizer Engine | not written | - | - | - | QUEUED |
| 0C | Caching + Cost Core | not written | - | - | - | QUEUED |
| 0D | Deploy/security infra (CSP, CI, pins, size-limit, refresh Action, **ESLint flat-config migration**) | not written | - | - | - | QUEUED |
| 1 | Workloads + Optimization + Denial of Wallet | not written | - | - | - | QUEUED |
| 2 | UI + dataviz (light/dark, command palette) | not written | - | - | - | QUEUED |
| 3 | Workflow (permalink, import, saved, examples, exports) | not written | - | - | - | QUEUED |
| 4 | Hardening: E2E, appsec audit, a11y, load, live deploy | not written | - | - | - | QUEUED |

## Decision log

- 2026-07-03: Tokenizer Option A (local estimate for Claude), all-local tiered. [spec D3/D4]
- 2026-07-03: Registry keyed on (canonical model, deployment). [spec D9]
- 2026-07-03: Sole decider = owner; F1 owner/presenter residual explicitly accepted. [spec §13]
- 2026-07-03: Phase 0 decomposed into 0A-0D (independently testable). [plan scope check]
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

## RESUME HERE (checkpoint, 2026-07-03 — Tasks 1-12 green, review running)

State: on branch `feat/phase-0a-registry`. ALL Phase 0A implementation (Tasks 1-12) is committed and GREEN.
Verified: `npm run test:ci` = 74 tests pass across 11 files (tsc --noEmit + vitest --coverage), exit 0;
registry files at 100% statement / ~90% branch coverage; `npm run build` pending final re-run. Working tree
clean except pre-existing untracked clutter (.serena/*, claudedocs/*, *.docx, investigate-failures.ts,
test-execution.ts) and `.serena/project.yml` (not ours). Integration branch `feat/realtime-determinism-engine`
exists at 5d4694d (the premortem-amendments commit); 0A is ahead by the 12-task implementation.

Tasks 7-12 landed (commits 9061b42, d105a92, 6af34a7, 038eb69, ae754c0, 2eb2539): resolveCacheSpec+classifyRow
(A2/A4/A6), normalizeEntry/normalizeCatalog (A7 id sanitization + proto-pollution drop), dedupeRecords (A3),
buildSnapshot + guarded build script (A4/A11, network NOT run, placeholders kept, no generated.json), query API
(A3 dup-key throw), CI gate + coverage note (A9/A10/A12).

IN FLIGHT: adversarial review workflow (appsec + correctness + test-quality, each finding verified) running in
background (run wf_2db63ad5-6b4). ESLint deferred to 0D (see decision log).

REMAINING for Phase 0A close-out:
1. Ingest the review workflow result; fix every CONFIRMED finding test-first; keep the suite green (full test:ci
   + tsc after each fix). Re-run `npm run build`.
2. PR `feat/phase-0a-registry` -> `feat/realtime-determinism-engine` (NEVER main); merge on green; delete the phase branch.
3. Push the integration branch (backup + Vercel preview at the phase boundary).
4. Mark 0A DONE in the phase table; update lessons.

THEN: write Plan 0B (Tokenizer Engine) from spec v1.2.1; premortem (full 6-perspective for the sub-spec, focused
for the mechanical plan; appsec lens never skipped); fix findings; implement test-first; continue the loop through
0C, 0D (incl the ESLint flat-config migration BEFORE Phase 2), then Phases 1-4, ending with headed Playwright E2E
over every function, an appsec pass, and the single final integration->main go-live PR, then delete all phase branches.
(main is NOT touched until that final go-live. Push the integration branch at phase boundaries for preview deploys.)
