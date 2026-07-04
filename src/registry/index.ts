// Runtime registry query API. The single public entry point every UI and engine consumer uses.
// Pure lookups over an in-memory snapshot; no network, no Date.now(). Owner: TokenTally engine.
// Version: Phase 0A.

import type { RegistrySnapshot, ModelRecord } from '@/types/registry';

let current: RegistrySnapshot | null = null;
const byKey = new Map<string, ModelRecord>();
const byCanonical = new Map<string, ModelRecord[]>();

const key = (id: string, deployment: string): string => `${id}|${deployment}`;

export function loadRegistry(snap: RegistrySnapshot): void {
  // Build into fresh maps first, so a duplicate-key throw (A3) leaves the previously loaded
  // registry intact rather than half-cleared (transactional load).
  const nextByKey = new Map<string, ModelRecord>();
  const nextByCanonical = new Map<string, ModelRecord[]>();
  for (const m of snap.models) {
    const k = key(m.canonicalId, m.deployment);
    if (nextByKey.has(k)) {
      // A3: dedupeRecords guarantees one record per (canonicalId, deployment) upstream. A collision
      // here means a corrupt or hand-edited snapshot; fail loud rather than silently shadow a SKU.
      throw new Error(`registry: duplicate (canonicalId, deployment) key "${k}"`);
    }
    nextByKey.set(k, m);
    const list = nextByCanonical.get(m.canonicalId) ?? [];
    list.push(m);
    nextByCanonical.set(m.canonicalId, list);
  }
  current = snap;
  byKey.clear();
  for (const [k, v] of nextByKey) byKey.set(k, v);
  byCanonical.clear();
  for (const [k, v] of nextByCanonical) byCanonical.set(k, v);
}

export function getModel(id: string, deployment: string): ModelRecord | null {
  return byKey.get(key(id, deployment)) ?? null;
}

export function getDeployments(canonicalId: string): ModelRecord[] {
  return byCanonical.get(canonicalId) ?? [];
}

export function listByMode(mode: ModelRecord['mode']): ModelRecord[] {
  return (current?.models ?? []).filter((m) => m.mode === mode);
}

export function getSnapshotMeta(): {
  snapshotVersion: string;
  snapshotDate: string;
  droppedCount: number;
} {
  if (!current) throw new Error('registry not loaded');
  const { snapshotVersion, snapshotDate, droppedCount } = current;
  return { snapshotVersion, snapshotDate, droppedCount };
}
