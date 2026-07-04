import { describe, it, expect } from 'vitest';
import raw from './fixtures/sample.json';
import { buildSnapshot } from '../../../scripts/registry/buildRegistry';
import type { ModelRecord } from '@/types/registry';

const snap = buildSnapshot(
  raw as Record<string, Record<string, unknown>>,
  'abc123',
  '2026-07-03',
);

const find = (pred: (m: ModelRecord) => boolean): ModelRecord => {
  const m = snap.models.find(pred);
  expect(m).toBeDefined();
  return m!;
};

describe('buildSnapshot golden fixture (A11)', () => {
  it('drops out-of-scope rows, counts them, and ignores the sample_spec meta key', () => {
    // 3 drops: mode-less together-ai bucket, image_generation dall-e-3, audio whisper-1.
    // sample_spec is IGNORED (A4), never counted. 21 raw keys - 3 drops - 1 ignored - 1 collision = 16.
    expect(snap.droppedCount).toBe(3);
    expect(snap.conflictCount).toBe(1);
    expect(snap.models).toHaveLength(16);
  });

  it('carries the per-character billing unit', () => {
    const med = find((m) => m.canonicalId === 'medlm-large');
    expect(med.billingUnit).toBe('per_character');
    expect(med.inputPrice).toBeCloseTo(5, 10);
  });

  it('keeps the gov-cloud deployment distinct with its own family/tier', () => {
    const gov = find((m) => m.deployment === 'bedrock/us-gov-east-1');
    expect(gov.inputPrice).toBeCloseTo(3.6, 10);
    expect(gov.underlyingFamily).toBe('claude');
    expect(gov.accuracyTier).toBe('estimate');
    expect(gov.cache?.archetype).toBe('breakpoint_ttl');
  });

  it('stores a per-second rate raw (never scaled to per-million)', () => {
    const ps = find((m) => m.canonicalId === 'replicate-per-second-chat');
    expect(ps.billingUnit).toBe('per_second');
    expect(ps.inputPrice).toBeCloseTo(0.0001, 12);
  });

  it('detects the dbu billing unit', () => {
    const dbu = find((m) => m.canonicalId === 'databricks-dbrx-instruct');
    expect(dbu.billingUnit).toBe('dbu');
    expect(dbu.deployment).toBe('databricks');
    expect(dbu.underlyingFamily).toBe('dbrx');
  });

  it('keeps a 0/0 model as a free tier', () => {
    const free = find((m) => m.canonicalId === 'meta-llama/llama-3-8b-instruct:free');
    expect(free.freeTier).toBe(true);
    expect(free.deployment).toBe('openrouter');
  });

  it('lets the per-character rate win when both units are present', () => {
    const pro = find((m) => m.canonicalId === 'gemini-1.5-pro');
    expect(pro.billingUnit).toBe('per_character');
    expect(pro.inputPrice).toBeCloseTo(0.3125, 10);
  });

  it('reads a 128k input tier', () => {
    const flash = find((m) => m.canonicalId === 'gemini-1.5-flash');
    expect(flash.tiers).toHaveLength(1);
    expect(flash.tiers[0]!.thresholdTokens).toBe(128000);
  });

  it('reads a 200k tiered cache-read rate', () => {
    const c = find((m) => m.canonicalId === 'claude-3-7-sonnet-200k');
    const tier = c.tiers.find((t) => t.thresholdTokens === 200000);
    expect(tier).toBeDefined();
    expect(tier!.cacheReadPerMToken).toBeCloseTo(0.6, 10);
  });

  it('scales a reasoning-token rate to per-million', () => {
    const o1 = find((m) => m.canonicalId === 'o1');
    expect(o1.reasoningPerMToken).toBeCloseTo(60, 10);
  });

  it('reads a DeepSeek cache-hit read rate as automatic caching', () => {
    const ds = find((m) => m.canonicalId === 'deepseek-chat');
    expect(ds.cache?.archetype).toBe('automatic');
    expect(ds.cache?.cacheReadPerMToken).toBeCloseTo(0.07, 6);
  });

  it('flags rateUnavailable when caching is supported but unpriced', () => {
    const m = find((x) => x.canonicalId === 'some-cache-model');
    expect(m.cache?.rateUnavailable).toBe(true);
  });

  it('keeps the aggregator org-namespaced id as the canonical id', () => {
    const r1 = find((m) => m.canonicalId === 'deepseek/deepseek-r1');
    expect(r1.deployment).toBe('openrouter');
  });

  it('collapses a divergent-price collision to the first record', () => {
    const dupes = snap.models.filter((m) => m.canonicalId === 'dupe-model' && m.deployment === 'openai');
    expect(dupes).toHaveLength(1);
    expect(dupes[0]!.inputPrice).toBeCloseTo(1, 10); // the bare `dupe-model` (first) wins
  });

  it('gives the embedding a null output price', () => {
    const emb = find((m) => m.canonicalId === 'text-embedding-3-small');
    expect(emb.outputPrice).toBeNull();
  });

  it('keeps a completion-mode model', () => {
    const comp = find((m) => m.canonicalId === 'gpt-3.5-turbo-instruct');
    expect(comp.mode).toBe('completion');
  });

  it('sorts models deterministically by (canonicalId, deployment)', () => {
    for (let i = 1; i < snap.models.length; i++) {
      const prev = snap.models[i - 1]!;
      const cur = snap.models[i]!;
      const ordered =
        prev.canonicalId < cur.canonicalId ||
        (prev.canonicalId === cur.canonicalId && prev.deployment <= cur.deployment);
      expect(ordered).toBe(true);
    }
  });

  it('stamps the version and date', () => {
    expect(snap.snapshotVersion).toBe('abc123');
    expect(snap.snapshotDate).toBe('2026-07-03');
  });
});
