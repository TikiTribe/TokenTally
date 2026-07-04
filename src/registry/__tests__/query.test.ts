import { describe, it, expect, beforeEach } from 'vitest';
import { loadRegistry, getModel, getDeployments, listByMode, getSnapshotMeta } from '@/registry';
import type { RegistrySnapshot, ModelRecord } from '@/types/registry';

const rec = (over: Partial<ModelRecord>): ModelRecord => ({
  canonicalId: 'm',
  deployment: 'd',
  displayName: 'm',
  provider: 'p',
  underlyingFamily: 'openai',
  mode: 'chat',
  billingUnit: 'per_token',
  inputPrice: 1,
  outputPrice: 2,
  reasoningPerMToken: null,
  cache: null,
  contextWindow: null,
  maxOutput: null,
  tiers: [],
  accuracyTier: 'exact_unverified',
  freeTier: false,
  deprecated: false,
  ...over,
});

const snap: RegistrySnapshot = {
  snapshotVersion: 'v1',
  snapshotDate: '2026-07-03',
  droppedCount: 0,
  conflictCount: 0,
  models: [
    rec({ canonicalId: 'anthropic.claude-3-5-sonnet', deployment: 'bedrock', inputPrice: 3, underlyingFamily: 'claude' }),
    rec({ canonicalId: 'anthropic.claude-3-5-sonnet', deployment: 'bedrock/us-gov-east-1', inputPrice: 3.6, underlyingFamily: 'claude' }),
    rec({ canonicalId: 'text-embedding-3-small', deployment: 'openai', mode: 'embedding', outputPrice: null }),
  ],
};

describe('query API', () => {
  beforeEach(() => loadRegistry(snap));

  it('gets a specific (model, deployment)', () => {
    expect(getModel('anthropic.claude-3-5-sonnet', 'bedrock/us-gov-east-1')?.inputPrice).toBe(3.6);
  });

  it('returns null for an unknown (model, deployment)', () => {
    expect(getModel('anthropic.claude-3-5-sonnet', 'nowhere')).toBeNull();
  });

  it('lists all deployments for a model', () => {
    expect(
      getDeployments('anthropic.claude-3-5-sonnet')
        .map((m) => m.deployment)
        .sort(),
    ).toEqual(['bedrock', 'bedrock/us-gov-east-1']);
  });

  it('lists by mode', () => {
    expect(listByMode('embedding')).toHaveLength(1);
  });

  it('exposes snapshot meta for the "data as of" stamp', () => {
    expect(getSnapshotMeta()).toEqual({
      snapshotVersion: 'v1',
      snapshotDate: '2026-07-03',
      droppedCount: 0,
    });
  });

  it('A3: throws on a duplicate (canonicalId, deployment) key and leaves prior state intact', () => {
    const dup: RegistrySnapshot = {
      ...snap,
      models: [
        rec({ canonicalId: 'x', deployment: 'openai', inputPrice: 1 }),
        rec({ canonicalId: 'x', deployment: 'openai', inputPrice: 2 }),
      ],
    };
    expect(() => loadRegistry(dup)).toThrow(/duplicate/);
    // the prior good snapshot is still queryable (transactional load)
    expect(getModel('anthropic.claude-3-5-sonnet', 'bedrock')?.inputPrice).toBe(3);
  });
});
