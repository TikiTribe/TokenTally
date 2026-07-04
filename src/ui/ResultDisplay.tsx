// Phase 2C result surface for the active mode. Reads store.result (an EngineResult). Renders: a headline
// cost in an aria-live region, the conservative (p_warm=0) reference, the confidence band (or "point
// estimate, variance unmodeled" when unmodeled), the accuracy note, the waterfall, and a trust line linking
// the formula + snapshotVersion (§6/§12). NEVER a silent $0: 'unavailable' and DoW-disabled/unmodeled/zero
// render honest text (P2-A9/A20). Owner: TokenTally UI. Version: Phase 2C.
import { useAppStore } from '@/store/useAppStore';
import { CostWaterfall } from '@/viz/CostWaterfall';
import type { WorkloadForecast } from '@/workloads';
import type { DenialOfWalletResult } from '@/optimization';

const money = (n: number): string => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function WorkloadResult({ f }: { f: WorkloadForecast }): JSX.Element {
  const c = f.cost;
  if (!c.applicable) {
    return <p style={{ color: 'var(--text-muted)' }}>{f.accuracyNote}</p>; // non-per_token etc — honest note, not $0
  }
  const band = c.confidence;
  return (
    <div>
      <output aria-live="polite" style={{ display: 'block', fontSize: '2rem', fontWeight: 700 }}>
        {money(f.monthlyCost)} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ month</span>
      </output>
      <p style={{ margin: '0.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {band.unmodeled
          ? 'Point estimate; variance unmodeled.'
          : `Range ${money(band.low)} – ${money(band.high)} · conservative (no warm cache) ${money(c.conservativeTotal)}`}
      </p>
      <p><span className="badge badge-estimate">{f.accuracyNote}</span></p>
      <CostWaterfall waterfall={c.waterfall} />
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Formula: {f.formula} · priced against snapshot {f.snapshotVersion.slice(0, 8)}
      </p>
    </div>
  );
}

function DowResult({ r }: { r: DenialOfWalletResult }): JSX.Element {
  // P2-A9/A20: never a silent $0 — disabled/unmodeled/zero renders the honest note.
  if (!r.enabled || r.confidence.unmodeled || r.worstCaseMonthly === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>{r.note}</p>;
  }
  return (
    <div>
      <output aria-live="polite" style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700 }}>
        Worst-case exposure: {money(r.worstCaseMonthly)} / month
      </output>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{r.note}</p>
      <ul>
        {r.mitigations.map((m) => (
          <li key={m.control}>
            {m.control}: saves {money(m.savedMonthly)}/mo
          </li>
        ))}
      </ul>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formula: {r.formula} · snapshot {r.snapshotVersion.slice(0, 8)}</p>
    </div>
  );
}

export function ResultDisplay(): JSX.Element {
  const result = useAppStore((s) => s.result);
  const registryStatus = useAppStore((s) => s.registryStatus);

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Cost forecast</h2>
      {registryStatus !== 'ready' ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading pricing data…</p>
      ) : result === null ? (
        <p style={{ color: 'var(--text-muted)' }}>Enter your workload to see a forecast.</p>
      ) : result.kind === 'unavailable' ? (
        <p style={{ color: 'var(--text-muted)' }}>{result.reason}</p>
      ) : result.kind === 'workload' ? (
        <WorkloadResult f={result.forecast} />
      ) : (
        <DowResult r={result.result} />
      )}
    </div>
  );
}
