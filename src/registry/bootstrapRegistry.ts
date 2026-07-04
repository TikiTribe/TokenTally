// P2-A3/2A: the lazy registry bootstrap. This is a DYNAMIC-import target (never top-level-imported by any
// first-paint module) so the 573 KB generated catalog + the loadRegistry runtime stay out of the entry
// chunk (first-paint-lean gate). Loads the committed, hash-verified snapshot and returns its metadata.
// Owner: TokenTally UI. Version: Phase 2A.
import registrySnapshot from '@/config/registry.generated.json';
import { loadRegistry, getSnapshotMeta } from '@/registry';
import type { RegistrySnapshot } from '@/types/registry';
import type { SnapshotMeta } from '@/store/types';

let loaded = false;

export function bootstrapRegistry(): SnapshotMeta {
  if (!loaded) {
    loadRegistry(registrySnapshot as unknown as RegistrySnapshot);
    loaded = true;
  }
  return getSnapshotMeta();
}
