// P2-A6: registry supply-chain + regeneration integrity, fully offline (no network).
// (1) the vendored raw body still matches the pinned hash; (2) running the pure buildSnapshot over the
// vendored body byte-reproduces the committed registry.generated.json (catches a hand-edited artifact),
// and the artifact carries the pinned commit as its version with the expected model count.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildSnapshot, PINNED_COMMIT, EXPECTED_SNAPSHOT_SHA256 } from '../buildRegistry';
import type { RawEntry } from '../../../src/registry/normalize';

const vendored = new URL(`../vendor/model_prices.${PINNED_COMMIT.slice(0, 8)}.json`, import.meta.url);
const generated = new URL('../../../src/config/registry.generated.json', import.meta.url);
const SNAPSHOT_DATE = '2025-09-01';

describe('registry integrity (P2-A6)', () => {
  it('the vendored raw body matches the pinned sha256', () => {
    const body = readFileSync(vendored, 'utf8');
    expect(createHash('sha256').update(body).digest('hex')).toBe(EXPECTED_SNAPSHOT_SHA256);
  });

  it('buildSnapshot(vendored) byte-reproduces the committed artifact', () => {
    const body = readFileSync(vendored, 'utf8');
    const snap = buildSnapshot(JSON.parse(body) as Record<string, RawEntry>, PINNED_COMMIT, SNAPSHOT_DATE);
    expect(JSON.stringify(snap)).toBe(readFileSync(generated, 'utf8'));
  });

  it('the committed artifact is pinned + non-trivial', () => {
    const committed = JSON.parse(readFileSync(generated, 'utf8')) as { snapshotVersion: string; models: unknown[] };
    expect(committed.snapshotVersion).toBe(PINNED_COMMIT);
    expect(committed.models.length).toBeGreaterThan(1000);
  });
});
