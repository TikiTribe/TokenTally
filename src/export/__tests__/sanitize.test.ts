// §5.8 security (red-first): sanitizeForCSV must neutralize spreadsheet formula injection AND escape quotes
// on EVERY path (Excel/Sheets execute =,+,-,@ and treat a leading control char as a reveal). Owner: engine.
import { describe, it, expect } from 'vitest';
import { sanitizeForCSV } from '@/export/sanitize';

describe('sanitizeForCSV (CSV formula-injection + quoting)', () => {
  it('neutralizes leading =,+,-,@ (formula triggers) so the cell is inert text', () => {
    for (const payload of ['=SUM(A1)', '+1+1', '-2+3', '@cmd', '=1+1|cmd']) {
      const out = sanitizeForCSV(payload);
      expect(out.startsWith('=') || out.startsWith('+') || out.startsWith('-') || out.startsWith('@')).toBe(false);
    }
  });

  it('neutralizes leading control chars (tab/CR/LF) that Excel strips to reveal a formula', () => {
    expect(sanitizeForCSV('\t=cmd').startsWith('=')).toBe(false);
    expect(sanitizeForCSV('\r=cmd')).toMatch(/^"/); // wrapped because it contains \r
    expect(sanitizeForCSV('\n-cmd')).toMatch(/^"/);
  });

  it('escapes double-quotes by doubling, on every path', () => {
    expect(sanitizeForCSV('a"b')).toBe('"a""b"'); // quoted because it contains a quote
    expect(sanitizeForCSV('=a"b')).toContain('""'); // both prefixed AND escaped
  });

  it('quotes fields containing commas or newlines', () => {
    expect(sanitizeForCSV('has,comma')).toBe('"has,comma"');
    expect(sanitizeForCSV('two\nlines')).toBe('"two\nlines"');
  });

  it('leaves a plain value untouched', () => {
    expect(sanitizeForCSV('gpt-4o')).toBe('gpt-4o');
    expect(sanitizeForCSV('123.45')).toBe('123.45');
  });
});
