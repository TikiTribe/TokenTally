// Phase 2C result surface for the active mode. Reads store.result (an EngineResult). Renders: a headline
// cost in an aria-live region, the conservative (p_warm=0) reference, the confidence band (or "point
// estimate, variance unmodeled" when unmodeled), the accuracy note, the waterfall, and a trust line linking
// the formula + snapshotVersion (§6/§12). NEVER a silent $0: 'unavailable' and DoW-disabled/unmodeled/zero
// render honest text (P2-A9/A20). Owner: TokenTally UI. Version: Phase 2C.
import { useAppStore } from '@/store/useAppStore';
import { CostWaterfall } from '@/viz/CostWaterfall';
import { StepAccumulationChart } from '@/viz/StepAccumulationChart';
import { TornadoChart } from '@/viz/TornadoChart';
import { ExportButtons } from '@/ui/ExportButtons';
import { HelpTip } from '@/ui/HelpTip';
import { money } from '@/ui/format';
import type { WorkloadForecast } from '@/workloads';
import type { ConfidenceRange } from '@/types/engine';
import type { DenialOfWalletResult, TornadoBar } from '@/optimization';

// Plain-language definitions for the jargon each summary line uses, surfaced on hover/focus via HelpTip so a
// non-expert can decode "point estimate", "warm cache", "break-even", and the DoW ceiling (audit #8/#9/#10/#20/#21).
function confidenceHelp(band: ConfidenceRange): string {
  if (band.unmodeled) {
    return 'A point estimate is a single expected cost. This workload has no modeled source of cost variance (no prompt caching in play), so there is no range to show.';
  }
  if (band.low === band.high) {
    return 'A point estimate is a single expected cost. The range collapses here because there is no warm-cache saving to model, so the estimate and the conservative (cold-cache) figure are the same.';
  }
  return 'Your cost depends on how often a cached system prompt is still warm (recently used) when the next message arrives. A warm cache reuses the prompt at a low rate; a cold cache pays the full write again. The low end assumes the cache stays warm; the conservative high end assumes it never does. Your real cost sits between them.';
}
const CACHE_HELP =
  'A warm cache reuses your system prompt at a fraction of its first-time price. Break-even is the monthly message volume at which those savings pay back the one-time cost of writing the prompt into the cache. Arrivals are incoming messages per month.';
const DOW_NOTE_HELP =
  'Worst case assumes an attacker sends the largest request the model allows: a prompt that fills the whole context window, the maximum output, and any reasoning tokens, with no cache reuse (the most expensive path). It is a ceiling for setting spend limits, not a prediction.';
const DOW_FORMULA_HELP =
  'The arithmetic behind the ceiling: requests times retries, times the cost of one maximum-size request (full context input, maximum output, and reasoning), priced with no warm cache so nothing is discounted.';

// Accuracy badge colour tracks the model's tier, read from the note prefix (#22: it was always "estimate").
function badgeClass(note: string): string {
  if (note.startsWith('exact')) return 'badge badge-exact';
  if (note.startsWith('approx')) return 'badge badge-approx';
  return 'badge badge-estimate';
}

function confidenceLine(low: number, high: number, conservative: number): string {
  // #23: no fake "Range $X to $X" when the band collapses (exact tokenizer + no cache variance).
  if (low === high) {
    return conservative > high
      ? `Point estimate · conservative, no warm cache ${money(conservative)}`
      : 'Point estimate (no modeled cost variance).';
  }
  return `Range ${money(low)} to ${money(high)} · conservative, no warm cache ${money(conservative)}`;
}

