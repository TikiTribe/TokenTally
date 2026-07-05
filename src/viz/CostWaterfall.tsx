// Phase 2C hand-rolled cost waterfall (no recharts - exact control of the never-silent-$0 branch, C9/P2).
// Renders each WarmCostResult.waterfall component as a labeled bar; a component with a null cost (a
// non-per_token native-unit line) renders its native rate/unit, NEVER a $0 bar. All text nodes; a
// visually-hidden data table is the a11y alternative. Owner: TokenTally UI. Version: Phase 2C.
import type { CostWaterfall as CostWaterfallData } from '@/types/engine';

const money = (n: number): string => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function CostWaterfall(props: { waterfall: CostWaterfallData }): JSX.Element {
  const comps = props.waterfall.components;
  const max = Math.max(1, ...comps.map((c) => c.cost ?? 0));
  return (
    <figure role="group" aria-label="Monthly cost breakdown" style={{ margin: '1rem 0' }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {comps.map((c) => (
          <li key={c.label} style={{ display: 'grid', gridTemplateColumns: '9rem 1fr 6rem', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.label}</span>
            <span aria-hidden="true" style={{ background: 'var(--surface-2)', borderRadius: 3, height: '0.9rem' }}>
              <span style={{ display: 'block', height: '100%', width: `${((c.cost ?? 0) / max) * 100}%`, background: 'var(--primary)', borderRadius: 3 }} />
            </span>
            <span data-testid={`waterfall-${c.label}`} style={{ fontSize: '0.85rem', textAlign: 'right' }}>
              {c.cost === null
                ? `${c.nativeRate ?? '-'} / M ${c.nativeUnit ?? 'unit'}`
                : money(c.cost)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
