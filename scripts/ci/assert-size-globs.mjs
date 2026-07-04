// P2-A18: size-limit silently PASSES a glob that matches zero files (a renamed chunk = a dead budget). This
// preflight fails if any .size-limit.json path matches no built file, so a chunk rename can't disable its
// budget unnoticed. Owner: CI. Version: 2F.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, basename } from 'node:path';

const configs = JSON.parse(readFileSync('.size-limit.json', 'utf8'));
let failed = false;

for (const c of configs) {
  const dir = dirname(c.path); // e.g. dist/assets
  const pattern = basename(c.path); // e.g. index-*.js
  if (!existsSync(dir)) {
    console.error(`assert-size-globs: ${dir} missing — run \`npm run build\` first.`);
    process.exit(1);
  }
  // match the simple `prefix-*.suffix` glob with startsWith/endsWith (no RegExp needed; all budgets use one *).
  const star = pattern.indexOf('*');
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  const matches = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(suffix) && f.length >= prefix.length + suffix.length);
  if (matches.length === 0) {
    console.error(`assert-size-globs FAILED — budget "${c.name}" glob "${c.path}" matched ZERO files (chunk renamed?).`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`size-globs: all ${configs.length} budgets match a built chunk.`);
