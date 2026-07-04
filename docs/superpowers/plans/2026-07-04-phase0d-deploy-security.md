# Phase 0D: Deploy + Security Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the deploy + security spine — a strict enforced CSP, a working repo-wide linter (flat config), reproducible installs (`npm ci` + exact pins + Node 24), a `size-limit` gate, a CI workflow, and dependency-vuln remediation — plus the tokenizer supply-chain proofs (WASM-free `dist`, zero-egress), so the app is deployable-secure. `main` stays the untouched live MVP; everything merges into the integration branch.

**Architecture:** Config + CI, not engine code. The strict CSP is a served Vercel header (the enforceable one), verified by a Playwright `securitypolicyviolation` test. ESLint moves to flat config so the security ruleset actually runs. CI runs typecheck + lint + tests + build + size-limit + a WASM-free `dist` grep + the egress/CSP Playwright specs, blocking on any failure. The Transformers.js adapter (0B seam) and the real Exact-usage capture are scoped honestly (see the SCOPE section).

**Tech Stack:** `eslint@9` flat config (`@eslint/js` + `@typescript-eslint/*` + `eslint-plugin-security` + react plugins — all installed except the meta package), `@playwright/test`, `size-limit` + `@size-limit/preset-app`, Vercel headers, GitHub Actions. Node 24.

## Global Constraints

- No `unsafe-eval`; `wasm-unsafe-eval` OMITTED (the build is proven WASM-free). Strict CSP with the full directive set (spec §5.9, §7).
- Dependencies exact-pinned (no `^`/`~`), committed lockfile, `npm ci` in CI and as the Vercel `installCommand`.
- CI blocks merge on ANY failing, skipped, or disabled test (spec §5.9, §8).
- `main` NOT touched. Dependency upgrades land on the integration line and carry through the single go-live PR (main is frozen).
- Honesty: the WASM-free / egress / Exact claims are TESTED, not asserted. Anything owner-gated (a real API key, live production deploy) is flagged, never faked.
- Always-green: `npm run build`, `tsc --noEmit`, and the full Vitest suite stay green throughout.

## SCOPE (authoritative — what 0D delivers vs what is environment/owner-gated)

**Delivered + locally verified (Tasks 1-7):** ESLint flat-config migration; strict CSP + hardened headers + `npm ci` in `vercel.json`; Node 24 alignment; `size-limit` gate; the CI workflow YAML (its commands each verified to pass locally); the WASM-free `dist` grep + `POLICY_REVERIFIED` staleness checks as runnable tests; dependency-vuln remediation via `npm audit` + pins/overrides.

**Environment-gated (Task 8, done if the tooling installs in the sandbox; else the spec files land and CI runs them):** the Playwright `securitypolicyviolation` CSP test and the zero-egress test — both need `@playwright/test` + browser binaries + a local static server that serves the CSP header. If browsers cannot be installed here, the spec files + the local CSP server land and are wired into CI (which has browsers), and the local run is flagged as CI-only.

**Owner/decision-gated (Task 9, NOT silently done):**
- **Transformers.js adapter + Approx-before-demo gate (B15 fork).** Registering `@huggingface/transformers` needs self-hosted tokenizer assets + a proven-WASM-free tokenizer-only subpath + license checks. If the WASM-free proof holds and one Gemma tokenizer can be self-hosted, register it so Gemini reads Approx. If not, AMEND the §13 cut line to OpenAI-Exact-class + Estimate-only and correct the public copy — decided by the premortem's `adversarial-premortem-single`, not defaulted.
- **Real Exact-usage capture** (0B B1) needs the owner's OpenAI/Anthropic API key, done OUT OF BAND. Flag it; OpenAI stays `exact_unverified` until then.
- **Production go-live** needs the owner's Vercel credentials and is the single final integration->main PR, not part of 0D.

## PREMORTEM AMENDMENTS (D1–D16, AUTHORITATIVE — read first, override the tasks below on conflict)

