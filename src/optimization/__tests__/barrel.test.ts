// P1-A23: lock the Phase-2 import contract for the optimization barrel.
import { describe, it, expect } from 'vitest';
import * as opt from '@/optimization';

describe('optimization barrel', () => {
  it('exports every public function + the DoW governance constants', () => {
    for (const name of ['optimize', 'solveBudget', 'tornado', 'denialOfWallet', 'candidates', 'priceWorkload'] as const) {
      expect(typeof opt[name]).toBe('function');
    }
    expect(opt.DOW_VDP_URL).toMatch(/^https:\/\//);
    expect(opt.DOW_DISCLAIMER.length).toBeGreaterThan(0);
    expect(opt.NUMERIC_FIELDS.chatbot.length).toBeGreaterThan(0);
  });
});
