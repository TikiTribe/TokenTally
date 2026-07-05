// js-tiktoken adapter: exact OpenAI token counts. Imported from js-tiktoken/lite + the four rank
// subpaths this catalog needs (o200k/cl100k/p50k/r50k), so the fat main entry's six inlined rank
// tables (gpt2 + p50k_edit are never routed to) are not pulled in (B7). Encoders are constructed
// lazily and cached (at most four). Pure JS, no WASM, no network (asserted by the B9 egress test).
// The full dynamic-import()/LRU/size-limit optimization for the worker chunk is Phase 2/0D.
import { Tiktoken } from 'js-tiktoken/lite';
import o200k_base from 'js-tiktoken/ranks/o200k_base';
import cl100k_base from 'js-tiktoken/ranks/cl100k_base';
import p50k_base from 'js-tiktoken/ranks/p50k_base';
import r50k_base from 'js-tiktoken/ranks/r50k_base';
import type { TiktokenEncoding, TokenizerAdapter, TokenizerResolution } from '@/types/tokenizer';

const RANKS = { o200k_base, cl100k_base, p50k_base, r50k_base } as const;
const cache = new Map<TiktokenEncoding, Tiktoken>();

function encoder(encoding: TiktokenEncoding): Tiktoken {
  const hit = cache.get(encoding);
  if (hit) return hit;
  const enc = new Tiktoken(RANKS[encoding]);
  cache.set(encoding, enc);
  return enc;
}

export function tiktokenCount(text: string, encoding: TiktokenEncoding): number {
  if (text.length === 0) return 0;
  return encoder(encoding).encode(text).length;
}

// The per-token text pieces of `text` (first `cap` tokens), for the token-stream visualizer. A byte-level BPE
// token can be a FRAGMENT of a multibyte code point (e.g. an emoji spans several tokens), so decoding an id in
// isolation yields U+FFFD garbage. Accumulate ids and only emit a piece once the buffer decodes cleanly (no
// replacement char), merging the fragment-tokens of a split code point into one visible piece. join('') of the
// pieces then reconstructs the first `cap` tokens' text (verified for emoji/flags/ZWJ/CJK), never "".
export function tiktokenSegments(text: string, encoding: TiktokenEncoding, cap: number): string[] {
  if (text.length === 0 || cap <= 0) return [];
  const enc = encoder(encoding);
  const ids = enc.encode(text);
  const take = Math.min(ids.length, cap);
  const out: string[] = [];
  let buf: number[] = [];
  for (let i = 0; i < take; i++) {
    buf.push(ids[i]!);
    const piece = enc.decode(buf);
    if (!piece.includes('�')) {
      out.push(piece);
      buf = [];
    }
  }
  if (buf.length > 0) out.push(enc.decode(buf)); // flush a code point split exactly at the cap boundary (rare)
  return out;
}

export const tiktokenAdapter: TokenizerAdapter = {
  engine: 'tiktoken',
  available: true,
  count(text: string, resolution: TokenizerResolution): number {
    if (resolution.encoding === null) {
      throw new Error('tiktokenAdapter requires a non-null encoding');
    }
    return tiktokenCount(text, resolution.encoding);
  },
  segments(text: string, resolution: TokenizerResolution, cap: number): string[] {
    if (resolution.encoding === null) return [];
    return tiktokenSegments(text, resolution.encoding, cap);
  },
};
