// Tokenizer dispatcher: the single public entry point. Resolves a model id, runs the registered
// adapter for the resolved engine, and returns a count plus the badge that engine ACTUALLY earned.
// The heuristic is the built-in universal fallback (it carries the error band the adapter interface
// cannot), so a count is always returned and the badge never overstates fidelity.
//
// Amendments: B3 (Exact gated per (family, encoding), bound to a passing spot-check, never for a
// flagged id), B10 (clamp input at this security boundary), B11 (flagForReview = unknown id only;
// awaitingAdapter = known family whose adapter is not registered), B12 (sanity-bound an adapter
// count vs the heuristic; a per-engine kill switch).
import { resolveTokenizer } from '@/tokenizer/resolveTokenizer';
import { heuristicEstimate, type HeuristicEstimate } from '@/tokenizer/heuristic';
import type {
  TokenizerAdapter,
  TokenizerEngine,
  TokenizerResolution,
  TokenCount,
  SpotCheckResult,
  TiktokenEncoding,
} from '@/types/tokenizer';
import type { TokenizerFamily, AccuracyTier } from '@/types/registry';

// B10: hard cap so a multi-MB paste cannot peg the worker, and every caller (not just the UI) is safe.
export const MAX_TOKENIZE_CHARS = 200_000;
// B12: an estimator-INDEPENDENT sanity bound. A byte-level BPE tokenizer never emits more than ~4
// tokens per UTF-16 code unit, so a count above chars*4 (or below 0) is garbage (e.g. a 0D adapter
// that loaded a wrong/corrupt asset). We do NOT compare to the heuristic: a code review found that a
// heuristic-ratio bound wrongly discarded CORRECT exact counts on whitespace/repetitive text (the two
// estimators legitimately diverge >4x there). A too-LOW-but-positive count cannot be caught here
// (repetitive text legitimately merges to very few tokens); that class is the spot-check gate's job.
const MAX_TOKENS_PER_CHAR = 4;

const adapters = new Map<TokenizerEngine, TokenizerAdapter>();
const exactKeys = new Set<string>(); // `${family}:${encoding}` (B3)
const forced = new Set<TokenizerEngine>(); // B12 kill switch

export function registerAdapter(adapter: TokenizerAdapter): void {
  adapters.set(adapter.engine, adapter);
}
export function resetAdapters(): void {
  adapters.clear();
}
// B3: promotion is bound to proof - a passing SpotCheckResult for a specific (family, encoding).
export function markFamilyExact(
  family: TokenizerFamily,
  encoding: TiktokenEncoding,
  result: SpotCheckResult,
): void {
  if (!result.passed) {
    throw new Error(`cannot mark ${family}:${encoding} exact: the spot-check did not pass`);
  }
  exactKeys.add(`${family}:${encoding}`);
}
export function resetExactKeys(): void {
  exactKeys.clear();
}
export function forceHeuristic(engine: TokenizerEngine): void {
  forced.add(engine);
}
export function clearForceHeuristic(): void {
  forced.clear();
}

function estimateBand(est: HeuristicEstimate): { relLow: number; relHigh: number } {
  return { relLow: est.relLow, relHigh: est.relHigh };
}

// B11: known family, engine adapter unavailable/forced/failed -> heuristic count, estimate badge,
// awaitingAdapter true, flagForReview passed through (false for a recognized family).
function degrade(res: TokenizerResolution, est: HeuristicEstimate, truncated: boolean): TokenCount {
  return {
    count: est.count,
    badge: 'estimate',
    engine: 'heuristic',
    family: res.family,
    flagForReview: res.flagForReview,
    awaitingAdapter: true,
    errorBand: estimateBand(est),
    truncated,
  };
}

export function countTokens(modelId: string, text: string): TokenCount {
  const truncated = text.length > MAX_TOKENIZE_CHARS;
  const input = truncated ? text.slice(0, MAX_TOKENIZE_CHARS) : text;
  const res = resolveTokenizer(modelId);
  const est = heuristicEstimate(input, res.family);

  const adapter = adapters.get(res.engine);
  const useAdapter =
    adapter?.available === true && res.engine !== 'heuristic' && !forced.has(res.engine);

  if (useAdapter && adapter) {
    try {
      const count = adapter.count(input, res);
      // B12: reject only a garbage (negative or absurdly large) non-throwing adapter count.
      const sane = count >= 0 && count <= input.length * MAX_TOKENS_PER_CHAR;
      if (sane) {
        // B3 + B2: Exact only for a promoted (family, encoding), and NEVER for a flagged id.
        const key = res.encoding ? `${res.family}:${res.encoding}` : null;
        const badge: AccuracyTier =
          !res.flagForReview && key !== null && exactKeys.has(key) ? 'exact' : res.tier;
        // tiktoken exact content count carries no band; a transformers proxy (0D) does.
        const errorBand = res.engine === 'tiktoken' ? null : estimateBand(est);
        return {
          count,
          badge,
          engine: res.engine,
          family: res.family,
          flagForReview: res.flagForReview,
          awaitingAdapter: false,
          errorBand,
          truncated,
        };
      }
    } catch {
      // fall through to degradation
    }
    return degrade(res, est, truncated);
  }

  if (res.engine === 'heuristic') {
    // A genuinely heuristic-routed model (Claude/closed) or an unknown id: estimate, not awaiting.
    return {
      count: est.count,
      badge: 'estimate',
      engine: 'heuristic',
      family: res.family,
      flagForReview: res.flagForReview,
      awaitingAdapter: false,
      errorBand: estimateBand(est),
      truncated,
    };
  }
  // engine is tiktoken/transformers but no usable adapter (or forced off): degrade.
  return degrade(res, est, truncated);
}

// Maintenance reports (B11): flagged = genuinely unknown ids; awaiting = known families with no adapter.
export function listFlaggedFamilies(ids: readonly string[]): TokenizerFamily[] {
  const flagged = new Set<TokenizerFamily>();
  for (const id of ids) {
    const r = countTokens(id, '');
    if (r.flagForReview) flagged.add(r.family);
  }
  return [...flagged];
}
export function listAwaitingAdapter(ids: readonly string[]): TokenizerFamily[] {
  const awaiting = new Set<TokenizerFamily>();
  for (const id of ids) {
    const r = countTokens(id, '');
    if (r.awaitingAdapter) awaiting.add(r.family);
  }
  return [...awaiting];
}
