// Build-time registry snapshot builder.
// Pure `buildSnapshot` is unit-tested via a golden fixture. `main()` fetches the pinned upstream
// snapshot, verifies its integrity, normalizes it, and writes the bundled artifact. `main()` runs
// only when the script is invoked directly (never during tests), and is intentionally NOT run in
// Phase 0A: PINNED_COMMIT and EXPECTED_SNAPSHOT_SHA256 are placeholders the Phase 0D refresh Action
// sets to a real upstream commit + body hash. Owner: TokenTally engine. Version: Phase 0A.

import { writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeEntry, dedupeRecords, type RawEntry } from '../../src/registry/normalize';
import type { RegistrySnapshot, ModelRecord } from '../../src/types/registry';

// A4: pin to a specific upstream commit SHA, never `main`. The refresh Action (Phase 0D) replaces
// both placeholders atomically with a verified commit + the sha256 of that commit's raw body.
const PINNED_COMMIT = 'REPLACE_WITH_PINNED_SHA';
const EXPECTED_SNAPSHOT_SHA256 = 'REPLACE_WITH_EXPECTED_SHA256';
const SNAPSHOT_URL = `https://raw.githubusercontent.com/AgentOps-AI/tokencost/${PINNED_COMMIT}/tokencost/model_prices.json`;

// Deterministic, locale-independent ordering by the primary key (canonicalId, deployment) so the
// written artifact is byte-stable across machines and CI runs (A11).
function compareRecords(a: ModelRecord, b: ModelRecord): number {
  if (a.canonicalId !== b.canonicalId) return a.canonicalId < b.canonicalId ? -1 : 1;
  if (a.deployment !== b.deployment) return a.deployment < b.deployment ? -1 : 1;
  return 0;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Pure snapshot builder: normalize -> dedupe -> deterministic sort. Reads keys only (never assigns
 * a dynamic key onto a plain object), so a hostile `__proto__` key cannot pollute anything here;
 * `normalizeEntry` (A7) drops it anyway. The `sample_spec` documentation key is ignored (A4).
 */
export function buildSnapshot(
  raw: Record<string, RawEntry>,
  version: string,
  date: string,
): RegistrySnapshot {
  if (!isPlainObject(raw)) throw new Error('registry snapshot root must be a plain object');
  const models: ModelRecord[] = [];
  let droppedCount = 0;
  for (const [rawKey, entry] of Object.entries(raw)) {
    if (rawKey === 'sample_spec') continue; // A4: meta/example entry, not a model; not counted
    const rec = isPlainObject(entry) ? normalizeEntry(rawKey, entry) : null;
    if (rec === null) droppedCount++;
    else models.push(rec);
  }
  const { models: deduped, conflictCount } = dedupeRecords(models);
  return {
    snapshotVersion: version,
    snapshotDate: date,
    droppedCount,
    conflictCount,
    models: [...deduped].sort(compareRecords),
  };
}

async function main(): Promise<void> {
  // A4: fail closed if the pin is not a real 40-hex commit SHA.
  if (!/^[0-9a-f]{40}$/.test(PINNED_COMMIT)) {
    throw new Error(
      `PINNED_COMMIT is not a 40-hex commit SHA (got "${PINNED_COMMIT}"). ` +
        'Set it (and EXPECTED_SNAPSHOT_SHA256) to a verified upstream commit before building.',
    );
  }
  const res = await fetch(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`snapshot fetch failed: ${res.status} ${SNAPSHOT_URL}`);
  const body = await res.text();
  // A4: verify the fetched body against the committed hash before parsing (supply-chain gate).
  const actualSha = createHash('sha256').update(body).digest('hex');
  if (actualSha !== EXPECTED_SNAPSHOT_SHA256) {
    throw new Error(
      `snapshot sha256 mismatch: expected ${EXPECTED_SNAPSHOT_SHA256}, got ${actualSha}`,
    );
  }
  const parsed: unknown = JSON.parse(body);
  if (!isPlainObject(parsed)) throw new Error('fetched snapshot is not a JSON object');
  // Date is passed by CI env to keep the build reproducible; no Date.now() in engine code.
  const date = process.env.SNAPSHOT_DATE ?? '1970-01-01';
  const snap = buildSnapshot(parsed as Record<string, RawEntry>, PINNED_COMMIT, date);
  // A4: atomic write (temp file + rename) so a crash mid-write never leaves a partial artifact.
  const target = new URL('../../src/config/registry.generated.json', import.meta.url);
  const tmp = new URL('../../src/config/registry.generated.json.tmp', import.meta.url);
  writeFileSync(tmp, JSON.stringify(snap));
  renameSync(tmp, target);
  console.log(
    `registry: ${snap.models.length} models, ${snap.droppedCount} dropped, ${snap.conflictCount} conflicts`,
  );
}

// Only run when invoked directly, not when imported by a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
