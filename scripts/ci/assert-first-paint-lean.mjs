// P1-A25: the Phase-1 workload + optimization engine must stay OUT of the first-paint entry chunk. Today
// nothing imports them, so they tree-shake away entirely; when Phase 2 wires them it MUST use dynamic
// import() (code-split per mode), never a top-level import in a first-paint component. This gate greps the
// built entry chunk for tell-tale engine symbols and fails if they leaked into first-paint. Owner: CI. 0D/1.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_DIR = 'dist/assets';
// Distinctive identifiers that only appear if the workloads/optimization/registry graph is in the chunk.
const FORBIDDEN = ['denialOfWallet', 'crewForecast', 'monthlyWarmCost', 'DOW_VDP_URL', 'bandedAccumulatedCost'];

if (!existsSync(ASSET_DIR)) {
  console.error('assert-first-paint-lean: no dist/assets — run `npm run build` first.');
  process.exit(1);
}

const entry = readdirSync(ASSET_DIR).find((f) => /^index-.*\.js$/.test(f));
if (!entry) {
  console.error('assert-first-paint-lean: no entry chunk index-*.js found.');
  process.exit(1);
}

const code = readFileSync(join(ASSET_DIR, entry), 'utf8');
const leaked = FORBIDDEN.filter((sym) => code.includes(sym));
if (leaked.length > 0) {
  console.error(`assert-first-paint-lean FAILED — entry chunk ${entry} pulled in engine symbols:`);
  for (const s of leaked) console.error('  ' + s);
  console.error('Reach @/workloads and @/optimization via dynamic import() only (P1-A25).');
  process.exit(1);
}
console.log(`first-paint-lean: entry chunk ${entry} is free of the workload/optimization engine graph.`);
