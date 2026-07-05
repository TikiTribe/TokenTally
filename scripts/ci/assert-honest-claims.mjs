// D15: fail CI if the SHIPPED copy makes a dishonest accuracy claim (spec §6/§13 non-negotiable floor).
// The precision is scoped per accuracy badge, never a global "±5%"; test coverage was manual, never "100%".
// Scans index.html and the built dist/ (the surface users actually load). Owner: TokenTally CI. Version: 0D.
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// A bare "±5%" accuracy claim (incl. decimal "±5.0%" and prose "±5 percent" variants, ASCII +/-5%), or a
// "100%" adjacent to test/coverage. NOTE: we deliberately do NOT match a bare "5%" with no ± prefix - that
// would false-positive on legitimate mentions (e.g. "a 5% cache hit rate") and on the scoped per-badge copy.
const BANNED = [
  { re: /±\s?5(?:\.\d)?\s?(%|percent)/i, why: 'unqualified "±5%" accuracy claim (precision is scoped per badge)' },
  { re: /\+\s?\/?\s?-\s?5(?:\.\d)?\s?(%|percent)/i, why: 'unqualified "+/-5%" accuracy claim' },
  { re: /100\s*%[^.]{0,30}(test|cover)/i, why: '"100%" test-coverage claim (the scenarios were manual)' },
  { re: /(test|cover)[^.]{0,30}100\s*%/i, why: '"100%" test-coverage claim (the scenarios were manual)' },
  // P2-A17: catch accuracy claims WITHOUT the ± glyph ("accurate to within 5%", "5% accuracy"). The
  // accura/precision anchor keeps this from firing on a legitimate "a 5% cache hit rate".
  { re: /(accura|precision|margin of error)[^.]{0,20}\d+(?:\.\d)?\s?(%|percent)/i, why: 'unqualified numeric accuracy claim (scope it per badge)' },
  { re: /\d+(?:\.\d)?\s?(%|percent)[^.]{0,20}(accura|precision)/i, why: 'unqualified numeric accuracy claim (scope it per badge)' },
];

export function scanText(name, text) {
  const hits = [];
  for (const { re, why } of BANNED) {
    if (re.test(text)) hits.push(`${name}: ${why}`);
  }
  return hits;
}
// Only scan + exit as a CLI, not when imported by a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const offenders = [];
  // P2-A17: also scan the launch-facing docs (explicit allowlist - NOT every *.md, which would pull in stale
  // internal notes and flood the gate).
  for (const doc of ['index.html', 'README.md', 'DEPLOYMENT.md']) {
    if (existsSync(doc)) offenders.push(...scanText(doc, readFileSync(doc, 'utf8')));
  }
  const dir = 'dist';
  if (existsSync(dir)) {
    const walk = (d) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        // include .map (sourcesContent) and .svg - any text asset the deploy actually serves.
        else if (/\.(html|js|css|txt|json|map|svg)$/.test(e)) offenders.push(...scanText(p, readFileSync(p, 'utf8')));
      }
    };
    walk(dir);
  }
  if (offenders.length > 0) {
    console.error('assert-honest-claims FAILED - shipped copy makes an unqualified accuracy claim:');
    for (const o of offenders) console.error('  ' + o);
    process.exit(1);
  }
  console.log('honest-claims: no unqualified ±5% / 100%-coverage claims in the shipped copy.');
}
