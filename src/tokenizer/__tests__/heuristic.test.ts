import { describe, it, expect } from 'vitest';
import { heuristicEstimate, HEURISTIC_VERSION } from '@/tokenizer/heuristic';

describe('heuristicEstimate (B5: error band + char-class awareness)', () => {
  it('returns a zero estimate with a zero band ONLY for truly-empty text', () => {
    expect(heuristicEstimate('', 'unknown')).toEqual({
      count: 0,
      relLow: 0,
      relHigh: 0,
      degradedNonLatin: false,
    });
  });

  it('review-fix: whitespace-only (non-empty) text has a non-zero count and a real band, not [0,0]', () => {
    const e = heuristicEstimate('\n\t   \n', 'unknown');
    expect(e.count).toBeGreaterThanOrEqual(1); // whitespace tokenizes to > 0
    expect(e.relHigh).toBeGreaterThan(0); // never a false-precise zero-width band
  });

  it('estimates Latin prose near chars/4 with a symmetric band, not degraded', () => {
    const text = 'the quick brown fox jumps over the lazy dog again and again';
    const e = heuristicEstimate(text, 'unknown');
    expect(e.degradedNonLatin).toBe(false);
    expect(e.relLow).toBeLessThan(0);
    expect(e.relHigh).toBeGreaterThan(0);
    expect(e.count).toBeGreaterThan(10);
    expect(e.count).toBeLessThan(20);
  });

  it('does NOT under-count CJK - count exceeds chars/4 and the band widens + flags (B5)', () => {
    const cjk = '你好世界你好世界你好世界你好世界'; // 16 CJK chars, no spaces
    const e = heuristicEstimate(cjk, 'unknown');
    expect(e.count).toBeGreaterThan(cjk.length / 4); // denser than the Latin 4-chars/token rule
    expect(e.degradedNonLatin).toBe(true);
    expect(e.relHigh).toBeGreaterThan(0.3); // band widened beyond the Latin default
  });

  it('flags emoji-heavy text as degraded (non-Latin)', () => {
    const e = heuristicEstimate('😀😀😀😀😀😀', 'unknown');
    expect(e.degradedNonLatin).toBe(true);
    expect(e.count).toBeGreaterThan(0);
  });

  it('represents Claude with a wider upward band, not a magic point (B5c)', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const claude = heuristicEstimate(text, 'claude');
    const other = heuristicEstimate(text, 'amazon');
    // same char-class midpoint, but Claude carries more upside uncertainty (unverified, denser)
    expect(claude.relHigh).toBeGreaterThan(other.relHigh);
  });

  it('exposes a version string for the drift note', () => {
    expect(HEURISTIC_VERSION).toMatch(/^0B-/);
  });
});
