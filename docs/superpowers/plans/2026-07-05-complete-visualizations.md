# Complete Visualizations + Interactive Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four visualizations the Phase 2 UI plan (§2D) specified but never built (cache-warmth curve, cost-vs-context scatter, blast-radius radial, token stream), and replace the broken native-`title` hover with real interactive tooltips on every chart.

**Architecture:** Follow the §2D hybrid split verbatim. recharts 2.15.4 (lazy, its own `charts` chunk, never in first-paint) renders warmth-curve / scatter / step / blast-radius, each with recharts' built-in `<Tooltip>`. Hand-rolled SVG/DOM stays for waterfall / tornado / token-stream, and those get a new CSP-safe `ChartTooltip` (visible on hover AND focus, immediate, styled) that replaces `title`. The two curve charts get their series from UI-side sweeps that re-invoke the existing `runForecast` at varied inputs (no engine-core changes); blast-radius reads the DoW result; token-stream needs a small tokenizer→worker→store change to expose per-token segments.

**Tech Stack:** React 18.3.1 + TS 5.6 strict, Zustand 4.5, Vite 7 (worker ES modules + manualChunks), recharts 2.15.4 (lazy), Vitest + Testing Library + Playwright (headed, in-sandbox), @axe-core/playwright.

## Global Constraints

- **CSP (verbatim, `vercel.json`):** `script-src 'self'` (NO `unsafe-eval` — recharts must not `eval`/`new Function` at runtime), `style-src 'self' 'unsafe-inline'` (inline style attributes OK), `connect-src 'self'`, `img-src 'self' data:`. Every new chart must render with zero `securitypolicyviolation`.
- **First-paint gate is sacred (P1-A25):** No first-paint module may top-level-import recharts or the new chart components. recharts is reached ONLY through a `React.lazy` barrel. `npm run first-paint-check` and the 16 KB `index-*.js` size budget must stay green.
- **manualChunks:** `recharts` (and `victory-vendor`, `d3-*`, `react-smooth`) → one `charts` chunk. Add a `charts` budget to `.size-limit.json` (recharts is ~95 KB gzipped; set the ceiling at a freshly measured baseline + small margin).
- **a11y:** every chart is `role="img"` + `aria-label` + a visually-hidden `<table>` data equivalent (the `vizA11y` wrapper); recharts SVG marked `aria-hidden`. axe (serious/critical, light + dark) stays clean. WCAG AA: chartTheme series colors ≥ 3:1 vs both theme backgrounds, colorblind-safe, never hue-only.
- **Never a silent $0:** unmodeled / disabled / non-applicable states render honest text, never fake geometry (a warmth curve for a no-cache model, a blast-radius for a disabled DoW, etc.).
- **Copy/quality:** American English, active voice, NO em dashes, no AI-slop phrasing, no AI attribution in commits/PRs (git author stays human). Comment the *why*.
- **Money/format:** reuse `money`/`moneyPrecise` from `src/ui/format.ts`. New per-element hover copy lives in `format.ts` next to `waterfallHelp`/`factorHelp`.
- **Gates every task:** `npx tsc --noEmit` AND `npx tsc -p tsconfig.tests.json` both clean; `npm run lint`; `npm run build`; affected vitest + playwright green; `npm run size` + `npm run first-paint-check` green.

---

## File Structure

