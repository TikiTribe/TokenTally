// P2-A21: guard the theme token contrast against the ACTUAL shipped index.css (single source of truth).
// Parses the light (:root) and dark ([data-theme='dark']) token blocks and asserts WCAG-AA ratios so a
// future token tweak that breaks contrast fails CI. Node test (reads the file; no DOM).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
  // grab the first {...} after the selector
  const i = css.indexOf(selector);
  const open = css.indexOf('{', i);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[m[1]!] = m[2]!;
  return tokens;
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const light = block(':root {');
const dark = block(":root[data-theme='dark']");

describe.each([
  ['light', light],
  ['dark', dark],
])('theme contrast (%s)', (_name, t) => {
  it('body text and muted text meet AA (>=4.5:1) on the surface', () => {
    expect(contrast(t['--text']!, t['--surface']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t['--text-muted']!, t['--surface']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('primary (used as link/text) meets AA on the surface', () => {
    expect(contrast(t['--primary']!, t['--surface']!)).toBeGreaterThanOrEqual(4.5);
  });
  it('accuracy badge text meets AA on the surface', () => {
    for (const b of ['--badge-exact', '--badge-approx', '--badge-estimate']) {
      expect(contrast(t[b]!, t['--surface']!)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('the functional input border meets the 3:1 UI-component minimum (WCAG 1.4.11)', () => {
    // --border is decorative (cards/dividers, no contrast requirement); --input-border is the functional
    // boundary of form controls and must clear 3:1.
    expect(contrast(t['--input-border']!, t['--surface']!)).toBeGreaterThanOrEqual(3);
  });
});