A six-perspective appsec-weighted premortem (2026-07-04, 37 findings) plus a live probe found real defects. Apply every amendment. **Meta-finding (drives D1–D5): 0D cannot honestly certify the CSP/WASM/egress "verified enforced" floor — the real surface (charts→inline styles, the tokenizer worker, Transformers.js runtime WASM) is Phase 2, and Vercel's live response is not testable in-sandbox. 0D SHIPS the config + partial verification and EXPLICITLY re-opens/re-verifies at the Phase-2 gate; it does NOT claim §13's floor done.**

**D1 (CRITICAL) — Do NOT declare "CSP verified enforced" or "zero egress" in 0D.** 0D ships the header + the test harness and verifies the CURRENT (tiktoken/heuristic, chart-less) surface only. The §13 floor is declared ONLY after the Phase-2/pre-go-live re-run against a representative build (worker + one chart + one export + the Transformers.js adapter) AND a live-response check. Record this as an explicit un-met-yet gate in the BUILD-LOG; never mark it done off a chart-less artifact.

**D2 (HIGH) — Single-source the CSP; verify the served header, not a hand-copy.** `serve-with-csp.mjs` PARSES the `Content-Security-Policy` (and the other security headers) out of `vercel.json` at runtime (fail if absent) and replays them — the local server and prod can never drift. Add a test asserting the served header is byte-equal to `vercel.json`'s value AND that `unsafe-inline`/`unsafe-eval`/`Report-Only` are absent (strictness, not just compatibility). A live `curl -sI <preview-url>/<deep/spa/route>` byte-compare on a REWRITTEN path is a go-live/pre-flight step (owner/CI-against-preview), recorded as pending.

**D3 (HIGH) — Decide `style-src` now: `'self' 'unsafe-inline'`, documented trade.** Recharts/html2canvas emit inline `style=` attributes that a nonce/hash cannot admit; a strict `style-src 'self'` white-screens the Phase-2 charts/export. Since `script-src` is locked to `'self'`, inline-STYLE injection is a low-severity vector — ship `style-src 'self' 'unsafe-inline'` and document the trade in `docs/cost-core-notes.md`/BUILD-LOG (spec §5.9 deviation, recorded). Set `build.assetsInlineLimit: 0` UNCONDITIONALLY in `vite.config.ts` so Vite cannot inline a font/glyph `data:` under `font-src 'self'`. The CSP test must drive a real chart render + an export (not bare first-paint), with a hard timeout so a never-firing violation listener cannot pass vacuously, and must assert the expected lazy chunks actually loaded.

