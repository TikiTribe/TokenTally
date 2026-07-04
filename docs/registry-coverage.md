# Tokenizer accuracy coverage (projection, not measured)

**Status: projection.** Phase 0A ships the registry and its `accuracyTier` field; it does not yet
run the per-family tokenizer spot-checks that would let any tier be called "measured." Nothing in
this document is a measurement.

## What the registry actually carries

Every `ModelRecord` gets an `accuracyTier` from `resolveFamily` (`src/registry/resolveFamily.ts`):

- `exact_unverified` — an open family whose tokenizer we can run locally (OpenAI/tiktoken, Llama,
  Mistral, Qwen, DeepSeek, and peers), pending a per-family fixture spot-check in Phase 0B. It is
  promoted to `exact` only after that spot-check passes; it is never labeled `exact` before then.
- `approx` — a family we tokenize through a close proxy (Gemini/PaLM via a Gemma-family tokenizer,
  Grok, Perplexity). The count is right within a small margin, not exact.
- `estimate` — no first-party or proxy tokenizer; a character/word heuristic (Claude by design under
  Tokenizer Option A, plus Amazon Titan/Nova, Voyage, Aleph Alpha, and any unmatched id).

## The projected split

The three-tier split used in planning is a **projection**, derived from the design prototype's
family classification, not from a tokenization run:

- roughly **65–70% Exact-class** (`exact_unverified`, pending promotion),
- roughly **13–17% Approx**,
- roughly **16–20% Estimate** (about 11% of the catalog is Claude, `estimate` by design).

These are ranges on purpose. The two-way prototype split reported only Exact vs Estimate and had no
Approx bucket; the Approx tier here is carved out of the prototype's Exact count by demoting the
proxy-tokenized families, so the Exact share drops accordingly.

## What ships

The shipped tool computes the **live** split from the registry `accuracyTier` field and stamps it
with the snapshot version, so the number always reflects the pinned data rather than this document.
Public copy states ranges and the "data as of <snapshot>" stamp, never a single "measured" figure.
Phase 0B replaces these projections with per-family spot-checks and promotes verified families to
`exact`.