- `vite.config.ts` (modify) — `manualChunks`: recharts family → `charts`.
- `.size-limit.json` (modify) — add the `charts` chunk budget.
- `src/ui/charts/chartTheme.ts` (create) — CSP-safe, colorblind-safe, AA-contrast series palette + recharts tooltip style object, read from CSS custom-property tokens at call time (so it tracks light/dark).
- `src/viz/vizA11y.tsx` (create) — `VizFigure` wrapper: `role="img"` + `aria-label` + visually-hidden `<table>` from `{columns, rows}`. (This is the re-introduction of the deleted helper, but now wrapping charts that ARE visible; the SVG is decorative, the table is the text alternative.)
- `src/viz/chartsLazy.tsx` (create) — `React.lazy` barrel exporting `CacheWarmthCurveLazy`, `CostVsContextScatterLazy`, `BlastRadiusRadialLazy`, `StepAccumulationChartLazy`. This is the ONLY module that imports the recharts chart components; ResultDisplay imports the lazy barrel.
- `src/ui/ChartTooltip.tsx` (create) — reusable interactive tooltip for hand-rolled charts (waterfall/tornado/token-stream). Renders a positioned bubble on hover/focus of a target; CSP-safe (React state + inline-style position).
- `src/viz/CacheWarmthCurve.tsx` (create) — recharts.
- `src/viz/CostVsContextScatter.tsx` (create) — recharts.
- `src/viz/BlastRadiusRadial.tsx` (create) — recharts.
- `src/viz/StepAccumulationChart.tsx` (rewrite) — recharts LineChart (fixes the "hover anywhere on the line" complaint).
- `src/viz/CostWaterfall.tsx` (modify) — swap `title` → `ChartTooltip`.
- `src/viz/TornadoChart.tsx` (modify) — swap `title` → `ChartTooltip`.
- `src/viz/TokenStream.tsx` (create) — DOM spans, `textContent` only, per-token `ChartTooltip`.
- `src/store/engineClient.ts` (modify) — add `warmthCurve(...)` and `contextSweep(...)` sweep producers (re-invoke `runForecast`).
- `src/store/useAppStore.ts` + `src/store/types.ts` (modify) — carry `EngineResult` sweep series + token segments.
- `src/tokenizer/{tiktokenAdapter,worker,workerClient}.ts` + `src/hooks/useTokenizer.tsx` (modify) — expose per-token segments (opt-in, capped length) for TokenStream.
- `src/ui/ResultDisplay.tsx` (modify) — mount each chart in the right mode/context behind the lazy barrel.
- Tests: `src/viz/__tests__/*.test.tsx`, `src/store/__tests__/engineClient.test.ts`, `tests/e2e/{visualizations,tooltips,csp,a11y}.spec.ts`.

---

## Phase A — recharts infrastructure + CSP proof (must land before any recharts chart)

### Task A1: chart theme + vizA11y wrapper + manualChunks + size budget

**Files:**
- Create: `src/ui/charts/chartTheme.ts`, `src/viz/vizA11y.tsx`
- Modify: `vite.config.ts`, `.size-limit.json`
- Test: `src/viz/__tests__/vizA11y.test.tsx`

**Produces:**
- `chartTheme(): { series: string[]; axis: string; grid: string; tooltip: React.CSSProperties }` reading `getComputedStyle(document.documentElement).getPropertyValue('--...')` for the resolved theme tokens (so a single source of truth, tracks light/dark). Colorblind-safe palette pinned to existing AA tokens (`--primary`, `--brand`, `--brand-2`, `--badge-exact`, `--badge-approx`).
- `<VizFigure label figCaption columns rows children>` — `<figure role="img" aria-label={label}>` + visible `<figcaption>` + `children` (the SVG, `aria-hidden`) + a `.sr-only` `<table>` built from `columns: string[]` and `rows: (string|number)[][]`.

