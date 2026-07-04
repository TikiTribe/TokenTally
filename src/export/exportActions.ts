// §5.8 export triggers. CSV is a same-origin Blob download (no dep). PDF lazy-imports jsPDF so it stays out
// of first-paint. All values are already sanitized (CSV) or drawn as jsPDF text (no HTML). Owner: TokenTally
// export. Version: Phase 3.
import { forecastToCsv } from '@/export/csv';
import type { EngineResult } from '@/store/engineClient';

function download(filename: string, mime: string, data: BlobPart): void {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(result: EngineResult, mode: string, modelLabel: string, snapshotDate: string): void {
  download(`tokentally-${mode}.csv`, 'text/csv;charset=utf-8', forecastToCsv(result, mode, modelLabel, snapshotDate));
}

export async function exportPdf(result: EngineResult, mode: string, modelLabel: string, snapshotDate: string): Promise<void> {
  const { jsPDF } = await import('jspdf'); // lazy: jsPDF stays out of first-paint
  const doc = new jsPDF();
  let y = 16;
  const line = (text: string, size = 11): void => {
    doc.setFontSize(size);
    doc.text(text, 14, y);
    y += size * 0.6;
  };
  line('TokenTally cost forecast', 16);
  line(`Mode: ${mode}`);
  line(`Model: ${modelLabel}`);
  line(`Pricing data as of ${snapshotDate}`);
  y += 4;
  if (result.kind === 'workload') {
    const f = result.forecast;
    line(`Monthly cost: $${f.monthlyCost.toFixed(2)}`, 14);
    line(`Range: $${f.cost.confidence.low.toFixed(2)} - $${f.cost.confidence.high.toFixed(2)}`);
    line(`Conservative (no warm cache): $${f.cost.conservativeTotal.toFixed(2)}`);
    line(`Accuracy: ${f.accuracyNote}`);
    line(`Snapshot: ${f.snapshotVersion.slice(0, 12)}`);
  } else if (result.kind === 'dow') {
    line(`Denial-of-Wallet worst case: ${result.result.enabled ? '$' + result.result.worstCaseMonthly.toFixed(2) : 'disabled'}`);
    line(result.result.note, 9);
  } else {
    line(result.reason);
  }
  doc.save(`tokentally-${mode}.pdf`);
}
