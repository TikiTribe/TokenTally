// D16: fail CI when the cache policy constants have not been re-verified within the staleness window.
// This is a CI script (not engine code), so it may read the real date. Providers reprice caching/TTLs; a
// stale POLICY_REVERIFIED means WRITE_MULT / T_EFF (and thus every warm-cost + break-even number) may have
// drifted. Re-verify the constants against provider docs and bump POLICY_REVERIFIED + POLICY_VERSION.
// Owner: TokenTally CI. Version: 0D.
import { readFileSync } from 'node:fs';

const MAX_AGE_DAYS = 90;
const src = readFileSync(new URL('../../src/engine/caching/policy.ts', import.meta.url), 'utf8');
const m = src.match(/POLICY_REVERIFIED\s*=\s*'(\d{4}-\d{2}-\d{2})'/);
if (m === null) {
  console.error('assert-policy-fresh: could not find POLICY_REVERIFIED in policy.ts');
  process.exit(1);
}
const reverified = Date.parse(m[1]);
const ageDays = (Date.now() - reverified) / 86_400_000;
if (ageDays > MAX_AGE_DAYS) {
  console.error(
    `assert-policy-fresh FAILED: cache policy constants last re-verified ${m[1]} ` +
      `(${Math.round(ageDays)} days ago, > ${MAX_AGE_DAYS}). Re-verify WRITE_MULT/T_EFF against provider ` +
      `docs and bump POLICY_REVERIFIED + POLICY_VERSION.`,
  );
  process.exit(1);
}
console.log(`policy fresh: re-verified ${m[1]} (${Math.round(ageDays)} days ago, <= ${MAX_AGE_DAYS}).`);
