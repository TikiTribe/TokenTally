// D15: fail CI if the SHIPPED copy makes a dishonest accuracy claim (spec §6/§13 non-negotiable floor).
// The precision is scoped per accuracy badge, never a global "±5%"; test coverage was manual, never "100%".
// Scans index.html and the built dist/ (the surface users actually load). Owner: TokenTally CI. Version: 0D.
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// A bare "±5%" (or ASCII +/-5%, +-5%) accuracy claim, or a "100%" adjacent to test/coverage.
const BANNED = [
  { re: /±\s*5\s*%/, why: 'unqualified "±5%" accuracy claim (precision is scoped per badge)' },
  { re: /\+\s*\/?\s*-\s*5\s*%/, why: 'unqualified "+/-5%" accuracy claim' },
  { re: /100\s*%[^.]{0,30}(test|cover)/i, why: '"100%" test-coverage claim (the scenarios were manual)' },
  { re: /(test|cover)[^.]{0,30}100\s*%/i, why: '"100%" test-coverage claim (the scenarios were manual)' },
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
  if (existsSync('index.html')) offenders.push(...scanText('index.html', readFileSync('index.html', 'utf8')));
  const dir = 'dist';
  if (existsSync(dir)) {
    const walk = (d) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(html|js|css|txt|json)$/.test(e)) offenders.push(...scanText(p, readFileSync(p, 'utf8')));
      }
    };
    walk(dir);
  }
  if (offenders.length > 0) {
    console.error('assert-honest-claims FAILED — shipped copy makes an unqualified accuracy claim:');
    for (const o of offenders) console.error('  ' + o);
    process.exit(1);
  }
  console.log('honest-claims: no unqualified ±5% / 100%-coverage claims in the shipped copy.');
}
