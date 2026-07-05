// Phase 2A trust surface: an always-visible "data as of {snapshotDate}" stamp with the snapshot version and
// the price-provenance disclaimer (P2-A22: the tokencost pin gives byte-integrity, NOT price authenticity -
// the Exact tokenizer badge must not imply prices are verified against provider billing). All text nodes.
// Owner: TokenTally UI. Version: Phase 2A.
import { useAppStore } from '@/store/useAppStore';

export function SnapshotStamp(): JSX.Element {
  const status = useAppStore((s) => s.registryStatus);
  const meta = useAppStore((s) => s.snapshotMeta);

  return (
    <aside aria-label="Pricing data provenance" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
      {status === 'ready' && meta ? (
        <>
          <span>Pricing data as of {meta.snapshotDate}</span>
          <span> · snapshot {meta.snapshotVersion.slice(0, 8)}</span>
          <span> · {meta.droppedCount} entries dropped</span>
          <p style={{ margin: '0.25rem 0 0' }}>
            Prices are sourced from community-mirrored LiteLLM data and are not independently verified against
            provider billing; the accuracy badge reflects token-count fidelity only.
          </p>
        </>
      ) : status === 'error' ? (
        <span style={{ color: 'var(--danger)' }}>Pricing data failed to load. Figures unavailable.</span>
      ) : (
        <span>Loading pricing data…</span>
      )}
    </aside>
  );
}
