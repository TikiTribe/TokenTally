// Model id -> tokenizer routing (B2). The OpenAI encoding is taken from js-tiktoken's OWN
// model->encoding oracle (getEncodingNameForModel), never a hand-rolled table: the oracle is
// authoritative and stays correct as the pinned library updates, and its "Unknown model" throw is
// the signal that an id is novel/unrecognized (-> flagForReview, best-effort o200k, never Exact).
// The family classification (finetune-before-openai ordering) is reused from Phase 0A.
//
// Engine choice: OpenAI -> tiktoken; any family whose aspirational tier is 'estimate' (Claude,
// Amazon, Voyage, Aleph Alpha, unknown) -> heuristic; every other named family -> transformers.
// Imported from js-tiktoken/lite so the fat main entry's six rank tables are not pulled in (B7).
import { getEncodingNameForModel } from 'js-tiktoken/lite';
import { resolveFamily } from '@/registry/resolveFamily';
import type { TokenizerResolution, TiktokenEncoding } from '@/types/tokenizer';

const SUPPORTED = new Set<string>(['o200k_base', 'cl100k_base', 'p50k_base', 'r50k_base']);

type OracleArg = Parameters<typeof getEncodingNameForModel>[0];

function oracleLookup(candidate: string): TiktokenEncoding | null {
  try {
    // The oracle throws "Unknown model" on any id it does not recognize; we catch and return null.
    const enc = getEncodingNameForModel(candidate as OracleArg) as string;
    return SUPPORTED.has(enc) ? (enc as TiktokenEncoding) : null; // gpt2/p50k_edit -> treat as miss
  } catch {
    return null;
  }
}

// Returns the tiktoken encoding for an OpenAI id, or null if the oracle does not recognize it.
// Registry ids can be provider-prefixed (azure/gpt-4o), so a miss retries on the last path segment.
export function openaiEncoding(id: string): TiktokenEncoding | null {
  const direct = oracleLookup(id);
  if (direct !== null) return direct;
  const slash = id.lastIndexOf('/');
  if (slash >= 0) return oracleLookup(id.slice(slash + 1));
  return null;
}

export function resolveTokenizer(id: string): TokenizerResolution {
  const { family, tier } = resolveFamily(id);
  if (family === 'openai') {
    const encoding = openaiEncoding(id);
    if (encoding !== null) {
      return { family, engine: 'tiktoken', encoding, tier, flagForReview: false };
    }
    // B2: an OpenAI-classified id the oracle does not know (gpt-6, a mis-scraped row). Give a
    // best-effort current-generation o200k count, but flag it and never let it read Exact.
    return { family, engine: 'tiktoken', encoding: 'o200k_base', tier, flagForReview: true };
  }
  if (tier === 'estimate') {
    // Claude (Option A), Amazon/Voyage/Aleph Alpha, and unmatched ids: no local tokenizer.
    return { family, engine: 'heuristic', encoding: null, tier, flagForReview: family === 'unknown' };
  }
  // Every remaining named family has a Transformers.js tokenizer (registered in Phase 0D).
  return { family, engine: 'transformers', encoding: null, tier, flagForReview: false };
}
