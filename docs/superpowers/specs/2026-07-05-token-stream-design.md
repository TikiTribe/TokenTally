# Token Stream Visualization — Design

**Date:** 2026-07-05
**Status:** approved (brainstorming), pending implementation plan
**Context:** The 7th and last of the §2D visualizations (the other six shipped in PR #22). A live, per-token view of how the user's text tokenizes, so a user can SEE why their prompt costs what it does.

## Goal

Under each tokenized text box (chatbot **system prompt**, prompt-mode **prompt**), a collapsible "Show tokens" panel reveals a live, colored, per-token rendering of that text. Real token boundaries where a tokenizer exists (OpenAI, exact); a clearly-labeled approximate rendering everywhere else (Claude and other heuristic models). Rendered as inert DOM text nodes only, safe under the strict CSP.

## Decisions (from brainstorming)

1. **Placement:** a collapsible "Show tokens (N)" toggle inside the shared `TokenizedTextArea`, closed by default, so both tokenized fields get it and the input area stays uncluttered. Opening it reveals the live-updating stream.
2. **Non-exact models:** always show a stream. Real token spans where a real tokenizer runs (OpenAI exact; any proxy-tokenizer family, labeled with its existing accuracy badge); an **approximate** stream for heuristic-only models (Claude), clearly labeled "approximate — not this model's real tokens."
3. **Cap:** 400 spans, with a `+N more tokens` marker beyond, so a long prompt never renders thousands of nodes.
4. **Hover:** a single shared readout below the stream (one state, not 400 tooltip instances) — hovering a span highlights it and shows "token 5 of 120: `hello`".

## Architecture

### Data — expose token segments through the existing tokenizer pipeline

The tiktoken adapter already computes the token array (`encode(text)`), then discards it and returns `.length`. Expose the pieces:

- `src/tokenizer/tiktokenAdapter.ts`: add `tiktokenSegments(text, encoding, cap): string[]` that encodes, then `decode([id])` for each of the first `cap` token ids, returning their text pieces. `join('')` of the (uncapped) pieces reconstructs the input; the piece count (uncapped) equals `tiktokenCount`.
- `src/tokenizer/index.ts` `countTokens` and `src/tokenizer/worker.ts` `TokenizeResponse`: add `segments: string[] | null`. Real tokenizers (exact + proxy tiers, which route through tiktoken) return the capped pieces; the pure-heuristic path returns `null`.
- `src/tokenizer/workerClient.ts` (`tokenize`, `fallback`) + `src/hooks/useTokenizer.tsx`: carry `segments` through to the store.
- `src/store/types.ts` `FieldTokenCount`: add `segments: string[] | null`. Cap at 400 in the adapter so the store never holds a huge array (only the 2 tokenized fields carry it).

The **approximate** stream is built in the component, not the worker: when `segments === null` (heuristic), split the raw `text` into `count` roughly-equal character chunks (`chunkLen = ceil(text.length / count)`), so the number of visual chunks matches the shown token count. This keeps the worker change tiny and the approximation honest (chunk count == displayed count).

### Component — `src/viz/TokenStream.tsx`

```
TokenStream(props: { text: string; count: number; segments: string[] | null; approx: boolean; badge: string })
```

- Derives the render pieces: `segments` if present (real), else the client-side char-chunk approximation of `text` into `count` pieces.
- Renders each piece as a `<span className="tok" style={alternating tint}>{piece}</span>` — piece is a React text child (auto-escaped, inert). Alternating between two colorblind-safe AA-contrast tints so boundaries are visible; whitespace pieces get a subtle dot/placeholder so they are visible.
- Caps at 400 spans; a trailing `+{count - 400} more tokens` marker when over.
- A screen-reader summary line (`role` text): "`{count}` tokens ({badge})" — the per-token spans are `aria-hidden` decoration, the count+badge is the accessible content. For the approximate case, the summary and a visible sub-label both say "approximate".
- Hover: `onMouseEnter` on a span sets `hovered = {i, piece}`; a fixed readout line below shows "token {i+1} of {count}: `{piece}`"; the hovered span gets a highlight class. Leaving clears it. One shared state, CSP-safe (no title, no inline script).

### Placement — `src/ui/TokenizedTextArea.tsx`

Add a `<details className="tokenstream">` (or a button-toggled region) below the existing count line: summary "Show tokens ({count})", body renders `<TokenStream .../>` with the field's `segments`/`count`/`badge` from the store's `tokenCounts[fieldId]` and the current `value` as `text`. Closed by default. The stream updates live because `value`/`tokenCounts` update as the user types.

## Security

- **XSS:** segment/chunk strings are rendered ONLY as React text children (`{piece}`), never `innerHTML`/`dangerouslySetInnerHTML`. A pasted `<script>alert(1)</script>` renders as visible inert text. This is the primary risk and gets an explicit test.
- **CSP:** no new dependency (reuses js-tiktoken already in the worker); plain DOM + CSS. Renders under `script-src 'self'`; style is inline `style`/className (allowed). Not a recharts chart, so no `charts` chunk / first-paint impact.
- **DoS:** cap at 400 spans bounds the DOM; decode is O(tokens) and already bounded by the field's max length; segments computed on the existing debounced tokenize (no extra passes).

## Testing

- **Adapter** (`tiktokenAdapter.test`): `tiktokenSegments('hello world', 'cl100k_base', 400)` join reconstructs the input; uncapped length equals `tiktokenCount`; a >400-token input caps at 400.
- **Pipeline** (`index`/worker/workerClient): `segments` plumbed for a tiktoken model; `null` for a heuristic model.
- **Component** (`TokenStream.test`): exact segments render as spans; `segments===null` renders the approximate char-chunk stream whose span count equals `count`; a `<script>` piece renders as inert text (assert no `<script>` element, text present); >400 shows the `+N more` marker; the summary shows count + badge.
- **E2E** (`tooltips`/`functional` or a new `tokenstream.spec`): in chatbot, type a system prompt, open "Show tokens", assert spans appear and the count matches; hovering a span updates the readout; `csp.spec` extended to open the panel and assert zero CSP violations; a `<script>` typed into the box renders inert (no dialog, visible text).

## Out of scope (YAGNI)

- Editing/selecting tokens, token ids display, copy-as-tokens, per-token cost attribution. The stream is a read-only visualizer.
- A real Claude/Gemini tokenizer (none available client-side); the approximate stream stands in, labeled.