function WorkloadResult({ f, tornado }: { f: WorkloadForecast; tornado: TornadoBar[] }): JSX.Element {
  const c = f.cost;
  if (!c.applicable) {
    return <p style={{ color: 'var(--text-muted)' }}>{f.accuracyNote}</p>; // non-per_token etc - honest note, not $0
  }
  const band = c.confidence;
  return (
    <div>
      <output data-testid="headline-cost" aria-live="polite" style={{ display: 'block', fontSize: '2rem', fontWeight: 700 }}>
        {money(f.monthlyCost)} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ month</span>
      </output>
      <p data-testid="confidence-line" style={{ margin: '0.25rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {band.unmodeled ? 'Point estimate. Variance unmodeled.' : confidenceLine(band.low, band.high, c.conservativeTotal)}{' '}
        <HelpTip tipId="tip-confidence" content={confidenceHelp(band)} />
      </p>
      <p><span className={badgeClass(f.accuracyNote)} data-testid="accuracy-badge">{f.accuracyNote}</span></p>
      {/* §13 cut line: the cross-run warm-cache view + break-even. */}
      {c.warmth !== null || c.breakEvenArrivals !== null ? (
        <p data-testid="cache-line" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {c.savingsUpTo.central > 0 ? `Caching saves up to ${money(c.savingsUpTo.central)}/mo. ` : ''}
          {c.breakEvenArrivals !== null && Number.isFinite(c.breakEvenArrivals)
            ? `Warm-cache break-even at ~${Math.round(c.breakEvenArrivals).toLocaleString()} arrivals/mo.`
            : ''}{' '}
          <HelpTip tipId="tip-cache" content={CACHE_HELP} />
        </p>
      ) : null}
      <CostWaterfall waterfall={c.waterfall} />
      <StepAccumulationChart steps={f.steps} />
      <TornadoChart bars={tornado} central={f.monthlyCost} />
      <p data-testid="formula-line" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Formula: {f.formula} · priced against snapshot {f.snapshotVersion.slice(0, 8)}
      </p>
    </div>
  );
}

function DowResult({ r }: { r: DenialOfWalletResult }): JSX.Element {
  // P2-A9/A20: never a silent $0 - disabled/unmodeled/zero renders the honest note.
  if (!r.enabled || r.confidence.unmodeled || r.worstCaseMonthly === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>{r.note}</p>;
  }
  return (
    <div>
      {/* F-SEC-2/P2-A20: the guardrail travels WITH the figure - disclaimer + VDP link render before the number,
          not only in the (unmountable) input panel. */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.disclaimer}</p>
      <p style={{ fontSize: '0.85rem' }}>
        Report a vulnerability: <a href={r.vdpUrl} style={{ color: 'var(--primary)' }} rel="noreferrer">{r.vdpUrl}</a>
      </p>
      <output data-testid="dow-exposure" aria-live="polite" style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700 }}>
        Worst-case exposure: {money(r.worstCaseMonthly)} / month
      </output>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {r.note} <HelpTip tipId="tip-dow-note" content={DOW_NOTE_HELP} />
      </p>
      <ul data-testid="dow-mitigations">
        {r.mitigations.map((m) => (
          <li key={m.control}>
            {m.control}: saves {money(m.savedMonthly)}/mo
          </li>
        ))}
      </ul>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Formula: {r.formula} · snapshot {r.snapshotVersion.slice(0, 8)} <HelpTip tipId="tip-dow-formula" content={DOW_FORMULA_HELP} />
      </p>
    </div>
  );
}

export function ResultDisplay(): JSX.Element {
  const result = useAppStore((s) => s.result);
  const registryStatus = useAppStore((s) => s.registryStatus);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Cost forecast</h2>
      {registryStatus !== 'ready' ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading pricing data…</p>
      ) : status === 'error' ? (
        // Never a silent failure: surface the recompute error rather than leaving a stale/blank result.
        <p role="alert" style={{ color: 'var(--danger)' }}>Could not price this workload: {error ?? 'unknown error'}</p>
      ) : result === null ? (
        <p style={{ color: 'var(--text-muted)' }}>Enter your workload to see a forecast.</p>
      ) : result.kind === 'unavailable' ? (
        <p style={{ color: 'var(--text-muted)' }}>{result.reason}</p>
      ) : result.kind === 'workload' ? (
        <WorkloadResult f={result.forecast} tornado={result.tornado} />
      ) : (
        <DowResult r={result.result} />
      )}
      <ExportButtons />
    </div>
  );
}
