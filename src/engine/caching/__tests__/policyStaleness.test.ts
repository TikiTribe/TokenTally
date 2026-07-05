// D16: the cache policy constants (WRITE_MULT, T_EFF) are UNVERIFIED assumptions that drift as providers
// reprice. This deterministic test validates POLICY_REVERIFIED's format and guards against a rollback to a
// stale date; the LIVE "is it > N days old NOW" staleness gate is scripts/ci/assert-policy-fresh.mjs (a CI
// script that may read the real date - engine code may not use Date.now()).
import { describe, it, expect } from 'vitest';
import { POLICY_REVERIFIED, POLICY_VERSION } from '@/engine/caching/policy';

// The date the policy constants were established for this line of work; POLICY_REVERIFIED must not regress before it.
const POLICY_FLOOR = '2026-07-01';

describe('policy staleness (D16)', () => {
  it('POLICY_REVERIFIED is a valid ISO date', () => {
    expect(POLICY_REVERIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(POLICY_REVERIFIED))).toBe(false);
  });

  it('POLICY_REVERIFIED does not regress before the established floor', () => {
    expect(Date.parse(POLICY_REVERIFIED)).toBeGreaterThanOrEqual(Date.parse(POLICY_FLOOR));
  });

  it('POLICY_VERSION is stamped', () => {
    expect(POLICY_VERSION).toMatch(/^0C-/);
  });
});