**D4 (HIGH) — Make the WASM-free proof precise + runtime-gated; keep `wasm-unsafe-eval` omitted only where proven.** `assert-wasm-free.mjs` must NOT naive-grep `wasm` (false-positives on React's `wasMultiple`). Match: `/\.wasm(['")/]|$)/`, `/\bWebAssembly\s*[.(]/`, `wasm-unsafe-eval`, `application/wasm`, AND a magic-bytes scan (`00 61 73 6d`) of every emitted file incl base64/`data:` blobs. Add two unit tests (current bundle passes; a planted `foo.wasm`+`WebAssembly.instantiate` fixture fails). The static scan is a TRIPWIRE, never the gate: the real WASM-free proof is a RUNTIME assertion (Playwright fails on any `WebAssembly` construction) run against a build with the Transformers.js adapter REGISTERED and a Gemma tokenization driven through it — which is D5/Task 9. Until that runs green, the `wasm-unsafe-eval` omission is honest ONLY for the tiktoken+heuristic build ("trivially WASM-free: no WASM shipped").

**D5 (HIGH) — Egress proof must see the WORKER and the Transformers.js path.** Tokenization runs in a Web Worker; `page.route` may not see worker traffic. Assert egress at the BrowserContext layer (`context.on('request')`) or via a proxy access log showing only same-origin document/asset GETs, and additionally stub `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`EventSource` to throw. Run it against a build with the Transformers.js adapter registered + a model loaded/tokenized (the only path that can fetch). If Transformers.js is deferred (D14), scope the public claim to "tiktoken path only; Transformers.js egress proof pending."

**D6 (CRITICAL) — The CI gate must actually BLOCK on skipped/disabled tests.** `vitest run` exits 0 on skips. Add a hard guard: `vitest run --reporter=json`, fail the step if `numPendingTests/numTodoTests > 0`; a `grep -rEn '\.(skip|only|todo)\(|xit\(|describe\.skip' src tests scripts` step that exits non-zero on any hit; `--allowOnly=false`; Playwright `--forbid-only`. (Committed test files today have `.skip`? none — keep it that way.)

**D7 (HIGH) — ESLint flat config: the probe-verified working version.** (Probe confirmed the flat config LOADS.) Required for green `npm run lint`: `import globals from 'globals'` and set `globals: {...browser, ...node}` (+ `worker` for the tokenizer worker) with core `no-undef: 'off'` (tsc handles it); enable `@typescript-eslint/no-unused-vars` (`argsIgnorePattern/varsIgnorePattern: '^_'`) and disable core `no-unused-vars`/`no-redeclare`; keep `eslint-plugin-security` at ERROR on the new-engine globs (`src/engine|registry|tokenizer|types`, `scripts`) with per-site `// eslint-disable-next-line security/detect-object-injection -- validated enum/Map access` justifications (rule stays error; scope `detect-non-literal-fs-filename: 'off'` to `scripts/**` only); set `no-console: 'off'` (NOT warn) on the old-MVP override (`src/components|utils|store/**`, `src/App.tsx`, `src/main.tsx`, `src/config/**`) so `--max-warnings 0` is satisfiable without refactoring throwaway code; add a `**/*.{tsx,jsx}` block wiring `eslint-plugin-react` + `eslint-plugin-react-hooks` with `react/no-danger: 'error'` (the no-innerHTML tripwire); IGNORE `dist/coverage/node_modules/**/*.d.ts` AND the untracked debris (`test-*.ts`, `investigate-*.ts`). Delete the dead `.eslintrc.json`.

**D8 (HIGH) — `npm audit` is a blocking CI step; fix the 4 SHIPPED criticals/highs with real upgrades + a smoke test.** Probe: 4 production vulns (2 critical/1 high/1 moderate) — jsPDF (arbitrary-JS/path-traversal), dompurify, lodash (proto-pollution). Prefer REAL direct upgrades (jspdf → patched; dompurify via `npm audit fix`) over transitive overrides; use `overrides` only when no fixed release exists, each commented with the advisory id + forced version. BEFORE merging, add a minimal smoke test that actually generates a PDF and a CSV via the MVP export path (`pdfExporter`/`csvExporter`), so a forced bump that breaks output fails. Add `npm audit --audit-level=high` (review `--omit=dev` for shipped deps) as a required CI job; document any residual dev-only advisory in a reviewed allowlist with rationale. §12 zero-high/critical is re-gated on the go-live PR too.

**D9 (MEDIUM) — size-limit per-chunk, not one hollow number.** The tokenizer/engine are tree-shaken out today. Set `.size-limit.json` with (a) a TIGHT first-paint entry/index-chunk budget (the number §5.7 cares about, excluding tokenizer/registry) measured now, and (b) a SEPARATE lazy-tokenizer-chunk budget measured against a build that INCLUDES the js-tiktoken lite+rank-subpath import (per the 0B lesson). No guessed numbers — measure, then set.

**D10 (MEDIUM) — Node alignment: safe floor, no tight ceiling; Vercel Node is a runbook step.** `engines.node` = `>=22` (not `>=24 <25` — Vercel may not offer 24 and a tight ceiling hard-fails the prod build). `.nvmrc` + CI use the highest Vercel-offered LTS (verify at go-live; default 22 if unknown). Setting the Vercel Project Node version is an owner/config runbook step (recorded), since it is not code.

**D11 (MEDIUM) — HSTS without `preload` now.** Ship `Strict-Transport-Security: max-age=63072000; includeSubDomains` (NO `preload`). `preload` is a one-way apex-domain commitment; add it as an explicit owner-approved go-live step after the production domain topology is final.

**D12 (MEDIUM) — Wire the scripts typecheck; add a CSP report channel decision.** Create `tsconfig.scripts.json` (`extends` root, `include: ['scripts/**/*.ts','src/**/*.ts']`, `types:['node']`, `noEmit`), a `typecheck:scripts` script, and a distinct CI step so `buildRegistry.ts` is gated. For CSP field-visibility: run a `Content-Security-Policy-Report-Only` shadow OR document the no-report-channel trade explicitly (backend-less; a third-party collector would need a `connect-src` exception).

**D13 (MEDIUM) — Branch protection + prod-deploy gate are recorded runbook steps (settings are not code).** Record the exact `gh api -X PUT repos/:owner/:repo/branches/{main,integration}/protection` calls (require the ci.yml check) and the Vercel "wait for CI" / ignored-build-step config as an owner/admin runbook in the BUILD-LOG — CI cannot self-enforce merge/deploy blocking. Supply-chain hardening: `npm ci --ignore-scripts` where feasible, `npm audit signatures` in CI, pin GitHub Actions by commit SHA (spec §5.9).

**D14 (DECISION) — Resolve the Approx fork explicitly; do not ship contradicting §12.** Run `adversarial-premortem-single` on: pull one self-hosted Gemma tokenizer forward (register Transformers.js, prove runtime-WASM-free per D4/D5) vs AMEND the §13 cut line to OpenAI-Exact-class + Estimate-only. If amend: record a signed §12-criterion waiver in the go-live record ("Gemini-Approx NOT met; cut line amended to Estimate-only, <date>, owner"), and run a grep sweep so no copy still claims Approx. Given the in-sandbox difficulty of proving Transformers.js WASM-free, amend is the likely path — but decide it, don't default to a green grep.

**D15 (MEDIUM) — Honest-claims copy correction is on the non-negotiable floor, with a CI grep gate.** Move the "no unqualified ±5% / no '100% test coverage'" correction off cuttable Phase 4: add a CI grep gate that FAILS the build if shipped `index.html`/`README.md`/`dist` contain `±5%` or `100%` test-coverage claims without a qualifier. The owner signs the copy correction as part of go-live.

**D16 (MEDIUM) — Pricing-drift Action: build it or give it an owner + dated pre-go-live deadline.** The `POLICY_REVERIFIED` staleness test must not be a self-passing static assertion — compare `POLICY_REVERIFIED`/`snapshotDate` against a reference and fail when stale. The scheduled refresh Action (D7 pricing) is either built in 0D (cron → regenerate → per-field diff → fail/label PR over threshold → alert on own failure) or assigned an owner + a dated deadline BEFORE go-live, recorded in §13; launching without it means the accuracy claim carries an explicit staleness caveat.

## File Structure

- Create `eslint.config.js` — flat config (security rules repo-wide; strict TS rules on the new engine code).
- Modify `package.json` — fix the `lint` script (drop the removed `--ext`); add `lint`, `size-limit`, `wasm-check`, `policy-staleness` scripts; add exact-pinned devDeps; `engines.node`.
- Modify `vercel.json` — strict CSP + hardened headers + HSTS; `installCommand` -> `npm ci`.
- Modify `.nvmrc` — `24`.
- Create `.size-limit.json` — bundle budget.
- Create `.github/workflows/ci.yml` — the CI gate.
- Create `scripts/ci/assert-wasm-free.mjs` — grep `dist/` for wasm; exit non-zero on any hit.
- Create `src/engine/caching/__tests__/policyStaleness.test.ts` — `POLICY_REVERIFIED` window assertion.
- Create `tests/e2e/csp.spec.ts`, `tests/e2e/egress.spec.ts` + `tests/e2e/serve-with-csp.mjs` (Task 8, env-gated).
- Modify `tsconfig` / add `tsconfig.scripts.json` — typecheck the build scripts (currently untyped-checked).

---

### Task 1: ESLint flat-config migration (restores the repo-wide security linter)

**Problem:** `npm run lint` is broken (eslint 9 needs flat config; the repo has only a legacy `.eslintrc.json`, and the installed `eslint-plugin-security` ships a flat-only config the legacy validator rejects). The `lint` script also passes the removed `--ext` flag. Running the config repo-wide will surface pre-existing violations in the OLD MVP code (being rewritten in Phase 2) — do NOT mass-refactor it; apply the SECURITY rules repo-wide (error) and the strict TS/style rules only to the NEW engine code (`src/engine`, `src/registry`, `src/tokenizer`, `scripts`), with the old MVP under a relaxed set, so lint is green and the security floor is enforced everywhere.

- [ ] **Step 1:** Confirm the break: `npm run lint` errors ("couldn't find eslint.config").
- [ ] **Step 2:** Create `eslint.config.js` (flat):

```js
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import security from 'eslint-plugin-security';

const securityRules = {
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-script-url': 'error',
  ...security.configs.recommended.rules,
};

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts'] },
  js.configs.recommended,
  // Security floor: every TS/JS file in the repo.
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
    plugins: { '@typescript-eslint': tsPlugin, security },
    rules: { ...securityRules, 'no-console': ['warn', { allow: ['warn', 'error'] }] },
  },
  // Strict TS rules only on the NEW engine code (the old MVP is rewritten in Phase 2).
  {
    files: ['src/engine/**/*.ts', 'src/registry/**/*.ts', 'src/tokenizer/**/*.ts', 'src/types/**/*.ts'],
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // Build scripts legitimately log to stdout.
  { files: ['scripts/**/*.ts', 'scripts/**/*.mjs'], rules: { 'no-console': 'off' } },
];
```

- [ ] **Step 3:** Fix the `package.json` `lint` script: `"lint": "eslint . --report-unused-disable-directives --max-warnings 0"` (drop `--ext`). Add `typescript-eslint`? No — the manual plugin+parser wiring above avoids the meta package.
- [ ] **Step 4:** Run `npm run lint`. Fix any violation IN THE NEW ENGINE CODE (there should be few/none — the banned-pattern grep was clean). If the OLD MVP throws violations, verify they are confined to old files and relax those rule blocks (or add the old paths to a warn-only override) — do NOT refactor MVP logic. Iterate until `npm run lint` exits 0.
- [ ] **Step 5:** Delete the dead `.eslintrc.json` (superseded). Commit `chore: migrate to eslint flat config, restore repo-wide security lint`.

---

### Task 2: Strict CSP + hardened headers + npm ci (vercel.json)

- [ ] **Step 1:** Replace the `X-XSS-Protection` value `1; mode=block` with `0` (spec §5.9 — the legacy XSS auditor is harmful). Change `installCommand` to `npm ci`.
- [ ] **Step 2:** Add the CSP + HSTS headers to the `/(.*)` block:

```jsonc
{ "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; manifest-src 'self'" },
{ "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
```

No `unsafe-eval`, no `unsafe-inline`, no `wasm-unsafe-eval` (proven WASM-free). If Vite's inlined styles/scripts violate `style-src 'self'`, set `build.assetsInlineLimit: 0` in `vite.config.ts` and confirm no inline `<style>`/`<script>` at runtime (the Playwright test in Task 8 is the proof).
- [ ] **Step 3:** `npm run build`; grep `dist/index.html` for inline `style=`/`<style>`/`onclick` handlers that would need `unsafe-inline`. If found, resolve (Vite config) so the strict CSP holds.
- [ ] **Step 4:** Commit `feat: strict enforced CSP, HSTS, npm ci, X-XSS-Protection 0`.

---

### Task 3: Node 24 alignment

- [ ] `.nvmrc` -> `24`. Add `"engines": { "node": ">=24 <25" }` to `package.json`. Confirm `npm run build` + tests pass on Node 24 (the env is already 24.10). Commit `chore: align toolchain to Node 24`.

---

### Task 4: size-limit gate

- [ ] Install exact `size-limit` + `@size-limit/preset-app`. Create `.size-limit.json` targeting `dist/assets/*.js` with a budget set ~10% above the freshly-measured current gz size (measure first, then set — no guessed number). Add `"size": "size-limit"` script. Run it green. Commit `chore: add size-limit bundle gate against a measured baseline`.

---

### Task 5: CI workflow (GitHub Actions)

- [ ] Create `.github/workflows/ci.yml`: on PR to any branch + push to the integration branch; Node 24; `npm ci`; then `npm run typecheck`, `npm run lint`, `npm run test:ci`, `npm run build`, `npm run size`, `node scripts/ci/assert-wasm-free.mjs`, and (if Task 8 lands) the Playwright specs. Every step must pass; the job fails on any error. Verify EACH command passes locally before committing. Commit `ci: add GitHub Actions gate (typecheck/lint/test/build/size/wasm-free)`.

---

### Task 6: WASM-free dist assertion + POLICY_REVERIFIED staleness

- [ ] Create `scripts/ci/assert-wasm-free.mjs`: after build, recursively read `dist/`; if any file contains `.wasm` refs or `WebAssembly`/`wasm-unsafe-eval`, print the offenders and `process.exit(1)`; else exit 0. (Currently trivially clean — the tokenizer is tree-shaken out; this guards the future Transformers.js wiring.)
- [ ] Create `src/engine/caching/__tests__/policyStaleness.test.ts`: assert `POLICY_REVERIFIED` is a valid ISO date and (as a soft gate) within a documented window of a fixed reference; the CI staleness comparison against the registry snapshot date lands with the refresh Action. Commit `ci: add WASM-free dist assertion and policy-staleness test`.

---

### Task 7: Dependency-vuln remediation

- [ ] Run `npm audit --omit=dev` and `npm audit` on the integration branch deps. For each high/critical: pin/override to a fixed version or upgrade (exact pins only; NOT on main). Re-run until `npm audit` reports 0 high/critical (spec §12). Document residual moderates with rationale. Commit `fix: remediate high/critical dependency vulnerabilities (exact pins/overrides)`.

---

### Task 8 (env-gated): Playwright CSP + egress tests

- [ ] Install exact `@playwright/test`; `npx playwright install chromium` (if the sandbox permits the browser download). Create `tests/e2e/serve-with-csp.mjs` (a tiny static server that serves `dist/` WITH the exact `vercel.json` CSP header), `tests/e2e/csp.spec.ts` (loads the app, listens for `securitypolicyviolation`, FAILS on any), and `tests/e2e/egress.spec.ts` (blocks all network via route interception except same-origin document/asset loads; drives a tokenization; asserts zero disallowed requests). If browsers cannot install here, land the spec files + server and wire them into CI (which has browsers); flag the local run as CI-only in the BUILD-LOG. Commit `test: add served-CSP securitypolicyviolation + zero-egress Playwright specs`.

---

### Task 9 (decision-gated): Transformers.js / Approx + Exact-capture flags

- [ ] Run `adversarial-premortem-single` on the recommendation for the B15 Approx fork (pull one self-hosted Gemma tokenizer forward vs amend the §13 cut line to OpenAI-Exact-class + Estimate-only). Take the best path; if amending the cut line, update the spec's cut-line note (implementation record, not editing the frozen spec) + `docs/tokenizer-coverage.md` + any public copy. If registering Transformers.js, prove the tokenizer-only subpath is WASM-free (Task 6 grep) and license-check the asset before shipping.
- [ ] Record the real-Exact-capture as an explicit owner action (needs an API key) in the BUILD-LOG; do NOT fabricate a fixture.

---

### Task 10: Close-out gate

- [ ] `npm run lint` + `npm run typecheck` + `npm run test:ci` + `npm run build` + `npm run size` + `node scripts/ci/assert-wasm-free.mjs` all green locally. Security + code review of the 0D diff. PR into the integration branch; merge on green; delete. Update the BUILD-LOG.

---

## Self-Review

**Spec coverage (§5.9/§7):** full CSP directive set + HSTS + X-XSS-Protection 0 -> Task 2 ✓; `npm ci` + exact pins -> Tasks 2/7 ✓; CI blocking gate -> Task 5 ✓; size-limit -> Task 4 ✓; WASM-free dist -> Task 6 ✓; egress test -> Task 8 ✓; CSP Playwright test -> Task 8 ✓; refresh Action / POLICY staleness -> Task 6 (staleness) + flagged (Action) ✓; self-hosted tokenizers + license check + IndexedDB -> Task 9 (decision-gated) ✓; ESLint (the 0A-deferred blocker) -> Task 1 ✓; Node 24 -> Task 3 ✓; dependency remediation -> Task 7 ✓.

**Honest gating:** the Playwright browser install, the Transformers.js/Approx decision, the real Exact capture, and production go-live are environment/owner-gated and explicitly scoped, not faked.

## Execution Handoff

Phase 0D closes Phase 0. After it lands, Phase 1 builds the four workloads + optimization on the engine; Phase 2 wires the UI (and the ESLint config must already be green so DOM code is linted); the final integration->main PR is the go-live.
