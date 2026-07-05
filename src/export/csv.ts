// §5.8: build a CSV of the current forecast. Every cell goes through sanitizeForCSV (formula-injection
// safe). Pure - takes the already-computed result + labels. Owner: TokenTally export. Version: Phase 3.
import { csvRow } from '@/export/sanitize';
import type { EngineResult } from '@/store/engineClient';

export function forecastToCsv(result: EngineResult, mode: string, modelLabel: string, snapshotDate: string): string {
  const lines: string[] = [
    csvRow(['TokenTally cost forecast']),
    csvRow(['Mode', mode]),
    csvRow(['Model', modelLabel]),
    csvRow(['Pricing data as of', snapshotDate]),
    csvRow(['Note', 'Prices from community-mirrored LiteLLM data; not verified against provider billing.']),
    '',
  ];
  if (result.kind === 'workload') {
    const f = result.forecast;
    const c = f.cost;
    lines.push(
      csvRow(['Monthly cost (USD)', f.monthlyCost.toFixed(2)]),
      csvRow(['Confidence low', c.confidence.low.toFixed(2)]),
      csvRow(['Confidence high', c.confidence.high.toFixed(2)]),
      csvRow(['Conservative (no warm cache)', c.conservativeTotal.toFixed(2)]),
      csvRow(['Accuracy', f.accuracyNote]),
      csvRow(['Formula', f.formula]),
      csvRow(['Snapshot version', f.snapshotVersion]),
      '',
      csvRow(['Cost component', 'USD/month']),
    );
    for (const comp of c.waterfall.components) {
      lines.push(csvRow([comp.label, comp.cost === null ? `${comp.nativeRate ?? ''}/M ${comp.nativeUnit ?? ''}` : comp.cost.toFixed(4)]));
    }
  } else if (result.kind === 'dow') {
    const r = result.result;
    lines.push(
      csvRow(['Denial-of-Wallet worst-case (USD/month)', r.enabled ? r.worstCaseMonthly.toFixed(2) : 'disabled']),
      csvRow(['Note', r.note]),
      csvRow(['Disclaimer', r.disclaimer]),
    );
  } else {
    lines.push(csvRow(['Result', result.reason]));
  }
  return lines.join('\r\n');
}
