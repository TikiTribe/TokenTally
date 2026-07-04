// §5.8 export controls. CSV (Blob) + PDF (lazy jsPDF). Shown only for a computed forecast. Owner: TokenTally
// UI. Version: Phase 3.
import { useAppStore } from '@/store/useAppStore';
import { exportCsv, exportPdf } from '@/export/exportActions';

export function ExportButtons(): JSX.Element | null {
  const result = useAppStore((s) => s.result);
  const mode = useAppStore((s) => s.mode);
  const selection = useAppStore((s) => s.selection[mode]);
  const snapshotMeta = useAppStore((s) => s.snapshotMeta);

  if (!result || result.kind === 'unavailable' || !snapshotMeta) return null;
  const label = `${selection.canonicalId} (${selection.deployment})`;
  const date = snapshotMeta.snapshotDate;

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
      <button className="btn-secondary" onClick={() => exportCsv(result, mode, label, date)}>Export CSV</button>
      <button className="btn-secondary" onClick={() => void exportPdf(result, mode, label, date)}>Export PDF</button>
    </div>
  );
}
