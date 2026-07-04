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
| 0A | Test harness + types + Registry | written+amended | done (A1-A12) | Tasks 1-6 green | no | IN PROGRESS ~50% |
| 0B | Tokenizer Engine | not written | - | - | - | QUEUED |
| 0C | Caching + Cost Core | not written | - | - | - | QUEUED |
| 0D | Deploy/security infra (CSP, CI, pins, size-limit, refresh Action) | not written | - | - | - | QUEUED |
| 1 | Workloads + Optimization + Denial of Wallet | not written | - | - | - | QUEUED |
| 2 | UI + dataviz (light/dark, command palette) | not written | - | - | - | QUEUED |
| 3 | Workflow (permalink, import, saved, examples, exports) | not written | - | - | - | QUEUED |
| 4 | Hardening: E2E, appsec audit, a11y, load, live deploy | not written | - | - | - | QUEUED |

## Decision log

- 2026-07-03: Tokenizer Option A (local estimate for Claude), all-local tiered. [spec D3/D4]
- 2026-07-03: Registry keyed on (canonical model, deployment). [spec D9]
- 2026-07-03: Sole decider = owner; F1 owner/presenter residual explicitly accepted. [spec §13]
- 2026-07-03: Phase 0 decomposed into 0A-0D (independently testable). [plan scope check]

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

## RESUME HERE (clean checkpoint, 2026-07-03)

State at handoff: on branch `feat/phase-0a-registry`. Plan 0A premortem DONE (amendments A1-A12 at commit 5d4694d).
Implementation is ~50% done and GREEN: Tasks 1-6 committed (harness, types, resolveFamily, unit-aware billing/price
with sanity guard, provider-aware parseKey, unit-aware tiers) plus a field-name fix (2df0189). Verified: `npx vitest run`
= 26/26 pass, `npx tsc --noEmit` = 0 errors. Working tree is clean except pre-existing untracked clutter
(.serena/*, claudedocs/*, *.docx, investigate-failures.ts, test-execution.ts) and `.serena/project.yml` (not ours).
The background implementation subagent was STOPPED for a clean session handoff (do not expect it to be running).
The session-scoped ScheduleWakeup died with the session.

REMAINING for Phase 0A (finish these on the branch, test-first, applying the amendments):
- Task 7: `resolveCacheSpec` (A2: Gemini defaults `automatic`, add `readUnavailable`) + `classifyRow` (A6: whitelist mode to chat|completion|responses|embedding).
- Task 8: `normalizeEntry`/`normalizeCatalog` (A7: drop+count ids failing `/^[A-Za-z0-9._:@/-]+$/`; derive displayName from sanitized id; reasoning ×1e6; embedding output null).
- Task 9: `dedupeRecords` (A3: key `(canonicalId, deployment)` only; count price conflicts).
- Task 10: `buildSnapshot` + build script (A4: schema validation, `/^[0-9a-f]{40}$/` SHA assert, sha256 body hash vs EXPECTED_SNAPSHOT_SHA256, atomic write; A11: expand golden fixture to ~20 rows incl per_second/dbu/free/both-units/128k/200k-cache/reasoning/deepseek-cache-hit/supports-no-rate/dup/aggregator/image_generation-drops/sample_spec-ignored; deterministic sort by (canonicalId, deployment)). Do NOT run the network fetch; leave PINNED_COMMIT + EXPECTED_SNAPSHOT_SHA256 as placeholders; test buildSnapshot via the golden fixture only; do NOT generate registry.generated.json.
- Task 11: query API (A3: `loadRegistry` throws on a `byKey` collision).
- Task 12: `typecheck` + `test:ci` scripts (A9: `tsc --noEmit && vitest run --coverage`); A10: strip ALL remaining `^`/`~` in package.json to exact (read package-lock), `grep -E '"\^|"~' package.json` returns nothing, use `npm ci`; A12: verify single `PER_MILLION`; write docs/registry-coverage.md (projection, not measured).

THEN (0A close-out): run full `npm run test:ci` + eslint new files + `npm run build` green; security review + code review of the 0A diff; fix findings; PR `feat/phase-0a-registry` -> `feat/realtime-determinism-engine`; merge; delete the phase branch; update this log (mark 0A DONE). Proceed to write Plan 0B (Tokenizer Engine), premortem it (full 6-perspective for a sub-spec; focused for the plan), fix, implement, and continue the loop through 0C, 0D, then Phases 1-4, ending with headed Playwright E2E over every function, an appsec pass, and the single final integration->main go-live PR, then delete all phase branches.
(main is NOT touched until that final go-live. Push the integration branch at phase boundaries for preview deploys.)
