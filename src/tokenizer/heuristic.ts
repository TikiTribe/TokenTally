// Calibrated, versioned fallback estimator for models with no runnable local tokenizer (Claude
// under Option A, closed models, and the degradation target for any engine failure). It returns an
// EXPLICIT error band, never a bare integer, so downstream never renders false precision (spec §6,
// §5.4; premortem B5).
//
// UNVERIFIED: these ratios are heuristic approximations, NOT a real BPE tokenizer, and are not
// measured against captured provider usage. Latin text runs ~4 chars/token; CJK / emoji / symbols
// run far denser (~1-2 chars/token), so char-class-aware counting stops the ~3-5x CJK under-count a
// flat chars/4 produces. Claude tokenizes English somewhat denser than GPT but there is no accurate
// public Claude tokenizer (D3), so Claude is given a wider UPWARD band rather than a false-precise
// point uplift. Bump HEURISTIC_VERSION whenever these constants change.
import type { TokenizerFamily } from '@/types/registry';

export const HEURISTIC_VERSION = '0B-2026-07-04';

const ASCII_CHARS_PER_TOKEN = 4;
const NON_ASCII_CHARS_PER_TOKEN = 1.5; // CJK/emoji/symbol run far denser than Latin
const NON_LATIN_RATIO_THRESHOLD = 0.2; // >20% non-ASCII => widen the band and flag as degraded

const BASE_REL_LOW = -0.3;
const BASE_REL_HIGH = 0.3;
const NON_LATIN_REL_LOW = -0.4;
const NON_LATIN_REL_HIGH = 0.7;
const CLAUDE_EXTRA_UPSIDE = 0.1; // unverified: Claude runs denser; carry the uncertainty upward

export interface HeuristicEstimate {
  count: number;
  relLow: number;  // <= 0
  relHigh: number; // >= 0
  degradedNonLatin: boolean;
}

export function heuristicEstimate(text: string, family: TokenizerFamily): HeuristicEstimate {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) {
    return { count: 0, relLow: 0, relHigh: 0, degradedNonLatin: false };
  }
  // Count by code point (for...of is surrogate-pair aware, so an emoji counts once).
  let ascii = 0;
  let nonAscii = 0;
  for (const ch of normalized) {
    if ((ch.codePointAt(0) ?? 0) < 128) ascii += 1;
    else nonAscii += 1;
  }
  const total = ascii + nonAscii;
  const degradedNonLatin = nonAscii / total > NON_LATIN_RATIO_THRESHOLD;
  const midpoint = ascii / ASCII_CHARS_PER_TOKEN + nonAscii / NON_ASCII_CHARS_PER_TOKEN;
  const relLow = degradedNonLatin ? NON_LATIN_REL_LOW : BASE_REL_LOW;
  let relHigh = degradedNonLatin ? NON_LATIN_REL_HIGH : BASE_REL_HIGH;
  if (family === 'claude') relHigh += CLAUDE_EXTRA_UPSIDE;
  return { count: Math.ceil(midpoint), relLow, relHigh, degradedNonLatin };
}
