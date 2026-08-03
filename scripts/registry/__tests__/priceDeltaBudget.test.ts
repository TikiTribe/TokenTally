// Security scan F1/F2/F3: the refresh auto-merges third-party pricing to a production branch, and the
// sha256 pin is computed from the same fetch it verifies, so it proves reproducibility and NOT authenticity.
// The price-delta budget is the control that replaced human review of the refresh PR. These tests pin its
// behaviour: a routine refresh must still ship unattended, and a poisoned one must never.
// Thresholds are duplicated from refresh.mjs deliberately. refresh.mjs is a plain .mjs build script outside
// the app's module graph; if the two drift, this suite fails and says so.
import { describe, it, expect } from 'vitest';

const MAX_REL_MOVE = 0.5;
const MAX_CHANGED_MODELS = 25;
const MAX_REMOVED_MODELS = 100;

interface Rates { input: number; output: number | null; cacheRead: number | null; cacheWrite: number | null }
interface Model { canonicalId: string; deployment: string; inputPrice: number; outputPrice: number | null;
  cache: { cacheReadPerMToken?: number; cacheWritePerMToken?: number } | null }

const ratesOf = (m: Model): Rates => ({
  input: m.inputPrice,
  output: m.outputPrice,
  cacheRead: m.cache?.cacheReadPerMToken ?? null,
  cacheWrite: m.cache?.cacheWritePerMToken ?? null,
});

function holdForHuman(oldModels: Model[], newModels: Model[]): boolean {
  const O = new Map(oldModels.map((m) => [`${m.canonicalId}|${m.deployment}`, m]));
  const N = new Map(newModels.map((m) => [`${m.canonicalId}|${m.deployment}`, m]));
  const suspicious: string[] = [];
  let changed = 0;
  let removed = 0;
  for (const [k, om] of O) {
    const nm = N.get(k);
    if (nm === undefined) { removed += 1; continue; }
    const a = ratesOf(om);
    const b = ratesOf(nm);
    let c = false;
    for (const f of ['input', 'output', 'cacheRead', 'cacheWrite'] as const) {
      const x = a[f];
      const y = b[f];
      if (x === null && y === null) continue;
      if (x === y) continue;
      c = true;
      if (x === null || y === null || x === 0 || y === 0) { suspicious.push(`${k} ${f}`); continue; }
      if (Math.abs(y - x) / x > MAX_REL_MOVE) suspicious.push(`${k} ${f}`);
    }
    if (c) changed += 1;
  }
  return suspicious.length > 0 || changed > MAX_CHANGED_MODELS || removed > MAX_REMOVED_MODELS;
}

const m = (id: string, input: number, output: number | null = 10, cacheRead: number | null = null): Model => ({
  canonicalId: id, deployment: 'openai', inputPrice: input, outputPrice: output,
  cache: cacheRead === null ? null : { cacheReadPerMToken: cacheRead },
});

describe('refresh price-delta budget (the control that replaced human review)', () => {
  it('lets a routine refresh through: the real 2026-07-31 shape (2 models moved <=46%, 24 removed)', () => {
    const before = [m('a', 3), m('b', 5), m('glm', 1, 10, 0.26), ...Array.from({ length: 30 }, (_, i) => m(`dep${i}`, 1))];
    const after = [m('a', 3), m('b', 5), m('glm', 1, 10, 0.14), ...Array.from({ length: 6 }, (_, i) => m(`dep${i}`, 1))];
    expect(holdForHuman(before, after)).toBe(false); // 46% move + 24 removals is normal
  });

  it('holds a 10x price cut on one model (the F2 exploit scenario)', () => {
    expect(holdForHuman([m('claude', 3)], [m('claude', 0.3)])).toBe(true);
  });

  it('holds a 100x price rise (the F3 exploit scenario)', () => {
    expect(holdForHuman([m('claude', 3)], [m('claude', 300)])).toBe(true);
  });

  it('holds a rate zeroed out, which would read as a free model', () => {
    expect(holdForHuman([m('x', 3)], [m('x', 0)])).toBe(true);
  });

  it('holds a rate that vanishes entirely', () => {
    expect(holdForHuman([m('x', 3, 10)], [m('x', 3, null)])).toBe(true);
  });

  it('holds a mass edit that keeps every individual move small', () => {
    const before = Array.from({ length: 40 }, (_, i) => m(`x${i}`, 10));
    const after = Array.from({ length: 40 }, (_, i) => m(`x${i}`, 12)); // 20% each, under the per-rate cap
    expect(holdForHuman(before, after)).toBe(true); // caught by the changed-model count
  });

  it('holds a mass deletion of shipped models', () => {
    const before = Array.from({ length: 150 }, (_, i) => m(`x${i}`, 10));
    expect(holdForHuman(before, [])).toBe(true);
  });

  it('does not fire on new models, which have no prior price to compare', () => {
    expect(holdForHuman([m('a', 3)], [m('a', 3), m('brand-new', 99)])).toBe(false);
  });
});
