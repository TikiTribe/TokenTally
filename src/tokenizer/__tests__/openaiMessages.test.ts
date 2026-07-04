import { describe, it, expect } from 'vitest';
import { messageOverhead, PER_MESSAGE_STRUCT, PRIMING } from '@/tokenizer/openaiMessages';
import { tiktokenCount } from '@/tokenizer/tiktokenAdapter';

describe('messageOverhead (B6: role-aware, not a flat 3n+3)', () => {
  it('is per-message struct + encoded role token, plus one priming', () => {
    expect(messageOverhead(['user'], 'o200k_base')).toBe(
      PER_MESSAGE_STRUCT + tiktokenCount('user', 'o200k_base') + PRIMING,
    );
  });
  it('sums the encoded role over multiple messages', () => {
    const roles = ['system', 'user', 'assistant'];
    const expected =
      roles.reduce((s, r) => s + PER_MESSAGE_STRUCT + tiktokenCount(r, 'o200k_base'), 0) + PRIMING;
    expect(messageOverhead(roles, 'o200k_base')).toBe(expected);
  });
  it('is 0 for a zero-message request', () => {
    expect(messageOverhead([], 'o200k_base')).toBe(0);
  });
  it('exceeds the naive flat 3n+3 by the role tokens (the premortem undercount)', () => {
    const roles = ['user', 'user', 'user'];
    const naive = PER_MESSAGE_STRUCT * roles.length + PRIMING;
    expect(messageOverhead(roles, 'o200k_base')).toBeGreaterThan(naive);
  });
});
