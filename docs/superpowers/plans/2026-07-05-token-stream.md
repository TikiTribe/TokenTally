# Token Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A collapsible "Show tokens" panel under each tokenized text box that renders the text as a live, colored, per-token stream (real boundaries for OpenAI, a labeled approximate stream elsewhere), as inert DOM text nodes.

**Architecture:** Expose the token pieces the tiktoken adapter already computes through the existing tokenize pipeline (adapter → countTokens → worker → workerClient → hook → store). A new `TokenStream` component renders `segments` when present (real tokens) or a client-side char-chunk approximation when null (heuristic models). A `<details>` toggle in the shared `TokenizedTextArea` reveals it.

**Tech Stack:** React 18.3.1 + TS 5.6 strict, Zustand 4.5, js-tiktoken (already in the worker), Vitest + Testing Library + Playwright. NO new dependency.

## Global Constraints

- **Security:** segment/chunk strings render ONLY as React text children — never `innerHTML`/`dangerouslySetInnerHTML`. A `<script>` in the text must render as inert visible text. Explicit test.
- **CSP:** `script-src 'self'` (no new dep, plain DOM + inline style/className, allowed by `style-src 'unsafe-inline'`). Zero new `securitypolicyviolation`.
- **First-paint:** the token stream is NOT lazy through recharts; it is plain DOM. `TokenizedTextArea` already lives inside the lazy mode panels (ChatbotPanel/PromptPanel), so it is not in the first-paint entry chunk. `npm run first-paint-check` stays green.
- **Cap:** 400 rendered spans; a `+N more tokens` marker beyond. The adapter caps segment decoding at 400 so the store never holds a huge array.
- **Copy/quality:** American English, active voice, NO em dashes, no AI attribution. Comment the *why*.
- **Gates every task:** `npx tsc --noEmit` AND `npx tsc -p tsconfig.tests.json` clean; `npm run lint`; `npm run build`; affected vitest/playwright green.

---

## File Structure

- `src/types/tokenizer.ts` (modify) — `TokenCount.segments: string[] | null`; `TokenizerAdapter.segments?(text, resolution, cap): string[]`.
- `src/tokenizer/tiktokenAdapter.ts` (modify) — `tiktokenSegments(text, encoding, cap)` + implement `segments` on the exported adapter.
- `src/tokenizer/index.ts` (modify) — `countTokens` populates `segments` (tiktoken path via the adapter; every other path `null`).
- `src/tokenizer/worker.ts` (modify) — `TokenizeResponse.segments`; `handleTokenizeMessage` passes it through.
- `src/tokenizer/workerClient.ts` (modify) — `fallback()` includes `segments`.
- `src/hooks/useTokenizer.ts` (modify) — report `segments` to the store.
- `src/store/types.ts` (modify) — `FieldTokenCount.segments: string[] | null`.
- `src/viz/TokenStream.tsx` (create) — the component.
- `src/ui/TokenizedTextArea.tsx` (modify) — the `<details>` toggle + `TokenStream`.
- `src/index.css` (modify) — `.tokenstream` styles.
- Tests: `src/tokenizer/__tests__/tiktokenAdapter.test.ts`, `src/tokenizer/__tests__/index.test.ts` (or existing), `src/viz/__tests__/TokenStream.test.tsx`, `tests/e2e/tokenstream.spec.ts`, extend `tests/e2e/csp.spec.ts`.

---

### Task 1: tiktoken segments + TokenCount.segments through countTokens

**Files:**
- Modify: `src/types/tokenizer.ts`, `src/tokenizer/tiktokenAdapter.ts`, `src/tokenizer/index.ts`
- Test: `src/tokenizer/__tests__/tiktokenAdapter.test.ts` (+ the existing countTokens test file)

**Interfaces:**
- Produces: `tiktokenSegments(text: string, encoding: TiktokenEncoding, cap: number): string[]` (decode each of the first `cap` token ids to its text piece). `TokenizerAdapter.segments?(text, resolution, cap): string[]`. `TokenCount.segments: string[] | null`.

