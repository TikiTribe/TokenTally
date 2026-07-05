// One-at-a-time sensitivity: vary each named numeric factor by ±pct around the base and record the cost
// swing, sorted so the biggest lever is first. The UI renders these as a tornado chart. P1-A28: `factors`
// is untrusted input - every factor is validated against the per-workload numeric allowlist (which rejects
// __proto__/constructor/prototype), so a hostile field name yields a zero-swing bar and never writes an
// unexpected key. Pure. Owner: engine. Version: Phase 1.
import { numField, isAllowedNumericField, type OptimizationBase, type WorkloadConfig } from '@/optimization/candidates';
import { priceWorkload } from '@/optimization/price';

export interface TornadoBar {
  factor: string;
  low: number; // cost at factor*(1-pct)
  high: number; // cost at factor*(1+pct)
  swing: number; // |high - low|
}

export function tornado(base: OptimizationBase, factors: string[], pct = 0.2): TornadoBar[] {
  const p = Math.abs(pct);
  const bars: TornadoBar[] = factors.map((factor) => {
    if (!isAllowedNumericField(base.kind, factor)) return { factor, low: 0, high: 0, swing: 0 };
    const cur = numField(base.config, factor);
    const low = priceWorkload(base.kind, { ...base.config, [factor]: cur * (1 - p) } as WorkloadConfig);
    const high = priceWorkload(base.kind, { ...base.config, [factor]: cur * (1 + p) } as WorkloadConfig);
    return { factor, low: low.monthlyCost, high: high.monthlyCost, swing: Math.abs(high.monthlyCost - low.monthlyCost) };
  });
  return bars.sort((a, b) => b.swing - a.swing);
}
