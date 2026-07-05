// Cache-warmth curve (§5.7): monthly cost as the arrival rate rises and the cache warms. Central estimate line,
// the [low, high] confidence band, a dashed conservative (cold-cache) reference, and a break-even marker. Only
// meaningful for models that cache; a non-caching model gets honest text instead of a fake curve. recharts is
// lazy-loaded (never in first-paint) and its Tooltip gives hover-anywhere-along-x explanation. Owner: TokenTally UI.
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { chartTheme } from '@/ui/charts/chartTheme';
import { money } from '@/ui/format';
import { VizFigure } from '@/viz/vizA11y';
import type { WarmthPoint } from '@/store/engineClient';

export function CacheWarmthCurve(props: { points: WarmthPoint[] | null; breakEven: number | null }): JSX.Element | null {
  // Re-read the resolved theme colors whenever the store theme flips (recharts needs concrete colors).
  const theme = useAppStore((s) => s.theme);
  void theme;
  const t = chartTheme();
  const points = props.points;
  if (points === null) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '1.25rem 0 0' }}>
        This model has no warm-cache dynamics, so cost is flat per message regardless of volume.
      </p>
    );
  }
  if (points.length < 2) return null;

  return (
    <VizFigure
      label="Cache warmth: monthly cost as arrivals rise"
      caption="Cache warmth"
      subcaption="more arrivals keep the cache warm, so cost per message falls"
      columns={['Arrivals / mo', 'Central', 'Low', 'High', 'Conservative']}
      rows={points.map((p) => [p.arrivals.toLocaleString('en-US'), money(p.central), money(p.low), money(p.high), money(p.conservative)])}
    >
      <ResponsiveContainer width="100%" height={200}>
        {/* bandFloor + bandHeight are a stacked pair so the shaded band spans [low, high], NOT [0, high] - an
            area anchored at $0 would falsely imply the cost could fall to zero (review L1). */}
        <ComposedChart
          data={points.map((p) => ({ ...p, bandFloor: p.low, bandHeight: Math.max(0, p.high - p.low) }))}
          margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
        >
          <XAxis dataKey="arrivals" tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => Number(v).toLocaleString('en-US')} />
          <YAxis tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => money(Number(v))} width={64} />
          <Tooltip
            contentStyle={t.tooltip}
            formatter={(value: number, name: string) => [money(Number(value)), name]}
            labelFormatter={(v) => `${Number(v).toLocaleString('en-US')} arrivals/mo`}
          />
          {/* No entrance animation: the chart re-renders on every recompute; recharts' default would re-draw
              the band + lines each time (flicker). */}
          <Area type="monotone" dataKey="bandFloor" stackId="band" stroke="none" fill="none" fillOpacity={0} legendType="none" isAnimationActive={false} />
          <Area type="monotone" dataKey="bandHeight" stackId="band" stroke="none" fill={t.band} fillOpacity={0.55} name="Range (low to high)" isAnimationActive={false} />
          <Line type="monotone" dataKey="central" stroke={t.central} strokeWidth={2} dot={false} name="Central" isAnimationActive={false} />
          <Line type="monotone" dataKey="conservative" stroke={t.conservative} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Conservative (cold cache)" isAnimationActive={false} />
          {props.breakEven != null && Number.isFinite(props.breakEven) ? (
            <ReferenceLine x={props.breakEven} stroke={t.marker} strokeDasharray="3 3" label={{ value: 'break-even', fill: t.marker, fontSize: 10, position: 'top' }} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </VizFigure>
  );
}