- [ ] Step 1 — Failing test (`tiktokenAdapter.test.ts`): `tiktokenSegments('hello world', 'cl100k_base', 400)` — `join('')` equals `'hello world'`, and its length equals `tiktokenCount('hello world','cl100k_base')`. A long input (`'a '.repeat(500)`) capped at 400 returns exactly 400.
- [ ] Step 2 — Run, watch fail (function missing).
- [ ] Step 3 — Implement `tiktokenSegments`:
```ts
export function tiktokenSegments(text: string, encoding: TiktokenEncoding, cap: number): string[] {
  if (text.length === 0) return [];
  const enc = encoder(encoding);
  const ids = enc.encode(text);
  const take = Math.min(ids.length, Math.max(0, cap));
  const out: string[] = [];
  for (let i = 0; i < take; i++) out.push(enc.decode([ids[i]!]));
  return out;
}
```
Add `segments(text, resolution, cap) { if (resolution.encoding === null) return []; return tiktokenSegments(text, resolution.encoding, cap); }` to `tiktokenAdapter`. Add `segments?(...)` to the `TokenizerAdapter` interface and `segments: string[] | null` to `TokenCount`.
- [ ] Step 4 — In `countTokens` (`index.ts`), in the successful tiktoken branch add `segments: res.engine === 'tiktoken' && adapter.segments ? adapter.segments(input, res, 400) : null` to the returned object; add `segments: null` to the `degrade()` return and the two other `TokenCount` returns (the heuristic top return and any early return). Run both tsc configs.
- [ ] Step 5 — countTokens test: a tiktoken model (encoding non-null) yields `segments` whose join reconstructs the input; a heuristic model yields `segments: null`.
- [ ] Step 6 — Run, pass, commit.

### Task 2: plumb segments through the worker → store

**Files:**
- Modify: `src/tokenizer/worker.ts`, `src/tokenizer/workerClient.ts`, `src/hooks/useTokenizer.ts`, `src/store/types.ts`
- Test: `src/hooks/__tests__/useTokenizer.test.tsx`

**Interfaces:**
- Consumes: `TokenCount.segments` (Task 1).
- Produces: `TokenizeResponse.segments: string[] | null`; `FieldTokenCount.segments: string[] | null`.

- [ ] Step 1 — Failing test (`useTokenizer.test.tsx`): after a tokenize for a tiktoken model, `useAppStore.getState().tokenCounts[fieldId].segments` is a non-empty array; for a heuristic model it is `null`.
- [ ] Step 2 — Run, watch fail.
- [ ] Step 3 — `worker.ts`: add `segments: string[] | null` to `TokenizeResponse`; `handleTokenizeMessage` returns `segments: r.segments`. `workerClient.ts` `fallback`: add `segments: r.segments`. `useTokenizer.ts`: add `segments: res.segments` to the `report(...)` object. `store/types.ts`: add `segments: string[] | null` to `FieldTokenCount`.
- [ ] Step 4 — Run, pass. Both tsc configs (the ResultDisplay/csv fixtures do not build a FieldTokenCount; grep for other `FieldTokenCount` literals and add `segments: null` if any).
- [ ] Step 5 — Commit.

### Task 3: TokenStream component

**Files:**
- Create: `src/viz/TokenStream.tsx`
- Modify: `src/index.css`
- Test: `src/viz/__tests__/TokenStream.test.tsx`

**Interfaces:**
- Produces: `TokenStream(props: { text: string; count: number; segments: string[] | null; badge: string })`.

Render pieces: `const pieces = segments ?? approxChunks(text, count)` where `approxChunks` splits `text` into `count` roughly-equal char chunks (`const size = Math.max(1, Math.ceil(text.length / Math.max(1, count)))`; slice). `const approx = segments === null`. Render up to 400 pieces as `<span className="tok" data-odd={i%2}>{piece}</span>` (piece is a text child — inert). A visible summary line: `{count} tokens · {approx ? 'approximate' : badge}`. `+{count-400} more` marker when `pieces.length > 400`. A single `hovered` state (`{i, piece} | null`) set on span `onMouseEnter`/cleared on the container `onMouseLeave`; a readout line shows `token {i+1} of {count}: {piece}`. The span row is `aria-hidden` (decorative); the summary line is the accessible text.

