// P2-A7 (was P1-A25): the Phase-1 workload/optimization/engine graph must stay OUT of the first-paint
// entry chunk. The OLD gate grepped the MINIFIED entry .js for identifier names (denialOfWallet, ...),
// which esbuild renames (denialOfWallet -> t) — empirically proven blind. The real, minifier-IMMUNE gate:
// the `firstPaintLeanGuard` Vite plugin (vite.config.ts) writes `dist/.first-paint-entry-modules.json` —
// the entry chunk's actual pre-minification module ids — and this script fails if any resolve under the
// engine source dirs. A deliberate-leak unit test exercises `findEngineLeaks`. Owner: CI. Version: 0D/P2.
import { readFileSync, existsSync } from 'node:fs';

// A module id (rollup gives absolute source paths) that belongs to the lazy engine graph, never first-paint.
export const ENGINE_LEAK_RE = /[\\/]src[\\/](engine|workloads|optimization|registry|tokenizer)[\\/]/;
export const GENERATED_REGISTRY_RE = /registry\.generated\.json$/;

export function findEngineLeaks(moduleIds) {
  return moduleIds.filter((id) => typeof id === 'string' && (ENGINE_LEAK_RE.test(id) || GENERATED_REGISTRY_RE.test(id)));
}

// Only run as a CLI, not when imported by the unit test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const report = 'dist/.first-paint-entry-modules.json';
  if (!existsSync(report)) {
    console.error(
      `assert-first-paint-lean: ${report} missing — run \`npm run build\` (the firstPaintLeanGuard plugin writes it).`,
    );
    process.exit(1);
  }
  const moduleIds = JSON.parse(readFileSync(report, 'utf8'));
  if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
    console.error(`assert-first-paint-lean: ${report} is empty/invalid — the entry chunk had no modules?`);
    process.exit(1);
  }
  const leaks = findEngineLeaks(moduleIds);
  if (leaks.length > 0) {
    console.error('assert-first-paint-lean FAILED — the first-paint entry chunk statically pulled in the engine graph:');
    for (const l of leaks) console.error('  ' + l);
    console.error('Reach @/workloads, @/optimization, @/registry, @/tokenizer via dynamic import() only (P2-A7).');
    process.exit(1);
  }
  console.log(`first-paint-lean: entry chunk (${moduleIds.length} modules) is free of the engine graph.`);
}
