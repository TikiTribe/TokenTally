// Cache-warmth curve (§5.7): monthly cost as the arrival rate rises and the cache warms. Central estimate line,
// the [low, high] confidence band, a dashed conservative (cold-cache) reference, and a break-even marker. Only
// meaningful for models that cache; a non-caching model gets honest text instead of a fake curve. recharts is
// lazy-loaded (never in first-paint) and its Tooltip gives hover-anywhere-along-x explanation. Owner: TokenTally UI.
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { chartTheme } from '@/ui/charts/chartTheme';
import { money } from '@/ui/format';
import { VizFigure } from '@/viz/vizA11y';

export interface WarmthPoint {
  arrivals: number;
  central: number;
  low: number;
  high: number;
  conservative: number;
}

// SKELETON DATA for the Task A2 CSP/first-paint proof. Replaced by the real warmthCurve() series in Task B2.
const SKELETON: WarmthPoint[] = [
  { arrivals: 1000, central: 120, low: 110, high: 140, conservative: 150 },
  { arrivals: 100000, central: 60, low: 50, high: 75, conservative: 150 },
];

export function CacheWarmthCurve(props: { points?: WarmthPoint[] | null; breakEven?: number | null }): JSX.Element | null {
  // Re-read the resolved theme colors whenever the store theme flips (recharts needs concrete colors).
  const theme = useAppStore((s) => s.theme);
  void theme;
  const t = chartTheme();
  const points = props.points === undefined ? SKELETON : props.points;
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
        <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <XAxis dataKey="arrivals" tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => Number(v).toLocaleString('en-US')} />
          <YAxis tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => money(Number(v))} width={64} />
          <Tooltip
            contentStyle={t.tooltip}
            formatter={(value: number, name: string) => [money(Number(value)), name]}
            labelFormatter={(v) => `${Number(v).toLocaleString('en-US')} arrivals/mo`}
          />
          <Area type="monotone" dataKey="high" stroke="none" fill={t.band} fillOpacity={0.6} name="High" />
          <Area type="monotone" dataKey="low" stroke="none" fill={t.band} fillOpacity={0} name="Low" />
          <Line type="monotone" dataKey="central" stroke={t.central} strokeWidth={2} dot={false} name="Central" />
          <Line type="monotone" dataKey="conservative" stroke={t.conservative} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Conservative (cold cache)" />
          {props.breakEven != null && Number.isFinite(props.breakEven) ? (
            <ReferenceLine x={props.breakEven} stroke={t.marker} strokeDasharray="3 3" label={{ value: 'break-even', fill: t.marker, fontSize: 10, position: 'top' }} />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </VizFigure>
  );
}
