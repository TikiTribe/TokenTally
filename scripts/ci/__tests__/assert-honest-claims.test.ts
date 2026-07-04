import { describe, it, expect } from 'vitest';
import { scanText } from '../assert-honest-claims.mjs';

describe('assert-honest-claims scanner (D15)', () => {
  it('passes honest, scoped copy', () => {
    expect(scanText('x', 'precision scoped per model; exact where a verified tokenizer exists')).toEqual([]);
  });
  it('flags an unqualified ±5% accuracy claim', () => {
    expect(scanText('x', 'within ±5% accuracy').length).toBeGreaterThan(0);
    expect(scanText('x', 'accurate to +/- 5%').length).toBeGreaterThan(0);
  });
  it('flags a 100% test-coverage claim', () => {
    expect(scanText('x', '100% test coverage').length).toBeGreaterThan(0);
    expect(scanText('x', 'fully tested with 100% coverage').length).toBeGreaterThan(0);
  });
});
