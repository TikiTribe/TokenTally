// Cost waterfall: each WarmCostResult.waterfall component as a labeled bar. Human labels (not raw engine ids),
// a visible heading, zero-cost cache rows hidden (a no-cache model should not show empty "Cache writes $0"
// noise), and bars scaled to the largest real component. A null-cost component (a non-per_token native-unit
// line) shows its native rate, never a $0 bar. Owner: TokenTally UI.
import type { CostWaterfall as CostWaterfallData } from '@/types/engine';
import { money, waterfallLabel, waterfallHelp } from '@/ui/format';
import { ChartTip } from '@/ui/ChartTooltip';

export function CostWaterfall(props: { waterfall: CostWaterfallData }): JSX.Element | null {
  // Hide zero-cost cache rows: without caching (or a cached prefix) they are just noise (#16).
  const comps = props.waterfall.components.filter(
    (c) => !((c.label === 'cacheWrite' || c.label === 'cacheReads') && (c.cost ?? 0) === 0),
  );
  if (comps.length === 0) return null;
  // Scale to the largest real component, not a floored $1, so sub-dollar bars are not slivers (#17).
  const max = Math.max(Number.MIN_VALUE, ...comps.map((c) => c.cost ?? 0));
  return (
    <figure role="group" aria-label="Monthly cost breakdown" style={{ margin: '1.25rem 0 0' }}>
      <figcaption style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
        Cost breakdown
      </figcaption>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {comps.map((c) => (
          // ChartTip: a visible hover/focus tooltip explaining what this component is and why it costs what it
          // does (the "hover any item" ask - native title was invisible to users).
          <ChartTip
            key={c.label}
            as="li"
            content={waterfallHelp(c.label)}
            style={{ display: 'grid', gridTemplateColumns: '9rem 1fr 6rem', alignItems: 'center', gap: '0.5rem', cursor: 'help' }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{waterfallLabel(c.label)}</span>
            <span aria-hidden="true" style={{ background: 'var(--surface-2)', borderRadius: 3, height: '0.9rem' }}>
              <span style={{ display: 'block', height: '100%', width: `${((c.cost ?? 0) / max) * 100}%`, background: 'var(--primary)', borderRadius: 3 }} />
            </span>
            <span data-testid={`waterfall-${c.label}`} style={{ fontSize: '0.85rem', textAlign: 'right' }}>
              {c.cost === null
                ? `${c.nativeRate ?? 'n/a'} / M ${c.nativeUnit ?? 'unit'}`
                : money(c.cost)}
            </span>
          </ChartTip>
        ))}
      </ul>
    </figure>
  );
}
