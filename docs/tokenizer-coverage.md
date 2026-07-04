# Tokenizer Engine coverage (Phase 0B) — projection, not measured

**Status: projection.** 0B ships the resolver, engines, dispatcher, and the Exact-badge *gate*; it
does not promote any family to Exact (that needs a real provider capture — see below). Nothing here
is a measurement.

## Engines shipped in 0B

- **tiktoken (`js-tiktoken@1.0.21`, pure JS, `base64-js` pinned):** exact OpenAI counts, per-encoding,
  with the encoding taken from js-tiktoken's own `getEncodingNameForModel` oracle (never a hand-rolled
  table, so it cannot drift). OpenAI ships as **`exact_unverified`** — the local tokenizer is right, but
  the full request-level count has not been checked against real API `usage` (B1).
- **heuristic (versioned, char-class aware, error-banded):** Claude (Option A) and closed models —
  **`estimate`** with an explicit error band. CJK/emoji/symbol text is counted denser (not under-counted)
  and flagged `degradedNonLatin`.
- **transformers (open families):** RESOLVED but the adapter is NOT registered in 0B. Open families
  degrade honestly to the heuristic (`estimate`, `awaitingAdapter: true`). `listAwaitingAdapter` reports them.

## Live badge split at 0B (honest)

With the Transformers.js adapter deferred to 0D, the shipped resolver+adapters produce roughly
**~13% Exact-class (`exact_unverified`, OpenAI) / 0% Approx / ~87% Estimate**. This is NOT the spec §5.1
projection of 67% Exact / 15% Approx / 18% Estimate — that projection assumes open families tokenize
locally, which lands in 0D. Public copy must state the 0B-until-0D reality and never repeat "67% Exact"
as a launch number.

## No Exact badge without real provider ground truth (B1)

The Exact badge is *earned* only when a family+encoding reproduces captured provider `usage` counts
within tolerance (spec I7). No such capture exists in this repo: it needs a real OpenAI/Anthropic API
key and must be done **out of band** by the owner, committing a provenance-carrying fixture
(`capturedAt`, `endpoint`, `apiModelSnapshot`, raw `usage`). Until then `markFamilyExact` is never
called and OpenAI stays `exact_unverified`. Numbers are NEVER reconciled by editing a fixture toward the
tool's own output — that would make the gate a tautology.

## Owed to Phase 0D (tracked in BUILD-LOG)

Register the Transformers.js adapter + self-hosted tokenizer assets + redistribution license check; the
`grep -r wasm dist/` WASM-free build assertion; the zero-egress Playwright test over the served CSP; the
IndexedDB staleness cache; the pre-demo tokenizer-URL 200 pre-flight; the dynamic-`import()`/LRU/`size-limit`
optimization for the worker chunk; and the **dated Approx-before-demo gate** (pull one Gemma tokenizer
forward so Gemini shows Approx, or amend the §13 cut line to OpenAI-Exact-class + Estimate-only and correct
the copy). The shipped tool computes the live split from the resolver and stamps it with the snapshot
version — never a single "measured" number.