- [ ] Step 1: Write `vizA11y.test.tsx`: render `<VizFigure label="X" figCaption="X" columns={['A','B']} rows={[[1,2]]}><svg/></VizFigure>`; assert `getByRole('img',{name:'X'})`, a `table` with a `cell` "1", and the svg is `aria-hidden`.
- [ ] Step 2: Run it, watch it fail (module missing).
- [ ] Step 3: Implement `vizA11y.tsx` + `chartTheme.ts`.
- [ ] Step 4: `vite.config.ts` `manualChunks(id)`: if `id` matches `/recharts|victory-vendor|d3-|react-smooth|recharts-scale/` → `'charts'`. Keep the existing `react`→`vendor` rule.
- [ ] Step 5: `.size-limit.json`: add `{ "name": "recharts charts (lazy)", "path": "dist/assets/charts-*.js", "limit": "110 KB", "gzip": true }` and `scripts/ci/assert-size-globs.mjs` expects 6 budgets (bump the count). NOTE: this glob only exists once a recharts chart is actually imported (Task A2); land A1+A2 together so the build produces a `charts-*.js`.
- [ ] Step 6: Run test → pass. Commit (fold into A2's commit since the chunk needs a consumer).

### Task A2: CSP + first-paint proof with a minimal real chart (CacheWarmthCurve skeleton)

**Files:**
- Create: `src/viz/CacheWarmthCurve.tsx` (skeleton: a recharts `LineChart` over a hardcoded 2-point series, wrapped in `VizFigure`), `src/viz/chartsLazy.tsx`
- Modify: `src/ui/ResultDisplay.tsx` (mount `<Suspense><CacheWarmthCurveLazy .../></Suspense>` in chatbot only, temporarily with skeleton data)
- Test: `tests/e2e/csp.spec.ts` (extend), `tests/e2e/visualizations.spec.ts` (extend)

**Interfaces:**
- Produces: `CacheWarmthCurveLazy = lazy(() => import('@/viz/CacheWarmthCurve').then(m => ({ default: m.CacheWarmthCurve })))`.

- [ ] Step 1: Extend `csp.spec.ts`: after switching to chatbot and waiting for the forecast, wait for the recharts svg (`figure[role=img][aria-label*="cache"] svg`) to render, THEN assert `violations(page) === []`. This is the P2-A16 live proof under `script-src 'self'`.
- [ ] Step 2: Run it, watch it fail (chart not present).
- [ ] Step 3: Implement the skeleton `CacheWarmthCurve` + `chartsLazy` barrel; mount lazily in ResultDisplay.
- [ ] Step 4: `npm run build`; `npm run first-paint-check` (must stay green — recharts NOT in index); `npm run size` (index ≤16 KB; `charts-*.js` under its budget).
- [ ] Step 5: Run csp.spec → pass (zero CSP violations with recharts live). If it FAILS with a CSP violation, STOP: recharts is not CSP-clean under `script-src 'self'`; do not proceed — reassess (this is the go/no-go gate for the whole recharts decision).
- [ ] Step 6: Commit `feat: recharts infra + CSP/first-paint proof`.

---

## Phase B — the three recharts data charts

### Task B1: warmthCurve sweep producer (engineClient)

**Files:**
- Modify: `src/store/engineClient.ts`
- Test: `src/store/__tests__/engineClient.test.ts`

**Interfaces:**
- Produces: `warmthCurve(mode: Mode, inputs: ModeInputs, model: ModelRecord, snapshotVersion: string): { arrivals: number; central: number; low: number; high: number; conservative: number }[] | null`. Returns `null` when the model does not cache (the point forecast's `cost.warmth === null`) so the UI renders honest text. Otherwise sweeps the mode's arrivals field (`conversationsPerMonth` for chatbot, `callsPerMonth` for prompt) across ~24 log-spaced points spanning [max(1, current/8), current*8], calling the existing per-mode forecast at each and collecting `centralTotal`, `confidence.low/high`, `conservativeTotal`.

- [ ] Step 1: Write a test: for a caching model + chatbot config, `warmthCurve(...)` returns a non-empty array, monotonic in arrivals, with `low <= central <= high` and `central <= conservative` at every point; for a non-caching model returns `null`.
- [ ] Step 2: Run → fail.
- [ ] Step 3: Implement. Reuse the existing mode-mapping + forecast; vary only the arrivals input via a shallow clone. Guard: skip points that throw; clamp arrivals to integers ≥1.
- [ ] Step 4: Run → pass; both tsc configs green.
- [ ] Step 5: Commit.

### Task B2: CacheWarmthCurve (real data + interactive tooltip)

**Files:**
- Rewrite: `src/viz/CacheWarmthCurve.tsx`
- Modify: `src/store/engineClient.ts` (add `warmthSeries` to the workload `EngineResult`), `src/store/types.ts`, `src/ui/ResultDisplay.tsx`
- Test: `src/viz/__tests__/charts.test.tsx`, `tests/e2e/visualizations.spec.ts`

**Interfaces:**
- Consumes: `warmthCurve(...)` from B1.
- Produces: renders a recharts `ComposedChart`: an `Area` for the [low, high] band, a `Line` for `central`, a dashed `Line`/`ReferenceLine` for `conservative`, and a `ReferenceLine x={breakEvenArrivals}` marker. recharts `<Tooltip>` shows `{arrivals, central, band, conservative}` on hover anywhere along x. `VizFigure` a11y table has columns `Arrivals/mo, Central, Low, High, Conservative`. When `warmthSeries === null`: render `<p>` honest text ("This model has no warm-cache dynamics; cost is flat per message."). Never renders for agent/crew/DoW.

- [ ] Step 1: Unit test: given a mock `warmthSeries`, `getByRole('img',{name:/cache warmth/i})` present, the a11y `table` has a row per point; given `null`, renders the honest `<p>` and no `img`.
- [ ] Step 2: Run → fail.
- [ ] Step 3: Implement; wire `warmthSeries` into `runForecast`'s workload result (compute once per recompute); mount in ResultDisplay for chatbot+prompt behind the lazy barrel.
- [ ] Step 4: E2E (`visualizations.spec.ts`): chatbot with a Claude (caching) model shows the curve `img`; a non-caching model (gpt-4o) shows the honest text, no `img`.
- [ ] Step 5: All gates (tsc×2, lint, build, size, first-paint, axe both themes on the mode showing the curve).
- [ ] Step 6: Commit.

### Task B3: contextSweep producer + CostVsContextScatter

**Files:**
- Modify: `src/store/engineClient.ts` (add `contextSweep(...)` + `contextSeries` on the result), `src/store/types.ts`
- Create: `src/viz/CostVsContextScatter.tsx`
- Modify: `src/viz/chartsLazy.tsx`, `src/ui/ResultDisplay.tsx`
- Test: `src/store/__tests__/engineClient.test.ts`, `src/viz/__tests__/charts.test.tsx`, `tests/e2e/visualizations.spec.ts`

**Interfaces:**
- Produces: `contextSweep(...)` sweeps the context driver (`contextGrowthPerTurn` chatbot / `contextGrowthPerTurn` prompt; agent/crew skip) across ~16 points [0, current*3], returning `{ context: number; central: number; truncated: boolean }[]`. `truncated` from the forecast's context-truncation flag when the swept context exceeds the model window. `CostVsContextScatter` renders a recharts `ScatterChart` (x=context tokens/turn, y=cost), a distinct marker shape/color for `truncated` points, recharts `<Tooltip>`, `VizFigure` table.

- [ ] Step 1: engineClient test: `contextSweep` returns points increasing in cost with context; marks `truncated` once context exceeds `model.contextWindow`.
- [ ] Step 2 → 6: fail → implement → scatter unit test → E2E (chatbot shows scatter `img`; truncated markers appear at extreme context) → gates → commit.

### Task B4: BlastRadiusRadial (DoW)

**Files:**
- Create: `src/viz/BlastRadiusRadial.tsx`
- Modify: `src/viz/chartsLazy.tsx`, `src/ui/ResultDisplay.tsx` (`DowResult`)
- Test: `src/viz/__tests__/charts.test.tsx`, `tests/e2e/visualizations.spec.ts`

**Interfaces:**
- Consumes: `DenialOfWalletResult` (`worstCaseMonthly`, `confidence.{low,mid,high}`, `mitigations[].{control,savedMonthly}`).
- Produces: a recharts `RadialBarChart` with concentric rings: outer = worst-case exposure, inner rings = exposure after each mitigation (`worstCaseMonthly - savedMonthly`), plus a confidence arc from `confidence.low`→`high`. recharts `<Tooltip>` per ring. HARD text fallback (no chart) when `!enabled || confidence.unmodeled || worstCaseMonthly === 0` — reuse the existing DowResult guard. The disclaimer + VDP link stay rendered before the figure (F-SEC-2/P2-A20).

- [ ] Step 1 → 6: unit test (rings present for a real result; text fallback when disabled/zero) → implement → E2E (DoW with both gates shows the radial `img`; ungated shows only the disclaimer) → axe on DoW mode both themes → gates → commit.

---

## Phase C — interactive tooltips on the hand-rolled charts + step chart

### Task C1: ChartTooltip + apply to waterfall and tornado (fixes the tornado-row complaint)

**Files:**
- Create: `src/ui/ChartTooltip.tsx`
- Modify: `src/viz/CostWaterfall.tsx`, `src/viz/TornadoChart.tsx`
- Test: `src/viz/__tests__/charts.test.tsx`, `tests/e2e/tooltips.spec.ts`

**Interfaces:**
- Produces: `<ChartTooltip content={string} children>` — wraps a hover/focus target; on `mouseenter`/`focus` shows a styled bubble (role="tooltip", `aria-describedby` wired) positioned near the target; on `mouseleave`/`blur`/Escape hides. CSP-safe: React state + inline-style `left/top` (style-src 'unsafe-inline'); no `title`. Immediate (no 1s OS delay). Reuse `HelpTip`'s hover+focus+ESC discipline (WCAG 1.4.13); this is the visible-on-a-chart-element variant.
- Waterfall/tornado rows: replace `title={...}` with `<ChartTooltip content={...}>` around the row's inner content; keep `cursor: help`.

- [ ] Step 1: E2E in `tooltips.spec.ts`: hover a tornado row → a `role="tooltip"` becomes visible (`is-open`) containing the factor's swing text; leave → hidden. (This is the exact user-reported failure; it must now pass with a VISIBLE tooltip, not a `title` attribute.)
- [ ] Step 2 → 6: unit test (ChartTooltip opens on hover/focus, closes on ESC) → implement → wire waterfall+tornado → run the E2E → gates → commit.

### Task C2: StepAccumulationChart → recharts (fixes the line-hover complaint)

**Files:**
- Rewrite: `src/viz/StepAccumulationChart.tsx` (recharts `LineChart` with dots + `<Tooltip>` that fires on hover anywhere along the line)
- Modify: `src/viz/chartsLazy.tsx`, `src/ui/ResultDisplay.tsx`
- Test: `src/viz/__tests__/charts.test.tsx`, `tests/e2e/{visualizations,tooltips,math}.spec.ts`

**Interfaces:**
- Consumes: `StepProfile[]` (unchanged: `step, inputTokens, outputTokens, cost`).
- Produces: recharts `LineChart`; `<Tooltip>` shows `Step N: moneyPrecise(cost) (in/out tokens)` for the nearest point when hovering anywhere over the plot (the fix for "hover a point on the line"). `VizFigure` table preserved (math.spec oracle E reads it). Returns null for < 2 steps.

- [ ] Step 1: Keep math.spec oracle E green (it reads the sr-only table `$0.0055`/`$0.0045`); add a tooltips.spec test that hovering the step plot shows a `Step \d+:` tooltip.
- [ ] Step 2 → 6: fail → implement (preserve the a11y table columns Step/Input tokens/Output tokens/Cost) → run math.spec + tooltips.spec + visualizations.spec → axe (agent mode) → gates → commit.

---

## Phase D — token stream (tokenizer segments)

### Task D1: expose per-token segments from the tokenizer

**Files:**
- Modify: `src/tokenizer/tiktokenAdapter.ts` (return `{count, segments?: string[]}` — decode each token id to its text piece, capped at N=400 tokens), `src/tokenizer/worker.ts`, `src/tokenizer/workerClient.ts`, `src/tokenizer/index.ts`, `src/hooks/useTokenizer.tsx`, `src/store/types.ts` (`FieldTokenCount.segments?: string[]`)
- Test: `src/tokenizer/__tests__/*.test.ts`

**Interfaces:**
- Produces: an opt-in `segments` field on the token count for the ACTIVE tokenized field, cap 400 tokens (truncate marker beyond). Exact tokenizers (js-tiktoken) yield real pieces; heuristic/Claude/open families yield `undefined` (TokenStream then shows a whitespace-word approximation with an honest "approximate" note). Never `innerHTML`; segments are plain strings rendered as text nodes.

- [ ] Step 1: test: `tokenizeExact('hello world', 'gpt-4o')` returns `segments` whose join reconstructs the input and whose length equals `count`; a heuristic model returns `segments: undefined`.
- [ ] Step 2 → 6: fail → implement (plumb through worker postMessage → workerClient → hook → store; cap length) → tests → both tsc → commit.

### Task D2: TokenStream component

**Files:**
- Create: `src/viz/TokenStream.tsx`
- Modify: `src/modes/ChatbotPanel.tsx` + `src/modes/PromptPanel.tsx` (render under the tokenized textarea) OR `src/ui/TokenizedTextArea.tsx`
- Test: `src/viz/__tests__/TokenStream.test.tsx`, `tests/e2e/{tooltips,csp}.spec.ts`

**Interfaces:**
- Consumes: `segments` from the store's active-field token count.
- Produces: a container (`aria-hidden` decorative + a textual count for SR) mapping each segment to a `<span>` whose text is the segment (never `innerHTML`), colored by index via className/CSSOM (chartTheme, not hue-only — alternate two AA-contrast tints). Each span gets a `ChartTooltip` ("token N: '<piece>'"). When `segments` is undefined: whitespace-word approximation with an "approximate, not real tokens" note. A `<script>`-containing input MUST render inert (test it).

- [ ] Step 1: test: a segment `"<script>"` renders as visible inert text (`textContent`), not an element; a 500-token input shows the truncation marker.
- [ ] Step 2 → 6: fail → implement → E2E (typing shows the stream; a token tooltip opens on hover; csp.spec: no violation with the stream live) → gates → commit.

---

## Phase E — integration, review, ship

### Task E1: full-suite + gates + a11y sweep

- [ ] Run: both tsc configs, lint, build, `npm run size`, `npm run first-paint-check`, full vitest, full playwright (incl. axe light+dark over EVERY mode now that each carries its charts). Fix any regression at root cause.
- [ ] Verify the mode→chart matrix renders and is axe-clean: chatbot/prompt {waterfall, tornado, warmth-curve|honest-text, scatter, what-if, token-stream}; agent {waterfall, tornado, step, what-if}; crew {waterfall, step}; DoW {blast-radius|honest-text}.

### Task E2: adversarial review + PR

- [ ] Adversarial code+security review of the whole diff (prototype-pollution N/A here, but: recharts CSP under load, sweep performance / infinite-loop guards, token-segment length cap / XSS via segment text, first-paint leakage, a11y table correctness). Fix confirmed findings.
- [ ] Commit BUILD-LOG update; push `feat/complete-visualizations`; open PR to main; resolve any Copilot threads; merge on green; delete branch.

---

## Self-Review

**Spec coverage (§5.7 / §2D seven visualizations):** waterfall ✅(exists), step ✅(C2 → recharts), tornado ✅(exists + C1 tooltip), cache-warmth curve ✅(B1/B2), cost-vs-context scatter ✅(B3), blast-radius radial ✅(B4), token stream ✅(D1/D2). Interactive hover on every element: recharts `<Tooltip>` (B/C2) + `ChartTooltip` (C1/D2). No gap.

**Placeholder scan:** the per-chart boilerplate references the existing hand-rolled charts as templates rather than repeating every line; the novel pieces (sweeps, chartTheme, ChartTooltip, chartsLazy, CSP/size setup, tokenizer segments) carry their contracts and key assertions. Acceptable for a plan of this size; each task is TDD with a named failing test first.

**Type consistency:** `warmthCurve`/`contextSweep` return types are consumed by B2/B3 as `warmthSeries`/`contextSeries` on the workload `EngineResult`; `segments?: string[]` added to `FieldTokenCount` and consumed by D2; `VizFigure`/`chartTheme`/`ChartTooltip`/`chartsLazy` signatures are fixed in A1/A2/C1 and reused verbatim downstream.

**Risk gates:** A2 is the hard go/no-go on recharts+CSP; if it fails the recharts decision is void and we fall back to hand-rolled (revisit with the user). B1/B3 sweeps must be bounded (fixed point counts, integer clamps, try/guard) so a recompute can never hang.