- [ ] Step 1 — Failing test: (a) `segments=['hel','lo']` renders 2 `.tok` spans with those texts; (b) `segments=null, text='abcdefgh', count=2` renders 2 spans and the "approximate" label; (c) a piece `'<script>x</script>'` renders as text (`screen.getByText` finds it) and `container.querySelector('script')` is null; (d) 500 segments render 400 spans + a `+100 more` marker.
- [ ] Step 2 — Run, watch fail.
- [ ] Step 3 — Implement `TokenStream.tsx` + `approxChunks`; add `.tokenstream`/`.tok`/`.tok[data-odd="1"]`/`.tok--hover` CSS (two colorblind-safe AA tints, whitespace pieces shown via a faint background so they are visible).
- [ ] Step 4 — Run, pass. Both tsc.
- [ ] Step 5 — Commit.

### Task 4: wire into TokenizedTextArea

**Files:**
- Modify: `src/ui/TokenizedTextArea.tsx`
- Test: covered by Task 5 E2E (the toggle is trivial wiring); optionally a render test that the summary renders and the panel is closed by default.

- [ ] Step 1 — After the count `<span>`, add (only when `props.value.length > 0 && tc`):
```tsx
<details className="tokenstream">
  <summary>Show tokens ({tc.count.toLocaleString()})</summary>
  <TokenStream text={props.value} count={tc.count} segments={tc.segments} badge={tc.badge} />
</details>
```
Import `TokenStream`. Closed by default (no `open` attr).
- [ ] Step 2 — Run both tsc, lint, build.
- [ ] Step 3 — Commit.

### Task 5: E2E + gates

**Files:**
- Create: `tests/e2e/tokenstream.spec.ts`
- Modify: `tests/e2e/csp.spec.ts`

- [ ] Step 1 — `tokenstream.spec.ts`: chatbot → fill the system prompt with `'The quick brown fox'` → click `summary` "Show tokens" → assert `.tokenstream .tok` count > 0 and the summary shows a token count; hover a `.tok` → a readout line matches `/token \d+ of \d+/`. XSS: fill `'<script>alert(1)</script>hello'`, open the panel, assert the text is visible AND `page.locator('.tokenstream script')` has count 0 (inert), and no dialog fired.
- [ ] Step 2 — Extend `csp.spec.ts`: after typing in Prompt mode (where the panel exists), open "Show tokens", wait for a `.tok` span, then assert zero CSP violations.
- [ ] Step 3 — Full gates: both tsc, lint, build, size, first-paint, full vitest, full playwright (incl. axe both themes — the panel adds a `<details>` + spans; verify no serious/critical).
- [ ] Step 4 — Commit. Update BUILD-LOG. PR to main (adversarial review first).

---

## Self-Review

**Spec coverage:** placement (Task 4 `<details>` toggle) ✅; real-vs-approximate (Task 3 `segments ?? approxChunks`, badge label) ✅; 400 cap + `+N more` (Task 3) ✅; shared hover readout (Task 3) ✅; segment pipeline (Tasks 1-2) ✅; XSS inert + CSP (Task 3 test + Task 5) ✅; SR summary + aria-hidden spans (Task 3) ✅. No gap.

**Placeholder scan:** the novel code (tiktokenSegments, approxChunks, the `<details>` block) is shown; boilerplate plumbing (adding one field through 4 files) is enumerated by exact file + field rather than repeated verbatim, which is unambiguous for a one-field addition. Test intents are concrete (inputs → assertions).

**Type consistency:** `segments: string[] | null` is the single shape used verbatim across `TokenCount`, `TokenizeResponse`, `FieldTokenCount`, and the `TokenStream` prop. `tiktokenSegments(text, encoding, cap)` and the adapter `segments(text, resolution, cap)` are consistent. `approxChunks(text, count)` is defined and consumed only in Task 3.

**Risk:** the primary risk is XSS via segment text — mitigated by React text-node rendering and an explicit inert test in BOTH the unit (Task 3) and E2E (Task 5). Verified adversarially via a Workflow before the PR (Ultracode).
